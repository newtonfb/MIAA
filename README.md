# MIAA Power Rankings — 2026

Unofficial power rankings and playoff predictor for **football, field hockey, boys soccer, girls soccer and volleyball**. Every sport uses the same page: official MIAA ratings, a matchup panel to enter or predict scores, live statewide recalculation, projected brackets, team schedules and an explanation of the formula. **This is not an official MIAA rankings service.**

Live site: https://miaa-football-scenarios.vercel.app — pick a sport from the bar under the header, or link straight to one with `?sport=field-hockey`, `boys-soccer`, `girls-soccer` or `volleyball`.

## How each sport works

| | Football | Field hockey, soccer, volleyball |
| --- | --- | --- |
| Margin cap | ±14 points | ±3 goals (volleyball: sets won) |
| Tournament field | Top 16 per division (3 wins, 7 games) | Top 32 by rating **plus** additional .500 qualifiers with at least 10 competed games; play-in rounds feed into the round of 32 |
| Matchups | Week 8 schedule, with confirmed Thursday finals locked | Viewers add the games still to be played; MIAA doesn't publish a schedule |
| Predictions | Rating gap, points scored/allowed and common opponents | Same signals, tuned per sport; always names a winner |

Every team starts from MIAA's published rating, so with no scores entered the page matches MIAA exactly. A **FINAL** published MIAA ranking is treated as the authoritative rating baseline; automatically generated play-in pairings remain unofficial projections, not MIAA-issued brackets. Entered or predicted scores re-solve the whole statewide opponent network and add each team's change to its official rating.

Prediction weights come from walk-forward backtests on this season (each week predicted only from earlier weeks). Correct winners: football 76.8%, field hockey 77.8%, boys soccer 67.8%, girls soccer 70.9%, volleyball 82.3%. Predicting a draw never beat picking the favorite, so predictions always name a winner.

## Files

- `index.html`, `styles.css`, `app.js` — the one page for every sport.
- `rating-engine.js` — dependency-free, high-precision statewide rating solver (sport-specific margin cap).
- `tournament-rules.js` — postseason qualification rules, extra .500 qualifiers, and projected preliminary-round pairings.
- `data/season-2026.js` — football: MIAA's scored games, the Week 8 schedule, divisions and official ratings.
- `data/fall-2026.js` — field hockey, boys and girls soccer, volleyball: games, divisions and official ratings.
- `scripts/sync_miaa.py` — downloads MIAA's newest Arbiter export PDFs for every sport and rebuilds both data files.
- `scripts/audit_releases.cjs` — game-by-game comparison of successive MIAA PDF releases: added/removed games, corrected scores, doubleheaders and forfeit flags. Writes `data/reconciliation-log.json`.
- `scripts/accuracy_report.cjs` — walk-forward validation: error percentiles, top-32 selection, exact seeds and the ten worst rating discrepancies. Writes `data/accuracy-log.json`.
- `api/sync.js` — Vercel function behind the site's **Admin** button; starts the sync workflow.
- `.github/workflows/sync-arbiter.yml` — runs the sync, tests the result, commits to `main` only if results changed.
- `tests/` — engine benchmarks against the frozen Oct 30 release (`tests/fixtures/`) and checks of whatever data is current.
- `fall.html` — redirects old fall-sports links to the main page.

## Syncing scores from Arbiter

MIAA publishes each sport's rankings and its Arbiter score ledger as PDFs ("entered into Arbiter as of <date>, 4 a.m."). Arbiter itself has no public API, so these PDFs are the source. The sync refuses to publish unless every team's record and average capped margin match MIAA's published rankings. Each newly published ledger is also compared game-by-game against the prior ledger and the next-release rating prediction is scored against official rankings. When the supplemental live MIAA scoreboard returns HTTP 500, the last available live data is retained and explicitly marked unavailable; verified official PDF updates are still allowed to publish.

