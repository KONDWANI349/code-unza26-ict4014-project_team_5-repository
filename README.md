# UNZA Clinic Hypertension Data Quality Dashboard

A small browser-based tool for reviewing completeness and basic consistency in a CSV export of hypertension visit data.

## Run it

Open `index.html` in a modern browser. No installation, server, or build step is required. Choose a CSV export or load the included synthetic example.

## Use it

1. Load a CSV with a header row and at least one data row.
2. Check the suggested column mappings and adjust them as needed.
3. Select which mapped fields count as required for the review.
4. Review field coverage, missing required values, and basic date/numeric parsing issues.

The dashboard does not upload or persist data. Use only exports approved for this purpose, following clinic policy for de-identification and handling. The example records are synthetic.

The default required fields are patient identifier, visit date, systolic blood pressure, and diastolic blood pressure. These can be changed in the interface. Diagnosis/status, medication/treatment, and follow-up date are included as additional review fields.

## Deploy to GitHub Pages

Before the first deployment, a repository administrator must enable Pages:

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push the workflow and site files to the `main` branch, or run **Deploy static site to GitHub Pages** from the **Actions** tab.

The workflow uses the repository's standard `GITHUB_TOKEN` permissions to upload and deploy the site. It does not attempt to change repository Pages settings, which require separate administrator authorization.

## Scope

This is a data-quality aid, not a clinical decision-support system. It does not apply clinical thresholds, assess treatment appropriateness, or replace source verification and local documentation standards.
