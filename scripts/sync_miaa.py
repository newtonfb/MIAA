#!/usr/bin/env python3
"""Sync every sport from MIAA's published Arbiter export.

MIAA publishes each sport's power rankings and its Arbiter score ledger as PDFs
("entered into Arbiter as of <date>, 4 a.m."). This script downloads the newest
release for football, field hockey, boys and girls soccer and volleyball,
rebuilds data/season-2026.js (football) and data/fall-2026.js (the rest), and
refuses to write anything if any sport fails validation.

    pip install 'pdfplumber>=0.11,<0.13' 'requests>=2.31,<3'
    python scripts/sync_miaa.py           # download, validate, write
    python scripts/sync_miaa.py --check   # download and validate only

Validation: every published team's win-loss-tie record and average capped
margin must match the parsed score ledger to MIAA's four-decimal precision.
"""
import argparse
import io
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import pdfplumber
import requests

ROOT = Path(__file__).resolve().parents[1]
SEASON = 2026
INDEX_URL = "https://www.miaa.net/game-day/tournament-central/power-rankings"
FALLBACK_BASE = f"https://www.miaa.net/sites/default/files/{SEASON}-09/power-rankings-fall-{SEASON}-"
# slug: (title, divisions, margin cap, ties column in the rankings PDF)
SPORTS = {
    "football": ("Football", 8, 14, False),
    "field-hockey": ("Field Hockey", 4, 3, True),
    "boys-soccer": ("Boys Soccer", 5, 3, True),
    "girls-soccer": ("Girls Soccer", 5, 3, True),
    "volleyball": ("Volleyball", 5, 3, False),
}
FLOAT = r"([+-]?\d+\.\d{4})"
RANK_TIES = re.compile(r"^(\d{1,3})\s+(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+" + r"\s+".join([FLOAT] * 3) + r"(?:\s+" + FLOAT + r")?\s*\*?\s*$")
RANK_NO_TIES = re.compile(r"^(\d{1,3})\s+(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+" + r"\s+".join([FLOAT] * 3) + r"(?:\s+" + FLOAT + r")?\s*\*?\s*$")
SCORE = re.compile(r"^(\d{1,2}/\d{1,2})\s+(.+?)\s+(\d{1,3})\s+(.+?)\s+(\d{1,3})(?:\s+(F))?\s*$")
AS_OF = re.compile(r"as of (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2})", re.I)
MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}


class SyncError(Exception):
    pass


def discover_urls():
    """Newest PDF for each sport and file, read from MIAA's power-rankings page.
    A "-final" release beats the in-season file, and a later upload folder beats an earlier one."""
    urls = {}
    try:
        html = requests.get(INDEX_URL, timeout=60, headers={"User-Agent": "MIAA-Rankings-Sync/1.0"}).text
    except requests.RequestException as exc:
        print("Could not read the MIAA index page, using known file paths:", exc)
        html = ""
    pattern = re.compile(r"/sites/default/files/(\d{4}-\d{2})/power-rankings-fall-%d-([a-z-]+?)-(division-\d|scores)(-final)?\.pdf" % SEASON)
    for m in pattern.finditer(html):
        folder, slug, part, final = m.groups()
        if slug not in SPORTS:
            continue
        rank = (1 if final else 0, folder)
        key = (slug, part)
        if key not in urls or rank > urls[key][0]:
            urls[key] = (rank, "https://www.miaa.net" + m.group(0))
    return {key: url for key, (_, url) in urls.items()}


def fetch_pdf(url):
    r = requests.get(url, timeout=90, headers={"User-Agent": "MIAA-Rankings-Sync/1.0"})
    r.raise_for_status()
    if not r.content.startswith(b"%PDF"):
        raise SyncError("Not a PDF: " + url)
    return pdfplumber.open(io.BytesIO(r.content))


def as_of_date(text, url):
    m = AS_OF.search(text or "")
    if not m:
        raise SyncError("No 'as of' date found in " + url)
    return f"{SEASON}-{MONTHS[m.group(1).lower()]:02d}-{int(m.group(2)):02d}"


def url_for(urls, slug, part):
    return urls.get((slug, part)) or f"{FALLBACK_BASE}{slug}-{part}.pdf"