**From the site:** open **Admin** in the footer, enter the admin key, and select **Sync now**. It takes about two minutes, then Vercel redeploys if anything changed.

**One-time setup** (Vercel project → Settings → Environment Variables, then redeploy):

1. `ADMIN_SYNC_KEY` — a long passphrase of your choosing; this is what admins type.
2. `GITHUB_TOKEN` — a GitHub fine-grained personal access token limited to the `newtonfb/MIAA` repository with **Actions: Read and write** permission.

Until both are set, the Admin dialog explains that sync isn't set up. You can also run the workflow by hand from the repository's **Actions** tab, or locally:

```bash
pip install 'pdfplumber>=0.11,<0.13' 'requests>=2.31,<3'
python scripts/sync_miaa.py --check   # download and validate only
python scripts/sync_miaa.py           # write data/season-2026.js and data/fall-2026.js
```

## Running locally

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. Everything except the Admin sync works offline after loading.

To validate calculations (Node.js 22 or later):

```bash
node --test tests/rating-engine.test.cjs tests/fall-sports.test.cjs tests/current-data.test.cjs
```

## Accuracy

Independently solved ratings, aligned to MIAA's scale with one shared offset per sport, against the Oct 30 release:

| Sport | Teams | Games | Rank positions matching MIAA | Max rating difference |
| --- | ---: | ---: | ---: | ---: |
| Football | 262 | 919 | 260/262 | 0.0021 |
| Field hockey | 197 | 1,695 | 197/197 | 0.0020 |
| Boys soccer | 332 | 2,722 | 326/332 | 0.0034 |
| Girls soccer | 319 | 2,603 | 317/319 | 0.0038 |
| Volleyball | 309 | 2,832 | 305/309 | 0.0058 |

The mismatched positions are teams separated by less than the difference. Official numbers are shown exactly; only scenario changes are modeled.

## Formula investigation (October 31, 2026)

The archived 2024 football release satisfies the current equations after correcting three missing forfeit flags: Catholic Memorial–St. Francis (September 21), Holbrook–Wareham (October 25), and Monomoy–Nantucket (November 1). All 256 teams whose opponents have published ratings now pass, with a largest residual of 0.000163. The earlier claim that 2024 football used a different formula was incorrect. Other 2024 sports still need their own input audit.

`data/ledger-corrections.json` records the sources for these corrections, and the historical importer reapplies them. A 14–0 score alone is not sufficient evidence of a forfeit. The rating engine now uses the full sport margin cap for any flagged forfeit, including a nominal 2–0 feed score.

`node scripts/check_procedure.cjs` compares consecutive archived releases across 1,152 combinations of starting values, update order, damping, intermediate rounding and stopping threshold. It reports raw errors, the mean signed error (shared scale bias), and the largest error remaining after removing that bias for diagnosis. It also selects fixed procedures across transitions and evaluates each transition using a procedure selected on the other transitions, to expose overfitting.

Four complete football snapshots copied from mahsratings.com are kept separately under `data/research/mahsratings/2026/`, with provenance and the hash of the downloaded source. October 27 and 30 ratings match all 262 ratings in our existing archives exactly. October 16 and 23 have not been independently checked against historical MIAA PDFs; all four pass record, margin and opponent-equation checks. Tie counts omitted by the third-party official rows are inferred from each ledger. Supplemental results and hypothetical edits are excluded.

Reproduce the research:

```bash
node scripts/import_research_snapshots.cjs
RELEASE_DIR=data/research/mahsratings node scripts/check_consistency.cjs
RELEASE_DIR=data/research/mahsratings node scripts/check_procedure.cjs
```

The saved results are in `data/research/mahsratings/procedure-analysis.json`. The current production projection has these errors against the copied releases:

| Transition | Largest absolute error | Shared signed offset | Largest error after removing shared offset |
| --- | ---: | ---: | ---: |
| October 16 → 23 | 0.043659 | −0.042730 | 0.001651 |
| October 23 → 27 | 0.055486 | −0.055072 | 0.000485 |
| October 27 → 30 | 0.002801 | −0.002661 | 0.000156 |

