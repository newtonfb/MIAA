# MIAA Football Rankings — 2026

A mobile-friendly, statewide Massachusetts football power-ratings calculator with Week 8 scenario entry. The October 27 data includes 262 Massachusetts schools in Divisions 1–8, plus opponents outside Massachusetts. This is an independent scenario model, **not an official MIAA rankings service**.

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
- `data/season-2026.js` — embedded October 27, 2026 score data, divisions, official D8 baselines and Week 8 schedule. **Avoid changing official data without verifying sources.**
- `api/school-logos.js` — cached, best-effort lookup of public school logos from MIAA's directory.

## Scenarios and accuracy

Scores entered in the app are saved in each user's browser `localStorage`; users' scenarios do not affect one another. `MAX` gives a team a 14–0 win. `Predict Week 8` creates deterministic statistical predictions, not predictions from a hosted AI service.

Division 8 starts from the official October 27 ratings. Other divisions and all changes after entering predicted scores are derived from an iterative statewide model. The exact MIAA iteration procedure has not been reproduced to four decimals. The model handles capped point margins and special forfeit adjustments, but **projected cutoff positions are not official**.

## Publishing changes

Changes you make locally will **not automatically update** https://miaa-football-scenarios.vercel.app until the existing Vercel project is connected to this repository for Git-based deploys. Before enabling auto-deploy, verify the Vercel project settings and that its production branch is `main`.

After you modify the source, commit and push with:

```bash
git add .
git commit -m "Describe my changes"
git push origin main
```

The current production website was historically deployed directly to Vercel, independent of this GitHub repository.