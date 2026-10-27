import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "leaflet/dist/leaflet.css";
import "./style.css";

import { defaultLayerId, layers, lokeren, places } from "./catalogue";
import { MapView } from "./mapView";
import {
  activateLayer,
  formatDegree,
  formatZoom,
  kindLabel,
  layerById,
  layerCovers,
  moveView,
  stepLayer,
  suggestCompareId,
} from "./model";
import { registerServiceWorker } from "./pwa";
import { locatePlace, suggestPlaces } from "./search";
import { buildRuler } from "./timeline";
import { TimelineRuler, type LayerMark } from "./timelineView";
import type { MapLayer, ViewState } from "./types";

const STORAGE_KEY = "landkaarten-view";

const mapEl = document.querySelector<HTMLElement>("#map");
const infoEl = document.querySelector<HTMLElement>("#info");
const liveEl = document.querySelector<HTMLElement>("#live");
const loadbar = document.querySelector<HTMLElement>("#loadbar");
const searchForm = document.querySelector<HTMLFormElement>("#search-form");
const searchInput = document.querySelector<HTMLInputElement>("#search");
const suggestionsEl = document.querySelector<HTMLElement>("#suggestions");
const searchToggle = document.querySelector<HTMLButtonElement>("#search-toggle");
const compareToggle = document.querySelector<HTMLButtonElement>("#compare-toggle");
const compareCard = document.querySelector<HTMLElement>("#compare-card");
const compareClose = document.querySelector<HTMLButtonElement>("#compare-close");
const compareSelect = document.querySelector<HTMLSelectElement>("#compare-with");
const swipeInput = document.querySelector<HTMLInputElement>("#swipe");
const opacityInput = document.querySelector<HTMLInputElement>("#opacity");
const swipeLabel = document.querySelector<HTMLElement>("#swipe-label");
const opacityLabel = document.querySelector<HTMLElement>("#opacity-label");
const swipeHandle = document.querySelector<HTMLButtonElement>("#swipe-handle");
const modeSwipe = document.querySelector<HTMLButtonElement>("#mode-swipe");
const modeOpacity = document.querySelector<HTMLButtonElement>("#mode-opacity");
const infoToggle = document.querySelector<HTMLButtonElement>("#info-toggle");
const infoCard = document.querySelector<HTMLElement>("#info-card");
const infoClose = document.querySelector<HTMLButtonElement>("#info-close");
const offlineEl = document.querySelector<HTMLElement>("#offline");
const rulerViewport = document.querySelector<HTMLElement>("#ruler-viewport");
const rulerTrack = document.querySelector<HTMLElement>("#ruler-track");
const needle = document.querySelector<HTMLElement>("#needle");
const yearReadout = document.querySelector<HTMLElement>("#year-readout");
const nameReadout = document.querySelector<HTMLElement>("#name-readout");
const coverageFlag = document.querySelector<HTMLElement>("#coverage-flag");
const gaugeLat = document.querySelector<HTMLElement>("#gauge-lat");
const gaugeLng = document.querySelector<HTMLElement>("#gauge-lng");
const gaugeZoom = document.querySelector<HTMLElement>("#gauge-zoom");
const timelineEl = document.querySelector<HTMLElement>("#timeline");

if (
  !mapEl ||
  !infoEl ||
  !liveEl ||
  !loadbar ||
  !searchForm ||
  !searchInput ||
  !suggestionsEl ||
  !searchToggle ||
  !compareToggle ||
  !compareCard ||
  !compareClose ||
  !compareSelect ||
  !swipeInput ||
  !opacityInput ||
  !swipeLabel ||
  !opacityLabel ||
  !swipeHandle ||
  !modeSwipe ||
  !modeOpacity ||
  !infoToggle ||
  !infoCard ||
  !infoClose ||
  !offlineEl ||
  !rulerViewport ||
  !rulerTrack ||
  !needle ||
  !yearReadout ||
  !nameReadout ||
  !coverageFlag ||
  !gaugeLat ||
  !gaugeLng ||
  !gaugeZoom ||
  !timelineEl
) {
  throw new Error("De pagina mist een vast onderdeel.");
}

const ui = {
  mapEl,
  infoEl,
  liveEl,
  loadbar,
  searchForm,
  searchInput,
  suggestionsEl,
  searchToggle,
  compareToggle,
  compareCard,
  compareClose,
  compareSelect,
  swipeInput,
  opacityInput,
  swipeLabel,
  opacityLabel,
  swipeHandle,
  modeSwipe,
  modeOpacity,
  infoToggle,
  infoCard,
  infoClose,
  offlineEl,
  yearReadout,
  nameReadout,
  coverageFlag,
  gaugeLat,
  gaugeLng,
  gaugeZoom,
  timelineEl,
};

