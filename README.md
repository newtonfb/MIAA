# MIAA Football Rankings — 2026

A mobile-friendly, statewide Massachusetts football power-ratings calculator with Week 8 scenario entry. The October 27 data includes 262 Massachusetts schools in Divisions 1–8, plus opponents outside Massachusetts. Three October 23 scores missing from the original Arbiter export were independently verified and added: Lee 52–6 South Hadley, Cathedral 32–28 Bishop Fenwick, and Nashoba Valley Tech 40–12 KIPP Academy Lynn Collegiate. This brings the October 27 baseline to 908 completed games. This is an independent scenario model, **not an official MIAA rankings service**.

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

Every team starts from MIAA's official October 27 rating. Changes after entering scores are derived from an iterative statewide model and added to those official ratings. The exact MIAA iteration procedure has not been reproduced to four decimals. The model handles capped point margins and special forfeit adjustments, but **projected cutoff positions are not official**.

## Publishing changes

The Vercel production site is linked to GitHub repository `newtonfb/MIAA`, branch `main`. Pushing commits to `main` automatically creates a production deployment at https://miaa-football-scenarios.vercel.app.

After you modify the source, commit and push with:

```bash
git add .
git commit -m "Describe my changes"
git push origin main
```

**Score verification:** The October 29 finals were cross-checked against published game reports including MaxPreps and the Boston Globe on October 30. These are not an official updated MIAA power-rating release. New weekly MIAA rankings should be verified separately; power ratings calculated after these finals remain projections.