Removing the offset here uses the target release and is diagnostic only; it is not available to a forward projection. The common offset does not affect ranks or pairwise rating gaps. The equation matching supports the underlying formula, while these transitions show the games-weighted centering rule is an estimate rather than an established MIAA invariant. The 0.0028 result from October 27–30 is not a general absolute-error bound.

No tested procedure reproduces MIAA's numbers exactly or reliably outperforms the current model on every transition. The best fixed candidate's mean error across all 786 team observations is 0.016257, but it has a worst error of 0.028333 and does worse than the current method on October 27–30. Selecting a procedure on two transitions gives held-out maximum errors of 0.063067, 0.028333 and 0.016957 on the remaining transition. Simple continuation from previous published ratings, including preserving prior opponent values while updating own margins, remains unconfirmed. Unpublished daily states and full-precision starting values are unavailable. The production calculation is unchanged by this research.

Run the equation checks with `node scripts/check_consistency.cjs`; failures request investigation of the ledger, release and procedure rather than automatically claiming a different formula.

## Releasing updates

The Vercel project deploys every push to `main`:

```bash
git add .
git commit -m "Explain my change"
git push origin main
```

## Verifying scores missing from MIAA

MIAA's official rankings PDFs and live scoreboard remain the primary sources. A fixture without
a posted final is **unverified**, not automatically a loss, draw, cancellation or completed game.

To research results still missing after a sync, check:
- [iBerkshires high school sports](https://www.iberkshires.com/sports/highschool/main) for Berkshire / Western Massachusetts games.
- [Boston Globe High School Sports scoreboard](https://www.bostonglobe.com/sports/high-schools/scoreboard/) for Eastern Massachusetts soccer, field hockey, and volleyball results; check the dated scoreboard.
- [Worcester Telegram & Gazette high school scoreboard](https://cm.telegram.com/highschool-scores?season=202627&type=scoreboard) for Central Massachusetts games.
- [Worcester T&G Sports on X (@tgsports)](https://x.com/tgsports) for Central Mass. game recaps, final scores, and school-athletics reposts. Cross-check the dated post before using a score; an X profile alone is not proof of any specific result.

An independently verified result may be recorded in `data/verified-reported-2026.js`,
with its sport, date, participants, score, publisher and exact public article URL.
The website labels these **REPORTED FINAL**, links to the source, and uses them
provisionally in projections. **MIAA's own scored ledger and live scoreboard take
precedence** when the same game appears in their data. Do not infer missing
scores from a scheduled matchup or season record.

## Sources

- [MIAA power-ranking releases](https://www.miaa.net/game-day/tournament-central/power-rankings)
- [MIAA rating and forfeit methodology](https://www.miaa.net/about-power-ratings)

## 2026 post-season accuracy audit

After correcting the November 2 volleyball ledger (9 missing games, 3 extra duplicate rows), the site was reconciled game-by-game: all **2,904** published November 2 matches matched by date, teams, scores and occurrence count. The newer MIAA November 3 **FINAL** PDF is now authoritative, including a corrected October 27 Bishop Stang–Middleborough result.

The October 30 → final volleyball **walk-forward** regression in `data/accuracy-log.json` achieved **160/160** top-32 selections and **158/160** exact seeds; Lexington and Springfield Central in D1 were reversed at #27/#28. This backtest uses previous released ratings and the later official game ledger, and therefore measures formula/projection accuracy conditional on complete later data, **not the accuracy of a real-time prediction made with potentially missing input games**. The final official MIAA ratings, once imported, display with their published rank and rating rather than a simulated prediction.

All five volleyball 2026 tournament field sizes now match MIAA: D1 35, D2 35, D3 45, D4 38, D5 38 (191 total). Play-in pairings shown on the site are automatically generated; verify them against MIAA's issued bracket before representing them as official.