def rankings(slug, ndiv, has_ties, urls):
    official, divisions, used, dates = {}, {}, [], set()
    pattern = RANK_TIES if has_ties else RANK_NO_TIES
    for division in range(1, ndiv + 1):
        url = url_for(urls, slug, f"division-{division}")
        used.append(url)
        found = 0
        with fetch_pdf(url) as pdf:
            for page in pdf.pages:
                text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
                if page.page_number == 1:
                    dates.add(as_of_date(text, url))
                for line in text.splitlines():
                    m = pattern.match(" ".join(line.split()))
                    if not m:
                        continue
                    g = m.groups()
                    name = g[1].strip()
                    w, l = int(g[2]), int(g[3])
                    ties = int(g[4]) if has_ties else 0
                    vals = g[5:] if has_ties else g[4:]
                    mov, opp, rating = map(float, vals[:3])
                    if name in official:
                        raise SyncError(f"{slug}: duplicate team {name}")
                    official[name] = [int(g[0]), rating, mov, opp, w, l, ties, float(vals[3]) if vals[3] else None]
                    divisions[name] = division
                    found += 1
        if found < 8:
            raise SyncError(f"{slug} D{division}: parsed only {found} teams; the PDF layout may have changed")
        print(f"  {slug} D{division}: {found} teams")
    if len(dates) != 1:
        raise SyncError(f"{slug}: division PDFs disagree on the as-of date {sorted(dates)}")
    return official, divisions, used, dates.pop()


def capped(x, cap):
    return max(-cap, min(cap, x))


def scores(slug, cap, official, url, cutoff):
    """Parse the two-column score ledger. Each game appears under both schools; keep one copy,
    but keep real same-day doubleheaders, which raise the published game count."""
    games, observed, bad, equivalent, conflicts = {}, {}, [], [], []
    with fetch_pdf(url) as pdf:
        header = pdf.pages[0].extract_text() or ""
        ledger_date = as_of_date(header, url)
        for page in pdf.pages:
            mid = page.width / 2
            for x0, x1 in [(0, mid - 5), (mid - 5, page.width)]:
                text = page.crop((x0, 0, x1, page.height)).extract_text(x_tolerance=2, y_tolerance=3) or ""
                for row in text.splitlines():
                    line = " ".join(row.split())
                    m = SCORE.match(line)
                    if not m:
                        if re.match(r"^\d{1,2}/\d{1,2}\s", line):
                            bad.append(line)
                        continue
                    day, a, sa, b, sb, flag = m.groups()
                    month, dom = map(int, day.split("/"))
                    d = f"{SEASON}-{month:02d}-{dom:02d}"
                    if d > cutoff:
                        continue
                    sa, sb = int(sa), int(sb)
                    if sa > 999 or sb > 999 or not a or not b or a == b:
                        raise SyncError(f"{slug}: bad score line {line}")
                    k = (d,) + tuple(sorted((a, b)))
                    g = [d, a, b, sa, sb, 1 if flag else 0]
                    observed.setdefault(k, []).append(g)
                    if k not in games:
                        games[k] = g
                        continue
                    old = games[k]
                    same = (old[3], old[4]) == ((sa, sb) if old[1] == a else (sb, sa))
                    if same:
                        old[5] = max(old[5], g[5])
                    elif capped(old[3] - old[4], cap) == capped((sa - sb) if old[1] == a else (sb - sa), cap):
                        equivalent.append([old, g])  # different raw blowouts, same capped margin
                    else:
                        conflicts.append((k, old, g))
    if ledger_date != cutoff:
        raise SyncError(f"{slug}: score ledger is as of {ledger_date} but rankings are as of {cutoff}")

    counts = {}

    def bump(g):
        _, a, b, sa, sb, _ = g
        for team, own, opp in [(a, sa, sb), (b, sb, sa)]:
            counts.setdefault(team, [0, 0, 0])[0 if own > opp else 1 if own < opp else 2] += 1

    for g in games.values():
        bump(g)

    def improves_record(g):
        _, a, b, sa, sb, _ = g
        delta = 0
        for team, own, opp in [(a, sa, sb), (b, sb, sa)]:
            if team not in official:
                continue
            want = official[team][4:7]
            have = counts.get(team, [0, 0, 0])
            trial = have[:]
            trial[0 if own > opp else 1 if own < opp else 2] += 1
            delta += sum(abs(have[i] - want[i]) for i in range(3)) - sum(abs(trial[i] - want[i]) for i in range(3))
        return delta > 0

    extras, doubleheaders = [], []
    for key, rows in observed.items():
        by_source = {}
        for g in rows:
            by_source.setdefault(g[1], []).append(g)
        listed = max(by_source.values(), key=len)
        used = 0
        for extra in listed[1:]:
            if improves_record(extra):
                extras.append(extra)
                bump(extra)
                used += 1
        if used:
            doubleheaders.append([key[0], key[1], key[2], used + 1])

    def team_mov(team, swap=None):
        played = [(swap[1] if swap and k == swap[0] else g) for k, g in games.items()] + extras
        mine = [capped(g[3] - g[4], cap) * (1 if g[1] == team else -1) for g in played if team in (g[1], g[2])]
        return sum(mine) / len(mine) if mine else None

    resolved = []
    for k, old, new in conflicts:
        err = []
        for candidate in (old, new):
            total = 0.0
            for t in {old[1], old[2]} & set(official):
                total += (team_mov(t, (k, candidate)) - official[t][2]) ** 2
            err.append(total)
        if err[1] < err[0]:
            games[k] = new
        resolved.append({"date": k[0], "teams": [k[1], k[2]], "candidates": [[old[3], old[4]], [new[3], new[4]]], "chosen": "second" if err[1] < err[0] else "first"})

    played = sorted(list(games.values()) + extras)
    final_counts = {}
    for g in played:
        for team, own, opp in [(g[1], g[3], g[4]), (g[2], g[4], g[3])]:
            final_counts.setdefault(team, [0, 0, 0])[0 if own > opp else 1 if own < opp else 2] += 1
    record_errors, margin_errors = [], []
    for team, row in official.items():
        if final_counts.get(team, [0, 0, 0]) != row[4:7]:
            record_errors.append([team, final_counts.get(team), row[4:7]])
        mov = team_mov(team)
        if mov is not None and abs(mov - row[2]) > 0.00051:
            margin_errors.append([team, round(mov - row[2], 4)])
    print(f"  {slug} scores: {len(played)} games, {len(doubleheaders)} doubleheaders, {len(resolved)} resolved conflicts, {len(bad)} unscored lines")
    if record_errors or margin_errors:
        raise SyncError(f"{slug}: ledger does not reproduce MIAA's published numbers; records off for {record_errors[:5]}, margins off for {margin_errors[:5]}")
    return played, {"scores": url, "unmatchedScoreLines": len(bad), "equivalentScoreDiscrepancies": len(equivalent), "scoreConflicts": resolved, "sameDayMultipleMatches": doubleheaders}


