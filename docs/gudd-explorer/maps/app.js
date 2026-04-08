const DATA_DIR_CANDIDATES = ["./data", "../data", "./02_code/01_mapping/web/data", "/02_code/01_mapping/web/data"];
const PLAY_INTERVAL_MS = 520;
const GIF_FRAME_INTERVAL_SECONDS = 0.42;
const PLOT_FONT_FAMILY = "IBM Plex Mono, monospace";
const PNG_EXPORT_SCALE = 3;
const COUNTRY_PLOT_CANVAS_WIDTH = 980;
const COUNTRY_PLOT_CANVAS_HEIGHT = 680;
const COUNTRY_PLOT_LOG_MULTIPLIERS = [1, 2, 5];
const COUNTRY_PLOT_BASE_FONT_SIZE = 11;
const COUNTRY_PLOT_BASE_TITLE_FONT_SIZE = 13;
const COUNTRY_PLOT_BASE_SUBTITLE_FONT_SIZE = 11;
const EXPORT_WATERMARK_LINES = ["Zimmer et al., (2026)", "Nature Cities"];
const SIDEBAR_DEFAULT_WIDTH = 500;
const SIDEBAR_DEFAULT_WIDTH_RATIO = 0.32;
const SIDEBAR_MIN_WIDTH = 360;
const SIDEBAR_MAX_WIDTH = 860;
const COUNTRY_PLOT_PALETTE = [
  [244, 109, 67],
  [253, 174, 97],
  [254, 224, 139],
  [171, 221, 164],
  [102, 194, 165],
  [50, 136, 189],
  [94, 79, 162],
  [213, 62, 79],
  [230, 97, 1],
  [117, 112, 179],
  [27, 158, 119],
  [231, 138, 195],
];

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
  { key: "women_cba", label: "Women of childbearing age", formatter: formatPopulation },
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
  cityIdsByCountry: new Map(),
  metricIndexByKey: new Map(),
  countryPlotDataByCountry: new Map(),
  series: null,
  seriesPromise: null,
  selectedCity: null,
  selectedYearIdx: 0,
  animationTimer: null,
  dataDir: null,
  basemapTheme: "dark",
  gifReady: false,
  gifSupportQueued: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  sidebarResizeFrame: null,
  countryPlotMouse: {
    active: false,
    x: -1,
    y: -1,
  },
};

const sidebarEl = document.getElementById("sidebar");
const sidebarResizeHandleEl = document.getElementById("sidebarResizeHandle");
const closeSidebarButton = document.getElementById("closeSidebar");
const cityTitleEl = document.getElementById("cityTitle");
const cityMetaRowsEl = document.getElementById("cityMetaRows");
const statusTextEl = document.getElementById("statusText");
const yearSliderEl = document.getElementById("yearSlider");
const yearValueEl = document.getElementById("yearValue");
const playPauseButtonEl = document.getElementById("playPauseButton");
const downloadCountryGifButtonEl = document.getElementById("downloadCountryGifButton");
const downloadCountryPngButtonEl = document.getElementById("downloadCountryPngButton");
const downloadGifButtonEl = document.getElementById("downloadGifButton");
const downloadTrendPngButtonEl = document.getElementById("downloadTrendPngButton");
const basemapToggleButtonEl = document.getElementById("basemapToggle");
const metricCardsEl = document.getElementById("metricCards");
const countryPlotCanvasEl = document.getElementById("countryPlotCanvas");
const countryPlotCtx = countryPlotCanvasEl.getContext("2d");
const pyramidPlotEl = document.getElementById("pyramidPlot");
const trendPlotEl = document.getElementById("trendPlot");
const loadingOverlayEl = document.getElementById("loadingOverlay");
const loadingMessageEl = document.getElementById("loadingMessage");
const loadingStepMapEl = document.getElementById("loadingStepMap");
const loadingStepVisualsEl = document.getElementById("loadingStepVisuals");

