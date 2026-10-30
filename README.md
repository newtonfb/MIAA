# MIAA Football Rankings — 2026

Unofficial, statewide Massachusetts football power-rating and playoff scenario calculator. Includes all eight MIAA football divisions and their out-of-state opponents. Enter or predict scores, including 14-point MAX scenarios, and the app recalculates the entire opponent-strength network rather than estimating from win/loss margin alone.

## October 30, 2026 baseline

- **262** Massachusetts schools, with exact published October 30, 4 a.m. official rating and rank for each team.
- **919** scored matchups from the October 30 MIAA Arbiter report, including **seven** marked forfeits. Two October 29 finals (South Shore Vo-Tech 45–8 Upper Cape Cod RVT, Winthrop 42–22 Salem) were confirmed too late for this release; the app applies them only to its *unofficial live projection*, not to the frozen 919-game baseline.
- Reconciled Nashoba Valley Tech 41–6 KIPP Academy Lynn Collegiate (corrected from an earlier 40–12 report) and the official Quabbin Regional–Tyngsborough forfeit classification.
- Independent rating solver uses a high-precision graph-Laplacian/conjugate-gradient calculation, with forfeits excluded from opponent-strength calculations and applied afterward to own average capped margin.
- **Independent verification:** using only the published October 30 games, fitting *one common offset* across all 262 calculated ratings gives a maximum difference of **0.00204 rating points** and a mean absolute error of about **0.00050** versus the official PDFs. Calculated order matches **260 of 262** division rank slots; the only exceptions are Ware and Wareham, separated by just 0.0006 in the official D8 rankings.
- The app shows exactly published ratings when you compare the official October 30 baseline, then adds *calculated rating changes* for games beyond that baseline. An unchanged published rating is not evidence of solver accuracy; the test checks the independently solved ratings separately.

**This is not an official MIAA rankings service.** Forecasts and eligibility are approximations, not tournament selection decisions, and tiny rating differences can matter near the 16/17 cutoff.

## Files

- `index.html` — responsive interface, rankings, Week 8 scenarios, teams and bracket screens.
- `styles.css` — styling.
- `app.js` — match entry, scenarios, UI, browser-local state and official-baseline deltas.
- `rating-engine.js` — dependency-free high-precision statewide rating engine.
- `data/season-2026.js` — 919 MIAA-published completed matchups, upcoming games, 262 published ratings and divisions.
- `data/official-oct30-2026.json` — independent October 30 validation fixture (all eight divisions).
- `tests/rating-engine.test.cjs` — independent numerical benchmark, forfeit handling, 14-point cap, and nonmember-opponent tests.
- `api/school-logos.js` — best-effort logo lookup on Vercel.

## Running locally

Clone `https://github.com/newtonfb/MIAA.git`, open in VS Code, and from the project root run:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. The main rankings engine needs no build and operates client-side. Logo lookup is provided by a Vercel function and may use initial-based fallback locally.

To validate calculations (requires Node.js 22 or later):

```bash
node --check rating-engine.js
node --check app.js
node --test tests/rating-engine.test.cjs
```

The `Validate football ratings` GitHub Actions workflow also runs on changes. The test checks the independently solved model against all 262 official ratings, not against itself.

## Releasing updates

The Vercel production site has been linked to the `newtonfb/MIAA` repository's `main` branch. After changes are merged:

```bash
git pull origin main
# edit files, then
git add .
git commit -m "Explain my change"
git push origin main
```

Vercel should deploy commits to `main`. If it does not, check the Vercel project's Git integration and deployment status; a GitHub push alone cannot confirm the production build was successful.

## Sources

- [MIAA power-ranking releases](https://www.miaa.net/game-day/tournament-central/power-rankings)
- [MIAA rating and forfeit methodology](https://www.miaa.net/about-power-ratings)
- [October 30, 2026 MIAA football scores PDF](https://www.miaa.net/sites/default/files/2026-09/power-rankings-fall-2026-football-scores.pdf)
- [October 30, 2026 MIAA Division 8 rankings](https://www.miaa.net/sites/default/files/2026-09/power-rankings-fall-2026-football-division-8.pdf)
