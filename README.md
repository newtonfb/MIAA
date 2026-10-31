# MIAA Power Rankings — 2026

Unofficial power rankings and playoff predictor for **football, field hockey, boys soccer, girls soccer and volleyball**. Every sport uses the same page: official MIAA ratings, a matchup panel to enter or predict scores, live statewide recalculation, projected brackets, team schedules and an explanation of the formula. **This is not an official MIAA rankings service.**

Live site: https://miaa-football-scenarios.vercel.app — pick a sport from the bar under the header, or link straight to one with `?sport=field-hockey`, `boys-soccer`, `girls-soccer` or `volleyball`.

## How each sport works

| | Football | Field hockey, soccer, volleyball |
| --- | --- | --- |
| Margin cap | ±14 points | ±3 goals (volleyball: sets won) |
| Tournament field | Top 16 per division (3 wins, 7 games) | Top 32 per division |
| Matchups | Week 8 schedule, with confirmed Thursday finals locked | Viewers add the games still to be played; MIAA doesn't publish a schedule |
| Predictions | Rating gap, points scored/allowed and common opponents | Same signals, tuned per sport; always names a winner |

Every team starts from MIAA's published rating, so with no scores entered the page matches MIAA exactly. Entered or predicted scores re-solve the whole statewide opponent network and add each team's change to its official rating.

Prediction weights come from walk-forward backtests on this season (each week predicted only from earlier weeks). Correct winners: football 76.8%, field hockey 77.8%, boys soccer 67.8%, girls soccer 70.9%, volleyball 82.3%. Predicting a draw never beat picking the favorite, so predictions always name a winner.

## Files

- `index.html`, `styles.css`, `app.js` — the one page for every sport.
- `rating-engine.js` — dependency-free, high-precision statewide rating solver (sport-specific margin cap).
- `data/season-2026.js` — football: MIAA's scored games, the Week 8 schedule, divisions and official ratings.
- `data/fall-2026.js` — field hockey, boys and girls soccer, volleyball: games, divisions and official ratings.
- `scripts/sync_miaa.py` — downloads MIAA's newest Arbiter export PDFs for every sport and rebuilds both data files.
- `api/sync.js` — Vercel function behind the site's **Admin** button; starts the sync workflow.
- `.github/workflows/sync-arbiter.yml` — runs the sync, tests the result, commits to `main` only if results changed.
- `tests/` — engine benchmarks against the frozen Oct 30 release (`tests/fixtures/`) and checks of whatever data is current.
- `fall.html` — redirects old fall-sports links to the main page.

## Syncing scores from Arbiter

MIAA publishes each sport's rankings and its Arbiter score ledger as PDFs ("entered into Arbiter as of <date>, 4 a.m."). Arbiter itself has no public API, so these PDFs are the source. The sync refuses to publish unless every team's record and average capped margin match MIAA's published rankings.

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

## Releasing updates

The Vercel project deploys every push to `main`:

```bash
git add .
git commit -m "Explain my change"
git push origin main
```

## Sources

- [MIAA power-ranking releases](https://www.miaa.net/game-day/tournament-central/power-rankings)
- [MIAA rating and forfeit methodology](https://www.miaa.net/about-power-ratings)