init().catch((error) => {
  const message = error && error.message ? error.message : String(error);
  showStartupError(`Failed to initialize map app: ${message}`);
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

  bindUiEvents();
  applySidebarWidth(getDefaultSidebarWidth());
  initSidebarResizing();
  observeSidebarResize();
  setControlsEnabled(false);
  renderEmptyCountryPlot();

  setStartupLoadingPhase("map", "Loading basemap...");
  const mapReadyPromise = initMap();

  setStartupLoadingPhase("map", "Loading city boundaries and metadata...");
  const dataBundlePromise = fetchPrimaryDataBundle();
  const [dataBundle] = await Promise.all([dataBundlePromise, mapReadyPromise]);
  const { cityIndex, boundaries } = dataBundle;

  state.years = cityIndex.years;
  state.ageColumns = cityIndex.age_columns;
  state.metricColumns = cityIndex.metric_columns;
  state.metricIndexByKey = new Map(cityIndex.metric_columns.map((metricKey, index) => [metricKey, index]));
  state.valuesPerYear = cityIndex.values_per_year;
  state.selectedYearIdx = state.years.length - 1;

  for (const city of cityIndex.cities) {
    state.cityById.set(String(city.id), city);
    const countryKey = city.country || "Unknown";
    const existing = state.cityIdsByCountry.get(countryKey);
    if (existing) {
      existing.push(String(city.id));
    } else {
      state.cityIdsByCountry.set(countryKey, [String(city.id)]);
    }
  }

  setStartupLoadingPhase("map", "Rendering map polygons...");
  addCityLayers(boundaries);
  applyBasemapTheme();
  updateBasemapToggleButton();

  setStartupLoadingPhase("visuals", "Preloading visualizations...");
  await ensureSeriesLoaded();

  hideStartupLoading();
  statusTextEl.textContent = "Map ready. Click a city polygon.";
  queueGifSupportPreload();
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

  downloadCountryGifButtonEl.addEventListener("click", () => {
    if (!state.selectedCity) {
      return;
    }
    downloadCountryPlotGif();
  });

  downloadCountryPngButtonEl.addEventListener("click", () => {
    if (!state.selectedCity) {
      return;
    }
    downloadCountryPlotPng();
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

  countryPlotCanvasEl.addEventListener("mousemove", (event) => {
    if (!state.selectedCity || !state.series) {
      return;
    }
    const rect = countryPlotCanvasEl.getBoundingClientRect();
    const scaleX = countryPlotCanvasEl.width / rect.width;
    const scaleY = countryPlotCanvasEl.height / rect.height;
    state.countryPlotMouse = {
      active: true,
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    renderCountryPlot(state.selectedYearIdx);
  });

  countryPlotCanvasEl.addEventListener("mouseleave", () => {
    if (!state.countryPlotMouse.active) {
      return;
    }
    state.countryPlotMouse = { active: false, x: -1, y: -1 };
    if (state.selectedCity && state.series) {
      renderCountryPlot(state.selectedYearIdx);
    }
  });

  closeSidebarButton.addEventListener("click", () => {
    stopAnimation();
    sidebarEl.classList.remove("open");
  });

  window.addEventListener("resize", () => {
    applySidebarWidth(state.sidebarWidth);
    scheduleSidebarPlotResize();
  });
}

function initSidebarResizing() {
  sidebarResizeHandleEl.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = Math.round(sidebarEl.getBoundingClientRect().width) || state.sidebarWidth;
    sidebarEl.classList.add("resizing");

    const onPointerMove = (moveEvent) => {
      applySidebarWidth(startWidth + (moveEvent.clientX - startX));
      scheduleSidebarPlotResize();
    };

    const onPointerUp = () => {
      sidebarEl.classList.remove("resizing");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      scheduleSidebarPlotResize();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerUp, { once: true });
  });
}

function observeSidebarResize() {
  if (typeof ResizeObserver === "undefined") {
    return;
  }

  const observer = new ResizeObserver(() => {
    scheduleSidebarPlotResize();
  });
  observer.observe(sidebarEl);
}

function applySidebarWidth(width) {
  const clampedWidth = clampSidebarWidth(width);
  state.sidebarWidth = clampedWidth;
  document.documentElement.style.setProperty("--sidebar-width", `${clampedWidth}px`);
}

function getDefaultSidebarWidth() {
  const proportionalWidth = Math.round(window.innerWidth * SIDEBAR_DEFAULT_WIDTH_RATIO);
  return clampSidebarWidth(Math.max(SIDEBAR_DEFAULT_WIDTH, proportionalWidth));
}

function clampSidebarWidth(width) {
  const viewportMax = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth - 48));
  return Math.round(Math.max(SIDEBAR_MIN_WIDTH, Math.min(viewportMax, width)));
}

function scheduleSidebarPlotResize() {
  if (state.sidebarResizeFrame) {
    window.cancelAnimationFrame(state.sidebarResizeFrame);
  }

  state.sidebarResizeFrame = window.requestAnimationFrame(() => {
    state.sidebarResizeFrame = null;

    if (state.selectedCity && state.series) {
      renderCountryPlot(state.selectedYearIdx);
    } else {
      renderEmptyCountryPlot();
    }

    if (typeof Plotly !== "undefined" && typeof Plotly.Plots !== "undefined") {
      try {
        if (pyramidPlotEl.children.length) {
          Plotly.Plots.resize(pyramidPlotEl);
        }
      } catch (_) {
        // ignore Plotly resize errors during transitions
      }
      try {
        if (trendPlotEl.children.length) {
          Plotly.Plots.resize(trendPlotEl);
        }
      } catch (_) {
        // ignore Plotly resize errors during transitions
      }
    }
  });
}

