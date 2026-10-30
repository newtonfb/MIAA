# MIAA Football Rankings — 2026

A mobile-friendly, statewide Massachusetts football power-ratings calculator with Week 8 scenario entry. The October 27 data includes 262 Massachusetts schools in Divisions 1–8, plus opponents outside Massachusetts. Three October 23 scores missing from the original Arbiter export were independently verified and added: Lee 52–6 South Hadley, Cathedral 32–28 Bishop Fenwick, and Nashoba Valley Tech 40–12 KIPP Academy Lynn Collegiate. The score ledger now has 907 completed games dated through October 27 after removing an erroneous Abby Kelley–Southbridge 6–6 entry. The model still uses the original October 27 cutoff as its fixed baseline; the three later-confirmed scores are only applied to current projections. This is an independent scenario model, **not an official MIAA rankings service**.

## Open in VS Code (Mac)

```bash
git clone https://github.com/newtonfb/MIAA.git
cd MIAA
code .
```

If `code .` isn't available, open VS Code and choose **File → Open Folder**, then select the `MIAA` folder.

## Run locally

No Node install or build is required for the rankings calculator. In the VS Code terminal:

```bash
python3 -m http.server 8000
```

Then visit **http://localhost:8000**. Alternatively, use VS Code's Live Server extension (Open with Live Server). The MIAA school-logo lookup at `/api/school-logos` is a Vercel Serverless Function, so most logos will use the initials fallback with a basic local static server. The rankings, game entries and calculation work offline after loading the site.

To test the actual logo endpoint too, use the Vercel CLI's `vercel dev` after linking this repository to the existing Vercel project.

## Files

- `index.html` — HTML structure / navigation.
- `styles.css` — complete site appearance, desktop and mobile breakpoints.
- `app.js` — scenario engine, controls, rankings, team details and game cards.
- `data/season-2026.js` — embedded October 27, 2026 score data, divisions, official October 27 ratings for all 262 teams (from MIAA's division PDFs) and Week 8 schedule. **Avoid changing official data without verifying sources.**
- `api/school-logos.js` — cached, best-effort lookup of public school logos from MIAA's directory.

## Scenarios and accuracy

**14 confirmed Thursday, October 29 game results are published in `app.js` and applied for all visitors across Divisions 1–8.** They display a 🔒 Final label and are locked against editing, clearing, or prediction. Two games originally scheduled on Friday have their dates corrected to Thursday to avoid double-counting. All other what-if scores are saved in each visitor's browser `localStorage`; individual scenarios do not affect one another. `MAX` gives a team a 14–0 win. `Predict Week 8` creates deterministic statistical predictions, not predictions from a hosted AI service.

Every team starts from MIAA's official October 27 rating. Changes after entering scores are derived from an iterative statewide model and added to those official ratings. The October 30 MIAA report lists Lee at +6.2582, while the corrected model projects about +6.31, so the remaining iteration/data discrepancy is around 0.05 rather than the previously incorrect 1.08. The exact MIAA iteration procedure has not been reproduced to four decimals. The model handles capped point margins and special forfeit adjustments, but **projected cutoff positions are not official**.

## Publishing changes

The Vercel production site is linked to GitHub repository `newtonfb/MIAA`, branch `main`. Pushing commits to `main` automatically creates a production deployment at https://miaa-football-scenarios.vercel.app.

After you modify the source, commit and push with:

```bash
git add .
git commit -m "Describe my changes"
git push origin main
```

**Score verification:** The October 29 finals were cross-checked against published game reports including MaxPreps and the Boston Globe on October 30. These are not an official updated MIAA power-rating release. New weekly MIAA rankings should be verified separately; power ratings calculated after these finals remain projections.

## October 30 accuracy audit

MIAA's October 30 Division 8 PDF has Lee at 8–0, +12.7500 capped MOV, −6.4918 opponent rating and +6.2582 overall. Our previously displayed +5.1781 was mainly caused by recalculating the October 27 model baseline after three October 23 results were added retroactively, even though those games were absent from MIAA's October 27 ratings release. The source data now keeps those results for live projections but omits them from the Oct 27 baseline calculation. This fixed the majority of the error.

A separate 6–6 Abby Kelley–Southbridge score was removed, because it does not appear as a qualifying result on MIAA's October 30 score report or in either team's record. South Shore Vo-Tech's reported 45–8 win over Upper Cape is locked as a real result, but it was not included in MIAA's October 30, 4 a.m. score ledger; don't compare its effect directly to that official ranking snapshot. All 8 divisions continue to update from the full statewide model. The independent model can still differ by tenths and cannot reliably determine four-decimal playoff tiebreakers.

References: https://www.miaa.net/game-day/tournament-central/power-rankings and https://www.miaa.net/about-power-ratings.
