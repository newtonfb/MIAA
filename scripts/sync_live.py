#!/usr/bin/env python3
"""Pull live results from MIAA's public scoreboard (https://www.miaa.net/scores).

The scoreboard serves Arbiter game data from miaa.net. For each sport this script makes one
request for the season to date, learns which Arbiter school is which of our teams by matching
games that also appear in MIAA's official ledger (same date, same score), then writes
data/live-2026.js with:

  results   varsity games played after the sport's latest official MIAA release
  upcoming  scheduled varsity games that have no score yet

Run after scripts/sync_miaa.py so the official ledger it reads is current:

    python scripts/sync_live.py

A sport whose request fails or whose team mapping looks wrong keeps its previous live data.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
API = "https://www.miaa.net/arbiter_api/search_games"
SEASON_START = "2026-08-20"
# slug: (Arbiter sport id, Arbiter gender id or None for any, margin cap used for awarded forfeits)
SPORTS = {
    "football": (4, None, 14),
    "field-hockey": (3, None, 3),
    "boys-soccer": (8, 1, 3),
    "girls-soccer": (8, 2, 3),
    "volleyball": (12, 2, 3),
}
OUT = ROOT / "data" / "live-2026.js"
# Placeholders that must never be matched: Arbiter's "TBA" opponent and MIAA's "#N/A" spreadsheet errors.
PLACEHOLDER = re.compile(r"^(TBA|TBD|#N/?A)$", re.I)


def read_js(path, name):
    text = re.sub(r"^(//[^\n]*\n)+", "", path.read_text(encoding="utf8")).strip()
    return json.loads(re.sub(r"^const %s=" % name, "", text).rstrip(";"))


def official(slug):
    if slug == "football":
        d = read_js(ROOT / "data" / "season-2026.js", "DATA")
        return d["date"], d["divisions"], [g for g in d["games"] if g[3] is not None]
    f = read_js(ROOT / "data" / "fall-2026.js", "FALL_DATA")
    s = f["sports"][slug]
    return s.get("date", f["date"]), s["divisions"], s["games"]


def fetch(sport_id, gender_id, through):
    # The scoreboard needs different from/to dates; one request covers the whole season.
    params = {"fromDate": SEASON_START, "toDate": through, "sportIds": sport_id}
    if gender_id:
        params["genderIds"] = gender_id
    r = requests.get(API, params=params, timeout=120, headers={"User-Agent": "MIAA-Rankings-Sync/1.0", "Accept": "application/json"})
    r.raise_for_status()
    games = r.json()
    if not isinstance(games, list):
        raise ValueError("unexpected response shape")
    return [g for g in games if g.get("levelId") == 1 and not g.get("isDeleted") and len(g.get("teams") or []) == 2]


def learn_names(games, ledger):
    """Arbiter schoolId -> our team name, voted by games with identical date and score in both sources."""
    by_date = defaultdict(list)
    ledger = [g for g in ledger if not PLACEHOLDER.match(g[1]) and not PLACEHOLDER.match(g[2])]
    games = [g for g in games if not any(PLACEHOLDER.match((t["schoolName"] or t["teamName"] or "").strip()) for t in g["teams"])]
    for g in ledger:
        by_date[g[0]].append(g)
    votes, names = defaultdict(Counter), {}
    for g in games:
        a, b = g["teams"]
        names[a["schoolId"]], names[b["schoolId"]] = a["schoolName"] or a["teamName"], b["schoolName"] or b["teamName"]
        if a["score"] is None or b["score"] is None or a["score"] == b["score"]:
            continue
        for led in by_date.get(g["fromDate"][:10], []):
            if {led[3], led[4]} == {a["score"], b["score"]} and led[3] != led[4]:
                team_a = led[1] if led[3] == a["score"] else led[2]
                votes[a["schoolId"]][team_a] += 1
                votes[b["schoolId"]][led[2] if team_a == led[1] else led[1]] += 1
    mapping = {}
    for sid, c in votes.items():
        ranked = c.most_common()
        top, n = ranked[0]
        second = ranked[1][1] if len(ranked) > 1 else 0
        # Two agreeing games, or a single game with no competing candidate (one-off out-of-state opponents).
        if (n >= 2 and n >= 3 * second) or (n == 1 and second == 0):
            mapping[sid] = top
    # One Arbiter school per team: drop any team name claimed twice.
    claimed = Counter(mapping.values())
    mapping = {sid: t for sid, t in mapping.items() if claimed[t] == 1}

    # Second pass, repeated until nothing changes: when one side of an Arbiter game is already known,
    # the ledger game with that team, date and score names the other side. This resolves set scores
    # (volleyball has dozens of 3–0 games a day) and ties, which the first pass can't use.
    by_team_date = defaultdict(list)
    for g in ledger:
        by_team_date[(g[1], g[0])].append(g)
        by_team_date[(g[2], g[0])].append(g)
    while True:
        votes = defaultdict(Counter)
        for g in games:
            a, b = g["teams"]
            if a["score"] is None or b["score"] is None:
                continue
            for known, other in ((a, b), (b, a)):
                team = mapping.get(known["schoolId"])
                if not team or other["schoolId"] in mapping:
                    continue
                for led in by_team_date.get((team, g["fromDate"][:10]), []):
                    mine, theirs = (led[3], led[4]) if led[1] == team else (led[4], led[3])
                    if (mine, theirs) == (known["score"], other["score"]):
                        votes[other["schoolId"]][led[2] if led[1] == team else led[1]] += 1
        taken = set(mapping.values())
        added = {}
        for sid, c in votes.items():
            ranked = c.most_common()
            top, n = ranked[0]
            if top not in taken and (len(ranked) == 1 or n >= 3 * ranked[1][1]):
                added[sid] = top
        added = {sid: t for sid, t in added.items() if Counter(added.values())[t] == 1}
        if not added:
            return mapping, names
        mapping.update(added)


def sport_live(slug, today):
    sport_id, gender_id, cap = SPORTS[slug]
    as_of, divisions, ledger = official(slug)
    games = fetch(sport_id, gender_id, (today + timedelta(days=21)).isoformat())
    mapping, names = learn_names(games, ledger)
    covered = {t for t in mapping.values() if t in divisions}
    if len(covered) < 0.9 * len(divisions):
        raise ValueError(f"only {len(covered)} of {len(divisions)} teams matched to Arbiter schools")
    results, upcoming, unmapped = {}, {}, Counter()
    for g in games:
        day = g["fromDate"][:10]
        if day < as_of:
            continue  # covered by the official release (stamped 4 a.m. on its date, so that night's games are not)
        a, b = g["teams"]
        ta, tb = mapping.get(a["schoolId"]), mapping.get(b["schoolId"])
        if not ta or not tb:
            unmapped[names.get(a["schoolId"] if not ta else b["schoolId"])] += 1
            continue
        key = g["uniqueGameId"]  # keeps same-day doubleheaders as separate games
        status = g.get("status")
        if a["score"] is not None and b["score"] is not None and status in ("Normal", "Forfeit"):
            results[key] = [day, ta, tb, int(a["score"]), int(b["score"]), 1 if status == "Forfeit" else 0]
        elif status == "Forfeit" and (a.get("isMarkedWinner") or b.get("isMarkedWinner")):
            results[key] = [day, ta, tb, cap if a.get("isMarkedWinner") else 0, cap if b.get("isMarkedWinner") else 0, 1]
        elif status == "Normal" and a["score"] is None and b["score"] is None and day >= today.isoformat():
            upcoming[key] = [day, ta, tb, g["fromDate"][11:16]]
    return {
        "asOf": as_of,
        "results": sorted(results.values()),
        "upcoming": sorted(upcoming.values()),
        "unmappedSchools": sorted(n for n in unmapped if n),
        "matchedTeams": len(covered),
    }


def main():
    today = date.today()
    previous = read_js(OUT, "LIVE_DATA")["sports"] if OUT.exists() else {}
    sports, failed = {}, []
    for slug in SPORTS:
        try:
            sports[slug] = sport_live(slug, today)
            s = sports[slug]
            print(f"{slug}: {len(s['results'])} results after {s['asOf']}, {len(s['upcoming'])} upcoming, {s['matchedTeams']} teams matched, {len(s['unmappedSchools'])} unmapped schools")
        except (requests.RequestException, ValueError) as exc:
            failed.append(slug)
            print(f"{slug}: kept previous live data ({exc})", file=sys.stderr)
            if slug in previous:
                sports[slug] = previous[slug]
    OUT.write_text("// Live varsity results from MIAA's public scoreboard (Arbiter data), written by scripts/sync_live.py.\nconst LIVE_DATA=" + json.dumps({"sports": sports}, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf8")
    print("Wrote", OUT.name)
    if len(failed) == len(SPORTS):
        sys.exit(1)


if __name__ == "__main__":
    main()