type Panel = "none" | "search" | "info" | "compare";

const ruler = buildRuler(layers);
const marks = new Map<string, LayerMark>(
  layers.map((layer) => [
    layer.id,
    { timelineLabel: layer.timelineLabel, title: layer.title, premium: layer.premium },
  ]),
);

function readStoredView(): ViewState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ViewState>;
    if (!parsed.layerId || !layerById(layers, parsed.layerId)) return null;
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number" || typeof parsed.zoom !== "number") {
      return null;
    }
    return {
      layerId: parsed.layerId,
      compareEnabled: false,
      compareId: null,
      compareMode: "swipe",
      swipe: 54,
      opacity: 0.55,
      lat: parsed.lat,
      lng: parsed.lng,
      zoom: parsed.zoom,
    };
  } catch {
    return null;
  }
}

let state: ViewState = readStoredView() ?? {
  layerId: defaultLayerId,
  compareEnabled: false,
  compareId: null,
  compareMode: "swipe",
  swipe: 54,
  opacity: 0.55,
  lat: lokeren.lat,
  lng: lokeren.lng,
  zoom: lokeren.zoom,
};

let panel: Panel = "none";
let ready = false;
let fromRuler = false;

const timeline = new TimelineRuler(rulerViewport, rulerTrack, needle, ruler, marks, (layerId) => {
  if (layerId === state.layerId) return;
  fromRuler = true;
  state = activateLayer(state, layerId);
  render();
  fromRuler = false;
});

const mapView = new MapView(
  ui.mapEl,
  { lat: state.lat, lng: state.lng, zoom: state.zoom },
  (lat, lng, zoom) => {
    state = moveView(state, lat, lng, zoom);
    paintGauges();
    timeline.sync(state.layerId, outsideIds());
    paintCoverageFlag();
    remember();
  },
  (loading) => ui.loadbar.classList.toggle("on", loading),
);

function activeLayer(): MapLayer {
  return layerById(layers, state.layerId) ?? layers[layers.length - 1]!;
}

function outsideIds(): Set<string> {
  const ids = new Set<string>();
  for (const layer of layers) {
    if (!layerCovers(layer, state.lat, state.lng)) ids.add(layer.id);
  }
  return ids;
}

function remember(): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      layerId: state.layerId,
      lat: state.lat,
      lng: state.lng,
      zoom: state.zoom,
    }),
  );
}

function paintGauges(): void {
  const center = mapView.map.getCenter();
  ui.gaugeLat.textContent = formatDegree(center.lat, "N", "S");
  ui.gaugeLng.textContent = formatDegree(center.lng, "E", "W", 9);
  ui.gaugeZoom.textContent = formatZoom(mapView.map.getZoom());
}

function paintCoverageFlag(): void {
  ui.coverageFlag.hidden = layerCovers(activeLayer(), state.lat, state.lng);
}

function paintChrome(): void {
  ui.searchForm.hidden = panel !== "search";
  ui.infoCard.hidden = panel !== "info";
  ui.compareCard.hidden = panel !== "compare";
  ui.searchToggle.setAttribute("aria-expanded", panel === "search" ? "true" : "false");
  ui.infoToggle.setAttribute("aria-expanded", panel === "info" ? "true" : "false");
  ui.compareToggle.setAttribute("aria-pressed", state.compareEnabled ? "true" : "false");
}

function setPanel(next: Panel): void {
  panel = next;
  paintChrome();
  if (next === "search") ui.searchInput.focus();
}

function renderReadout(): void {
  const layer = activeLayer();
  ui.yearReadout.textContent = layer.timelineLabel;
  ui.nameReadout.textContent = layer.title;
  paintCoverageFlag();
  document.title = `Landkaarten · ${layer.timelineLabel} ${layer.title}`;
  ui.liveEl.textContent = `${layer.timelineLabel}, ${layer.title}`;
}

