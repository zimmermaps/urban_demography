#!/usr/bin/env python3
"""Build web-ready static mapping assets for the GUDD static boundary dataset."""

from __future__ import annotations

import argparse
import csv
import json
import math
import subprocess
import tempfile
from array import array
from pathlib import Path

YEARS = list(range(2000, 2021))
AGE_COLUMNS = [
    "f_00",
    "f_01",
    "f_05",
    "f_10",
    "f_15",
    "f_20",
    "f_25",
    "f_30",
    "f_35",
    "f_40",
    "f_45",
    "f_50",
    "f_55",
    "f_60",
    "f_65",
    "f_70",
    "f_75",
    "f_80",
    "m_00",
    "m_01",
    "m_05",
    "m_10",
    "m_15",
    "m_20",
    "m_25",
    "m_30",
    "m_35",
    "m_40",
    "m_45",
    "m_50",
    "m_55",
    "m_60",
    "m_65",
    "m_70",
    "m_75",
    "m_80",
]
METRIC_COLUMNS = [
    "total_pop",
    "total_dr",
    "young_dr",
    "old_dr",
    "total_sr",
    "women_cba",
    "general_fr",
]

DARK_COUNTRY_COLORS = [
    "#1ee6ff",
    "#45c7ff",
    "#6f8dff",
    "#a66bff",
    "#00ffd4",
    "#21f3ff",
    "#5fd4ff",
    "#8b7dff",
    "#ff66e6",
    "#3cf1ff",
    "#58ffb1",
    "#7fb2ff",
    "#6dffea",
    "#4fd6ff",
    "#75b6ff",
    "#a98bff",
    "#ff78d0",
    "#00ffc2",
    "#34ffe7",
    "#54c7ff",
    "#7f9eff",
    "#c77aff",
    "#ff8aa5",
    "#62ffe3",
    "#4ee0ff",
    "#7095ff",
    "#9f7dff",
    "#ff6ec7",
    "#43ffd1",
    "#68f0ff",
    "#82b3ff",
    "#b687ff",
    "#ff7eb3",
    "#53ffd9",
    "#5ac9ff",
    "#6fa8ff",
    "#9480ff",
    "#ff83df",
    "#3cfdd2",
    "#5de4ff",
    "#7ca2ff",
    "#ad73ff",
    "#ff93c5",
    "#4fffd6",
    "#62d0ff",
    "#88bbff",
    "#c071ff",
    "#ff82b7",
    "#5dffe8",
    "#6ed8ff",
    "#96a4ff",
    "#d16fff",
    "#ff91d8",
    "#66ffc8",
    "#6ff2ff",
    "#8cb8ff",
    "#af8cff",
    "#ff74cc",
]

LIGHT_COUNTRY_COLORS = [
    "#9ee8ff",
    "#b0e2ff",
    "#c4d2ff",
    "#dcc4ff",
    "#aef8e6",
    "#b7f3ff",
    "#c6eaff",
    "#d7d0ff",
    "#ffc7f2",
    "#c5f6ff",
    "#baf7d8",
    "#d5e4ff",
    "#baf9ef",
    "#b8ecff",
    "#c3dcff",
    "#dccfff",
    "#ffd0ea",
    "#b1ffe4",
    "#bcfff3",
    "#b9e8ff",
    "#cbdbff",
    "#e4ccff",
    "#ffd7e1",
    "#c8fff0",
    "#bdf1ff",
    "#c8d6ff",
    "#dccdff",
    "#ffd4f0",
    "#beffe8",
    "#c9f7ff",
    "#d2e1ff",
    "#e3d0ff",
    "#ffd8e9",
    "#c7ffef",
    "#c4ebff",
    "#cfe0ff",
    "#ddd3ff",
    "#ffd8f4",
    "#c2ffe9",
    "#c8f1ff",
    "#d9e1ff",
    "#e8ccff",
    "#ffdeef",
    "#cbffe5",
    "#cdf9ff",
    "#dbe7ff",
    "#e6d8ff",
    "#ffd5f1",
]


def normalize_city_id(value: str) -> str:
    if value is None:
        return ""
    cleaned = str(value).strip()
    if not cleaned:
        return ""
    try:
        return str(int(float(cleaned)))
    except ValueError:
        return cleaned


def parse_float(value: str) -> float:
    if value is None:
        return math.nan
    cleaned = str(value).strip()
    if not cleaned:
        return math.nan
    try:
        return float(cleaned)
    except ValueError:
        return math.nan


def finite_or_none(value: float | int | str | None) -> float | int | None:
    if isinstance(value, (int, float)) and math.isfinite(float(value)):
        return value
    return None


