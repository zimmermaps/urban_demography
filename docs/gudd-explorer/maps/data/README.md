Generated mapping assets are written here by:

```bash
python3 ../../scripts/build_mapping_assets.py
```

Expected files:

- `static_boundaries.geojson`
- `city_index.json`
- `city_snapshot_2020.bin`: compact 2020 metrics for every city, used for the first map paint.
- `city_metric_series.bin`: annual map metrics and growth-accounting inputs per city/year, loaded after first paint or when historical controls are requested.
- `city_age_series.bin`: 36 annual age–sex cohort values per city/year, ordered in city-sized blocks so the app can request only the selected city's bytes.

The detailed boundary GeoJSON is requested only after the map reaches neighborhood-level zoom. GitHub Pages supports byte-range responses for the binary files, so selecting a city does not require downloading the full age–sex series.
