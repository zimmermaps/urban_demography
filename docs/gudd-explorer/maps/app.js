const DATA_DIR_CANDIDATES = ["./data", "../data", "./02_code/01_mapping/web/data", "/02_code/01_mapping/web/data"];
const BASE_PLAY_INTERVAL_MS = 520;
const ANIMATION_SPEEDS = [0.5, 0.75, 1, 1.5, 2];
const DEFAULT_ANIMATION_SPEED_INDEX = 2;
const PLOT_FONT_FAMILY = "Helvetica, Arial, sans-serif";
const PNG_EXPORT_SCALE = 3;
const COUNTRY_PLOT_CANVAS_WIDTH = 980;
const COUNTRY_PLOT_CANVAS_HEIGHT = 620;
const COUNTRY_PLOT_EXPORT_DISPLAY_SCALE = 1.25;
const COUNTRY_PLOT_LOG_MULTIPLIERS = [1, 2, 5];
const CHART_FONT_SIZE = 14;
const CHART_TICK_FONT_SIZE = 13;
const CHART_TITLE_FONT_SIZE = 19;
const CHART_SUBTITLE_FONT_SIZE = 13;
const CHART_AXIS_TITLE_FONT_SIZE = 15;
const CHART_LEGEND_FONT_SIZE = 13;
const CHART_HOVER_FONT_SIZE = 13;
const CHART_AXIS_LINE_WIDTH = 2.2;
const CHART_TICK_WIDTH = 1.6;
const COUNTRY_PLOT_BASE_FONT_SIZE = CHART_TICK_FONT_SIZE;
const COUNTRY_PLOT_BASE_TITLE_FONT_SIZE = CHART_TITLE_FONT_SIZE;
const COUNTRY_PLOT_BASE_SUBTITLE_FONT_SIZE = CHART_SUBTITLE_FONT_SIZE;
const EXPORT_WATERMARK_LINES = ["Andrew Zimmer · Nina Brooks · Andrea E. Gaughan · Cascade Tuholske (2026)", "Nature Cities"];
const SIDEBAR_DEFAULT_WIDTH = 500;
const SIDEBAR_DEFAULT_WIDTH_RATIO = 0.32;
const SIDEBAR_MIN_WIDTH = 360;
const SIDEBAR_MAX_WIDTH = 860;
const INITIAL_SNAPSHOT_YEAR = 2020;
const BOUNDARY_LOAD_ZOOM = 3.4;
const PLOTLY_SCRIPT_CANDIDATES = [
  "https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.35.2/plotly.min.js",
  "https://cdn.plot.ly/plotly-2.35.2.min.js",
  "https://unpkg.com/plotly.js-dist-min@2.35.2/plotly.min.js",
];
const AGE_BIN_LABELS = [
  "0",
  "1–4",
  "5–9",
  "10–14",
  "15–19",
  "20–24",
  "25–29",
  "30–34",
  "35–39",
  "40–44",
  "45–49",
  "50–54",
  "55–59",
  "60–64",
  "65–69",
  "70–74",
  "75–79",
  "80+",
];

const METRIC_CARD_CONFIG = [
  { key: "total_pop", label: "Total population", formatter: formatPopulation },
  { key: "total_dr", label: "Total dependency ratio", formatter: (v) => formatDecimal(v, 3) },
  { key: "young_dr", label: "Youth dependency ratio", formatter: (v) => formatDecimal(v, 3) },
  { key: "old_dr", label: "Old-age dependency ratio", formatter: (v) => formatDecimal(v, 3) },
  { key: "total_sr", label: "Sex ratio", formatter: (v) => formatDecimal(v, 3) },
  { key: "women_cba", label: "Women of childbearing age", formatter: formatPopulation },
  { key: "general_fr", label: "General fertility rate", formatter: (v) => formatDecimal(v, 2) },
];

const MAP_METRIC_CONFIG = {
  total_pop: { label: "Total population", shortLabel: "Population", unit: "people", formatter: formatPopulation, palette: "viridis", scale: "log" },
  total_dr: { label: "Total dependency ratio", shortLabel: "Total dependency", unit: "ratio", formatter: (v) => formatDecimal(v, 3), palette: "viridis", fixedDomain: [0.2, 1.2] },
  young_dr: { label: "Youth dependency ratio", shortLabel: "Youth dependency", unit: "ratio", formatter: (v) => formatDecimal(v, 3), palette: "viridis", fixedDomain: [0.2, 1.2] },
  old_dr: { label: "Old-age dependency ratio", shortLabel: "Old-age dependency", unit: "ratio", formatter: (v) => formatDecimal(v, 3), palette: "viridis", fixedDomain: [0, 0.5] },
  total_sr: { label: "Sex ratio", shortLabel: "Sex ratio", unit: "ratio", formatter: (v) => formatDecimal(v, 3), palette: "sex", fixedDomain: [0.7, 1.3] },
  women_cba: { label: "Women of childbearing age", shortLabel: "Women, childbearing age", unit: "people", formatter: formatPopulation, palette: "viridis", scale: "log" },
  general_fr: { label: "General fertility rate", shortLabel: "Fertility rate", unit: "births per 1,000 women", formatter: (v) => formatDecimal(v, 1), palette: "viridis" },
};

const MAP_PALETTES = {
  viridis: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
  change: ["#160b39", "#5a116e", "#9b2964", "#d74b3f", "#f8890c", "#f6d746"],
  sex: ["#2c105c", "#225ea8", "#1fa187", "#9ecae1", "#fcbba1", "#fb8d3c", "#e31a1c", "#7a0177"],
  sexChange: ["#00441b", "#1fa187", "#4ac16d", "#a0e1c7", "#f7b6d2", "#e164a0", "#c51b7d", "#7a1f4b"],
  migration: ["#fdd070", "#fdae61", "#f98e52", "#f46d43", "#e34a33", "#d73027", "#c51b7d", "#ae017e", "#8c0273", "#5f0165", "#2b0040"],
};

const BASEMAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const state = {
  map: null,
  years: [],
  ageColumns: [],
  metricColumns: [],
  metricValuesPerYear: 0,
  ageValuesPerYear: 0,
  cityById: new Map(),
  cityAxisById: new Map(),
  cityIdsByCountry: new Map(),
  metricIndexByKey: new Map(),
  countryPlotDataByCountry: new Map(),
  countryPlotHighlightSelected: true,
  snapshotMetricSeries: null,
  snapshotYearIdx: 0,
  metricSeries: null,
  metricSeriesPromise: null,
  plotlyPromise: null,
  ageSeriesByCity: new Map(),
  ageSeriesPromiseByCity: new Map(),
  selectedCity: null,
  selectedYearIdx: 0,
  animationTimer: null,
  animationSpeedIndex: DEFAULT_ANIMATION_SPEED_INDEX,
  dataDir: null,
  basemapTheme: "dark",
  basemapLayers: { dark: [], light: [] },
  mapMode: "snapshot",
  mapMetricKey: "total_pop",
  mapStartYearIdx: 0,
  mapEndYearIdx: 20,
  mapChangeUnit: "percent",
  mapPointsVisible: true,
  mapPointData: null,
  mapPointSummary: null,
  hoverPopup: null,
  boundariesLoaded: false,
  boundariesLoadPromise: null,
  gifReady: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  sidebarResizeFrame: null,
  compactPlotLayout: null,
  countryPlotHoverFrame: null,
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
const slowerAnimationButtonEl = document.getElementById("slowerAnimationButton");
const fasterAnimationButtonEl = document.getElementById("fasterAnimationButton");
const animationSpeedValueEl = document.getElementById("animationSpeedValue");
const downloadCountryGifButtonEl = document.getElementById("downloadCountryGifButton");
const downloadCountryPngButtonEl = document.getElementById("downloadCountryPngButton");
const highlightSelectedCityEl = document.getElementById("highlightSelectedCity");
const downloadGifButtonEl = document.getElementById("downloadGifButton");
const downloadTrendPngButtonEl = document.getElementById("downloadTrendPngButton");
const basemapToggleButtonEl = document.getElementById("basemapToggle");
const basemapToggleLabelEl = document.getElementById("basemapToggleLabel");
const metricCardsEl = document.getElementById("metricCards");
const countryPlotFrameEl = document.getElementById("countryPlotFrame");
const countryPlotCanvasEl = document.getElementById("countryPlotCanvas");
const countryPlotCtx = countryPlotCanvasEl.getContext("2d");
const pyramidPlotEl = document.getElementById("pyramidPlot");
const trendPlotEl = document.getElementById("trendPlot");
const loadingOverlayEl = document.getElementById("loadingOverlay");
const loadingMessageEl = document.getElementById("loadingMessage");
const loadingStepMapEl = document.getElementById("loadingStepMap");
const loadingStepVisualsEl = document.getElementById("loadingStepVisuals");
const metricExplorerEl = document.getElementById("metricExplorer");
const metricExplorerToggleEl = document.getElementById("metricExplorerToggle");
const metricExplorerBodyEl = document.getElementById("metricExplorerBody");
const mapModeButtons = Array.from(document.querySelectorAll("[data-map-mode]"));
const mapMetricFieldEl = document.getElementById("mapMetricField");
const mapMetricSelectEl = document.getElementById("mapMetricSelect");
const snapshotYearSelectEl = document.getElementById("snapshotYearSelect");
const changeStartYearSelectEl = document.getElementById("changeStartYearSelect");
const changeEndYearSelectEl = document.getElementById("changeEndYearSelect");
const changeUnitSelectEl = document.getElementById("changeUnitSelect");
const changeUnitFieldEl = document.getElementById("changeUnitField");
const snapshotControlsEl = document.getElementById("snapshotControls");
const changeControlsEl = document.getElementById("changeControls");
const driverExplanationEl = document.getElementById("driverExplanation");
const historicalDataStatusEl = document.getElementById("historicalDataStatus");
const showMetricPointsEl = document.getElementById("showMetricPoints");
const mapLegendTitleEl = document.getElementById("mapLegendTitle");
const mapLegendBarEl = document.getElementById("mapLegendBar");
const mapLegendMinEl = document.getElementById("mapLegendMin");
const mapLegendMidEl = document.getElementById("mapLegendMid");
const mapLegendMaxEl = document.getElementById("mapLegendMax");
const mapLegendNoteEl = document.getElementById("mapLegendNote");
const aboutDialogEl = document.getElementById("aboutDialog");
const openAboutButtonEl = document.getElementById("openAboutButton");
const openDownloadButtonEl = document.getElementById("openDownloadButton");
const openHeaderDownloadButtonEl = document.getElementById("openHeaderDownloadButton");
const openHeaderCitationsButtonEl = document.getElementById("openHeaderCitationsButton");
const citationsSectionEl = document.getElementById("citationsSection");
const downloadsSectionEl = document.getElementById("downloadsSection");
const citationCopyButtons = Array.from(document.querySelectorAll("[data-copy-target]"));
const citationCopyStatusEl = document.getElementById("citationCopyStatus");

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
  highlightSelectedCityEl.checked = state.countryPlotHighlightSelected;
  bindUiEvents();
  if (window.matchMedia("(max-width: 560px)").matches) {
    metricExplorerEl.classList.add("is-collapsed");
    metricExplorerToggleEl.textContent = "Expand";
    metricExplorerToggleEl.setAttribute("aria-expanded", "false");
  }
  applySidebarWidth(getDefaultSidebarWidth());
  initSidebarResizing();
  observeSidebarResize();
  setControlsEnabled(false);
  resizeCountryPlotCanvas();
  renderEmptyCountryPlot();

  setStartupLoadingPhase("map", "Loading the basemap…");
  const mapReadyPromise = initMap();

  setStartupLoadingPhase("map", "Loading city data and map metrics…");
  const dataBundlePromise = fetchStartupDataBundle();
  const [dataBundle] = await Promise.all([dataBundlePromise, mapReadyPromise]);
  const { cityIndex, snapshotMetricSeries } = dataBundle;

  state.years = cityIndex.years;
  state.ageColumns = cityIndex.age_columns;
  state.metricColumns = cityIndex.metric_columns;
  state.metricIndexByKey = new Map(cityIndex.metric_columns.map((metricKey, index) => [metricKey, index]));
  state.metricValuesPerYear = cityIndex.metric_values_per_year;
  state.ageValuesPerYear = cityIndex.age_values_per_year;
  state.snapshotMetricSeries = snapshotMetricSeries;
  state.snapshotYearIdx = Math.max(0, state.years.indexOf(cityIndex.snapshot_year));
  state.selectedYearIdx = state.snapshotYearIdx;
  state.mapStartYearIdx = 0;
  state.mapEndYearIdx = state.snapshotYearIdx;

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

  populateExplorerControls();
  setStartupLoadingPhase("map", "Rendering city metrics…");
  addCityPointLayers();
  updateMetricMap();
  applyBasemapTheme();
  updateBasemapToggleButton();

  setStartupLoadingPhase("visuals", "Preparing charts and controls…");

  hideStartupLoading();
  statusTextEl.textContent = "Map ready. Explore a metric or select a city.";
  setupBoundaryLoadOnZoom();
  queueHistoricalMetricsLoad();
}