function renderInfo(): void {
  if (panel !== "info") return;
  const layer = activeLayer();
  const covers = layerCovers(layer, state.lat, state.lng);
  ui.infoEl.replaceChildren();

  const kicker = document.createElement("p");
  kicker.className = "kicker";
  kicker.textContent = kindLabel(layer.kind);

  const title = document.createElement("h2");
  title.textContent = layer.title;

  const period = document.createElement("p");
  period.className = "period";
  period.textContent = layer.periodLabel;

  const text = document.createElement("p");
  text.className = "explanation";
  text.textContent = layer.explanation;

  const meta = document.createElement("dl");
  meta.className = "meta";
  appendMeta(meta, "Bron", layer.sourceName, layer.sourceUrl);
  appendMeta(meta, "Licentie", layer.licenseName, layer.licenseUrl);
  appendMeta(meta, "Rechthebbende", layer.rightsHolder);
  appendMeta(meta, "Vermelding", layer.attribution);
  ui.infoEl.append(kicker, title, period, text, meta);

  if (layer.coverage.note) {
    const note = document.createElement("p");
    note.className = "coverage-note";
    note.textContent = layer.coverage.note;
    ui.infoEl.append(note);
  }

  if (!covers) {
    const warn = document.createElement("p");
    warn.className = "warn";
    warn.textContent = "Deze kaart dekt de plek in beeld niet.";
    ui.infoEl.append(warn);
  }

  if (layer.premium && layer.premiumReason) {
    const details = document.createElement("details");
    details.className = "premium";
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Toestemming nodig voor commercieel gebruik";
    const reason = document.createElement("p");
    reason.textContent = layer.premiumReason;
    details.append(summary, reason);
    ui.infoEl.append(details);
  }
}

function appendMeta(list: HTMLDListElement, label: string, value: string, href?: string): void {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  if (href) {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = value;
    dd.append(link);
  } else {
    dd.textContent = value;
  }
  list.append(dt, dd);
}

function renderCompare(): void {
  const on = state.compareEnabled;
  ui.swipeHandle.hidden = !on || state.compareMode !== "swipe";
  ui.modeSwipe.setAttribute("aria-pressed", state.compareMode === "swipe" ? "true" : "false");
  ui.modeOpacity.setAttribute("aria-pressed", state.compareMode === "opacity" ? "true" : "false");
  ui.swipeLabel.hidden = state.compareMode !== "swipe";
  ui.opacityLabel.hidden = state.compareMode !== "opacity";

  ui.compareSelect.replaceChildren();
  for (const layer of layers) {
    if (layer.id === state.layerId) continue;
    const option = document.createElement("option");
    option.value = layer.id;
    option.textContent = `${layer.timelineLabel} · ${layer.title}`;
    ui.compareSelect.append(option);
  }
  const wanted =
    state.compareId && state.compareId !== state.layerId
      ? state.compareId
      : state.compareEnabled
        ? suggestCompareId(layers, state.layerId)
        : null;
  if (wanted && layerById(layers, wanted)) {
    ui.compareSelect.value = wanted;
    if (state.compareId !== wanted) state = { ...state, compareId: wanted };
  }

  ui.swipeInput.value = String(state.swipe);
  ui.opacityInput.value = String(Math.round(state.opacity * 100));
  applyCompare();
}

function applyCompare(): void {
  ui.swipeHandle.style.left = `${state.swipe}%`;
  ui.swipeHandle.setAttribute("aria-valuenow", String(Math.round(state.swipe)));
  const compareLayer =
    state.compareEnabled && state.compareId ? (layerById(layers, state.compareId) ?? null) : null;
  mapView.setCompare(compareLayer, state.compareMode, state.swipe, state.opacity);
}

function render(): void {
  renderReadout();
  renderInfo();
  renderCompare();
  paintChrome();
  paintGauges();
  timeline.sync(state.layerId, outsideIds());
  if (!fromRuler) timeline.centerOn(state.layerId, ready);
  ready = true;
  mapView.setBase(activeLayer());
  remember();
}

function showSuggestions(items: string[]): void {
  ui.suggestionsEl.replaceChildren();
  if (items.length === 0) {
    ui.suggestionsEl.hidden = true;
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item;
    button.addEventListener("click", () => {
      void chooseQuery(item);
    });
    li.append(button);
    ui.suggestionsEl.append(li);
  }
  ui.suggestionsEl.hidden = false;
}

function showPlaces(): void {
  ui.suggestionsEl.replaceChildren();
  for (const place of places) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = place.label;
    button.addEventListener("click", () => {
      ui.searchInput.value = place.label;
      ui.suggestionsEl.hidden = true;
      setPanel("none");
      mapView.flyTo(place.lat, place.lng, Math.max(state.zoom, 16));
    });
    li.append(button);
    ui.suggestionsEl.append(li);
  }
  ui.suggestionsEl.hidden = false;
}

let suggestTimer = 0;
let suggestAbort: AbortController | null = null;

async function chooseQuery(query: string): Promise<void> {
  ui.searchInput.value = query;
  ui.suggestionsEl.hidden = true;
  suggestAbort?.abort();
  suggestAbort = new AbortController();
  try {
    const hit = await locatePlace(query, suggestAbort.signal);
    if (!hit) return;
    setPanel("none");
    mapView.flyTo(hit.lat, hit.lng, Math.max(mapView.map.getZoom(), 16));
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    ui.liveEl.textContent = "De plaats is niet gevonden.";
  }
}

