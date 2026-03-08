const DATA_DIR_CANDIDATES = ["./data", "../data", "./02_code/01_mapping/web/data", "/02_code/01_mapping/web/data"];
const PLAY_INTERVAL_MS = 520;
const GIF_FRAME_INTERVAL_SECONDS = 0.42;
const PLOT_FONT_FAMILY = "IBM Plex Mono, monospace";
const PNG_EXPORT_SCALE = 3;

const AGE_BIN_LABELS = [
  "0",
  "1-4",
  "5-9",
  "10-14",
  "15-19",
  "20-24",
  "25-29",
  "30-34",
  "35-39",
  "40-44",
  "45-49",
  "50-54",
  "55-59",
  "60-64",
  "65-69",
  "70-74",
  "75-79",
  "80+",
];

const METRIC_CARD_CONFIG = [
  { key: "total_pop", label: "Total Population", formatter: formatPopulation },
  { key: "total_dr", label: "Total Dependency Ratio", formatter: (v) => formatDecimal(v, 3) },
  { key: "young_dr", label: "Youth Dependency Ratio", formatter: (v) => formatDecimal(v, 3) },
  { key: "old_dr", label: "Old-Age Dependency Ratio", formatter: (v) => formatDecimal(v, 3) },
  { key: "total_sr", label: "Sex Ratio", formatter: (v) => formatDecimal(v, 3) },
  { key: "women_cba", label: "Women CBA", formatter: formatPopulation },
  { key: "general_fr", label: "General Fertility Rate", formatter: (v) => formatDecimal(v, 2) },
];

