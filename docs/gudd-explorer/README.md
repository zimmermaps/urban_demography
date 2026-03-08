# GUDD Explorer (GitHub Pages)

This folder is the consolidated static site root for both web apps.

## Structure

- `docs/index.html`
  - Redirects to `docs/gudd-explorer/index.html`
- `docs/gudd-explorer/index.html`
  - Landing page with links to both apps
- `docs/gudd-explorer/maps/`
  - Map app (`index.html`, `app.js`, `styles.css`, `data/`)
- `docs/gudd-explorer/plots/`
  - Plot app (`index.html`)

## What must be in GitHub Pages

Only web-ready static assets are required for runtime:

- `maps/data/city_index.json`
- `maps/data/city_series.bin`
- `maps/data/static_boundaries.geojson`
- app HTML/CSS/JS files

You do **not** need to host the raw extracted CSV files for the site to run,
as long as `maps/data/*` is already built.

## Build + publish flow

1. Keep large/raw source files in `01_data/` (including `.zip` files).
2. Run the asset build script locally (`02_code/01_mapping/scripts/build_mapping_assets.py`).
3. Copy/update outputs into `docs/gudd-explorer/maps/data/`.
4. Commit and push.
5. In GitHub settings, enable Pages from `main` branch, `/docs` folder.

