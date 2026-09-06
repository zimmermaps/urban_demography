# 01_mapping

Interactive static-boundary city map for the Global Urban Demography Dataset (GUDD).

This folder contains:

- `scripts/build_mapping_assets.py`: preprocesses source CSV + shapefile data into browser-ready assets.
- `web/index.html`: GitHub Pages-compatible map UI.
- `web/app.js`: map interactions, click sidebar, and plotting logic.
- `web/styles.css`: UI styling.
- `web/data/`: generated assets used by the app.

## What the app does

- Renders all cities from a compact 2020 snapshot at global scale and loads static urban boundary polygons (`GHS-UCDB-MTUC-2020-WGS84.shp`) only after users zoom in.
- Maps annual snapshots for seven demographic metrics: population, total/youth/old-age dependency ratios, sex ratio, women of childbearing age, and general fertility rate.
- Maps custom-period absolute or percentage change for any of those metrics.
- Maps the relative contribution of migration and natural change using the same migration palette and positive-growth convention as the paper.
- Displays city labels (`Name`) on the map at zoomed-in levels.
- Opens a left sidebar when a city is clicked.
- Shows:
  - yearly snapshot metrics for that city,
  - an auto-playing year animation with manual play/pause and 0.5×–2× speed controls (2000-2020),
  - a country-level population-versus-dependency plot for all cities in the selected city's country,
  - a dynamic population pyramid,
  - a trend plot of total population and total dependency ratio.
- Includes:
  - instant dark/light OpenFreeMap basemap toggle with provider labels removed (no API key required),
  - responsive Helvetica-styled charts with a highlighted selected-city trajectory,
  - a linked thumbnail for the July 2026 *Nature Cities* cover issue,
  - a concise Research Briefing callout with links to the briefing, paper, dataset, and repository,
  - a paper-and-data panel with copy-ready citations, BibTeX, and direct Harvard Dataverse downloads,
  - download of the country context plot as GIF or PNG, with GIF timing matched to the selected playback speed,
  - download of the full population-pyramid-through-time animation as a speed-matched GIF,
  - download of the city trend plot as PNG,
  - export-only watermarking for downloaded plots.

## Build web assets

Run from repo root:

```bash
python3 02_code/01_mapping/scripts/build_mapping_assets.py
```

Generated output files:

- `02_code/01_mapping/web/data/static_boundaries.geojson`
- `02_code/01_mapping/web/data/city_index.json`
- `02_code/01_mapping/web/data/city_snapshot_2020.bin` (compact first-paint metrics for all cities)
- `02_code/01_mapping/web/data/city_metric_series.bin` (annual metrics and growth-accounting inputs, loaded after first paint or on demand)
- `02_code/01_mapping/web/data/city_age_series.bin` (age–sex cohorts, fetched by byte range for the selected city)

To rebuild only the compact binary assets and city index while reusing the existing boundary GeoJSON:

```bash
python3 02_code/01_mapping/scripts/build_mapping_assets.py --skip-boundaries
```

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