function initMap() {
  state.map = new maplibregl.Map({
    container: "map",
    style: createMapStyle(state.basemapTheme),
    center: [12, 20],
    zoom: 1.6,
    minZoom: 1.2,
    maxZoom: 14.5,
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  return new Promise((resolve) => {
    state.map.once("load", () => {
      resolve();
    });
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

function getCountryFillProperty() {
  return state.basemapTheme === "dark" ? "CountryColorDark" : "CountryColorLight";
}

function getCountryOutlineProperty() {
  return state.basemapTheme === "dark" ? "CountryOutlineDark" : "CountryOutlineLight";
}

function getCountryFillOpacity() {
  return state.basemapTheme === "dark" ? 0.48 : 0.62;
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
      "fill-color": ["get", getCountryFillProperty()],
      "fill-opacity": getCountryFillOpacity(),
    },
  });

  state.map.addLayer({
    id: "city-outline",
    type: "line",
    source: "cities",
    paint: {
      "line-color": ["get", getCountryOutlineProperty()],
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
    state.countryPlotMouse = { active: false, x: -1, y: -1 };
    sidebarEl.classList.add("open");
    setControlsEnabled(true);
    queueGifSupportPreload();
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
    state.map.setPaintProperty("city-fill", "fill-color", ["get", getCountryFillProperty()]);
    state.map.setPaintProperty("city-fill", "fill-opacity", getCountryFillOpacity());
  }
  if (state.map.getLayer("city-outline")) {
    state.map.setPaintProperty("city-outline", "line-color", ["get", getCountryOutlineProperty()]);
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
  } else {
    renderEmptyCountryPlot();
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
  downloadCountryGifButtonEl.disabled = !enabled || !state.gifReady;
  downloadCountryPngButtonEl.disabled = !enabled;
  downloadGifButtonEl.disabled = !enabled || !state.gifReady;
  downloadTrendPngButtonEl.disabled = !enabled;
}

function setStartupLoadingMessage(message) {
  if (loadingMessageEl) {
    loadingMessageEl.textContent = message;
  }
  if (loadingOverlayEl) {
    loadingOverlayEl.classList.remove("hidden", "error");
  }
  statusTextEl.textContent = message;
}

function setStartupLoadingPhase(phase, message) {
  setStartupLoadingMessage(message);
  setStartupStepState(loadingStepMapEl, phase === "map" ? "active" : "done");
  if (phase === "visuals") {
    setStartupStepState(loadingStepVisualsEl, "active");
  } else {
    setStartupStepState(loadingStepVisualsEl, "pending");
  }
}

function hideStartupLoading() {
  setStartupStepState(loadingStepMapEl, "done");
  setStartupStepState(loadingStepVisualsEl, "done");
  if (loadingOverlayEl) {
    loadingOverlayEl.classList.add("hidden");
    loadingOverlayEl.classList.remove("error");
  }
}

function showStartupError(message) {
  setStartupStepState(loadingStepMapEl, "pending");
  setStartupStepState(loadingStepVisualsEl, "pending");
  if (loadingMessageEl) {
    loadingMessageEl.textContent = message;
  }
  if (loadingOverlayEl) {
    loadingOverlayEl.classList.remove("hidden");
    loadingOverlayEl.classList.add("error");
  }
  statusTextEl.textContent = message;
}

function setStartupStepState(stepEl, stateValue) {
  if (!stepEl) {
    return;
  }
  stepEl.classList.remove("is-active", "is-done");
  if (stateValue === "active") {
    stepEl.classList.add("is-active");
  } else if (stateValue === "done") {
    stepEl.classList.add("is-done");
  }
}

async function prepareGifSupport() {
  try {
    await ensureGifshotLoaded();
    state.gifReady = true;
    downloadCountryGifButtonEl.title = "Download country population and dependency animation as a GIF.";
    downloadGifButtonEl.title = "Download population pyramid animation as a GIF.";
  } catch (error) {
    state.gifReady = false;
    downloadCountryGifButtonEl.title = "GIF library failed to load.";
    downloadGifButtonEl.title = "GIF library failed to load.";
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    setControlsEnabled(Boolean(state.selectedCity));
  }
}

function queueGifSupportPreload() {
  if (state.gifReady || state.gifSupportQueued) {
    return;
  }
  state.gifSupportQueued = true;

  const preload = () => {
    window.setTimeout(() => {
      prepareGifSupport().finally(() => {
        state.gifSupportQueued = false;
      });
    }, 1200);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(preload, { timeout: 2000 });
    return;
  }

  preload();
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

async function fetchPrimaryDataBundle() {
  for (const candidate of DATA_DIR_CANDIDATES) {
    try {
      const [cityIndexResponse, boundariesResponse] = await Promise.all([
        fetch(`${candidate}/city_index.json`),
        fetch(`${candidate}/static_boundaries.geojson`),
      ]);
      if (!cityIndexResponse.ok || !boundariesResponse.ok) {
        continue;
      }
      state.dataDir = candidate;
      const [cityIndex, boundaries] = await Promise.all([
        cityIndexResponse.json(),
        boundariesResponse.json(),
      ]);
      return { cityIndex, boundaries };
    } catch (_) {
      // keep trying candidate paths
    }
  }
  throw new Error("Could not find the required map data in expected data paths.");
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
  renderCountryPlot(state.selectedYearIdx);
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
  const metricOffset = state.metricIndexByKey.get(metricKey);
  if (metricOffset === undefined) {
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

function getMetricValue(city, yearIndex, metricKey) {
  const metricOffset = state.metricIndexByKey.get(metricKey);
  if (metricOffset === undefined) {
    return null;
  }

  const ageCount = state.ageColumns.length;
  const index = city.series_index + yearIndex * state.valuesPerYear + ageCount + metricOffset;
  return sanitizeNumber(state.series[index]);
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

function renderEmptyCountryPlot(message = "Select a city to compare every city in that country through time.") {
  const colors = getCountryPlotTheme();
  const metrics = getCountryPlotMetrics(countryPlotCanvasEl);
  countryPlotCtx.clearRect(0, 0, countryPlotCanvasEl.width, countryPlotCanvasEl.height);
  countryPlotCtx.fillStyle = colors.canvasBg;
  countryPlotCtx.fillRect(0, 0, countryPlotCanvasEl.width, countryPlotCanvasEl.height);

  countryPlotCtx.fillStyle = colors.title;
  countryPlotCtx.font = metrics.titleFont;
  countryPlotCtx.textAlign = "center";
  countryPlotCtx.textBaseline = "alphabetic";
  countryPlotCtx.fillText("Urban Population vs Dependency Ratio", countryPlotCanvasEl.width / 2, metrics.titleY);

  countryPlotCtx.fillStyle = colors.subtitle;
  countryPlotCtx.font = metrics.subtitleFont;
  countryPlotCtx.fillText("Country context opens here once a city is selected.", countryPlotCanvasEl.width / 2, metrics.subtitleY);

  countryPlotCtx.fillStyle = colors.label;
  countryPlotCtx.font = metrics.axisFont;
  countryPlotCtx.textBaseline = "middle";
  countryPlotCtx.fillText(message, countryPlotCanvasEl.width / 2, countryPlotCanvasEl.height / 2);
}

function renderCountryPlot(yearIndex) {
  if (!state.selectedCity || !state.series) {
    renderEmptyCountryPlot();
    return;
  }

  const countryName = state.selectedCity.country || "Unknown";
  const plotData = getCountryPlotData(countryName);
  renderCountryPlotFrame(countryPlotCtx, countryPlotCanvasEl, plotData, yearIndex, {
    selectedCityId: String(state.selectedCity.id),
    mouse: state.countryPlotMouse,
    includeWatermark: false,
  });
}

function getCountryPlotData(countryName) {
  const cached = state.countryPlotDataByCountry.get(countryName);
  if (cached) {
    return cached;
  }

  const cityIds = state.cityIdsByCountry.get(countryName) || [];
  const pointsByYear = state.years.map(() => []);
  const popValues = [];
  const drValues = [];

  for (const cityId of cityIds) {
    const city = state.cityById.get(cityId);
    if (!city) {
      continue;
    }

    const color = COUNTRY_PLOT_PALETTE[stableIndexForText(cityId, COUNTRY_PLOT_PALETTE.length)];
    for (let yearIdx = 0; yearIdx < state.years.length; yearIdx += 1) {
      const totalPop = getMetricValue(city, yearIdx, "total_pop");
      const totalDr = getMetricValue(city, yearIdx, "total_dr");
      if (totalPop === null || totalPop <= 0 || totalDr === null) {
        continue;
      }

      pointsByYear[yearIdx].push({
        cityId,
        cityName: sanitizeCityName(city.name),
        totalPop,
        totalDr,
        color,
      });
      popValues.push(totalPop);
      drValues.push(totalDr);
    }
  }

  const plotData = {
    countryName,
    axisLimits: computeCountryPlotAxisLimits(popValues, drValues),
    pointsByYear,
  };
  state.countryPlotDataByCountry.set(countryName, plotData);
  return plotData;
}

function computeCountryPlotAxisLimits(popValues, drValues) {
  const safePopValues = popValues.filter((value) => Number.isFinite(value) && value > 0);
  const safeDrValues = drValues.filter((value) => Number.isFinite(value));

  const minPop = safePopValues.length ? Math.min(...safePopValues) : 1;
  const maxPop = safePopValues.length ? Math.max(...safePopValues) : 10;
  const minLog = Math.log10(minPop);
  const maxLog = Math.log10(maxPop);
  const logSpan = maxLog - minLog;
  const logPad = Math.max(0.018, logSpan * 0.045);
  let xMin = Math.max(1, 10 ** (minLog - logPad));
  let xMax = 10 ** (maxLog + logPad);
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) {
    xMin = Math.max(1, minPop * 0.94);
    xMax = Math.max(xMin * 1.12, maxPop * 1.06);
  }

  const drMax = Math.max(...safeDrValues, 0);
  const yFloor = 0;
  const yBaseCeiling = 1.5;
  const yPad = Math.max(0.03, drMax * 0.05);
  const yUpperTarget = Math.max(yBaseCeiling, drMax + yPad);
  const yTicks = buildLinearTicks(yFloor, yUpperTarget, 6);

  return {
    xMin,
    xMax,
    xTicks: buildCountryPlotXTicks(xMin, xMax),
    yMin: yFloor,
    yMax: yTicks[yTicks.length - 1],
    yTicks,
  };
}

function renderCountryPlotFrame(targetCtx, targetCanvas, plotData, yearIndex, options = {}) {
  const colors = getCountryPlotTheme();
  const metrics = getCountryPlotMetrics(targetCanvas, options);
  const axisLimits = plotData.axisLimits;
  const safeYearIndex = Math.max(0, Math.min(yearIndex, state.years.length - 1));
  const targetYear = state.years[safeYearIndex];
  const geom = getCountryPlotGeometry(targetCanvas, metrics);
  const mouse = options.mouse || { active: false, x: -1, y: -1 };
  const selectedCityId = options.selectedCityId || "";
  const selectedPoints = [];
  let hoverCandidate = null;

  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.fillStyle = colors.canvasBg;
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  drawCountryPlotAxes(targetCtx, targetCanvas, axisLimits, geom, colors, metrics);

  for (let visibleYearIdx = 0; visibleYearIdx <= safeYearIndex; visibleYearIdx += 1) {
    const points = plotData.pointsByYear[visibleYearIdx];
    const isCurrentYear = visibleYearIdx === safeYearIndex;

    for (const point of points) {
      const drawablePoint = {
        ...point,
        x: toCountryPlotX(point.totalPop, axisLimits.xMin, axisLimits.xMax, geom),
        y: toCountryPlotY(point.totalDr, axisLimits.yMin, axisLimits.yMax, geom),
        isCurrentYear,
        isSelected: point.cityId === selectedCityId,
      };

      if (drawablePoint.isSelected) {
        selectedPoints.push(drawablePoint);
      } else {
        drawCountryPlotPoint(targetCtx, drawablePoint, colors, metrics);
      }

      if (mouse.active) {
        const radius = getCountryPlotRadius(drawablePoint, metrics);
        const distance = Math.hypot(mouse.x - drawablePoint.x, mouse.y - drawablePoint.y);
        if (distance <= radius + 2) {
          if (
            hoverCandidate === null ||
            distance < hoverCandidate.distance ||
            (drawablePoint.isCurrentYear && !hoverCandidate.isCurrentYear)
          ) {
            hoverCandidate = { ...drawablePoint, distance };
          }
        }
      }
    }
  }

  for (const point of selectedPoints) {
    drawCountryPlotPoint(targetCtx, point, colors, metrics);
  }

  if (hoverCandidate) {
    drawCountryPlotHover(targetCtx, hoverCandidate, colors, metrics);
  }

  targetCtx.font = metrics.titleFont;
  targetCtx.fillStyle = colors.title;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "alphabetic";
  targetCtx.fillText("Urban Population vs Dependency Ratio", targetCanvas.width / 2, metrics.titleY);
  targetCtx.font = metrics.subtitleFont;
  targetCtx.fillStyle = colors.subtitle;
  targetCtx.fillText(`${plotData.countryName} · ${targetYear}`, targetCanvas.width / 2, metrics.subtitleY);

  if (options.includeWatermark) {
    drawExportWatermark(targetCtx, targetCanvas.width, targetCanvas.height, colors);
  }
}

function drawCountryPlotPoint(targetCtx, point, colors, metrics) {
  const radius = getCountryPlotRadius(point, metrics);
  const alpha = point.isSelected
    ? point.isCurrentYear ? 0.98 : 0.42
    : point.isCurrentYear ? 0.9 : 0.2;
  const fillColor = point.isSelected
    ? rgbaFromArray(colors.selectedFill, alpha)
    : rgbaFromArray(point.color, alpha);

  targetCtx.beginPath();
  targetCtx.fillStyle = fillColor;
  targetCtx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
  targetCtx.fill();
  targetCtx.lineWidth = point.isSelected ? metrics.selectedStrokeWidth : point.isCurrentYear ? metrics.pointStrokeWidth : metrics.pointStrokeWidthSoft;
  targetCtx.strokeStyle = point.isSelected
    ? colors.selectedStroke
    : point.isCurrentYear ? colors.pointStrokeCurrent : colors.pointStroke;
  targetCtx.stroke();
}

function drawCountryPlotHover(targetCtx, hoverPoint, colors, metrics) {
  const padding = metrics.hoverPadding;
  const statsText = `${formatCompactUpper(hoverPoint.totalPop)} · ${formatDecimal(hoverPoint.totalDr, 2)}`;
  targetCtx.font = metrics.axisFont;
  const nameWidth = targetCtx.measureText(hoverPoint.cityName).width;
  targetCtx.font = metrics.subtitleFont;
  const statsWidth = targetCtx.measureText(statsText).width;
  const boxWidth = Math.max(nameWidth, statsWidth) + padding * 2;
  const boxHeight = metrics.hoverBoxHeight;
  const boxX = Math.max(metrics.hoverEdgePadding, Math.min(
    hoverPoint.x - boxWidth / 2,
    targetCtx.canvas.width - boxWidth - metrics.hoverEdgePadding
  ));
  const boxY = Math.max(metrics.hoverMinTop, hoverPoint.y - boxHeight - metrics.hoverPointerGap);

  drawRoundedRectPath(targetCtx, boxX, boxY, boxWidth, boxHeight, metrics.hoverRadius);
  targetCtx.fillStyle = colors.hoverBg;
  targetCtx.fill();
  targetCtx.strokeStyle = colors.hoverBorder;
  targetCtx.lineWidth = metrics.hoverBorderWidth;
  targetCtx.stroke();

  targetCtx.fillStyle = colors.hoverText;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.font = metrics.axisFont;
  targetCtx.fillText(hoverPoint.cityName, boxX + boxWidth / 2, boxY + boxHeight / 2 - metrics.hoverNameOffset);
  targetCtx.fillStyle = colors.subtitle;
  targetCtx.font = metrics.subtitleFont;
  targetCtx.fillText(statsText, boxX + boxWidth / 2, boxY + boxHeight / 2 + metrics.hoverStatsOffset);
}

function drawCountryPlotAxes(targetCtx, targetCanvas, axisLimits, geom, colors, metrics) {
  targetCtx.font = metrics.axisFont;
  targetCtx.fillStyle = colors.label;
  targetCtx.strokeStyle = colors.axisStrong;
  targetCtx.lineWidth = metrics.axisLineWidth;

  targetCtx.beginPath();
  targetCtx.moveTo(geom.left, geom.top);
  targetCtx.lineTo(geom.left, geom.bottom);
  targetCtx.lineTo(geom.right, geom.bottom);
  targetCtx.stroke();

  targetCtx.strokeStyle = colors.grid;
  targetCtx.textAlign = "right";
  targetCtx.textBaseline = "middle";
  for (const tick of axisLimits.yTicks) {
    const py = toCountryPlotY(tick, axisLimits.yMin, axisLimits.yMax, geom);
    targetCtx.beginPath();
    targetCtx.moveTo(geom.left, py);
    targetCtx.lineTo(geom.right, py);
    targetCtx.stroke();
    targetCtx.fillStyle = colors.label;
    targetCtx.fillText(formatDecimal(tick, 2), geom.left - metrics.yTickPadding, py);
  }

  targetCtx.strokeStyle = colors.tickMinor;
  targetCtx.lineWidth = metrics.minorTickWidth;
  const logMin = Math.floor(Math.log10(axisLimits.xMin));
  const logMax = Math.ceil(Math.log10(axisLimits.xMax));
  for (let decade = logMin; decade <= logMax; decade += 1) {
    const base = 10 ** decade;
    for (const factor of COUNTRY_PLOT_LOG_MULTIPLIERS) {
      if (factor === 1) {
        continue;
      }
      const value = base * factor;
      if (value < axisLimits.xMin || value > axisLimits.xMax) {
        continue;
      }
      const px = toCountryPlotX(value, axisLimits.xMin, axisLimits.xMax, geom);
      targetCtx.beginPath();
      targetCtx.moveTo(px, geom.bottom);
      targetCtx.lineTo(px, geom.bottom + metrics.minorTickLength);
      targetCtx.stroke();
    }
  }

  targetCtx.lineWidth = metrics.majorTickWidth;
  for (const tick of axisLimits.xTicks) {
    if (tick < axisLimits.xMin || tick > axisLimits.xMax) {
      continue;
    }
    const px = toCountryPlotX(tick, axisLimits.xMin, axisLimits.xMax, geom);
    targetCtx.strokeStyle = colors.grid;
    targetCtx.beginPath();
    targetCtx.moveTo(px, geom.top);
    targetCtx.lineTo(px, geom.bottom);
    targetCtx.stroke();
    targetCtx.strokeStyle = colors.axisStrong;
    targetCtx.beginPath();
    targetCtx.moveTo(px, geom.bottom);
    targetCtx.lineTo(px, geom.bottom + metrics.majorTickLength);
    targetCtx.stroke();
    targetCtx.fillStyle = colors.label;
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "top";
    targetCtx.fillText(formatCompactUpper(tick), px, geom.bottom + metrics.xTickLabelOffset);
  }

  targetCtx.save();
  targetCtx.fillStyle = colors.label;
  targetCtx.translate(metrics.yAxisLabelX, geom.top + geom.height / 2);
  targetCtx.rotate(-Math.PI / 2);
  targetCtx.textAlign = "center";
  targetCtx.fillText("Total Dependency Ratio", 0, 0);
  targetCtx.restore();

  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "top";
  targetCtx.fillStyle = colors.label;
  targetCtx.fillText("Total Population", geom.left + geom.width / 2, geom.bottom + metrics.xAxisLabelOffset);
}

function getCountryPlotGeometry(targetCanvas, metrics) {
  const left = metrics.marginLeft;
  const right = targetCanvas.width - metrics.marginRight;
  const top = metrics.marginTop;
  const bottom = targetCanvas.height - metrics.marginBottom;
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function getCountryPlotMetrics(targetCanvas, options = {}) {
  const scale = getCountryPlotDisplayScale(targetCanvas, options);
  const axisFontSize = Math.max(11, Math.round(COUNTRY_PLOT_BASE_FONT_SIZE * scale));
  const titleFontSize = Math.max(13, Math.round(COUNTRY_PLOT_BASE_TITLE_FONT_SIZE * scale));
  const subtitleFontSize = Math.max(11, Math.round(COUNTRY_PLOT_BASE_SUBTITLE_FONT_SIZE * scale));

  return {
    scale,
    axisFont: `${axisFontSize}px "IBM Plex Mono", monospace`,
    titleFont: `500 ${titleFontSize}px "IBM Plex Mono", monospace`,
    subtitleFont: `${subtitleFontSize}px "IBM Plex Mono", monospace`,
    titleY: Math.round(24 * scale),
    subtitleY: Math.round(44 * scale),
    marginLeft: Math.round(94 * scale),
    marginRight: Math.round(30 * scale),
    marginTop: Math.round(92 * scale),
    marginBottom: Math.round(58 * scale),
    axisLineWidth: Math.max(1, 1 * scale),
    pointStrokeWidth: Math.max(1, 1 * scale),
    pointStrokeWidthSoft: Math.max(0.8, 0.8 * scale),
    selectedStrokeWidth: Math.max(1.25, 1.35 * scale),
    minorTickWidth: Math.max(0.8, 0.8 * scale),
    majorTickWidth: Math.max(1, 1 * scale),
    minorTickLength: Math.round(6 * scale),
    majorTickLength: Math.round(8 * scale),
    xTickLabelOffset: Math.round(10 * scale),
    yTickPadding: Math.round(8 * scale),
    yAxisLabelX: Math.round(42 * scale),
    xAxisLabelOffset: Math.round(34 * scale),
    hoverPadding: Math.round(10 * scale),
    hoverRadius: Math.round(6 * scale),
    hoverBorderWidth: Math.max(1, 1 * scale),
    hoverBoxHeight: Math.round(44 * scale),
    hoverEdgePadding: Math.round(12 * scale),
    hoverMinTop: Math.round(68 * scale),
    hoverPointerGap: Math.round(12 * scale),
    hoverNameOffset: Math.round(8 * scale),
    hoverStatsOffset: Math.round(10 * scale),
  };
}

function getCountryPlotDisplayScale(targetCanvas, options = {}) {
  if (Number.isFinite(options.displayScale) && options.displayScale > 0) {
    return options.displayScale;
  }
  if (!targetCanvas || typeof targetCanvas.getBoundingClientRect !== "function") {
    return 1;
  }
  const rect = targetCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return 1;
  }
  return Math.max(targetCanvas.width / rect.width, targetCanvas.height / rect.height);
}

function toCountryPlotX(value, xMin, xMax, geom) {
  return geom.left + ((Math.log10(value) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * geom.width;
}

function toCountryPlotY(value, yMin, yMax, geom) {
  return geom.bottom - ((value - yMin) / (yMax - yMin)) * geom.height;
}

function getCountryPlotRadius(point, metrics) {
  const scale = metrics && Number.isFinite(metrics.scale) ? metrics.scale : 1;
  if (point.isSelected) {
    return (point.isCurrentYear ? 5.8 : 3.5) * scale;
  }
  return (point.isCurrentYear ? 4.6 : 2.1) * scale;
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

async function downloadCountryPlotGif() {
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
  downloadCountryGifButtonEl.disabled = true;
  statusTextEl.textContent = "Rendering country frames for GIF...";

  try {
    const plotData = getCountryPlotData(state.selectedCity.country || "Unknown");
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = COUNTRY_PLOT_CANVAS_WIDTH;
    exportCanvas.height = COUNTRY_PLOT_CANVAS_HEIGHT;
    const exportCtx = exportCanvas.getContext("2d");
    const images = [];

    for (let yearIdx = 0; yearIdx < state.years.length; yearIdx += 1) {
      renderCountryPlotFrame(exportCtx, exportCanvas, plotData, yearIdx, {
        displayScale: getCountryPlotDisplayScale(countryPlotCanvasEl),
        selectedCityId: String(state.selectedCity.id),
        includeWatermark: true,
      });
      images.push(exportCanvas.toDataURL("image/png"));
    }

    statusTextEl.textContent = "Encoding GIF...";
    const gifDataUri = await createGifFromImages(
      images,
      exportCanvas.width,
      exportCanvas.height,
      GIF_FRAME_INTERVAL_SECONDS
    );
    const fileBase = slugify(state.selectedCity.country || state.selectedCity.name || `city_${state.selectedCity.id}`);
    triggerDownload(gifDataUri, `${fileBase}_country_population_dependency_2000_2020.gif`);
    statusTextEl.textContent = "GIF downloaded.";
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    statusTextEl.textContent = `GIF export failed: ${message}`;
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    setControlsEnabled(Boolean(state.selectedCity));
  }
}

async function downloadCountryPlotPng() {
  if (!state.selectedCity || !state.series) {
    return;
  }

  downloadCountryPngButtonEl.disabled = true;
  statusTextEl.textContent = "Rendering high-resolution country PNG...";

  try {
    const plotData = getCountryPlotData(state.selectedCity.country || "Unknown");
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = COUNTRY_PLOT_CANVAS_WIDTH * PNG_EXPORT_SCALE;
    exportCanvas.height = COUNTRY_PLOT_CANVAS_HEIGHT * PNG_EXPORT_SCALE;
    const exportCtx = exportCanvas.getContext("2d");
    exportCtx.setTransform(PNG_EXPORT_SCALE, 0, 0, PNG_EXPORT_SCALE, 0, 0);

    renderCountryPlotFrame(
      exportCtx,
      { width: COUNTRY_PLOT_CANVAS_WIDTH, height: COUNTRY_PLOT_CANVAS_HEIGHT },
      plotData,
      state.selectedYearIdx,
      {
        displayScale: getCountryPlotDisplayScale(countryPlotCanvasEl),
        selectedCityId: String(state.selectedCity.id),
        includeWatermark: true,
      }
    );

    const fileBase = slugify(state.selectedCity.country || state.selectedCity.name || `city_${state.selectedCity.id}`);
    triggerDownload(exportCanvas.toDataURL("image/png"), `${fileBase}_country_population_dependency_${state.years[state.selectedYearIdx]}.png`);
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
      images.push(await addWatermarkToImageDataUrl(image));
    }

    statusTextEl.textContent = "Encoding GIF...";
    const gifDataUri = await createGifFromImages(images, frameWidth, frameHeight, GIF_FRAME_INTERVAL_SECONDS);
    const fileBase = slugify(state.selectedCity.name || `city_${state.selectedCity.id}`);

    triggerDownload(gifDataUri, `${fileBase}_population_pyramid_2000_2020.gif`);

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
    const imageWithWatermark = await addWatermarkToImageDataUrl(imageData);
    const fileBase = slugify(state.selectedCity.name || `city_${state.selectedCity.id}`);
    triggerDownload(imageWithWatermark, `${fileBase}_population_dependency_300dpi.png`);
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

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function addWatermarkToImageDataUrl(dataUrl) {
  const image = await loadImage(dataUrl);
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = image.naturalWidth || image.width;
  exportCanvas.height = image.naturalHeight || image.height;
  const exportCtx = exportCanvas.getContext("2d");
  exportCtx.drawImage(image, 0, 0, exportCanvas.width, exportCanvas.height);
  drawExportWatermark(exportCtx, exportCanvas.width, exportCanvas.height, getCountryPlotTheme());
  return exportCanvas.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load exported image."));
    image.src = src;
  });
}

function drawExportWatermark(targetCtx, width, height, colors) {
  const padding = Math.max(8, Math.round(Math.min(width, height) * 0.014));
  const fontSize = Math.max(8, Math.round(Math.min(width, height) * 0.0118));
  const lineHeight = Math.max(7, Math.round(fontSize * 1.18));
  const bottomY = height - padding;
  targetCtx.save();
  targetCtx.fillStyle = colors.watermarkText;
  targetCtx.globalAlpha = 0.4;
  targetCtx.textAlign = "right";
  targetCtx.textBaseline = "alphabetic";
  targetCtx.font = `500 ${fontSize}px "IBM Plex Mono", monospace`;
  targetCtx.fillText(EXPORT_WATERMARK_LINES[0], width - padding, bottomY - lineHeight);
  targetCtx.font = `italic 500 ${fontSize}px "IBM Plex Mono", monospace`;
  targetCtx.fillText(EXPORT_WATERMARK_LINES[1], width - padding, bottomY);
  targetCtx.restore();
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

function buildLinearTicks(minValue, maxValue, desiredCount = 6) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || minValue === maxValue) {
    const center = Number.isFinite(minValue) ? minValue : 0;
    return [center - 0.1, center, center + 0.1];
  }

  const rawStep = Math.abs(maxValue - minValue) / Math.max(1, desiredCount - 1);
  const step = computeNiceStep(Math.max(rawStep, 0.001));
  const start = Math.floor(minValue / step) * step;
  const end = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let value = start; value <= end + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

function buildCountryPlotXTicks(xMin, xMax) {
  const ticks = [];
  const startExponent = Math.floor(Math.log10(xMin));
  const endExponent = Math.ceil(Math.log10(xMax));

  for (let exponent = startExponent; exponent <= endExponent; exponent += 1) {
    const magnitude = 10 ** exponent;
    for (const multiplier of COUNTRY_PLOT_LOG_MULTIPLIERS) {
      const value = multiplier * magnitude;
      if (value < xMin || value > xMax) {
        continue;
      }
      ticks.push(value);
    }
  }

  if (ticks.length < 2) {
    ticks.unshift(xMin);
    ticks.push(xMax);
  }

  return Array.from(new Set(ticks.map((value) => Number(value.toPrecision(12))))).sort((a, b) => a - b);
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

function getCountryPlotTheme() {
  const plotTheme = getPlotTheme();
  if (state.basemapTheme === "dark") {
    return {
      canvasBg: plotTheme.plotBg,
      axisStrong: plotTheme.axisLine,
      grid: plotTheme.grid,
      gridSoft: plotTheme.gridSoft,
      label: plotTheme.text,
      title: plotTheme.text,
      subtitle: "#a9c5e2",
      hoverBg: plotTheme.hoverBg,
      hoverBorder: plotTheme.hoverBorder,
      hoverText: plotTheme.hoverText,
      pointStroke: "rgba(206, 229, 252, 0.42)",
      pointStrokeCurrent: "rgba(234, 248, 255, 0.88)",
      tickMinor: plotTheme.gridSoft,
      selectedFill: [255, 209, 102],
      selectedStroke: "#fff4cf",
      watermarkBg: "rgba(12, 24, 38, 0.72)",
      watermarkBorder: "rgba(170, 203, 235, 0.32)",
      watermarkText: "rgba(230, 242, 255, 0.88)",
    };
  }

  return {
    canvasBg: plotTheme.plotBg,
    axisStrong: plotTheme.axisLine,
    grid: plotTheme.grid,
    gridSoft: plotTheme.gridSoft,
    label: plotTheme.text,
    title: plotTheme.text,
    subtitle: "#4f6b86",
    hoverBg: plotTheme.hoverBg,
    hoverBorder: plotTheme.hoverBorder,
    hoverText: plotTheme.hoverText,
    pointStroke: "rgba(36, 56, 79, 0.38)",
    pointStrokeCurrent: "rgba(16, 35, 53, 0.74)",
    tickMinor: plotTheme.gridSoft,
    selectedFill: [227, 106, 63],
    selectedStroke: "#6e2f10",
    watermarkBg: "rgba(255, 252, 243, 0.84)",
    watermarkBorder: "rgba(55, 74, 97, 0.18)",
    watermarkText: "rgba(36, 56, 79, 0.76)",
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

function sanitizeCityName(name) {
  if (name === null || name === undefined || Number.isNaN(name)) {
    return "Unknown city";
  }
  const text = String(name).trim();
  return text && text !== "NaN" ? text : "Unknown city";
}

function stableIndexForText(text, size) {
  let value = 0;
  const input = String(text);
  for (let index = 0; index < input.length; index += 1) {
    value = (value + (index + 1) * input.charCodeAt(index)) % 2147483647;
  }
  return value % size;
}

function rgbaFromArray(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function drawRoundedRectPath(targetCtx, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  targetCtx.beginPath();
  targetCtx.moveTo(x + safeRadius, y);
  targetCtx.lineTo(x + width - safeRadius, y);
  targetCtx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  targetCtx.lineTo(x + width, y + height - safeRadius);
  targetCtx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  targetCtx.lineTo(x + safeRadius, y + height);
  targetCtx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  targetCtx.lineTo(x, y + safeRadius);
  targetCtx.quadraticCurveTo(x, y, x + safeRadius, y);
  targetCtx.closePath();
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
