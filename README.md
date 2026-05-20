# inventory-pages

Generates a small static site of inventory pages — one HTML page per item — from rows in a Google Sheet, and publishes the result to GitHub Pages.

## How it works

```
Google Sheet  ──┐
                │  (Sheets API, read-only)
                ▼
        generate.js (Node, Mustache)
                │
                ▼
            dist/*.html  ──►  GitHub Pages
```

On every push to `main` (and on a 6-hour cron schedule), the GitHub Actions workflow:

1. Authenticates to Google as the project's build service account via **Workload Identity Federation** — no JSON keys checked in or stored in secrets.
2. Reads the configured sheet via the Sheets API.
3. Renders one HTML page per row from `templates/page.html`, plus an `index.html` listing all items from `templates/index.html`.
4. Copies everything in `static/` (CSS, logo) alongside the generated pages.
5. Deploys the resulting `dist/` directory to GitHub Pages.

Rows with an empty `Name` column are skipped.

## Repo layout

```
generate.js               build script
package.json              npm scripts and deps
templates/page.html       per-item template
templates/index.html      top-level listing template
static/page.css           shared styles
static/ems-logo.svg       logo
.github/workflows/build.yml   build + deploy workflow
```

## Infrastructure (for administrators)

These are the resources another administrator would need to know about. None of the values below are secret.

| Resource | Value |
|---|---|
| GCP project ID | `inventory-496804` |
| GCP project number | `728073987327` |
| Build service account | `inventory-ssg-build-bot@inventory-496804.iam.gserviceaccount.com` |
| Sheets API scope | `https://www.googleapis.com/auth/spreadsheets.readonly` |
| Workload Identity Pool | `github-pool` (`global`) |
| Workload Identity Provider | `github-provider` |
| Provider attribute condition | `assertion.repository=='eugenemakerspace/inventory-pages'` |
| Source sheet tab | `Equipment` |
| GitHub Actions variable | `SHEET_ID` (repo-level Variable, not Secret) |
| Deploy target | GitHub Pages, source = "GitHub Actions" |

The service account has been granted **Viewer** on the source sheet via direct sharing (no project-level Drive permissions). The GitHub repo can impersonate it via the IAM binding `roles/iam.workloadIdentityUser` on the SA, scoped to this repo by the attribute condition above.

## Updating the inventory

Edit the source sheet. The site rebuilds automatically on the next cron tick (every 6 hours), or you can trigger an immediate rebuild from the **Actions** tab → **Build and deploy static pages** → **Run workflow**.

## Local development

One-time setup — authenticate ADC as yourself, impersonating the build SA:

```bash
gcloud auth application-default login \
  --impersonate-service-account=inventory-ssg-build-bot@inventory-496804.iam.gserviceaccount.com
```

This requires `roles/iam.serviceAccountTokenCreator` on the SA for your Google identity. If you don't have it, ask a project admin to grant it.

Then, to regenerate locally:

```bash
SHEET_ID=<sheet id> npm run generate
```

Output lands in `dist/`. Open `dist/index.html` in a browser to verify.

The ADC token expires periodically (Google's reauth policy). If you see `invalid_grant` / `invalid_rapt`, re-run the `application-default login` command above.

## Notes

- The Google Sheet ID is not embedded in this repo — it lives only in the GitHub repository variable `SHEET_ID` and in whatever local environment you run the script in. Get the value from a current admin or from the repo's Actions variables page.
- Action versions in `build.yml` are pinned to major-version tags so non-breaking updates flow automatically. Bump them deliberately when GitHub deprecates a Node runtime.