def parse_year(value: str) -> int | None:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def stable_palette_index(text: str, palette_size: int) -> int:
    value = 0
    for idx, char in enumerate(text):
        value = (value + (idx + 1) * ord(char)) % 2_147_483_647
    return value % palette_size


def scale_hex(hex_color: str, factor: float) -> str:
    """Scale a hex color's RGB channels by factor (less than 1 darkens, greater than 1 brightens)."""
    color = hex_color.lstrip("#")
    if len(color) != 6:
        return hex_color
    r = int(color[0:2], 16)
    g = int(color[2:4], 16)
    b = int(color[4:6], 16)
    r = max(0, min(255, int(round(r * factor))))
    g = max(0, min(255, int(round(g * factor))))
    b = max(0, min(255, int(round(b * factor))))
    return f"#{r:02x}{g:02x}{b:02x}"


def collect_city_metadata(metrics_csv: Path) -> tuple[list[str], dict[str, dict[str, float | str]]]:
    city_ids: set[str] = set()
    city_meta: dict[str, dict[str, float | str]] = {}

    with metrics_csv.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            city_id = normalize_city_id(row.get("ID_UC_G0", ""))
            if not city_id:
                continue
            city_ids.add(city_id)
            year = parse_year(row.get("year", ""))
            row_meta = {
                "name": row.get("Name", "").strip(),
                "country": row.get("Country", "").strip(),
                "continent": row.get("Continent", "").strip(),
                "development": row.get("Development", "").strip(),
                "latitude": finite_or_none(parse_float(row.get("latitude", ""))),
                "longitude": finite_or_none(parse_float(row.get("longitude", ""))),
            }

            existing = city_meta.get(city_id)
            if existing is None or year == 2020:
                city_meta[city_id] = row_meta

    sorted_ids = sorted(city_ids, key=lambda value: int(value))
    return sorted_ids, city_meta


def build_city_series(
    all_csv: Path,
    metrics_csv: Path,
    city_ids: list[str],
) -> tuple[array, dict[str, int], int, int]:
    n_years = len(YEARS)
    values_per_year = len(AGE_COLUMNS) + len(METRIC_COLUMNS)
    city_block_size = n_years * values_per_year
    total_values = len(city_ids) * city_block_size

    series = array("f", [math.nan]) * total_values
    city_to_idx = {city_id: idx for idx, city_id in enumerate(city_ids)}
    year_to_idx = {year: idx for idx, year in enumerate(YEARS)}

    with metrics_csv.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            city_id = normalize_city_id(row.get("ID_UC_G0", ""))
            city_idx = city_to_idx.get(city_id)
            year = parse_year(row.get("year", ""))
            year_idx = year_to_idx.get(year) if year is not None else None
            if city_idx is None or year_idx is None:
                continue

            row_offset = city_idx * city_block_size + year_idx * values_per_year + len(AGE_COLUMNS)
            for metric_idx, metric_name in enumerate(METRIC_COLUMNS):
                series[row_offset + metric_idx] = parse_float(row.get(metric_name, ""))

    with all_csv.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            city_id = normalize_city_id(row.get("ID_UC_G0", ""))
            city_idx = city_to_idx.get(city_id)
            year = parse_year(row.get("year", ""))
            year_idx = year_to_idx.get(year) if year is not None else None
            if city_idx is None or year_idx is None:
                continue

            row_offset = city_idx * city_block_size + year_idx * values_per_year
            for age_idx, age_name in enumerate(AGE_COLUMNS):
                series[row_offset + age_idx] = parse_float(row.get(age_name, ""))

    return series, city_to_idx, values_per_year, city_block_size


def write_city_index(
    output_json: Path,
    city_ids: list[str],
    city_meta: dict[str, dict[str, float | str]],
    city_to_idx: dict[str, int],
    city_block_size: int,
    values_per_year: int,
) -> None:
    cities: list[dict[str, str | float | int | None]] = []
    for city_id in city_ids:
        meta = city_meta.get(city_id, {})
        city_idx = city_to_idx[city_id]
        cities.append(
            {
                "id": city_id,
                "name": meta.get("name", ""),
                "country": meta.get("country", ""),
                "continent": meta.get("continent", ""),
                "development": meta.get("development", ""),
                "latitude": finite_or_none(meta.get("latitude", None)),
                "longitude": finite_or_none(meta.get("longitude", None)),
                "series_index": city_idx * city_block_size,
            }
        )

    payload = {
        "years": YEARS,
        "age_columns": AGE_COLUMNS,
        "metric_columns": METRIC_COLUMNS,
        "values_per_year": values_per_year,
        "cities": cities,
    }

    with output_json.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"), allow_nan=False)