def read_js_object(path, name):
    if not path.exists():
        return None
    text = path.read_text(encoding="utf8").strip()
    return json.loads(re.sub(r"^const %s=" % name, "", text).rstrip(";"))


def sync(check_only):
    urls = discover_urls()
    out = {}
    for slug, (title, ndiv, cap, has_ties) in SPORTS.items():
        print(f"{title}:")
        official, divisions, rank_urls, as_of = rankings(slug, ndiv, has_ties, urls)
        games, meta = scores(slug, cap, official, url_for(urls, slug, "scores"), as_of)
        out[slug] = dict(title=title, cap=cap, date=as_of, divisions=divisions, official=official, games=games, urls={"rankings": rank_urls, "scores": meta.pop("scores")}, **meta)
        print(f"  as of {as_of}: {len(official)} teams, {len(games)} games")
    if check_only:
        print("Check passed; nothing written.")
        return

    # Football keeps the upcoming schedule (unscored rows) from the current file.
    football_path = ROOT / "data" / "season-2026.js"
    current = read_js_object(football_path, "DATA") or {"games": []}
    fb = out.pop("football")
    played_on = {}
    for g in fb["games"]:
        played_on.setdefault(tuple(sorted((g[1], g[2]))), []).append(datetime.fromisoformat(g[0]))

    def still_upcoming(g):
        # Drop a scheduled game once the same matchup has been played within a week of its date
        # (games move between Thursday and Saturday), or once its date has passed unplayed.
        when = datetime.fromisoformat(g[0])
        moved = any(abs((when - d).days) <= 7 for d in played_on.get(tuple(sorted((g[1], g[2]))), []))
        return g[3] is None and g[0] >= fb["date"] and not moved

    upcoming = [g for g in current["games"] if still_upcoming(g)]
    football = {"date": fb["date"], "games": fb["games"] + upcoming, "divisions": fb["divisions"], "official": fb["official"]}
    football_path.write_text("\nconst DATA=" + json.dumps(football, separators=(",", ":"), ensure_ascii=False) + ";\n\n", encoding="utf8")
    print(f"Wrote {football_path.name}: {len(fb['games'])} scored games, {len(upcoming)} upcoming")

    dates = {s["date"] for s in out.values()}
    # No run timestamp in the file: a sync with no new results must leave it byte-for-byte unchanged.
    fall = {"date": max(dates), "sports": out}
    fall_path = ROOT / "data" / "fall-2026.js"
    fall_path.write_text("const FALL_DATA=" + json.dumps(fall, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf8")
    print(f"Wrote {fall_path.name}: " + ", ".join(f"{k} {len(v['games'])} games as of {v['date']}" for k, v in out.items()))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="download and validate without writing files")
    try:
        sync(parser.parse_args().check)
    except (SyncError, requests.RequestException) as exc:
        print("Sync failed, no files were changed:", exc, file=sys.stderr)
        sys.exit(1)
