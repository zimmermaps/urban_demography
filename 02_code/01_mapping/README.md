# 01_mapping

Interactive static-boundary city map for the Global Urban Demography Dataset (GUDD).

This folder contains:

- `scripts/build_mapping_assets.py`: preprocesses source CSV + shapefile data into browser-ready assets.
- `web/index.html`: GitHub Pages-compatible map UI.
- `web/app.js`: map interactions, click sidebar, and plotting logic.
- `web/styles.css`: UI styling.
- `web/data/`: generated assets used by the app.

## What the app does

- Renders all static urban boundary polygons (`GHS-UCDB-MTUC-2020-WGS84.shp`).
- Displays city labels (`Name`) on the map at zoomed-in levels.
- Opens a left sidebar when a city is clicked.
- Shows:
  - yearly snapshot metrics for that city,
  - a year slider + play animation control (2000-2020),
  - a dynamic population pyramid,
  - a trend plot of total population and total dependency ratio.
- Includes:
  - dark/light Carto basemap toggle,
  - download of full population-pyramid-through-time animation as GIF.

## Build web assets

Run from repo root:

```bash
python3 02_code/01_mapping/scripts/build_mapping_assets.py
```

Generated output files:

- `02_code/01_mapping/web/data/static_boundaries.geojson`
- `02_code/01_mapping/web/data/city_index.json`
- `02_code/01_mapping/web/data/city_series.bin`

## Run locally

Use any local static web server from `02_code/01_mapping/web`:

```bash
cd 02_code/01_mapping/web
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

This app is static and can be deployed directly. Typical options:

- publish `02_code/01_mapping/web` as the Pages root (or copy it to `docs/`), and
- ensure the generated `web/data/*` assets are present in the published branch.
