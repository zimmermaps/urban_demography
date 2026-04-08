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

COUNTRY_RAMP_STOPS = [
    "#34245d",
    "#2d3f85",
    "#225fa2",
    "#14809f",
    "#0f9d98",
    "#84cfd2",
    "#f2d8c8",
    "#ffb277",
    "#ff873d",
    "#ff5a1f",
    "#d72d2e",
    "#7c1f72",
]
COUNTRY_PALETTE_SIZE = 72
UNKNOWN_COUNTRY_KEYS = {"", "unknown", "none", "nan"}
UNKNOWN_COUNTRY_DARK_FILL = "#7f8994"
UNKNOWN_COUNTRY_LIGHT_FILL = "#cfd5dc"
SPECIAL_COUNTRY_RAMP_POSITIONS = {
    "china": 0.18,
    "people's republic of china": 0.18,
    "india": 0.78,
}


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


def normalize_country_key(value: str | None) -> str:
    return " ".join(str(value or "").strip().lower().split())


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


def blend_hex(hex_a: str, hex_b: str, weight: float) -> str:
    """Blend hex_a toward hex_b by weight in [0, 1]."""
    color_a = hex_a.lstrip("#")
    color_b = hex_b.lstrip("#")
    if len(color_a) != 6 or len(color_b) != 6:
        return hex_a
    weight = max(0.0, min(1.0, weight))
    r = int(round(int(color_a[0:2], 16) * (1 - weight) + int(color_b[0:2], 16) * weight))
    g = int(round(int(color_a[2:4], 16) * (1 - weight) + int(color_b[2:4], 16) * weight))
    b = int(round(int(color_a[4:6], 16) * (1 - weight) + int(color_b[4:6], 16) * weight))
    return f"#{r:02x}{g:02x}{b:02x}"


def interpolate_hex(hex_a: str, hex_b: str, t: float) -> str:
    return blend_hex(hex_a, hex_b, t)


def sample_color_ramp(stops: list[str], position: float) -> str:
    if not stops:
        return "#888888"
    if len(stops) == 1:
        return stops[0]

    safe_position = max(0.0, min(1.0, position))
    scaled = safe_position * (len(stops) - 1)
    lower_idx = int(math.floor(scaled))
    upper_idx = min(len(stops) - 1, lower_idx + 1)
    t = scaled - lower_idx
    return interpolate_hex(stops[lower_idx], stops[upper_idx], t)


def build_country_palettes(size: int) -> tuple[list[str], list[str]]:
    dark_palette: list[str] = []
    light_palette: list[str] = []
    golden_ratio_conjugate = 0.6180339887498949

    for idx in range(size):
        position = (idx * golden_ratio_conjugate) % 1.0
        dark_fill = sample_color_ramp(COUNTRY_RAMP_STOPS, position)
        dark_palette.append(dark_fill)
        light_palette.append(blend_hex(dark_fill, "#fff7ef", 0.46))

    return dark_palette, light_palette


def get_country_palette_colors(
    country_name: str,
    city_id: str,
    dark_palette: list[str],
    light_palette: list[str],
) -> tuple[str, str, str, str]:
    country_key = normalize_country_key(country_name)

    if country_key in UNKNOWN_COUNTRY_KEYS:
        dark_fill = UNKNOWN_COUNTRY_DARK_FILL
        light_fill = UNKNOWN_COUNTRY_LIGHT_FILL
    else:
        special_position = SPECIAL_COUNTRY_RAMP_POSITIONS.get(country_key)
        if special_position is not None:
            dark_fill = sample_color_ramp(COUNTRY_RAMP_STOPS, special_position)
            light_fill = blend_hex(dark_fill, "#fff7ef", 0.46)
        else:
            palette_key = country_name or city_id
            dark_idx = stable_palette_index(palette_key, len(dark_palette))
            light_idx = stable_palette_index(palette_key, len(light_palette))
            dark_fill = dark_palette[dark_idx]
            light_fill = light_palette[light_idx]

    dark_outline = blend_hex(dark_fill, "#f4efff", 0.34)
    light_outline = blend_hex(light_fill, "#2d3f53", 0.34)
    return dark_fill, light_fill, dark_outline, light_outline


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
    dark_country_colors, light_country_colors = build_country_palettes(COUNTRY_PALETTE_SIZE)

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
        dark_fill, light_fill, dark_outline, light_outline = get_country_palette_colors(
            country_name,
            city_id,
            dark_country_colors,
            light_country_colors,
        )
        feature["properties"] = {
            "ID_UC_G0": city_id,
            "Name": meta.get("name", ""),
            "Country": country_name,
            "Continent": meta.get("continent", ""),
            "Development": meta.get("development", ""),
            "CountryColor": dark_fill,
            "CountryOutline": dark_outline,
            "CountryColorDark": dark_fill,
            "CountryColorLight": light_fill,
            "CountryOutlineDark": dark_outline,
            "CountryOutlineLight": light_outline,
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