const MAP_TILES = {
  light: [
    "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  ],
  dark: [
    "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  ],
};

const state = {
  map: null,
  years: [],
  ageColumns: [],
  metricColumns: [],
  valuesPerYear: 0,
  cityById: new Map(),
  cityAxisById: new Map(),
  series: null,
  seriesPromise: null,
  selectedCity: null,
  selectedYearIdx: 0,
  animationTimer: null,
  dataDir: null,
  basemapTheme: "dark",
  gifReady: false,
};

const sidebarEl = document.getElementById("sidebar");
const closeSidebarButton = document.getElementById("closeSidebar");
const cityTitleEl = document.getElementById("cityTitle");
const cityMetaRowsEl = document.getElementById("cityMetaRows");
const statusTextEl = document.getElementById("statusText");
const yearSliderEl = document.getElementById("yearSlider");
const yearValueEl = document.getElementById("yearValue");
const playPauseButtonEl = document.getElementById("playPauseButton");
const downloadGifButtonEl = document.getElementById("downloadGifButton");
const downloadTrendPngButtonEl = document.getElementById("downloadTrendPngButton");
const basemapToggleButtonEl = document.getElementById("basemapToggle");
const metricCardsEl = document.getElementById("metricCards");
const pyramidPlotEl = document.getElementById("pyramidPlot");
const trendPlotEl = document.getElementById("trendPlot");

init().catch((error) => {
  const message = error && error.message ? error.message : String(error);
  statusTextEl.textContent = `Failed to initialize map app: ${message}`;
  // eslint-disable-next-line no-console
  console.error(error);
});

async function init() {
  if (typeof maplibregl === "undefined") {
    throw new Error("MapLibre script failed to load (check internet/CDN access).");
  }
  if (typeof Plotly === "undefined") {
    throw new Error("Plotly script failed to load (check internet/CDN access).");
  }

  const cityIndex = await fetchCityIndex();
  const boundaries = await fetchBoundaries();

  state.years = cityIndex.years;
  state.ageColumns = cityIndex.age_columns;
  state.metricColumns = cityIndex.metric_columns;
  state.valuesPerYear = cityIndex.values_per_year;
  state.selectedYearIdx = state.years.length - 1;

  for (const city of cityIndex.cities) {
    state.cityById.set(String(city.id), city);
  }

  initMap(boundaries);
  bindUiEvents();
  setControlsEnabled(false);
  prepareGifSupport();
}

function bindUiEvents() {
  yearSliderEl.addEventListener("input", () => {
    if (!state.selectedCity) {
      return;
    }
    stopAnimation();
    state.selectedYearIdx = Number(yearSliderEl.value);
    renderSelectedYear();
  });

  playPauseButtonEl.addEventListener("click", () => {
    if (!state.selectedCity) {
      return;
    }
    if (state.animationTimer) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  downloadGifButtonEl.addEventListener("click", () => {
    if (!state.selectedCity) {
      return;
    }
    downloadPyramidGif();
  });

  downloadTrendPngButtonEl.addEventListener("click", () => {
    if (!state.selectedCity) {
      return;
    }
    downloadTrendPng();
  });

  basemapToggleButtonEl.addEventListener("click", () => {
    if (!state.map) {
      return;
    }
    state.basemapTheme = state.basemapTheme === "dark" ? "light" : "dark";
    applyBasemapTheme();
    updateBasemapToggleButton();
  });

  closeSidebarButton.addEventListener("click", () => {
    stopAnimation();
    sidebarEl.classList.remove("open");
  });
}

function initMap(boundaries) {
  state.map = new maplibregl.Map({
    container: "map",
    style: createMapStyle(state.basemapTheme),
    center: [12, 20],
    zoom: 1.6,
    minZoom: 1.2,
    maxZoom: 14.5,
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  state.map.on("load", () => {
    addCityLayers(boundaries);
    applyBasemapTheme();
    updateBasemapToggleButton();
    statusTextEl.textContent = "Map ready. Click a city polygon.";
  });
}

function createMapStyle(theme) {
  const showDark = theme === "dark";
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      carto_light: {
        type: "raster",
        tiles: MAP_TILES.light,
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
      carto_dark: {
        type: "raster",
        tiles: MAP_TILES.dark,
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
    },
    layers: [
      {
        id: "basemap-light",
        type: "raster",
        source: "carto_light",
        layout: { visibility: showDark ? "none" : "visible" },
      },
      {
        id: "basemap-dark",
        type: "raster",
        source: "carto_dark",
        layout: { visibility: showDark ? "visible" : "none" },
      },
    ],
  };
}

function addCityLayers(boundaries) {
  state.map.addSource("cities", {
    type: "geojson",
    data: boundaries,
    tolerance: 0,
    maxzoom: 22,
  });

  state.map.addLayer({
    id: "city-fill",
    type: "fill",
    source: "cities",
    paint: {
      "fill-color": ["get", "CountryColor"],
      "fill-opacity": 0.48,
    },
  });

  state.map.addLayer({
    id: "city-outline",
    type: "line",
    source: "cities",
    paint: {
      "line-color": ["get", "CountryOutline"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 1.2, 1.2, 4, 1.8, 7, 2.4, 10, 3],
      "line-opacity": 1,
    },
  });

  state.map.addLayer({
    id: "city-selected",
    type: "line",
    source: "cities",
    filter: ["==", ["get", "ID_UC_G0"], ""],
    paint: {
      "line-color": "#ffd166",
      "line-width": 2.4,
      "line-opacity": 1,
    },
  });

  state.map.addLayer({
    id: "city-labels",
    type: "symbol",
    source: "cities",
    minzoom: 3.6,
    layout: {
      "text-field": ["get", "Name"],
      "text-font": ["IBM Plex Mono Regular", "Noto Sans Mono Regular", "Open Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 3.6, 8.5, 6, 10.3, 8, 12.2],
      "text-max-width": 9,
    },
    paint: {
      "text-color": "#ebf3ff",
      "text-halo-color": "rgba(7,11,19,0.82)",
      "text-halo-width": 1.2,
    },
  });

  state.map.on("mouseenter", "city-fill", () => {
    state.map.getCanvas().style.cursor = "pointer";
  });

  state.map.on("mouseleave", "city-fill", () => {
    state.map.getCanvas().style.cursor = "";
  });

  state.map.on("click", "city-fill", async (event) => {
    const feature = event.features && event.features[0];
    if (!feature) {
      return;
    }

    const cityId = normalizeCityId(feature.properties.ID_UC_G0);
    const city = state.cityById.get(cityId);
    if (!city) {
      statusTextEl.textContent = `No city series found for ID ${cityId}.`;
      return;
    }

    state.selectedCity = city;
    state.selectedYearIdx = state.years.length - 1;
    sidebarEl.classList.add("open");
    setControlsEnabled(true);
    updateMapSelection();
    renderCityHeader();
    statusTextEl.textContent = "Loading city time series...";

    try {
      await ensureSeriesLoaded();
      getCityAxisLimits(city);
      statusTextEl.textContent = `Selected ${city.name || "Unknown City"} (${city.country || "Unknown Country"})`;
      renderSelectedCity();
    } catch (error) {
      statusTextEl.textContent = "Failed to load city time series binary.";
      // eslint-disable-next-line no-console
      console.error(error);
    }
  });
}

function applyBasemapTheme() {
  if (!state.map || !state.map.getLayer("basemap-dark")) {
    return;
  }

  const isDark = state.basemapTheme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  document.body.classList.toggle("theme-light", !isDark);

  state.map.setLayoutProperty("basemap-dark", "visibility", isDark ? "visible" : "none");
  state.map.setLayoutProperty("basemap-light", "visibility", isDark ? "none" : "visible");

  if (state.map.getLayer("city-fill")) {
    state.map.setPaintProperty("city-fill", "fill-color", ["get", "CountryColor"]);
    state.map.setPaintProperty("city-fill", "fill-opacity", 0.48);
  }
  if (state.map.getLayer("city-outline")) {
    state.map.setPaintProperty("city-outline", "line-color", ["get", "CountryOutline"]);
    state.map.setPaintProperty("city-outline", "line-opacity", 1);
  }
  if (state.map.getLayer("city-labels")) {
    state.map.setPaintProperty("city-labels", "text-color", isDark ? "#ecf5ff" : "#18283a");
    state.map.setPaintProperty(
      "city-labels",
      "text-halo-color",
      isDark ? "rgba(7,11,19,0.84)" : "rgba(249,246,239,0.97)"
    );
  }
  if (state.map.getLayer("city-selected")) {
    state.map.setPaintProperty("city-selected", "line-color", isDark ? "#ffd166" : "#ff5a2a");
  }

  if (state.selectedCity && state.series) {
    renderSelectedYear();
  }
}

function updateBasemapToggleButton() {
  const isDark = state.basemapTheme === "dark";
  basemapToggleButtonEl.textContent = isDark ? "🌙" : "☀️";
  basemapToggleButtonEl.title = isDark ? "Switch to light basemap" : "Switch to dark basemap";
}

function setControlsEnabled(enabled) {
  yearSliderEl.disabled = !enabled;
  playPauseButtonEl.disabled = !enabled;
  yearSliderEl.max = String(state.years.length - 1);
  downloadGifButtonEl.disabled = !enabled || !state.gifReady;
  downloadTrendPngButtonEl.disabled = !enabled;
}

async function prepareGifSupport() {
  try {
    await ensureGifshotLoaded();
    state.gifReady = true;
    downloadGifButtonEl.title = "Download population pyramid animation as a GIF.";
  } catch (error) {
    state.gifReady = false;
    downloadGifButtonEl.title = "GIF library failed to load.";
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    setControlsEnabled(Boolean(state.selectedCity));
  }
}

async function ensureGifshotLoaded() {
  if (typeof gifshot !== "undefined") {
    return;
  }

  const candidates = [
    "https://cdn.jsdelivr.net/npm/gifshot@0.4.5/build/gifshot.min.js",
    "https://cdn.jsdelivr.net/npm/gifshot@0.4.5/dist/gifshot.min.js",
    "https://unpkg.com/gifshot@0.4.5/build/gifshot.min.js",
    "https://unpkg.com/gifshot@0.4.5/dist/gifshot.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.4.5/gifshot.min.js",
  ];

  for (const src of candidates) {
    try {
      await loadScriptOnce(src);
      if (typeof gifshot !== "undefined") {
        return;
      }
    } catch (_) {
      // try the next CDN fallback
    }
  }

  throw new Error("Could not load gifshot from CDN fallbacks.");
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-gifshot-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Script load failed: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.gifshotSrc = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Script load failed: ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

function updateMapSelection() {
  if (!state.map || !state.map.getLayer("city-selected")) {
    return;
  }
  const selectedId = state.selectedCity ? String(state.selectedCity.id) : "";
  state.map.setFilter("city-selected", ["==", ["get", "ID_UC_G0"], selectedId]);
}

async function fetchCityIndex() {
  for (const candidate of DATA_DIR_CANDIDATES) {
    try {
      const response = await fetch(`${candidate}/city_index.json`);
      if (!response.ok) {
        continue;
      }
      state.dataDir = candidate;
      return response.json();
    } catch (_) {
      // keep trying candidate paths
    }
  }
  throw new Error("Could not find city_index.json in expected data paths.");
}

async function fetchBoundaries() {
  if (!state.dataDir) {
    throw new Error("Data directory not resolved before loading boundaries.");
  }
  const response = await fetch(`${state.dataDir}/static_boundaries.geojson`);
  if (!response.ok) {
    throw new Error(`Failed to fetch boundaries from ${state.dataDir}: HTTP ${response.status}`);
  }
  return response.json();
}

async function ensureSeriesLoaded() {
  if (state.series) {
    return state.series;
  }

  if (!state.seriesPromise) {
    if (!state.dataDir) {
      throw new Error("Data directory not resolved before loading binary series.");
    }
    state.seriesPromise = fetch(`${state.dataDir}/city_series.bin`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch binary series from ${state.dataDir}: HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        state.series = new Float32Array(buffer);
        return state.series;
      });
  }

  return state.seriesPromise;
}

function renderSelectedCity() {
  stopAnimation();
  yearSliderEl.value = String(state.selectedYearIdx);
  renderSelectedYear();
}

function renderCityHeader() {
  if (!state.selectedCity) {
    return;
  }

  cityTitleEl.textContent = state.selectedCity.name || "Unknown City";
  cityMetaRowsEl.innerHTML = `
    <p><span>Country:</span> ${escapeHtml(state.selectedCity.country || "Unknown")}</p>
    <p><span>Region:</span> ${escapeHtml(state.selectedCity.continent || "Unknown")}</p>
    <p><span>Income status:</span> ${escapeHtml(state.selectedCity.development || "Unknown")}</p>
  `;
}

function renderSelectedYear() {
  if (!state.selectedCity || !state.series) {
    return;
  }

  const year = state.years[state.selectedYearIdx];
  yearValueEl.textContent = String(year);

  const yearData = getCityYearData(state.selectedCity, state.selectedYearIdx);
  const axisLimits = getCityAxisLimits(state.selectedCity);

  renderMetricCards(yearData.metrics);
  renderPyramidPlot(yearData.ages, year, axisLimits);
  renderTrendPlot(year, axisLimits);
}

function getCityYearData(city, yearIndex) {
  const ageCount = state.ageColumns.length;
  const start = city.series_index + yearIndex * state.valuesPerYear;
  const row = state.series.subarray(start, start + state.valuesPerYear);

  const ages = Array.from(row.subarray(0, ageCount), (value) => sanitizeNumber(value));
  const metrics = {};
  for (let i = 0; i < state.metricColumns.length; i += 1) {
    const metricName = state.metricColumns[i];
    metrics[metricName] = sanitizeNumber(row[ageCount + i]);
  }
  return { ages, metrics };
}

function getMetricSeries(city, metricKey) {
  const metricOffset = state.metricColumns.indexOf(metricKey);
  if (metricOffset < 0) {
    return [];
  }

  const ageCount = state.ageColumns.length;
  const series = [];
  for (let i = 0; i < state.years.length; i += 1) {
    const index = city.series_index + i * state.valuesPerYear + ageCount + metricOffset;
    series.push(sanitizeNumber(state.series[index]));
  }
  return series;
}

function getCityAxisLimits(city) {
  const cached = state.cityAxisById.get(String(city.id));
  if (cached) {
    return cached;
  }

  let pyramidMax = 1;
  const popValues = [];
  const drValues = [];

  for (let yearIdx = 0; yearIdx < state.years.length; yearIdx += 1) {
    const yearData = getCityYearData(city, yearIdx);
    for (let i = 0; i < 36; i += 1) {
      const value = yearData.ages[i];
      if (value !== null && value > pyramidMax) {
        pyramidMax = value;
      }
    }
    const totalPop = yearData.metrics.total_pop;
    const totalDr = yearData.metrics.total_dr;
    if (totalPop !== null) {
      popValues.push(totalPop);
    }
    if (totalDr !== null) {
      drValues.push(totalDr);
    }
  }

  const pyramidRawMax = Math.max(1, pyramidMax * 1.05);
  const pyramidHalfStep = Math.max(1, computeNiceStep(pyramidRawMax / 2));
  const pyramidUpper = pyramidHalfStep * 2;
  const pyramidTicks = [-pyramidUpper, -pyramidHalfStep, 0, pyramidHalfStep, pyramidUpper];
  const initialPopTicks = buildZeroBasedTicks(Math.max(...popValues, 1));
  const popUpper = Math.max(1, initialPopTicks[initialPopTicks.length - 1]);
  const popTicks = buildZeroBasedTicks(popUpper);

  const drMin = Math.min(...drValues, 0);
  const drMax = Math.max(...drValues, 1);
  const drPad = Math.max(0.03, (drMax - drMin) * 0.08);
  const drRangeMin = Math.max(0, drMin - drPad);
  const drRangeMax = drMax + drPad;

  const limits = {
    pyramidMax: pyramidUpper,
    pyramidTicks,
    popTicks,
    popUpper,
    drRange: [drRangeMin, drRangeMax],
  };
  state.cityAxisById.set(String(city.id), limits);
  return limits;
}

function renderMetricCards(metrics) {
  metricCardsEl.innerHTML = METRIC_CARD_CONFIG.map((config) => {
    const value = metrics[config.key];
    const formatted = config.formatter(value);
    return `<article class="metric-card">
      <p class="metric-label">${config.label}</p>
      <p class="metric-value">${formatted}</p>
    </article>`;
  }).join("");
}

function renderPyramidPlot(ages, year, axisLimits) {
  const figure = buildPyramidFigure(ages, year, axisLimits, false);
  Plotly.react("pyramidPlot", figure.traces, figure.layout, figure.config);
}

function buildPyramidFigure(ages, year, axisLimits, forGif = false) {
  const plotTheme = getPlotTheme();
  const female = ages.slice(0, 18).map((value) => (value === null ? 0 : value));
  const male = ages.slice(18, 36).map((value) => (value === null ? 0 : value));
  const maleNegative = male.map((value) => -value);

  const maxAxis = axisLimits.pyramidMax;
  const tickvals = axisLimits.pyramidTicks;
  const ticktext = tickvals.map((value) => formatCompactSigned(value));

  const traces = [
    {
      x: maleNegative,
      y: AGE_BIN_LABELS,
      type: "bar",
      orientation: "h",
      marker: { color: "#4f99d8" },
      name: "Male",
      hovertemplate: "Male %{y}: %{customdata:,.0f}<extra></extra>",
      customdata: male,
    },
    {
      x: female,
      y: AGE_BIN_LABELS,
      type: "bar",
      orientation: "h",
      marker: { color: "#f08b56" },
      name: "Female",
      hovertemplate: "Female %{y}: %{x:,.0f}<extra></extra>",
    },
  ];

  const layout = {
    margin: forGif ? { l: 90, r: 50, t: 126, b: 66 } : { l: 90, r: 50, t: 126, b: 66 },
    paper_bgcolor: plotTheme.paperBg,
    plot_bgcolor: plotTheme.plotBg,
    font: { family: PLOT_FONT_FAMILY, size: 11, color: plotTheme.text },
    barmode: "relative",
    title: {
      text: `${state.selectedCity ? state.selectedCity.name : "City"} · ${year}`,
      font: { family: PLOT_FONT_FAMILY, size: 13 },
      x: 0.5,
      xanchor: "center",
      y: 1.31,
      yanchor: "bottom",
      pad: { t: 0, b: 0 },
    },
    xaxis: {
      title: "Population",
      range: [-maxAxis, maxAxis],
      tickvals,
      ticktext,
      showline: true,
      linecolor: plotTheme.axisLine,
      mirror: true,
      ticks: "outside",
      showgrid: true,
      gridcolor: plotTheme.grid,
      zeroline: true,
      zerolinecolor: plotTheme.zeroline,
      zerolinewidth: 1.8,
    },
    yaxis: {
      title: "Age Group",
      automargin: true,
      categoryorder: "array",
      categoryarray: AGE_BIN_LABELS,
      tickmode: "array",
      tickvals: AGE_BIN_LABELS,
      ticktext: AGE_BIN_LABELS,
      showline: true,
      linecolor: plotTheme.axisLine,
      ticks: "outside",
      showgrid: true,
      gridcolor: plotTheme.gridSoft,
    },
    showlegend: true,
    legend: {
      orientation: "h",
      y: 1.04,
      yanchor: "bottom",
      x: 0.5,
      xanchor: "center",
      bgcolor: plotTheme.legendBg,
      bordercolor: plotTheme.legendBorder,
      borderwidth: 1,
      font: { size: 11 },
    },
    hoverlabel: {
      font: { family: PLOT_FONT_FAMILY, size: 11, color: plotTheme.hoverText },
      bgcolor: plotTheme.hoverBg,
      bordercolor: plotTheme.hoverBorder,
    },
  };

  const config = {
    displayModeBar: false,
    responsive: !forGif,
    staticPlot: Boolean(forGif),
  };

  return { traces, layout, config };
}

function renderTrendPlot(selectedYear, axisLimits) {
  const plotTheme = getPlotTheme();
  const totalPop = getMetricSeries(state.selectedCity, "total_pop");
  const totalDr = getMetricSeries(state.selectedCity, "total_dr");

  const traces = [
    {
      x: state.years,
      y: totalPop,
      type: "scatter",
      mode: "lines+markers",
      name: "Total Population",
      line: { color: "#0f928c", width: 2.4 },
      marker: { size: 4.6 },
      yaxis: "y",
      hovertemplate: "Year %{x}: %{y:,.0f}<extra></extra>",
    },
    {
      x: state.years,
      y: totalDr,
      type: "scatter",
      mode: "lines+markers",
      name: "Total Dependency Ratio",
      line: { color: "#e36a3f", width: 2.4 },
      marker: { size: 4.6 },
      yaxis: "y2",
      hovertemplate: "Year %{x}: %{y:.3f}<extra></extra>",
    },
  ];

  const layout = {
    margin: { l: 94, r: 92, t: 142, b: 58 },
    paper_bgcolor: plotTheme.paperBg,
    plot_bgcolor: plotTheme.plotBg,
    font: { family: PLOT_FONT_FAMILY, size: 11, color: plotTheme.text },
    title: {
      text: `${state.selectedCity ? state.selectedCity.name : "City"}`,
      font: { family: PLOT_FONT_FAMILY, size: 13 },
      x: 0.5,
      xanchor: "center",
      y: 1.42,
      yanchor: "bottom",
      pad: { t: 0, b: 0 },
    },
    xaxis: {
      title: "Year",
      tickvals: state.years.filter(
        (year) => year % 4 === 0 || year === state.years[0] || year === state.years[state.years.length - 1]
      ),
      showline: true,
      linecolor: plotTheme.axisLine,
      ticks: "outside",
      showgrid: true,
      gridcolor: plotTheme.grid,
    },
    yaxis: {
      title: "Total Population",
      range: [0, axisLimits.popUpper],
      tickvals: axisLimits.popTicks,
      ticktext: axisLimits.popTicks.map((value) => formatCompactUpper(value)),
      showline: true,
      linecolor: plotTheme.axisLine,
      ticks: "outside",
      showgrid: true,
      gridcolor: plotTheme.grid,
    },
    yaxis2: {
      title: "Dependency Ratio",
      range: axisLimits.drRange,
      overlaying: "y",
      side: "right",
      tickformat: ".2f",
      showline: true,
      linecolor: plotTheme.axisLine,
      ticks: "outside",
      showgrid: false,
    },
    showlegend: true,
    legend: {
      orientation: "h",
      y: 1.045,
      yanchor: "bottom",
      x: 0.5,
      xanchor: "center",
      bgcolor: plotTheme.legendBg,
      bordercolor: plotTheme.legendBorder,
      borderwidth: 1,
      font: { size: 11 },
    },
    hoverlabel: {
      font: { family: PLOT_FONT_FAMILY, size: 11, color: plotTheme.hoverText },
      bgcolor: plotTheme.hoverBg,
      bordercolor: plotTheme.hoverBorder,
    },
    shapes: [
      {
        type: "line",
        x0: selectedYear,
        x1: selectedYear,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: { color: plotTheme.verticalMarker, width: 1.3, dash: "dot" },
      },
    ],
  };

  return Plotly.react("trendPlot", traces, layout, {
    displayModeBar: false,
    responsive: true,
  });
}

function startAnimation() {
  if (state.animationTimer) {
    return;
  }
  playPauseButtonEl.textContent = "Pause";
  state.animationTimer = window.setInterval(() => {
    state.selectedYearIdx = (state.selectedYearIdx + 1) % state.years.length;
    yearSliderEl.value = String(state.selectedYearIdx);
    renderSelectedYear();
  }, PLAY_INTERVAL_MS);
}

function stopAnimation() {
  if (state.animationTimer) {
    window.clearInterval(state.animationTimer);
    state.animationTimer = null;
  }
  playPauseButtonEl.textContent = "Play";
}

async function downloadPyramidGif() {
  if (!state.selectedCity || !state.series) {
    return;
  }
  if (!state.gifReady) {
    await prepareGifSupport();
  }
  if (!state.gifReady) {
    statusTextEl.textContent = "GIF export unavailable: gifshot library could not be loaded.";
    return;
  }

  stopAnimation();
  downloadGifButtonEl.disabled = true;
  statusTextEl.textContent = "Rendering pyramid frames for GIF...";

  const axisLimits = getCityAxisLimits(state.selectedCity);
  const exportSize = getElementExportSize(pyramidPlotEl, 760, 540);
  const frameWidth = exportSize.width;
  const frameHeight = exportSize.height;
  const tempPlot = document.createElement("div");
  tempPlot.style.position = "fixed";
  tempPlot.style.left = "-12000px";
  tempPlot.style.top = "0";
  tempPlot.style.width = `${frameWidth}px`;
  tempPlot.style.height = `${frameHeight}px`;
  document.body.appendChild(tempPlot);

  try {
    const images = [];
    for (let yearIdx = 0; yearIdx < state.years.length; yearIdx += 1) {
      const year = state.years[yearIdx];
      const yearData = getCityYearData(state.selectedCity, yearIdx);
      const figure = buildPyramidFigure(yearData.ages, year, axisLimits, true);
      await Plotly.react(tempPlot, figure.traces, figure.layout, figure.config);
      const image = await Plotly.toImage(tempPlot, {
        format: "png",
        width: frameWidth,
        height: frameHeight,
        scale: 1,
      });
      images.push(image);
    }

    statusTextEl.textContent = "Encoding GIF...";
    const gifDataUri = await createGifFromImages(images, frameWidth, frameHeight, GIF_FRAME_INTERVAL_SECONDS);
    const fileBase = slugify(state.selectedCity.name || `city_${state.selectedCity.id}`);

    const link = document.createElement("a");
    link.href = gifDataUri;
    link.download = `${fileBase}_population_pyramid_2000_2020.gif`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    statusTextEl.textContent = "GIF downloaded.";
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    statusTextEl.textContent = `GIF export failed: ${message}`;
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    try {
      Plotly.purge(tempPlot);
    } catch (_) {
      // ignore purge errors
    }
    tempPlot.remove();
    setControlsEnabled(Boolean(state.selectedCity));
  }
}

async function downloadTrendPng() {
  if (!state.selectedCity || !state.series) {
    return;
  }

  downloadTrendPngButtonEl.disabled = true;
  statusTextEl.textContent = "Rendering high-resolution PNG...";
  try {
    const axisLimits = getCityAxisLimits(state.selectedCity);
    const selectedYear = state.years[state.selectedYearIdx];
    await renderTrendPlot(selectedYear, axisLimits);
    const exportSize = getElementExportSize(trendPlotEl, 860, 520);
    const imageData = await Plotly.toImage(trendPlotEl, {
      format: "png",
      width: exportSize.width,
      height: exportSize.height,
      scale: PNG_EXPORT_SCALE,
    });
    const fileBase = slugify(state.selectedCity.name || `city_${state.selectedCity.id}`);
    const link = document.createElement("a");
    link.href = imageData;
    link.download = `${fileBase}_population_dependency_300dpi.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    statusTextEl.textContent = "PNG downloaded.";
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    statusTextEl.textContent = `PNG export failed: ${message}`;
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    setControlsEnabled(Boolean(state.selectedCity));
  }
}

function createGifFromImages(images, width, height, intervalSeconds) {
  return new Promise((resolve, reject) => {
    gifshot.createGIF(
      {
        images,
        gifWidth: width,
        gifHeight: height,
        interval: intervalSeconds,
      },
      (obj) => {
        if (obj.error) {
          reject(new Error(obj.errorMsg || "gifshot failed to encode GIF."));
          return;
        }
        resolve(obj.image);
      }
    );
  });
}

function buildZeroBasedTicks(maxValue) {
  const safeMax = Math.max(1, maxValue);
  const rawStep = safeMax / 4;
  const step = computeNiceStep(rawStep);
  const upper = Math.ceil(safeMax / step) * step;
  const ticks = [];
  for (let value = 0; value <= upper + step * 0.5; value += step) {
    ticks.push(value);
  }
  return ticks;
}

function computeNiceStep(rawStep) {
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const fraction = rawStep / magnitude;
  if (fraction <= 1) {
    return 1 * magnitude;
  }
  if (fraction <= 2) {
    return 2 * magnitude;
  }
  if (fraction <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function getElementExportSize(element, fallbackWidth, fallbackHeight) {
  if (!element) {
    return { width: fallbackWidth, height: fallbackHeight };
  }
  const rect = element.getBoundingClientRect();
  const width = Math.max(220, Math.round(rect.width) || fallbackWidth);
  const height = Math.max(220, Math.round(rect.height) || fallbackHeight);
  return { width, height };
}

function getPlotTheme() {
  if (state.basemapTheme === "dark") {
    return {
      paperBg: "#122332",
      plotBg: "#152c3f",
      text: "#d7e8fb",
      axisLine: "rgba(206,226,247,0.58)",
      grid: "rgba(182,211,242,0.16)",
      gridSoft: "rgba(182,211,242,0.11)",
      zeroline: "rgba(230,244,255,0.78)",
      legendBg: "rgba(10,21,33,0.78)",
      legendBorder: "rgba(157,191,226,0.3)",
      hoverBg: "rgba(11,25,38,0.95)",
      hoverBorder: "rgba(170,203,235,0.52)",
      hoverText: "#e4f0ff",
      verticalMarker: "rgba(201,223,246,0.52)",
    };
  }

  return {
    paperBg: "#fffef8",
    plotBg: "#fffef8",
    text: "#24364a",
    axisLine: "rgba(30,46,66,0.5)",
    grid: "rgba(35,52,73,0.12)",
    gridSoft: "rgba(35,52,73,0.08)",
    zeroline: "rgba(25,40,58,0.55)",
    legendBg: "rgba(255,255,255,0.82)",
    legendBorder: "rgba(35,52,73,0.16)",
    hoverBg: "rgba(255,255,255,0.96)",
    hoverBorder: "rgba(55,74,97,0.38)",
    hoverText: "#24364a",
    verticalMarker: "rgba(37,48,66,0.5)",
  };
}

function normalizeCityId(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value).trim();
  if (!text) {
    return "";
  }
  const parsed = Number(text);
  if (Number.isFinite(parsed)) {
    return String(Math.trunc(parsed));
  }
  return text;
}

function sanitizeNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  return Number(value);
}

function formatPopulation(value) {
  if (value === null) {
    return "NA";
  }
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value, digits) {
  if (value === null) {
    return "NA";
  }
  return Number(value).toFixed(digits);
}

function formatCompactUpper(value) {
  if (value === null) {
    return "NA";
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${trimDecimal(abs / 1_000_000_000)}B`;
  }
  if (abs >= 1_000_000) {
    return `${trimDecimal(abs / 1_000_000)}M`;
  }
  if (abs >= 1_000) {
    return `${trimDecimal(abs / 1_000)}K`;
  }
  return `${Math.round(abs)}`;
}

function formatCompactSigned(value) {
  if (value === null) {
    return "NA";
  }
  if (value === 0) {
    return "0";
  }
  const sign = value < 0 ? "-" : "";
  return `${sign}${formatCompactUpper(Math.abs(value))}`;
}

function trimDecimal(value) {
  const rounded = Number(value).toFixed(1);
  return rounded.endsWith(".0") ? rounded.slice(0, -2) : rounded;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