def write_boundaries_geojson(
    boundaries_shp: Path,
    output_geojson: Path,
    city_meta: dict[str, dict[str, float | str]],
) -> None:
    with tempfile.TemporaryDirectory() as tmp_dir:
        raw_geojson = Path(tmp_dir) / "raw_boundaries.geojson"
        cmd = [
            "ogr2ogr",
            "-f",
            "GeoJSON",
            str(raw_geojson),
            str(boundaries_shp),
            "-nlt",
            "PROMOTE_TO_MULTI",
        ]
        subprocess.run(cmd, check=True)

        with raw_geojson.open(encoding="utf-8") as handle:
            geojson = json.load(handle)

    output_features = []
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        city_id = normalize_city_id(props.get("ID_UC_G0", ""))
        if not city_id:
            continue

        meta = city_meta.get(city_id, {})
        country_name = str(meta.get("country", "")).strip()
        dark_idx = stable_palette_index(country_name or city_id, len(DARK_COUNTRY_COLORS))
        light_idx = stable_palette_index(country_name or city_id, len(LIGHT_COUNTRY_COLORS))
        dark_fill = DARK_COUNTRY_COLORS[dark_idx]
        light_fill = LIGHT_COUNTRY_COLORS[light_idx]
        feature["properties"] = {
            "ID_UC_G0": city_id,
            "Name": meta.get("name", ""),
            "Country": country_name,
            "Continent": meta.get("continent", ""),
            "Development": meta.get("development", ""),
            "CountryColor": dark_fill,
            "CountryOutline": scale_hex(dark_fill, 1.26),
            "CountryColorDark": dark_fill,
            "CountryColorLight": dark_fill,
            "CountryOutlineDark": scale_hex(dark_fill, 1.26),
            "CountryOutlineLight": scale_hex(dark_fill, 1.26),
        }
        output_features.append(feature)

    geojson["features"] = output_features
    with output_geojson.open("w", encoding="utf-8") as handle:
        json.dump(geojson, handle, separators=(",", ":"))


def build_assets(all_csv: Path, metrics_csv: Path, boundaries_shp: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    city_ids, city_meta = collect_city_metadata(metrics_csv)
    series, city_to_idx, values_per_year, city_block_size = build_city_series(all_csv, metrics_csv, city_ids)

    series_output = output_dir / "city_series.bin"
    with series_output.open("wb") as handle:
        series.tofile(handle)

    write_city_index(
        output_json=output_dir / "city_index.json",
        city_ids=city_ids,
        city_meta=city_meta,
        city_to_idx=city_to_idx,
        city_block_size=city_block_size,
        values_per_year=values_per_year,
    )

    write_boundaries_geojson(
        boundaries_shp=boundaries_shp,
        output_geojson=output_dir / "static_boundaries.geojson",
        city_meta=city_meta,
    )

    print(f"Cities: {len(city_ids)}")
    print(f"Years per city: {len(YEARS)}")
    print(f"Values per year: {values_per_year}")
    print(f"Binary values: {len(series)}")
    print(f"Wrote: {series_output}")
    print(f"Wrote: {output_dir / 'city_index.json'}")
    print(f"Wrote: {output_dir / 'static_boundaries.geojson'}")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]

    parser = argparse.ArgumentParser(description="Build static web map assets for the GUDD dataset.")
    parser.add_argument(
        "--all-csv",
        type=Path,
        default=repo_root / "01_data/04_final_demographic_data/01_static_boundaries/gudd_all_static_boundaries.csv",
        help="Path to gudd_all_static_boundaries.csv",
    )
    parser.add_argument(
        "--metrics-csv",
        type=Path,
        default=repo_root
        / "01_data/04_final_demographic_data/01_static_boundaries/gudd_annual_metrics_static_boundaries.csv",
        help="Path to gudd_annual_metrics_static_boundaries.csv",
    )
    parser.add_argument(
        "--boundaries-shp",
        type=Path,
        default=repo_root / "01_data/03_ghs_ucdb/01_shapefile/GHS-UCDB-MTUC-2020-WGS84.shp",
        help="Path to static 2020 city boundaries shapefile",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=repo_root / "02_code/01_mapping/web/data",
        help="Output folder for web assets",
    )
    args = parser.parse_args()

    if not args.all_csv.exists():
        raise FileNotFoundError(f"Missing all-csv file: {args.all_csv}")
    if not args.metrics_csv.exists():
        raise FileNotFoundError(f"Missing metrics-csv file: {args.metrics_csv}")
    if not args.boundaries_shp.exists():
        raise FileNotFoundError(f"Missing boundaries shapefile: {args.boundaries_shp}")

    build_assets(
        all_csv=args.all_csv,
        metrics_csv=args.metrics_csv,
        boundaries_shp=args.boundaries_shp,
        output_dir=args.output_dir,
    )


if __name__ == "__main__":
    main()