ui.searchToggle.addEventListener("click", () => {
  if (panel === "search") {
    setPanel("none");
    return;
  }
  setPanel("search");
  if (ui.searchInput.value.trim().length < 2) showPlaces();
});

ui.searchInput.addEventListener("focus", () => {
  if (ui.searchInput.value.trim().length < 2) showPlaces();
});

ui.searchInput.addEventListener("input", () => {
  window.clearTimeout(suggestTimer);
  const query = ui.searchInput.value.trim();
  if (query.length < 2) {
    showPlaces();
    return;
  }
  suggestTimer = window.setTimeout(() => {
    suggestAbort?.abort();
    suggestAbort = new AbortController();
    suggestPlaces(query, suggestAbort.signal)
      .then(showSuggestions)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        ui.suggestionsEl.hidden = true;
      });
  }, 280);
});

ui.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = ui.searchInput.value.trim();
  if (query.length > 0) void chooseQuery(query);
});

ui.infoToggle.addEventListener("click", () => {
  setPanel(panel === "info" ? "none" : "info");
  renderInfo();
});

ui.infoClose.addEventListener("click", () => setPanel("none"));

ui.compareToggle.addEventListener("click", () => {
  if (!state.compareEnabled) {
    state = {
      ...state,
      compareEnabled: true,
      compareId: state.compareId ?? suggestCompareId(layers, state.layerId),
    };
    setPanel("compare");
    render();
    return;
  }
  if (panel !== "compare") {
    setPanel("compare");
    return;
  }
  state = { ...state, compareEnabled: false };
  setPanel("none");
  render();
});

ui.compareClose.addEventListener("click", () => {
  state = { ...state, compareEnabled: false };
  setPanel("none");
  render();
});

ui.compareSelect.addEventListener("change", () => {
  state = { ...state, compareId: ui.compareSelect.value, compareEnabled: true };
  render();
});

ui.swipeInput.addEventListener("input", () => {
  state = { ...state, swipe: Number(ui.swipeInput.value), compareMode: "swipe" };
  applyCompare();
});

ui.opacityInput.addEventListener("input", () => {
  state = { ...state, opacity: Number(ui.opacityInput.value) / 100, compareMode: "opacity" };
  applyCompare();
});

ui.modeSwipe.addEventListener("click", () => {
  state = { ...state, compareMode: "swipe" };
  renderCompare();
});

ui.modeOpacity.addEventListener("click", () => {
  state = { ...state, compareMode: "opacity" };
  renderCompare();
});

ui.swipeHandle.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  ui.swipeHandle.setPointerCapture(event.pointerId);
  const move = (pointer: PointerEvent) => {
    const rect = ui.mapEl.getBoundingClientRect();
    const pct = ((pointer.clientX - rect.left) / rect.width) * 100;
    state = { ...state, swipe: Math.min(96, Math.max(4, pct)), compareMode: "swipe", compareEnabled: true };
    ui.swipeInput.value = String(state.swipe);
    applyCompare();
  };
  const stop = () => {
    ui.swipeHandle.removeEventListener("pointermove", move);
    ui.swipeHandle.removeEventListener("pointerup", stop);
    ui.swipeHandle.removeEventListener("pointercancel", stop);
  };
  ui.swipeHandle.addEventListener("pointermove", move);
  ui.swipeHandle.addEventListener("pointerup", stop);
  ui.swipeHandle.addEventListener("pointercancel", stop);
});

ui.swipeHandle.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  event.stopPropagation();
  const delta = event.key === "ArrowLeft" ? -4 : 4;
  state = { ...state, swipe: Math.min(96, Math.max(4, state.swipe + delta)) };
  ui.swipeInput.value = String(state.swipe);
  applyCompare();
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node)) return;
  const target = event.target;
  if (ui.searchForm.contains(target) || ui.searchToggle.contains(target)) return;
  if (ui.infoCard.contains(target) || ui.infoToggle.contains(target)) return;
  if (ui.compareCard.contains(target) || ui.compareToggle.contains(target)) return;
  if (panel !== "none") setPanel("none");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (panel !== "none") {
      event.preventDefault();
      setPanel("none");
    }
    return;
  }
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return;
  }
  if (target instanceof Node && ui.timelineEl.contains(target)) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    state = stepLayer(layers, state, event.key === "ArrowLeft" ? -1 : 1);
    render();
  }
});

mapView.map.on("move", paintGauges);

window.addEventListener("offline", () => {
  ui.offlineEl.hidden = false;
});
window.addEventListener("online", () => {
  ui.offlineEl.hidden = true;
});
ui.offlineEl.hidden = navigator.onLine;

render();
registerServiceWorker();
