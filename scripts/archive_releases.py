#!/usr/bin/env python3
"""Keep a permanent archive of every MIAA power-rankings release, for formula calibration.

MIAA overwrites its PDFs at the same addresses, so each release is lost once the next one is
posted. This saves the parsed numbers (every team's official rating, rank, record and margin, plus
the full score ledger) as data/releases/<season>/<sport>-<as-of date>.json. It reuses the parsing
and validation in scripts/sync_miaa.py, so a release is archived only if every team's record and
average capped margin match MIAA's published numbers.

    python scripts/archive_releases.py --current         # archive the release now in data/
    python scripts/archive_releases.py --season 2025     # MIAA's posted 2025 season files
    python scripts/archive_releases.py --season 2024
"""
import argparse
import json
import re
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sync_miaa  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data" / "releases"
PAGE = "https://www.miaa.net/game-day/tournament-central/power-rankings"


def save(season, slug, release):
    folder = ARCHIVE / str(season)
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / f"{slug}-{release['date']}.json"
    body = json.dumps({"season": season, "sport": slug, **release}, separators=(",", ":"), ensure_ascii=False, sort_keys=True)
    if out.exists() and out.read_text(encoding="utf8") == body:
        return out, False
    out.write_text(body, encoding="utf8")
    return out, True


def current():
    """Archive whatever release data/season-2026.js and data/fall-2026.js hold now."""
    fb = sync_miaa.read_js_object(ROOT / "data" / "season-2026.js", "DATA")
    fall = sync_miaa.read_js_object(ROOT / "data" / "fall-2026.js", "FALL_DATA")
    releases = {"football": {"date": fb["date"], "cap": 14, "divisions": fb["divisions"], "official": fb["official"],
                             "games": [g for g in fb["games"] if g[3] is not None]}}
    for slug, s in fall["sports"].items():
        releases[slug] = {"date": s.get("date", fall["date"]), "cap": s["cap"], "divisions": s["divisions"],
                          "official": s["official"], "games": s["games"]}
    for slug, r in releases.items():
        path, wrote = save(int(r["date"][:4]), slug, r)
        print(("saved " if wrote else "already archived ") + str(path.relative_to(ROOT)))


def season_urls(season):
    """Every rankings and score-ledger file MIAA links for a past season, keyed like sync_miaa expects.
    Older seasons link web addresses that redirect to the PDF; newer ones link the PDF directly."""
    html = requests.get(PAGE, timeout=60, headers={"User-Agent": "MIAA-Rankings-Archive/1.0"}).text
    pattern = re.compile(r'href="((?:https://www\.miaa\.net)?/(?:sites/default/files/[\d-]+/)?power-rankings-fall-%d-([a-z-]+?)-(division-\d|scores)(-final)?(?:\.pdf)?)"' % season)
    urls = {}
    for m in pattern.finditer(html):
        link, slug, part, final = m.groups()
        if slug in sync_miaa.SPORTS:
            # Prefer the "-final" release when both are linked.
            if (slug, part) not in urls or final:
                urls[(slug, part)] = link if link.startswith("http") else "https://www.miaa.net" + link
    return urls


def past_season(season):
    urls = season_urls(season)
    if not urls:
        print(f"MIAA's page links no {season} files.")
        return 1
    sync_miaa.SEASON = season  # dates in the PDFs carry no year
    failures = 0
    for slug, (title, ndiv, cap, has_ties) in sync_miaa.SPORTS.items():
        found = sorted(int(p.split("-")[1]) for (s, p) in urls if s == slug and p.startswith("division-"))
        if not found or (slug, "scores") not in urls:
            print(f"{season} {slug}: not posted")
            continue
        print(f"{season} {title}:")
        try:
            official, divisions, rank_urls, as_of = sync_miaa.rankings(slug, max(found), has_ties, urls)
            games, meta = sync_miaa.scores(slug, cap, official, urls[(slug, "scores")], as_of)
        except (sync_miaa.SyncError, requests.RequestException) as exc:
            failures += 1
            print(f"  not archived: {exc}")
            continue
        # End-of-season releases are undated; date them by the last game they include.
        release = {"date": as_of or max(g[0] for g in games), "final": as_of is None, "cap": cap, "divisions": divisions, "official": official, "games": games,
                   "urls": {"rankings": rank_urls, "scores": urls[(slug, "scores")]}}
        path, wrote = save(season, slug, release)
        print(f"  {'saved' if wrote else 'already archived'} {path.relative_to(ROOT)}: {len(official)} teams, {len(games)} games")
    return 1 if failures else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--current", action="store_true", help="archive the release currently in data/")
    group.add_argument("--season", type=int, help="archive MIAA's posted files for a past season")
    args = parser.parse_args()
    if args.current:
        current()
    else:
        sys.exit(past_season(args.season))