function setupBoundaryLoadOnZoom() {
  if (!state.map) {
    return;
  }

  const loadWhenNeeded = () => {
    if (state.map.getZoom() < BOUNDARY_LOAD_ZOOM || state.boundariesLoaded) {
      return;
    }
    loadCityBoundariesInBackground().then(() => {
      if (state.boundariesLoaded) {
        state.map.off("zoomend", loadWhenNeeded);
      }
    });
  };

  state.map.on("zoomend", loadWhenNeeded);
  loadWhenNeeded();
}

function bindUiEvents() {
  yearSliderEl.addEventListener("input", () => {
    if (!state.selectedCity) {
      return;
    }
    stopAnimation();
    state.selectedYearIdx = Number(yearSliderEl.value);
    if (state.mapMode === "snapshot") {
      snapshotYearSelectEl.value = String(state.selectedYearIdx);
      updateMetricMap();
    }
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

  slowerAnimationButtonEl.addEventListener("click", () => adjustAnimationSpeed(-1));
  fasterAnimationButtonEl.addEventListener("click", () => adjustAnimationSpeed(1));

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

  highlightSelectedCityEl.addEventListener("change", () => {
    state.countryPlotHighlightSelected = highlightSelectedCityEl.checked;
    state.countryPlotMouse = { active: false, x: -1, y: -1 };
    if (state.selectedCity && state.metricSeries) {
      renderCountryPlot(state.selectedYearIdx);
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
    switchBasemapTheme(state.basemapTheme === "dark" ? "light" : "dark");
  });

  metricExplorerToggleEl.addEventListener("click", () => {
    const collapsed = metricExplorerEl.classList.toggle("is-collapsed");
    metricExplorerToggleEl.textContent = collapsed ? "Expand" : "Collapse";
    metricExplorerToggleEl.setAttribute("aria-expanded", String(!collapsed));
  });

  for (const button of mapModeButtons) {
    button.addEventListener("click", () => setMapMode(button.dataset.mapMode));
  }

  mapMetricSelectEl.addEventListener("change", () => {
    state.mapMetricKey = mapMetricSelectEl.value;
    updateMetricMap();
  });

  snapshotYearSelectEl.addEventListener("change", () => {
    state.selectedYearIdx = Number(snapshotYearSelectEl.value);
    yearSliderEl.value = String(state.selectedYearIdx);
    updateMetricMap();
    if (state.selectedCity) {
      renderSelectedYear();
    }
  });

  changeStartYearSelectEl.addEventListener("change", () => {
    state.mapStartYearIdx = Number(changeStartYearSelectEl.value);
    enforceExplorerYearOrder("start");
    updateMetricMap();
  });

  changeEndYearSelectEl.addEventListener("change", () => {
    state.mapEndYearIdx = Number(changeEndYearSelectEl.value);
    enforceExplorerYearOrder("end");
    updateMetricMap();
  });

  changeUnitSelectEl.addEventListener("change", () => {
    state.mapChangeUnit = changeUnitSelectEl.value;
    updateMetricMap();
  });

  showMetricPointsEl.addEventListener("change", () => {
    state.mapPointsVisible = showMetricPointsEl.checked;
    updatePointLayerVisibility();
  });

  openAboutButtonEl.addEventListener("click", () => openAboutSection(citationsSectionEl));
  openDownloadButtonEl.addEventListener("click", () => openAboutSection(downloadsSectionEl));
  openHeaderCitationsButtonEl.addEventListener("click", () => openAboutSection(citationsSectionEl));
  openHeaderDownloadButtonEl.addEventListener("click", () => openAboutSection(downloadsSectionEl));
  for (const button of citationCopyButtons) {
    button.addEventListener("click", () => copyCitation(button));
  }

  countryPlotCanvasEl.addEventListener("mousemove", (event) => {
    if (!state.selectedCity || !state.metricSeries) {
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
    scheduleCountryPlotPointerRender();
  });

  countryPlotCanvasEl.addEventListener("mouseleave", () => {
    if (!state.countryPlotMouse.active) {
      return;
    }
    state.countryPlotMouse = { active: false, x: -1, y: -1 };
    scheduleCountryPlotPointerRender();
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

function populateExplorerControls() {
  const yearOptions = state.years
    .map((year, index) => `<option value="${index}">${year}</option>`)
    .join("");

  for (const select of [snapshotYearSelectEl, changeStartYearSelectEl, changeEndYearSelectEl]) {
    select.innerHTML = yearOptions;
  }

  snapshotYearSelectEl.value = String(state.selectedYearIdx);
  changeStartYearSelectEl.value = String(state.mapStartYearIdx);
  changeEndYearSelectEl.value = String(state.mapEndYearIdx);
  setHistoricalControlsEnabled(false);
  setMapMode(state.mapMode, false);
}

function setHistoricalControlsEnabled(enabled, message = "") {
  for (const button of mapModeButtons) {
    button.disabled = !enabled && button.dataset.mapMode !== "snapshot";
  }
  snapshotYearSelectEl.disabled = !enabled;
  changeStartYearSelectEl.disabled = !enabled;
  changeEndYearSelectEl.disabled = !enabled;
  changeUnitSelectEl.disabled = !enabled;
  historicalDataStatusEl.hidden = enabled;
  historicalDataStatusEl.classList.toggle("is-error", Boolean(message));
  if (!enabled) {
    historicalDataStatusEl.textContent = message || "Historical layers are loading in the background…";
  }
}

function setMapMode(mode, shouldRender = true) {
  if (!['snapshot', 'change', 'drivers'].includes(mode)) {
    return;
  }
  if (mode !== "snapshot" && !state.metricSeries) {
    return;
  }
  state.mapMode = mode;
  for (const button of mapModeButtons) {
    const active = button.dataset.mapMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  const isSnapshot = mode === "snapshot";
  const isDrivers = mode === "drivers";
  snapshotControlsEl.hidden = !isSnapshot;
  changeControlsEl.hidden = isSnapshot;
  mapMetricFieldEl.hidden = isDrivers;
  changeUnitFieldEl.hidden = isDrivers;
  driverExplanationEl.hidden = !isDrivers;

  if (shouldRender) {
    updateMetricMap();
  }
}

function enforceExplorerYearOrder(changedField) {
  if (state.mapStartYearIdx < state.mapEndYearIdx) {
    return;
  }
  if (changedField === "start") {
    state.mapEndYearIdx = Math.min(state.years.length - 1, state.mapStartYearIdx + 1);
    if (state.mapEndYearIdx === state.mapStartYearIdx) {
      state.mapStartYearIdx = Math.max(0, state.mapEndYearIdx - 1);
    }
  } else {
    state.mapStartYearIdx = Math.max(0, state.mapEndYearIdx - 1);
  }
  changeStartYearSelectEl.value = String(state.mapStartYearIdx);
  changeEndYearSelectEl.value = String(state.mapEndYearIdx);
}

function openAboutSection(sectionEl) {
  if (!aboutDialogEl.open) {
    aboutDialogEl.showModal();
  }
  window.requestAnimationFrame(() => {
    sectionEl.focus({ preventScroll: true });
    aboutDialogEl.scrollTo({ top: Math.max(0, sectionEl.offsetTop - 18), behavior: "auto" });
  });
}

async function copyCitation(button) {
  const target = document.getElementById(button.dataset.copyTarget);
  if (!target) {
    return;
  }

  const text = target.tagName === "PRE"
    ? target.textContent.trim()
    : target.textContent.replace(/\s+/g, " ").trim();

  try {
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      copyTextFallback(text);
    }
    const originalLabel = button.dataset.defaultLabel || button.textContent;
    button.dataset.defaultLabel = originalLabel;
    button.textContent = "Copied";
    button.classList.add("is-copied");
    citationCopyStatusEl.textContent = `${button.dataset.copyName || "Citation"} copied to clipboard.`;
    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.classList.remove("is-copied");
    }, 1600);
  } catch (error) {
    citationCopyStatusEl.textContent = "Could not copy automatically. Select the citation text and copy it manually.";
    console.error(error);
  }
}

function copyTextFallback(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) {
    throw new Error("Clipboard access is unavailable.");
  }
}

function scheduleCountryPlotPointerRender() {
  if (state.countryPlotHoverFrame) {
    return;
  }
  state.countryPlotHoverFrame = window.requestAnimationFrame(() => {
    state.countryPlotHoverFrame = null;
    if (state.selectedCity && state.metricSeries) {
      renderCountryPlot(state.selectedYearIdx);
    }
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
    resizeCountryPlotCanvas();

    const nextCompactLayout = isCompactPlotLayout();
    if (
      state.selectedCity &&
      state.metricSeries &&
      state.ageSeriesByCity.has(String(state.selectedCity.id)) &&
      nextCompactLayout !== state.compactPlotLayout
    ) {
      renderSelectedYear();
      return;
    }

    if (state.selectedCity && state.metricSeries) {
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

function resizeCountryPlotCanvas() {
  if (!countryPlotFrameEl || !countryPlotCanvasEl) {
    return false;
  }

  const availableWidth = Math.max(280, Math.floor(countryPlotFrameEl.clientWidth - 16));
  const cssHeight = Math.round(Math.max(300, Math.min(500, availableWidth * 0.68)));
  const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const targetWidth = Math.round(availableWidth * pixelRatio);
  const targetHeight = Math.round(cssHeight * pixelRatio);

  countryPlotCanvasEl.style.height = `${cssHeight}px`;
  if (countryPlotCanvasEl.width === targetWidth && countryPlotCanvasEl.height === targetHeight) {
    return false;
  }

  state.countryPlotMouse = { active: false, x: -1, y: -1 };
  countryPlotCanvasEl.width = targetWidth;
  countryPlotCanvasEl.height = targetHeight;
  return true;
}

async function initMap() {
  const basemapStyle = await loadLabelFreeBasemapStyle();

  state.map = new maplibregl.Map({
    container: "map",
    style: basemapStyle,
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

async function loadLabelFreeBasemapStyle() {
  const styleEntries = await Promise.all(
    Object.entries(BASEMAP_STYLES).map(async ([theme, url]) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${theme} basemap style: HTTP ${response.status}`);
      }
      return [theme, await response.json()];
    })
  );
  const styles = Object.fromEntries(styleEntries);
  const darkStyle = styles.dark;
  const lightStyle = styles.light;

  if (!darkStyle || !lightStyle) {
    throw new Error("OpenFreeMap dark and light styles are required.");
  }

  state.basemapLayers = { dark: [], light: [] };
  const layers = [];

  for (const theme of ["dark", "light"]) {
    for (const layer of styles[theme].layers || []) {
      if (layer.type === "symbol") {
        continue;
      }

      const layerId = `basemap-${theme}-${layer.id}`;
      const defaultVisibility = layer.layout?.visibility || "visible";
      state.basemapLayers[theme].push({ id: layerId, visibility: defaultVisibility });
      layers.push({
        ...layer,
        id: layerId,
        layout: {
          ...layer.layout,
          visibility: theme === state.basemapTheme ? defaultVisibility : "none",
        },
      });
    }
  }

  return {
    version: 8,
    name: "GUDD label-free OpenFreeMap basemap",
    sprite: darkStyle.sprite || lightStyle.sprite,
    glyphs: darkStyle.glyphs || lightStyle.glyphs,
    sources: { ...darkStyle.sources, ...lightStyle.sources },
    layers,
  };
}

function getCountryFillProperty() {
  return state.basemapTheme === "dark" ? "CountryColorDark" : "CountryColorLight";
}

function getCountryOutlineProperty() {
  return state.basemapTheme === "dark" ? "CountryOutlineDark" : "CountryOutlineLight";
}

function getCountryFillOpacity() {
  if (state.mapPointsVisible) {
    return state.basemapTheme === "dark" ? 0.16 : 0.2;
  }
  return state.basemapTheme === "dark" ? 0.48 : 0.62;
}

function addCityPointLayers() {
  if (!state.map || state.map.getSource("city-points-source")) {
    return;
  }

  state.map.addSource("city-points-source", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  state.map.addLayer({
    id: "city-points",
    type: "circle",
    source: "city-points-source",
    paint: {
      "circle-color": ["get", "mapColor"],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        1,
        ["get", "pointRadius"],
        5,
        ["*", ["get", "pointRadius"], 1.35],
        10,
        ["*", ["get", "pointRadius"], 1.85],
      ],
      "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.72, 4, 0.8, 8, 0.88],
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 1, 0.35, 6, 0.8],
      "circle-stroke-color": state.basemapTheme === "dark" ? "rgba(255,255,255,0.62)" : "rgba(15,27,40,0.58)",
    },
  });

  state.map.addLayer({
    id: "city-point-selected",
    type: "circle",
    source: "city-points-source",
    filter: ["==", ["get", "ID_UC_G0"], ""],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 5.5, 6, 9, 10, 13],
      "circle-color": "rgba(0,0,0,0)",
      "circle-stroke-width": 2.4,
      "circle-stroke-color": state.basemapTheme === "dark" ? "#ffd166" : "#e44218",
    },
  });

  bindCityLayerEvents();
  updateMapSelection();
  updatePointLayerVisibility();
}

function loadCityBoundariesInBackground() {
  if (!state.dataDir || state.boundariesLoaded) {
    return Promise.resolve();
  }
  if (state.boundariesLoadPromise) {
    return state.boundariesLoadPromise;
  }

  state.boundariesLoadPromise = (async () => {
    try {
      const response = await fetch(`${state.dataDir}/static_boundaries.geojson`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const boundaries = await response.json();
      addCityBoundaryLayers(boundaries);
      state.boundariesLoaded = true;
    } catch (error) {
      // City points remain fully usable if the optional detailed boundaries fail.
      console.warn("City boundaries could not be loaded:", error);
    } finally {
      state.boundariesLoadPromise = null;
    }
  })();

  return state.boundariesLoadPromise;
}

function addCityBoundaryLayers(boundaries) {
  if (!state.map || !boundaries || state.map.getSource("cities")) {
    return;
  }

  state.map.addSource("cities", {
    type: "geojson",
    data: boundaries,
    tolerance: 0.35,
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
  }, "city-points");

  state.map.addLayer({
    id: "city-outline",
    type: "line",
    source: "cities",
    paint: {
      "line-color": ["get", getCountryOutlineProperty()],
      "line-width": ["interpolate", ["linear"], ["zoom"], 1.2, 1.2, 4, 1.8, 7, 2.4, 10, 3],
      "line-opacity": 1,
    },
  }, "city-points");

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
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 3.6, 8.5, 6, 10.3, 8, 12.2],
      "text-max-width": 9,
    },
    paint: {
      "text-color": "#ebf3ff",
      "text-halo-color": "rgba(7,11,19,0.82)",
      "text-halo-width": 1.2,
    },
  });

  bindCityLayerEvents();
  updateMapSelection();
  updatePointLayerVisibility();
}

function bindCityLayerEvents() {
  for (const layerId of ["city-points", "city-fill"]) {
    if (!state.map.getLayer(layerId)) {
      continue;
    }
    state.map.off("mouseenter", layerId, handleCityMouseEnter);
    state.map.off("mousemove", layerId, handleCityMouseMove);
    state.map.off("mouseleave", layerId, handleCityMouseLeave);
    state.map.off("click", layerId, handleCityClick);
    state.map.on("mouseenter", layerId, handleCityMouseEnter);
    state.map.on("mousemove", layerId, handleCityMouseMove);
    state.map.on("mouseleave", layerId, handleCityMouseLeave);
    state.map.on("click", layerId, handleCityClick);
  }
}

function handleCityMouseEnter() {
  state.map.getCanvas().style.cursor = "pointer";
}

function handleCityMouseLeave() {
  state.map.getCanvas().style.cursor = "";
  if (state.hoverPopup) {
    state.hoverPopup.remove();
    state.hoverPopup = null;
  }
}

function handleCityMouseMove(event) {
  const feature = event.features && event.features[0];
  if (!feature || !state.map) {
    return;
  }
  const properties = feature.properties || {};
  const cityId = normalizeCityId(properties.ID_UC_G0);
  const city = state.cityById.get(cityId);
  if (!city) {
    return;
  }

  let valueLine = "Select for demographic detail";
  if (properties.mapValueLabel) {
    valueLine = `<strong>${escapeHtml(properties.mapLabel || "Map value")}:</strong> ${escapeHtml(properties.mapValueLabel)}`;
  }
  const html = `
    <p class="city-popup-name">${escapeHtml(city.name || "Unknown city")}</p>
    <p class="city-popup-meta">${escapeHtml(city.country || "Unknown country")}</p>
    <p class="city-popup-value">${valueLine}</p>
  `;
  if (!state.hoverPopup) {
    state.hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 11 });
  }
  state.hoverPopup.setLngLat(event.lngLat).setHTML(html).addTo(state.map);
}

async function handleCityClick(event) {
  if (event.originalEvent && event.originalEvent.guddCityHandled) {
    return;
  }
  if (event.originalEvent) {
    event.originalEvent.guddCityHandled = true;
  }
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
  stopAnimation();
  state.selectedYearIdx = state.mapMode === "snapshot" ? Number(snapshotYearSelectEl.value) : state.mapEndYearIdx;
  state.countryPlotMouse = { active: false, x: -1, y: -1 };
  sidebarEl.classList.add("open");
  setControlsEnabled(false);
  updateMapSelection();
  renderCityHeader();
  statusTextEl.textContent = "Loading city charts…";

  try {
    await Promise.all([
      ensureHistoricalMetrics(),
      ensurePlotlyLoaded(),
      ensureCityAgeSeries(city),
    ]);
    if (!state.selectedCity || String(state.selectedCity.id) !== cityId) {
      return;
    }
    getCityAxisLimits(city);
    statusTextEl.textContent = `Selected ${city.name || "Unknown city"} (${city.country || "Unknown country"})`;
    setControlsEnabled(true);
    renderSelectedCity({ autoPlay: !prefersReducedMotion() });
  } catch (error) {
    if (state.selectedCity && String(state.selectedCity.id) === cityId) {
      statusTextEl.textContent = "Failed to load the selected city charts.";
      setControlsEnabled(false);
    }
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

function switchBasemapTheme(nextTheme) {
  if (!state.map || !BASEMAP_STYLES[nextTheme] || nextTheme === state.basemapTheme) {
    return;
  }

  state.basemapTheme = nextTheme;
  applyBasemapTheme();
  updateBasemapToggleButton();
  statusTextEl.textContent = state.selectedCity
    ? `Selected ${state.selectedCity.name || "Unknown city"} (${state.selectedCity.country || "Unknown country"})`
    : "Map ready. Explore a metric or select a city.";
}

function applyBasemapTheme() {
  if (!state.map) {
    return;
  }

  const isDark = state.basemapTheme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  document.body.classList.toggle("theme-light", !isDark);

  for (const [theme, layers] of Object.entries(state.basemapLayers)) {
    for (const layer of layers) {
      if (state.map.getLayer(layer.id)) {
        state.map.setLayoutProperty(
          layer.id,
          "visibility",
          theme === state.basemapTheme ? layer.visibility : "none"
        );
      }
    }
  }

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
  if (state.map.getLayer("city-points")) {
    state.map.setPaintProperty(
      "city-points",
      "circle-stroke-color",
      isDark ? "rgba(255,255,255,0.62)" : "rgba(15,27,40,0.58)"
    );
  }
  if (state.map.getLayer("city-point-selected")) {
    state.map.setPaintProperty("city-point-selected", "circle-stroke-color", isDark ? "#ffd166" : "#e44218");
  }

  if (
    state.selectedCity &&
    state.metricSeries &&
    typeof Plotly !== "undefined" &&
    state.ageSeriesByCity.has(String(state.selectedCity.id))
  ) {
    renderSelectedYear();
  } else if (!state.selectedCity) {
    renderEmptyCountryPlot();
  }
}

function updateBasemapToggleButton() {
  const isDark = state.basemapTheme === "dark";
  const actionLabel = isDark ? "Switch to light basemap" : "Switch to dark basemap";
  basemapToggleLabelEl.textContent = isDark ? "Light map" : "Dark map";
  basemapToggleButtonEl.title = actionLabel;
  basemapToggleButtonEl.setAttribute("aria-label", actionLabel);
}

function setControlsEnabled(enabled) {
  yearSliderEl.disabled = !enabled;
  playPauseButtonEl.disabled = !enabled;
  yearSliderEl.max = String(state.years.length - 1);
  downloadCountryGifButtonEl.disabled = !enabled;
  downloadCountryPngButtonEl.disabled = !enabled;
  highlightSelectedCityEl.disabled = !enabled;
  downloadGifButtonEl.disabled = !enabled;
  downloadTrendPngButtonEl.disabled = !enabled;
  updateAnimationSpeedControls(enabled);
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

function ensurePlotlyLoaded() {
  if (typeof Plotly !== "undefined") {
    return Promise.resolve();
  }
  if (state.plotlyPromise) {
    return state.plotlyPromise;
  }

  state.plotlyPromise = (async () => {
    for (const src of PLOTLY_SCRIPT_CANDIDATES) {
      try {
        await loadScriptOnce(src);
        if (typeof Plotly !== "undefined") {
          return;
        }
      } catch (_) {
        // Try the next CDN fallback.
      }
    }
    throw new Error("Could not load Plotly from CDN fallbacks.");
  })().catch((error) => {
    state.plotlyPromise = null;
    throw error;
  });

  return state.plotlyPromise;
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

async function ensureGifshotLoaded() {
  if (typeof gifshot !== "undefined") {
    return;
  }

  const candidates = [
    "https://cdn.jsdelivr.net/npm/gifshot@0.4.5/dist/gifshot.min.js",
    "https://unpkg.com/gifshot@0.4.5/dist/gifshot.min.js",
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
    const absoluteSrc = new URL(src, document.baseURI).href;
    const existing = Array.from(document.scripts).find((script) => script.src === absoluteSrc);
    if (existing) {
      if (existing.dataset.externalLoaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Script load failed: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = absoluteSrc;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.externalLoaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Script load failed: ${src}`));
      },
      { once: true }
    );
    document.head.appendChild(script);
  });
}

function updateMapSelection() {
  if (!state.map) {
    return;
  }
  const selectedId = state.selectedCity ? String(state.selectedCity.id) : "";
  for (const layerId of ["city-selected", "city-point-selected"]) {
    if (state.map.getLayer(layerId)) {
      state.map.setFilter(layerId, ["==", ["get", "ID_UC_G0"], selectedId]);
    }
  }
}

async function fetchStartupDataBundle() {
  for (const candidate of DATA_DIR_CANDIDATES) {
    try {
      const [cityIndexResponse, snapshotSeriesResponse] = await Promise.all([
        fetch(`${candidate}/city_index.json`),
        fetch(`${candidate}/city_snapshot_${INITIAL_SNAPSHOT_YEAR}.bin`),
      ]);
      if (!cityIndexResponse.ok || !snapshotSeriesResponse.ok) {
        continue;
      }
      state.dataDir = candidate;
      const [cityIndex, snapshotSeriesBuffer] = await Promise.all([
        cityIndexResponse.json(),
        snapshotSeriesResponse.arrayBuffer(),
      ]);
      if (cityIndex.snapshot_year !== INITIAL_SNAPSHOT_YEAR) {
        throw new Error(`Expected a ${INITIAL_SNAPSHOT_YEAR} startup snapshot.`);
      }
      const expectedBytes = cityIndex.cities.length * cityIndex.metric_values_per_year * Float32Array.BYTES_PER_ELEMENT;
      if (snapshotSeriesBuffer.byteLength !== expectedBytes) {
        throw new Error("Startup snapshot returned an unexpected byte length.");
      }
      return { cityIndex, snapshotMetricSeries: new Float32Array(snapshotSeriesBuffer) };
    } catch (_) {
      // keep trying candidate paths
    }
  }
  throw new Error("Could not find the required map data in expected data paths.");
}

function queueHistoricalMetricsLoad() {
  const load = () => {
    window.setTimeout(() => {
      ensureHistoricalMetrics().catch((error) => {
        // The 2020 snapshot remains usable if the optional history fails.
        console.error(error);
      });
    }, 800);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(load, { timeout: 2500 });
  } else {
    load();
  }
}

function ensureHistoricalMetrics() {
  if (state.metricSeries) {
    return Promise.resolve(state.metricSeries);
  }
  if (state.metricSeriesPromise) {
    return state.metricSeriesPromise;
  }
  if (!state.dataDir) {
    return Promise.reject(new Error("Data directory not resolved before loading historical metrics."));
  }

  setHistoricalControlsEnabled(false);
  state.metricSeriesPromise = fetch(`${state.dataDir}/city_metric_series.bin`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch historical metrics: HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const expectedBytes = state.cityById.size * state.years.length * state.metricValuesPerYear * Float32Array.BYTES_PER_ELEMENT;
      if (buffer.byteLength !== expectedBytes) {
        throw new Error("Historical metrics returned an unexpected byte length.");
      }
      state.metricSeries = new Float32Array(buffer);
      setHistoricalControlsEnabled(true);
      return state.metricSeries;
    })
    .catch((error) => {
      setHistoricalControlsEnabled(false, "Historical layers could not load. The 2020 snapshot remains available.");
      throw error;
    })
    .finally(() => {
      state.metricSeriesPromise = null;
    });

  return state.metricSeriesPromise;
}

async function ensureCityAgeSeries(city) {
  const cityId = String(city.id);
  const cached = state.ageSeriesByCity.get(cityId);
  if (cached) {
    return cached;
  }

  const existingPromise = state.ageSeriesPromiseByCity.get(cityId);
  if (existingPromise) {
    return existingPromise;
  }

  if (!state.dataDir) {
    throw new Error("Data directory not resolved before loading age series.");
  }

  const valueCount = state.years.length * state.ageValuesPerYear;
  const startByte = city.age_series_index * Float32Array.BYTES_PER_ELEMENT;
  const endByte = startByte + valueCount * Float32Array.BYTES_PER_ELEMENT - 1;
  const promise = fetch(`${state.dataDir}/city_age_series.bin`, {
    headers: { Range: `bytes=${startByte}-${endByte}` },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch city age series: HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      let cityBuffer = buffer;
      if (response.status !== 206) {
        cityBuffer = buffer.slice(startByte, endByte + 1);
      }
      if (cityBuffer.byteLength !== valueCount * Float32Array.BYTES_PER_ELEMENT) {
        throw new Error("City age series returned an unexpected byte length.");
      }
      const ageSeries = new Float32Array(cityBuffer);
      state.ageSeriesByCity.set(cityId, ageSeries);
      return ageSeries;
    })
    .finally(() => {
      state.ageSeriesPromiseByCity.delete(cityId);
    });

  state.ageSeriesPromiseByCity.set(cityId, promise);
  return promise;
}

function updateMetricMap() {
  if (!state.map || (!state.metricSeries && !state.snapshotMetricSeries)) {
    return;
  }
  const source = state.map.getSource("city-points-source");
  if (!source) {
    return;
  }

  const metricConfig = MAP_METRIC_CONFIG[state.mapMetricKey] || MAP_METRIC_CONFIG.total_pop;
  const records = [];
  for (const city of state.cityById.values()) {
    if (!Number.isFinite(city.longitude) || !Number.isFinite(city.latitude)) {
      continue;
    }

    let value = null;
    let sizeValue = null;
    let displayValue = "—";
    if (state.mapMode === "snapshot") {
      value = getMetricValue(city, state.selectedYearIdx, state.mapMetricKey);
      sizeValue = getMetricValue(city, state.selectedYearIdx, "total_pop");
      displayValue = value === null ? "—" : metricConfig.formatter(value);
    } else if (state.mapMode === "change") {
      const startValue = getMetricValue(city, state.mapStartYearIdx, state.mapMetricKey);
      const endValue = getMetricValue(city, state.mapEndYearIdx, state.mapMetricKey);
      const delta = startValue === null || endValue === null ? null : endValue - startValue;
      value = state.mapChangeUnit === "percent"
        ? delta === null || startValue === 0 ? null : (delta / Math.abs(startValue)) * 100
        : delta;
      sizeValue = getMetricValue(city, state.mapEndYearIdx, "total_pop");
      displayValue = value === null
        ? "—"
        : state.mapChangeUnit === "percent"
          ? formatSigned(value, 1, "%")
          : formatSignedMetric(value, metricConfig);
    } else {
      const growthDrivers = getGrowthDrivers(city, state.mapStartYearIdx, state.mapEndYearIdx);
      if (growthDrivers && growthDrivers.natural_change > 0 && growthDrivers.migration > 0 && growthDrivers.total_change > 0) {
        value = growthDrivers.migration_share;
        sizeValue = growthDrivers.total_change;
        displayValue = `${formatDecimal(value, 1)}% migration · ${formatPopulation(growthDrivers.migration)} migration / ${formatPopulation(growthDrivers.natural_change)} natural`;
      }
    }

    if (value !== null && Number.isFinite(value)) {
      records.push({ city, value, sizeValue, displayValue });
    }
  }

  const values = records.map((record) => record.value);
  const domain = getMetricMapDomain(values, metricConfig);
  const palette = getMetricMapPalette(metricConfig);
  const sizeValues = records
    .map((record) => record.sizeValue)
    .filter((value) => value !== null && Number.isFinite(value) && value > 0);
  const sizeDomain = getRobustDomain(sizeValues, 0.05, 0.95, [1, 1]);
  const mapLabel = getMetricMapLabel(metricConfig);

  const features = records.map((record) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [record.city.longitude, record.city.latitude] },
    properties: {
      ID_UC_G0: String(record.city.id),
      Name: record.city.name || "",
      Country: record.city.country || "",
      mapValue: record.value,
      mapValueLabel: record.displayValue,
      mapLabel,
      mapColor: colorForMapValue(record.value, domain, palette, metricConfig.scale === "log" && state.mapMode === "snapshot"),
      pointRadius: getPointRadius(record.sizeValue, sizeDomain),
    },
  }));

  state.mapPointData = { type: "FeatureCollection", features };
  state.mapPointSummary = { domain, palette, count: features.length, mapLabel };
  source.setData(state.mapPointData);
  updateMapLegend(metricConfig, domain, palette, features.length);
  updateMapSelection();
}

function getMetricMapDomain(values, metricConfig) {
  if (state.mapMode === "drivers") {
    return [0, 100];
  }
  if (state.mapMode === "snapshot" && metricConfig.fixedDomain) {
    return metricConfig.fixedDomain;
  }
  if (
    state.mapMode === "change" &&
    state.mapChangeUnit === "absolute" &&
    ["total_dr", "young_dr", "old_dr"].includes(state.mapMetricKey)
  ) {
    return [-0.3, 0.3];
  }

  const domain = getRobustDomain(values, 0.02, 0.98, [0, 1]);
  if (state.mapMode === "change") {
    const maximumMagnitude = Math.max(Math.abs(domain[0]), Math.abs(domain[1]), Number.EPSILON);
    return [-maximumMagnitude, maximumMagnitude];
  }
  return domain;
}

function getMetricMapPalette(metricConfig) {
  if (state.mapMode === "drivers") {
    return MAP_PALETTES.migration;
  }
  if (state.mapMode === "change") {
    return state.mapMetricKey === "total_sr" ? MAP_PALETTES.sexChange : MAP_PALETTES.change;
  }
  return MAP_PALETTES[metricConfig.palette] || MAP_PALETTES.viridis;
}

function getMetricMapLabel(metricConfig) {
  const startYear = state.years[state.mapStartYearIdx];
  const endYear = state.years[state.mapEndYearIdx];
  if (state.mapMode === "snapshot") {
    return `${metricConfig.shortLabel} · ${state.years[state.selectedYearIdx]}`;
  }
  if (state.mapMode === "drivers") {
    return `Migration share of positive growth · ${startYear}–${endYear}`;
  }
  const unitLabel = state.mapChangeUnit === "percent" ? "% change" : "absolute change";
  return `${metricConfig.shortLabel} · ${unitLabel} · ${startYear}–${endYear}`;
}

function updateMapLegend(metricConfig, domain, palette, count) {
  const midpoint = (domain[0] + domain[1]) / 2;
  mapLegendTitleEl.textContent = getMetricMapLabel(metricConfig);
  mapLegendBarEl.style.background = `linear-gradient(90deg, ${palette.join(", ")})`;

  const formatLegendValue = (value) => {
    if (state.mapMode === "drivers" || (state.mapMode === "change" && state.mapChangeUnit === "percent")) {
      return `${formatDecimal(value, Math.abs(value) < 10 ? 1 : 0)}%`;
    }
    if (state.mapMode === "change") {
      return formatSignedMetric(value, metricConfig);
    }
    if (metricConfig.unit === "people") {
      return formatCompactSigned(value);
    }
    return metricConfig.formatter(value);
  };
  if (state.mapMode === "drivers") {
    mapLegendMinEl.textContent = "Natural · 0%";
    mapLegendMidEl.textContent = "50 / 50";
    mapLegendMaxEl.textContent = "100% · Migration";
  } else {
    mapLegendMinEl.textContent = formatLegendValue(domain[0]);
    mapLegendMidEl.textContent = formatLegendValue(midpoint);
    mapLegendMaxEl.textContent = formatLegendValue(domain[1]);
  }

  const totalCities = state.cityById.size.toLocaleString();
  const pointSizeNote = state.mapMode === "drivers" ? "Point size shows total population growth." : "Point size shows city population.";
  mapLegendNoteEl.textContent = `${count.toLocaleString()} of ${totalCities} cities shown. ${pointSizeNote}`;
}

function updatePointLayerVisibility() {
  if (!state.map) {
    return;
  }
  const visibility = state.mapPointsVisible ? "visible" : "none";
  for (const layerId of ["city-points", "city-point-selected"]) {
    if (state.map.getLayer(layerId)) {
      state.map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
  if (state.map.getLayer("city-fill")) {
    state.map.setPaintProperty("city-fill", "fill-opacity", getCountryFillOpacity());
  }
}

function getRobustDomain(values, lowerQuantile, upperQuantile, fallback) {
  const finiteValues = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finiteValues.length) {
    return fallback;
  }
  let lower = quantileSorted(finiteValues, lowerQuantile);
  let upper = quantileSorted(finiteValues, upperQuantile);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return fallback;
  }
  if (lower === upper) {
    const padding = Math.max(Math.abs(lower) * 0.05, 1);
    lower -= padding;
    upper += padding;
  }
  return [lower, upper];
}

function quantileSorted(values, probability) {
  if (!values.length) {
    return null;
  }
  const position = (values.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  return values[lowerIndex] * (1 - fraction) + values[upperIndex] * fraction;
}

function colorForMapValue(value, domain, palette, useLogScale) {
  let lower = domain[0];
  let upper = domain[1];
  let transformedValue = value;
  if (useLogScale) {
    lower = Math.log1p(Math.max(0, lower));
    upper = Math.log1p(Math.max(0, upper));
    transformedValue = Math.log1p(Math.max(0, value));
  }
  const t = upper === lower ? 0.5 : Math.max(0, Math.min(1, (transformedValue - lower) / (upper - lower)));
  const scaled = t * (palette.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(palette.length - 1, lowerIndex + 1);
  return interpolateHexColor(palette[lowerIndex], palette[upperIndex], scaled - lowerIndex);
}

function interpolateHexColor(startColor, endColor, amount) {
  const start = startColor.replace("#", "");
  const end = endColor.replace("#", "");
  const channels = [0, 2, 4].map((offset) => {
    const startValue = parseInt(start.slice(offset, offset + 2), 16);
    const endValue = parseInt(end.slice(offset, offset + 2), 16);
    return Math.round(startValue + (endValue - startValue) * amount).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function getPointRadius(value, domain) {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return 2.1;
  }
  const lower = Math.log1p(Math.max(0, domain[0]));
  const upper = Math.log1p(Math.max(0, domain[1]));
  const transformed = Math.log1p(value);
  const normalized = upper === lower ? 0.5 : Math.max(0, Math.min(1, (transformed - lower) / (upper - lower)));
  return 2.1 + Math.sqrt(normalized) * 3.5;
}

function formatSigned(value, digits, suffix = "") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value, digits)}${suffix}`;
}

function formatSignedMetric(value, metricConfig) {
  const sign = value > 0 ? "+" : "";
  if (metricConfig.unit === "people") {
    return `${sign}${formatCompactSigned(value)}`;
  }
  return `${sign}${metricConfig.formatter(value)}`;
}

function renderSelectedCity({ autoPlay = false } = {}) {
  stopAnimation();
  yearSliderEl.value = String(state.selectedYearIdx);
  renderSelectedYear();
  if (autoPlay) {
    startAnimation();
  }
}

function renderCityHeader() {
  if (!state.selectedCity) {
    return;
  }

  cityTitleEl.textContent = state.selectedCity.name || "Unknown city";
  cityMetaRowsEl.innerHTML = `
    <p><span>Country:</span> ${escapeHtml(state.selectedCity.country || "Unknown")}</p>
    <p><span>Region:</span> ${escapeHtml(state.selectedCity.continent || "Unknown")}</p>
    <p><span>Income status:</span> ${escapeHtml(state.selectedCity.development || "Unknown")}</p>
  `;
}

function renderSelectedYear() {
  if (
    !state.selectedCity ||
    !state.metricSeries ||
    typeof Plotly === "undefined" ||
    !state.ageSeriesByCity.has(String(state.selectedCity.id))
  ) {
    return;
  }

  const year = state.years[state.selectedYearIdx];
  yearValueEl.textContent = String(year);

  const yearData = getCityYearData(state.selectedCity, state.selectedYearIdx);
  const axisLimits = getCityAxisLimits(state.selectedCity);
  state.compactPlotLayout = isCompactPlotLayout();

  renderMetricCards(yearData.metrics);
  renderCountryPlot(state.selectedYearIdx);
  renderPyramidPlot(yearData.ages, year, axisLimits);
  renderTrendPlot(year, axisLimits);
}

function isCompactPlotLayout() {
  const widths = [pyramidPlotEl.clientWidth, trendPlotEl.clientWidth].filter((width) => width > 0);
  return widths.length ? Math.min(...widths) < 420 : window.innerWidth < 560;
}

function getCityYearData(city, yearIndex) {
  const ageSeries = state.ageSeriesByCity.get(String(city.id));
  const ageStart = yearIndex * state.ageValuesPerYear;
  const ages = ageSeries
    ? Array.from(ageSeries.subarray(ageStart, ageStart + state.ageValuesPerYear), (value) => sanitizeNumber(value))
    : Array.from({ length: state.ageValuesPerYear }, () => null);
  const metrics = {};
  for (let i = 0; i < state.metricColumns.length; i += 1) {
    const metricName = state.metricColumns[i];
    metrics[metricName] = getMetricValue(city, yearIndex, metricName);
  }
  return { ages, metrics };
}

function getMetricSeries(city, metricKey) {
  if (!state.metricSeries) {
    return [];
  }
  const metricOffset = state.metricIndexByKey.get(metricKey);
  if (metricOffset === undefined) {
    return [];
  }

  const series = [];
  for (let i = 0; i < state.years.length; i += 1) {
    const index = city.metric_series_index + i * state.metricValuesPerYear + metricOffset;
    series.push(sanitizeNumber(state.metricSeries[index]));
  }
  return series;
}

function getMetricValue(city, yearIndex, metricKey) {
  const metricOffset = state.metricIndexByKey.get(metricKey);
  if (metricOffset === undefined) {
    return null;
  }

  if (state.metricSeries) {
    const index = city.metric_series_index + yearIndex * state.metricValuesPerYear + metricOffset;
    return sanitizeNumber(state.metricSeries[index]);
  }

  if (state.snapshotMetricSeries && yearIndex === state.snapshotYearIdx) {
    const metricCityBlockSize = state.years.length * state.metricValuesPerYear;
    const cityIndex = Math.floor(city.metric_series_index / metricCityBlockSize);
    const snapshotIndex = cityIndex * state.metricValuesPerYear + metricOffset;
    return sanitizeNumber(state.snapshotMetricSeries[snapshotIndex]);
  }

  return null;
}

function getGrowthDrivers(city, startYearIdx, endYearIdx) {
  const startPopulation = getMetricValue(city, startYearIdx, "total_pop");
  const endPopulation = getMetricValue(city, endYearIdx, "total_pop");
  if (startPopulation === null || endPopulation === null || endYearIdx <= startYearIdx) {
    return null;
  }

  let births = 0;
  let deaths = 0;
  let observedBirths = false;
  let observedDeaths = false;
  for (let yearIdx = startYearIdx; yearIdx <= endYearIdx; yearIdx += 1) {
    const birthValue = getMetricValue(city, yearIdx, "births");
    const deathValue = getMetricValue(city, yearIdx, "deaths_total");
    if (birthValue !== null) {
      births += birthValue;
      observedBirths = true;
    }
    if (deathValue !== null) {
      deaths += deathValue;
      observedDeaths = true;
    }
  }
  if (!observedBirths || !observedDeaths) {
    return null;
  }

  const totalChange = endPopulation - startPopulation;
  const naturalChange = births - deaths;
  const migration = totalChange - naturalChange;
  return {
    total_change: totalChange,
    natural_change: naturalChange,
    migration,
    migration_share: totalChange === 0 ? null : (migration / totalChange) * 100,
  };
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

function renderEmptyCountryPlot(message = "Select a city to compare it with national peers in any year.") {
  const colors = getCountryPlotTheme();
  const metrics = getCountryPlotMetrics(countryPlotCanvasEl);
  countryPlotCtx.clearRect(0, 0, countryPlotCanvasEl.width, countryPlotCanvasEl.height);
  countryPlotCtx.fillStyle = colors.canvasBg;
  countryPlotCtx.fillRect(0, 0, countryPlotCanvasEl.width, countryPlotCanvasEl.height);

  countryPlotCtx.fillStyle = colors.title;
  countryPlotCtx.font = metrics.titleFont;
  countryPlotCtx.textAlign = "center";
  countryPlotCtx.textBaseline = "alphabetic";
  countryPlotCtx.fillText("Urban population and dependency ratio", countryPlotCanvasEl.width / 2, metrics.titleY);

  countryPlotCtx.fillStyle = colors.subtitle;
  countryPlotCtx.font = metrics.subtitleFont;
  countryPlotCtx.fillText("Country context opens here once a city is selected.", countryPlotCanvasEl.width / 2, metrics.subtitleY);

  countryPlotCtx.fillStyle = colors.label;
  countryPlotCtx.font = metrics.axisFont;
  countryPlotCtx.textBaseline = "middle";
  countryPlotCtx.fillText(
    fitCanvasText(countryPlotCtx, message, countryPlotCanvasEl.width - metrics.subtitleSidePadding * 2),
    countryPlotCanvasEl.width / 2,
    countryPlotCanvasEl.height / 2
  );
}

function renderCountryPlot(yearIndex) {
  if (!state.selectedCity || !state.metricSeries) {
    renderEmptyCountryPlot();
    return;
  }

  const countryName = state.selectedCity.country || "Unknown";
  const plotData = getCountryPlotData(countryName);
  renderCountryPlotFrame(countryPlotCtx, countryPlotCanvasEl, plotData, yearIndex, {
    selectedCityId: state.countryPlotHighlightSelected ? String(state.selectedCity.id) : "",
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

  const drMin = safeDrValues.length ? Math.min(...safeDrValues) : 0.3;
  const drMax = safeDrValues.length ? Math.max(...safeDrValues) : 0.9;
  const drSpan = Math.max(0.08, drMax - drMin);
  const yPad = Math.max(0.025, drSpan * 0.12);
  const yTicks = buildLinearTicks(Math.max(0, drMin - yPad), drMax + yPad, 5);
  const yMin = Math.max(0, yTicks[0]);
  const visibleYTicks = yTicks.filter((tick) => tick >= yMin);

  return {
    xMin,
    xMax,
    xTicks: buildCountryPlotXTicks(xMin, xMax),
    yMin,
    yMax: visibleYTicks[visibleYTicks.length - 1],
    yTicks: visibleYTicks,
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
  const isHighlightEnabled = Boolean(selectedCityId);
  const currentPoints = plotData.pointsByYear[safeYearIndex] || [];
  let selectedCurrentPoint = null;
  let hoverCandidate = null;

  if (targetCanvas === countryPlotCanvasEl) {
    countryPlotCanvasEl.setAttribute(
      "aria-label",
      isHighlightEnabled
        ? `Scatter plot of urban population and dependency ratio for ${plotData.countryName} in ${targetYear}. ${state.selectedCity ? state.selectedCity.name : "The selected city"} is highlighted for the current year.`
        : `Scatter plot of urban population and dependency ratio for ${plotData.countryName} in ${targetYear}. No city is highlighted.`
    );
  }

  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.fillStyle = colors.canvasBg;
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  drawCountryPlotAxes(targetCtx, targetCanvas, axisLimits, geom, colors, metrics);

  for (const point of currentPoints) {
    if (point.cityId === selectedCityId) {
      selectedCurrentPoint = makeCountryPlotDrawable(
        point,
        safeYearIndex,
        safeYearIndex,
        axisLimits,
        geom,
        true
      );
      continue;
    }
    const drawablePoint = makeCountryPlotDrawable(
      point,
      safeYearIndex,
      safeYearIndex,
      axisLimits,
      geom,
      false
    );
    drawCountryPlotPoint(targetCtx, drawablePoint, colors, metrics);
    hoverCandidate = considerCountryPlotHover(mouse, drawablePoint, metrics, hoverCandidate);
  }

  if (selectedCurrentPoint) {
    drawCountryPlotPoint(targetCtx, selectedCurrentPoint, colors, metrics);
    hoverCandidate = considerCountryPlotHover(mouse, selectedCurrentPoint, metrics, hoverCandidate);
    drawCountryPlotSelectedLabel(targetCtx, selectedCurrentPoint, geom, colors, metrics);
  }

  targetCtx.font = metrics.titleFont;
  targetCtx.fillStyle = colors.title;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "alphabetic";
  targetCtx.fillText(
    fitCanvasText(targetCtx, "Urban population and dependency ratio", targetCanvas.width - metrics.subtitleSidePadding * 2),
    targetCanvas.width / 2,
    metrics.titleY
  );
  targetCtx.font = metrics.subtitleFont;
  targetCtx.fillStyle = colors.subtitle;
  const subtitle = selectedCurrentPoint
    ? `${plotData.countryName} · ${targetYear} · ${selectedCurrentPoint.cityName} selected`
    : `${plotData.countryName} · ${targetYear}`;
  targetCtx.fillText(
    fitCanvasText(targetCtx, subtitle, targetCanvas.width - metrics.subtitleSidePadding * 2),
    targetCanvas.width / 2,
    metrics.subtitleY
  );

  if (hoverCandidate) {
    drawCountryPlotHover(targetCtx, hoverCandidate, colors, metrics);
  }

  if (options.includeWatermark) {
    drawExportWatermark(targetCtx, targetCanvas.width, targetCanvas.height, colors);
  }
}

function makeCountryPlotDrawable(point, yearIndex, currentYearIndex, axisLimits, geom, isSelected) {
  return {
    ...point,
    year: state.years[yearIndex],
    x: toCountryPlotX(point.totalPop, axisLimits.xMin, axisLimits.xMax, geom),
    y: toCountryPlotY(point.totalDr, axisLimits.yMin, axisLimits.yMax, geom),
    isCurrentYear: yearIndex === currentYearIndex,
    isSelected,
  };
}

function considerCountryPlotHover(mouse, point, metrics, currentCandidate) {
  if (!mouse.active) {
    return currentCandidate;
  }
  const distance = Math.hypot(mouse.x - point.x, mouse.y - point.y);
  if (distance > metrics.hoverHitRadius) {
    return currentCandidate;
  }
  if (
    currentCandidate === null ||
    distance < currentCandidate.distance ||
    (point.isCurrentYear && !currentCandidate.isCurrentYear)
  ) {
    return { ...point, distance };
  }
  return currentCandidate;
}

function drawCountryPlotPoint(targetCtx, point, colors, metrics) {
  const radius = getCountryPlotRadius(point, metrics);
  const alpha = point.isSelected ? 1 : 0.72;
  const fillColor = point.isSelected
    ? rgbaFromArray(colors.selectedFill, alpha)
    : rgbaFromArray(colors.peerFill, alpha);

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

function drawCountryPlotSelectedLabel(targetCtx, point, geom, colors, metrics) {
  const placeLeft = point.x > geom.left + geom.width * 0.68;
  const labelX = point.x + (placeLeft ? -metrics.pointLabelOffset : metrics.pointLabelOffset);
  const labelY = Math.max(geom.top + metrics.pointLabelTopGuard, point.y - metrics.pointLabelLift);
  targetCtx.save();
  targetCtx.font = metrics.pointLabelFont;
  targetCtx.fillStyle = colors.selectedLabel;
  targetCtx.textAlign = placeLeft ? "right" : "left";
  targetCtx.textBaseline = "middle";
  targetCtx.fillText(
    fitCanvasText(targetCtx, point.cityName, Math.max(metrics.pointLabelMaxWidth, geom.width * 0.32)),
    labelX,
    labelY
  );
  targetCtx.restore();
}

function drawCountryPlotHover(targetCtx, hoverPoint, colors, metrics) {
  const padding = metrics.hoverPadding;
  const rawStatsText = `${hoverPoint.year} · ${formatCompactUpper(hoverPoint.totalPop)} people · dependency ${formatDecimal(hoverPoint.totalDr, 2)}`;
  const maxTextWidth = Math.max(
    metrics.hoverMinTextWidth,
    targetCtx.canvas.width - metrics.hoverEdgePadding * 2 - padding * 2
  );
  targetCtx.font = metrics.axisFont;
  const nameText = fitCanvasText(targetCtx, hoverPoint.cityName, maxTextWidth);
  const nameWidth = targetCtx.measureText(nameText).width;
  targetCtx.font = metrics.subtitleFont;
  const statsText = fitCanvasText(targetCtx, rawStatsText, maxTextWidth);
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
  targetCtx.fillText(nameText, boxX + boxWidth / 2, boxY + boxHeight / 2 - metrics.hoverNameOffset);
  targetCtx.fillStyle = colors.subtitle;
  targetCtx.font = metrics.subtitleFont;
  targetCtx.fillText(statsText, boxX + boxWidth / 2, boxY + boxHeight / 2 + metrics.hoverStatsOffset);
}

function drawCountryPlotAxes(targetCtx, targetCanvas, axisLimits, geom, colors, metrics) {
  targetCtx.font = metrics.axisFont;
  targetCtx.fillStyle = colors.label;
  targetCtx.strokeStyle = colors.grid;
  targetCtx.lineWidth = metrics.gridLineWidth;
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

  for (const tick of getVisibleCountryPlotXTicks(axisLimits, geom, metrics)) {
    if (tick < axisLimits.xMin || tick > axisLimits.xMax) {
      continue;
    }
    const px = toCountryPlotX(tick, axisLimits.xMin, axisLimits.xMax, geom);
    targetCtx.strokeStyle = colors.grid;
    targetCtx.lineWidth = metrics.gridLineWidth;
    targetCtx.beginPath();
    targetCtx.moveTo(px, geom.top);
    targetCtx.lineTo(px, geom.bottom);
    targetCtx.stroke();
    targetCtx.strokeStyle = colors.axisStrong;
    targetCtx.lineWidth = metrics.majorTickWidth;
    targetCtx.beginPath();
    targetCtx.moveTo(px, geom.bottom);
    targetCtx.lineTo(px, geom.bottom + metrics.majorTickLength);
    targetCtx.stroke();
    targetCtx.fillStyle = colors.label;
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "top";
    targetCtx.fillText(formatCompactUpper(tick), px, geom.bottom + metrics.xTickLabelOffset);
  }

  targetCtx.strokeStyle = colors.axisStrong;
  targetCtx.lineWidth = metrics.axisLineWidth;
  targetCtx.beginPath();
  targetCtx.moveTo(geom.left, geom.top);
  targetCtx.lineTo(geom.left, geom.bottom);
  targetCtx.lineTo(geom.right, geom.bottom);
  targetCtx.stroke();

  targetCtx.save();
  targetCtx.fillStyle = colors.label;
  targetCtx.translate(metrics.yAxisLabelX, geom.top + geom.height / 2);
  targetCtx.rotate(-Math.PI / 2);
  targetCtx.textAlign = "center";
  targetCtx.fillText("Total dependency ratio", 0, 0);
  targetCtx.restore();

  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "top";
  targetCtx.fillStyle = colors.label;
  targetCtx.fillText("Urban population (log scale)", geom.left + geom.width / 2, geom.bottom + metrics.xAxisLabelOffset);
}

function getVisibleCountryPlotXTicks(axisLimits, geom, metrics) {
  const visibleTicks = [];
  let lastX = -Infinity;
  for (const tick of axisLimits.xTicks) {
    const x = toCountryPlotX(tick, axisLimits.xMin, axisLimits.xMax, geom);
    if (x - lastX >= metrics.minXTickSpacing) {
      visibleTicks.push(tick);
      lastX = x;
    }
  }
  return visibleTicks;
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
  const axisFontSize = Math.max(12, Math.round(COUNTRY_PLOT_BASE_FONT_SIZE * scale));
  const titleFontSize = Math.max(16, Math.round(COUNTRY_PLOT_BASE_TITLE_FONT_SIZE * scale));
  const subtitleFontSize = Math.max(12, Math.round(COUNTRY_PLOT_BASE_SUBTITLE_FONT_SIZE * scale));

  return {
    scale,
    axisFont: `${axisFontSize}px Helvetica, Arial, sans-serif`,
    titleFont: `600 ${titleFontSize}px Helvetica, Arial, sans-serif`,
    subtitleFont: `${subtitleFontSize}px Helvetica, Arial, sans-serif`,
    pointLabelFont: `600 ${axisFontSize}px Helvetica, Arial, sans-serif`,
    titleY: Math.round(24 * scale),
    subtitleY: Math.round(46 * scale),
    subtitleSidePadding: Math.round(18 * scale),
    marginLeft: Math.round(82 * scale),
    marginRight: Math.round(28 * scale),
    marginTop: Math.round(74 * scale),
    marginBottom: Math.round(68 * scale),
    axisLineWidth: Math.max(1.8, CHART_AXIS_LINE_WIDTH * scale),
    gridLineWidth: Math.max(0.7, 0.75 * scale),
    pointStrokeWidth: Math.max(1, 1 * scale),
    pointStrokeWidthSoft: Math.max(0.8, 0.8 * scale),
    selectedStrokeWidth: Math.max(1.4, 1.5 * scale),
    minorTickWidth: Math.max(0.8, 0.8 * scale),
    majorTickWidth: Math.max(1.4, CHART_TICK_WIDTH * scale),
    minorTickLength: Math.round(6 * scale),
    majorTickLength: Math.round(8 * scale),
    xTickLabelOffset: Math.round(10 * scale),
    yTickPadding: Math.round(8 * scale),
    yAxisLabelX: Math.round(20 * scale),
    xAxisLabelOffset: Math.round(39 * scale),
    minXTickSpacing: Math.round(70 * scale),
    pointLabelOffset: Math.round(10 * scale),
    pointLabelLift: Math.round(10 * scale),
    pointLabelTopGuard: Math.round(10 * scale),
    pointLabelMaxWidth: Math.round(82 * scale),
    hoverPadding: Math.round(10 * scale),
    hoverMinTextWidth: Math.round(90 * scale),
    hoverHitRadius: Math.round(14 * scale),
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
    return 6.4 * scale;
  }
  return 4.1 * scale;
}

function buildPlotlyTitle(title, subtitle, compactLayout = false) {
  const titleText = wrapPlotlyTitleText(title, compactLayout ? 26 : 52);
  const subtitleText = wrapPlotlyTitleText(subtitle, compactLayout ? 32 : 56);
  return `<span style="font-weight:600">${titleText}</span><br><span style="font-size:${CHART_SUBTITLE_FONT_SIZE}px;font-weight:400">${subtitleText}</span>`;
}

function wrapPlotlyTitleText(value, maxCharacters) {
  const words = String(value).trim().split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.map((item) => escapeHtml(item)).join("<br>");
}

function renderPyramidPlot(ages, year, axisLimits) {
  const figure = buildPyramidFigure(ages, year, axisLimits, false);
  const cityName = state.selectedCity ? sanitizeCityName(state.selectedCity.name) : "Selected city";
  pyramidPlotEl.setAttribute(
    "aria-label",
    `Population pyramid for ${cityName} in ${year}, comparing male and female population by age group.`
  );
  Plotly.react(pyramidPlotEl, figure.traces, figure.layout, figure.config);
}

function buildPyramidFigure(ages, year, axisLimits, forGif = false) {
  const plotTheme = getPlotTheme();
  const cityName = state.selectedCity ? sanitizeCityName(state.selectedCity.name) : "City";
  const compactLayout = !forGif && isCompactPlotLayout();
  const female = ages.slice(0, 18).map((value) => (value === null ? 0 : value));
  const male = ages.slice(18, 36).map((value) => (value === null ? 0 : value));
  const maleNegative = male.map((value) => -value);

  const maxAxis = axisLimits.pyramidMax;
  const tickvals = axisLimits.pyramidTicks;
  const ticktext = tickvals.map((value) => formatCompactUpper(Math.abs(value)));

  const traces = [
    {
      x: maleNegative,
      y: AGE_BIN_LABELS,
      type: "bar",
      orientation: "h",
      marker: {
        color: "#4f99d8",
        line: { color: plotTheme.barEdge, width: 0.6 },
      },
      name: "Male",
      hovertemplate: "Male %{y}: %{customdata:,.0f}<extra></extra>",
      customdata: male,
    },
    {
      x: female,
      y: AGE_BIN_LABELS,
      type: "bar",
      orientation: "h",
      marker: {
        color: "#f08b56",
        line: { color: plotTheme.barEdge, width: 0.6 },
      },
      name: "Female",
      hovertemplate: "Female %{y}: %{x:,.0f}<extra></extra>",
    },
  ];

  const layout = {
    autosize: true,
    margin: forGif
      ? { l: 90, r: 38, t: 130, b: 70 }
      : compactLayout ? { l: 72, r: 22, t: 142, b: 66 } : { l: 86, r: 30, t: 130, b: 68 },
    paper_bgcolor: plotTheme.paperBg,
    plot_bgcolor: plotTheme.plotBg,
    font: { family: PLOT_FONT_FAMILY, size: CHART_FONT_SIZE, color: plotTheme.text },
    barmode: "relative",
    bargap: 0.08,
    hovermode: "closest",
    uirevision: state.selectedCity ? `pyramid-${state.selectedCity.id}` : "pyramid",
    transition: { duration: 0 },
    title: {
      text: buildPlotlyTitle("Population pyramid", `${cityName} · ${year}`, compactLayout),
      font: { family: PLOT_FONT_FAMILY, size: compactLayout ? 17 : CHART_TITLE_FONT_SIZE },
      x: 0.5,
      xanchor: "center",
      y: 0.97,
      yanchor: "top",
      pad: { t: 4, b: 2 },
      automargin: true,
    },
    xaxis: {
      title: { text: "Population (people)", font: { family: PLOT_FONT_FAMILY, size: CHART_AXIS_TITLE_FONT_SIZE }, standoff: 12 },
      range: [-maxAxis, maxAxis],
      tickvals,
      ticktext,
      tickfont: { family: PLOT_FONT_FAMILY, size: CHART_TICK_FONT_SIZE },
      showline: true,
      linecolor: plotTheme.axisLine,
      linewidth: CHART_AXIS_LINE_WIDTH,
      ticks: "outside",
      ticklen: 6,
      tickwidth: CHART_TICK_WIDTH,
      showgrid: true,
      gridcolor: plotTheme.grid,
      gridwidth: 1,
      zeroline: true,
      zerolinecolor: plotTheme.zeroline,
      zerolinewidth: CHART_AXIS_LINE_WIDTH,
      fixedrange: true,
      automargin: false,
    },
    yaxis: {
      title: { text: "Age group (years)", font: { family: PLOT_FONT_FAMILY, size: CHART_AXIS_TITLE_FONT_SIZE }, standoff: 10 },
      automargin: false,
      categoryorder: "array",
      categoryarray: AGE_BIN_LABELS,
      tickmode: "array",
      tickvals: AGE_BIN_LABELS,
      ticktext: AGE_BIN_LABELS,
      tickfont: { family: PLOT_FONT_FAMILY, size: CHART_TICK_FONT_SIZE },
      showline: true,
      linecolor: plotTheme.axisLine,
      linewidth: CHART_AXIS_LINE_WIDTH,
      ticks: "outside",
      ticklen: 6,
      tickwidth: CHART_TICK_WIDTH,
      showgrid: true,
      gridcolor: plotTheme.gridSoft,
      gridwidth: 1,
      fixedrange: true,
    },
    showlegend: true,
    legend: {
      orientation: "h",
      y: 1.05,
      yanchor: "bottom",
      x: 0.5,
      xanchor: "center",
      bgcolor: "rgba(0,0,0,0)",
      borderwidth: 0,
      font: { family: PLOT_FONT_FAMILY, size: CHART_LEGEND_FONT_SIZE },
    },
    hoverlabel: {
      font: { family: PLOT_FONT_FAMILY, size: CHART_HOVER_FONT_SIZE, color: plotTheme.hoverText },
      bgcolor: plotTheme.hoverBg,
      bordercolor: plotTheme.hoverBorder,
    },
  };

  const config = {
    displayModeBar: false,
    responsive: !forGif,
    staticPlot: Boolean(forGif),
    scrollZoom: false,
    doubleClick: false,
  };

  return { traces, layout, config };
}

function renderTrendPlot(selectedYear, axisLimits) {
  const plotTheme = getPlotTheme();
  const cityName = state.selectedCity ? sanitizeCityName(state.selectedCity.name) : "City";
  const compactLayout = isCompactPlotLayout();
  const totalPop = getMetricSeries(state.selectedCity, "total_pop");
  const totalDr = getMetricSeries(state.selectedCity, "total_dr");
  const firstYear = state.years[0];
  const lastYear = state.years[state.years.length - 1];

  trendPlotEl.setAttribute(
    "aria-label",
    `Population and dependency ratio from ${firstYear} to ${lastYear} for ${cityName}. The current year is ${selectedYear}.`
  );

  const traces = [
    {
      x: state.years,
      y: totalPop,
      type: "scatter",
      mode: "lines",
      name: "Total population",
      line: { color: "#1aa39b", width: 3.2 },
      yaxis: "y",
      hovertemplate: "%{y:,.0f}<extra>Total population</extra>",
    },
    {
      x: state.years,
      y: totalDr,
      type: "scatter",
      mode: "lines",
      name: "Dependency ratio",
      line: { color: "#ef7b4d", width: 3.2 },
      yaxis: "y2",
      hovertemplate: "%{y:.3f}<extra>Dependency ratio</extra>",
    },
    {
      x: [selectedYear],
      y: [totalPop[state.years.indexOf(selectedYear)]],
      type: "scatter",
      mode: "markers",
      marker: { color: "#1aa39b", size: 10, line: { color: plotTheme.plotBg, width: 1.8 } },
      cliponaxis: false,
      yaxis: "y",
      showlegend: false,
      hoverinfo: "skip",
    },
    {
      x: [selectedYear],
      y: [totalDr[state.years.indexOf(selectedYear)]],
      type: "scatter",
      mode: "markers",
      marker: { color: "#ef7b4d", size: 10, line: { color: plotTheme.plotBg, width: 1.8 } },
      cliponaxis: false,
      yaxis: "y2",
      showlegend: false,
      hoverinfo: "skip",
    },
  ];

  const layout = {
    autosize: true,
    margin: compactLayout ? { l: 72, r: 72, t: 142, b: 66 } : { l: 86, r: 86, t: 130, b: 68 },
    paper_bgcolor: plotTheme.paperBg,
    plot_bgcolor: plotTheme.plotBg,
    font: { family: PLOT_FONT_FAMILY, size: CHART_FONT_SIZE, color: plotTheme.text },
    hovermode: "x unified",
    uirevision: state.selectedCity ? `trend-${state.selectedCity.id}` : "trend",
    transition: { duration: 0 },
    title: {
      text: buildPlotlyTitle("Population and dependency over time", `${cityName} · ${firstYear}–${lastYear}`, compactLayout),
      font: { family: PLOT_FONT_FAMILY, size: compactLayout ? 17 : CHART_TITLE_FONT_SIZE },
      x: 0.5,
      xanchor: "center",
      y: 0.97,
      yanchor: "top",
      pad: { t: 4, b: 2 },
      automargin: true,
    },
    xaxis: {
      title: { text: "Year", font: { family: PLOT_FONT_FAMILY, size: CHART_AXIS_TITLE_FONT_SIZE }, standoff: 12 },
      range: [firstYear, lastYear],
      tick0: firstYear,
      dtick: compactLayout ? 10 : 5,
      showline: true,
      linecolor: plotTheme.axisLine,
      linewidth: CHART_AXIS_LINE_WIDTH,
      ticks: "outside",
      ticklen: 6,
      tickwidth: CHART_TICK_WIDTH,
      tickfont: { family: PLOT_FONT_FAMILY, size: CHART_TICK_FONT_SIZE },
      showgrid: true,
      gridcolor: plotTheme.grid,
      gridwidth: 1,
      fixedrange: true,
      automargin: false,
    },
    yaxis: {
      title: { text: "Total population", font: { family: PLOT_FONT_FAMILY, size: CHART_AXIS_TITLE_FONT_SIZE }, standoff: 12 },
      range: [0, axisLimits.popUpper],
      tickvals: axisLimits.popTicks,
      ticktext: axisLimits.popTicks.map((value) => formatCompactUpper(value)),
      tickfont: { family: PLOT_FONT_FAMILY, size: CHART_TICK_FONT_SIZE, color: "#1aa39b" },
      showline: true,
      linecolor: "#1aa39b",
      linewidth: CHART_AXIS_LINE_WIDTH,
      ticks: "outside",
      ticklen: 6,
      tickwidth: CHART_TICK_WIDTH,
      showgrid: true,
      gridcolor: plotTheme.grid,
      gridwidth: 1,
      fixedrange: true,
      automargin: false,
    },
    yaxis2: {
      title: { text: "Dependency ratio", font: { family: PLOT_FONT_FAMILY, size: CHART_AXIS_TITLE_FONT_SIZE }, standoff: 12 },
      range: axisLimits.drRange,
      overlaying: "y",
      side: "right",
      tickformat: ".2f",
      tickfont: { family: PLOT_FONT_FAMILY, size: CHART_TICK_FONT_SIZE, color: "#ef7b4d" },
      showline: true,
      linecolor: "#ef7b4d",
      linewidth: CHART_AXIS_LINE_WIDTH,
      ticks: "outside",
      ticklen: 6,
      tickwidth: CHART_TICK_WIDTH,
      showgrid: false,
      fixedrange: true,
      automargin: false,
    },
    showlegend: true,
    legend: {
      orientation: "h",
      y: 1.05,
      yanchor: "bottom",
      x: 0.5,
      xanchor: "center",
      bgcolor: "rgba(0,0,0,0)",
      borderwidth: 0,
      font: { family: PLOT_FONT_FAMILY, size: CHART_LEGEND_FONT_SIZE },
    },
    hoverlabel: {
      font: { family: PLOT_FONT_FAMILY, size: CHART_HOVER_FONT_SIZE, color: plotTheme.hoverText },
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
        line: { color: plotTheme.verticalMarker, width: 1.6, dash: "dot" },
      },
    ],
  };

  return Plotly.react(trendPlotEl, traces, layout, {
    displayModeBar: false,
    responsive: true,
    scrollZoom: false,
    doubleClick: false,
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
    if (state.mapMode === "snapshot") {
      snapshotYearSelectEl.value = String(state.selectedYearIdx);
      updateMetricMap();
    }
    renderSelectedYear();
  }, getAnimationIntervalMs());
  updatePlaybackButtonLabel();
}

function stopAnimation() {
  if (state.animationTimer) {
    window.clearInterval(state.animationTimer);
    state.animationTimer = null;
  }
  playPauseButtonEl.textContent = "Play";
  updatePlaybackButtonLabel();
}

function adjustAnimationSpeed(direction) {
  const nextIndex = Math.max(
    0,
    Math.min(ANIMATION_SPEEDS.length - 1, state.animationSpeedIndex + direction)
  );
  if (nextIndex === state.animationSpeedIndex) {
    return;
  }

  const wasPlaying = Boolean(state.animationTimer);
  if (wasPlaying) {
    window.clearInterval(state.animationTimer);
    state.animationTimer = null;
  }
  state.animationSpeedIndex = nextIndex;
  updateAnimationSpeedControls(!yearSliderEl.disabled);
  if (wasPlaying) {
    startAnimation();
  }
}

function updateAnimationSpeedControls(enabled) {
  const speed = ANIMATION_SPEEDS[state.animationSpeedIndex];
  const speedLabel = `${speed}×`;
  animationSpeedValueEl.value = speedLabel;
  animationSpeedValueEl.textContent = speedLabel;
  slowerAnimationButtonEl.disabled = !enabled || state.animationSpeedIndex === 0;
  fasterAnimationButtonEl.disabled = !enabled || state.animationSpeedIndex === ANIMATION_SPEEDS.length - 1;

  const slowerSpeed = ANIMATION_SPEEDS[Math.max(0, state.animationSpeedIndex - 1)];
  const fasterSpeed = ANIMATION_SPEEDS[Math.min(ANIMATION_SPEEDS.length - 1, state.animationSpeedIndex + 1)];
  slowerAnimationButtonEl.title = state.animationSpeedIndex === 0 ? "Minimum animation speed" : `Slow to ${slowerSpeed}×`;
  fasterAnimationButtonEl.title = state.animationSpeedIndex === ANIMATION_SPEEDS.length - 1 ? "Maximum animation speed" : `Speed up to ${fasterSpeed}×`;
  slowerAnimationButtonEl.setAttribute("aria-label", slowerAnimationButtonEl.title);
  fasterAnimationButtonEl.setAttribute("aria-label", fasterAnimationButtonEl.title);
  updatePlaybackButtonLabel();
}

function updatePlaybackButtonLabel() {
  const action = state.animationTimer ? "Pause" : "Play";
  const speed = ANIMATION_SPEEDS[state.animationSpeedIndex];
  playPauseButtonEl.setAttribute("aria-label", `${action} animation at ${speed}× speed`);
  playPauseButtonEl.title = `${action} animation at ${speed}× speed`;
}

function getAnimationIntervalMs() {
  return BASE_PLAY_INTERVAL_MS / ANIMATION_SPEEDS[state.animationSpeedIndex];
}

function getGifFrameIntervalSeconds() {
  return getAnimationIntervalMs() / 1000;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function downloadCountryPlotGif() {
  if (!state.selectedCity || !state.metricSeries) {
    return;
  }
  if (!state.gifReady) {
    downloadCountryGifButtonEl.disabled = true;
    statusTextEl.textContent = "Loading GIF export tools…";
    await prepareGifSupport();
  }
  if (!state.gifReady) {
    statusTextEl.textContent = "GIF export unavailable: gifshot library could not be loaded.";
    return;
  }

  stopAnimation();
  const gifFrameIntervalSeconds = getGifFrameIntervalSeconds();
  const gifSpeedLabel = `${ANIMATION_SPEEDS[state.animationSpeedIndex]}×`;
  setControlsEnabled(false);
  statusTextEl.textContent = `Rendering country frames for GIF at ${gifSpeedLabel}…`;

  try {
    const plotData = getCountryPlotData(state.selectedCity.country || "Unknown");
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = COUNTRY_PLOT_CANVAS_WIDTH;
    exportCanvas.height = COUNTRY_PLOT_CANVAS_HEIGHT;
    const exportCtx = exportCanvas.getContext("2d");
    const images = [];

    for (let yearIdx = 0; yearIdx < state.years.length; yearIdx += 1) {
      renderCountryPlotFrame(exportCtx, exportCanvas, plotData, yearIdx, {
        displayScale: COUNTRY_PLOT_EXPORT_DISPLAY_SCALE,
        selectedCityId: state.countryPlotHighlightSelected ? String(state.selectedCity.id) : "",
        includeWatermark: true,
      });
      images.push(exportCanvas.toDataURL("image/png"));
    }

    statusTextEl.textContent = "Encoding GIF…";
    const gifDataUri = await createGifFromImages(
      images,
      exportCanvas.width,
      exportCanvas.height,
      gifFrameIntervalSeconds
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
  if (!state.selectedCity || !state.metricSeries) {
    return;
  }

  downloadCountryPngButtonEl.disabled = true;
  statusTextEl.textContent = "Rendering high-resolution country PNG…";

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
        displayScale: COUNTRY_PLOT_EXPORT_DISPLAY_SCALE,
        selectedCityId: state.countryPlotHighlightSelected ? String(state.selectedCity.id) : "",
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
  if (!state.selectedCity || !state.metricSeries) {
    return;
  }
  if (!state.gifReady) {
    downloadGifButtonEl.disabled = true;
    statusTextEl.textContent = "Loading GIF export tools…";
    await prepareGifSupport();
  }
  if (!state.gifReady) {
    statusTextEl.textContent = "GIF export unavailable: gifshot library could not be loaded.";
    return;
  }

  stopAnimation();
  const gifFrameIntervalSeconds = getGifFrameIntervalSeconds();
  const gifSpeedLabel = `${ANIMATION_SPEEDS[state.animationSpeedIndex]}×`;
  setControlsEnabled(false);
  statusTextEl.textContent = `Rendering pyramid frames for GIF at ${gifSpeedLabel}…`;

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

    statusTextEl.textContent = "Encoding GIF…";
    const gifDataUri = await createGifFromImages(images, frameWidth, frameHeight, gifFrameIntervalSeconds);
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
  if (!state.selectedCity || !state.metricSeries) {
    return;
  }

  downloadTrendPngButtonEl.disabled = true;
  statusTextEl.textContent = "Rendering high-resolution PNG…";
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
  targetCtx.font = `500 ${fontSize}px Helvetica, Arial, sans-serif`;
  targetCtx.fillText(EXPORT_WATERMARK_LINES[0], width - padding, bottomY - lineHeight);
  targetCtx.font = `italic 500 ${fontSize}px Helvetica, Arial, sans-serif`;
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
      axisLine: "rgba(220,235,250,0.78)",
      grid: "rgba(182,211,242,0.16)",
      gridSoft: "rgba(182,211,242,0.11)",
      zeroline: "rgba(230,244,255,0.78)",
      legendBg: "rgba(10,21,33,0.78)",
      legendBorder: "rgba(157,191,226,0.3)",
      hoverBg: "rgba(11,25,38,0.95)",
      hoverBorder: "rgba(170,203,235,0.52)",
      hoverText: "#e4f0ff",
      verticalMarker: "rgba(201,223,246,0.52)",
      barEdge: "rgba(230,244,255,0.32)",
    };
  }

  return {
    paperBg: "#fffef8",
    plotBg: "#fffef8",
    text: "#24364a",
    axisLine: "rgba(30,46,66,0.7)",
    grid: "rgba(35,52,73,0.12)",
    gridSoft: "rgba(35,52,73,0.08)",
    zeroline: "rgba(25,40,58,0.55)",
    legendBg: "rgba(255,255,255,0.82)",
    legendBorder: "rgba(35,52,73,0.16)",
    hoverBg: "rgba(255,255,255,0.96)",
    hoverBorder: "rgba(55,74,97,0.38)",
    hoverText: "#24364a",
    verticalMarker: "rgba(37,48,66,0.5)",
    barEdge: "rgba(34,52,72,0.24)",
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
      peerFill: [91, 154, 199],
      selectedFill: [255, 209, 102],
      selectedStroke: "#fff4cf",
      selectedLabel: "#ffe49a",
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
    peerFill: [66, 132, 171],
    selectedFill: [227, 106, 63],
    selectedStroke: "#6e2f10",
    selectedLabel: "#9c3e1d",
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

function rgbaFromArray(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function fitCanvasText(targetCtx, text, maxWidth) {
  const input = String(text);
  if (targetCtx.measureText(input).width <= maxWidth) {
    return input;
  }

  const ellipsis = "…";
  let low = 0;
  let high = input.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (targetCtx.measureText(`${input.slice(0, middle)}${ellipsis}`).width <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return `${input.slice(0, low)}${ellipsis}`;
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
  const slug = String(value || "selection")
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return slug || "selection";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
