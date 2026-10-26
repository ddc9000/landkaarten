import "@fontsource/fraunces/latin-500.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "leaflet/dist/leaflet.css";
import "./style.css";

import { defaultLayerId, layers, lokeren, places } from "./catalogue";
import { MapView } from "./mapView";
import {
  activateLayer,
  centuryLabel,
  kindLabel,
  layerById,
  layerCovers,
  moveView,
  stepLayer,
  suggestCompareId,
} from "./model";
import { registerServiceWorker } from "./pwa";
import { locatePlace, suggestPlaces } from "./search";
import type { MapLayer, ViewState } from "./types";

const STORAGE_KEY = "landkaarten-view";

const mapEl = document.querySelector<HTMLElement>("#map");
const infoEl = document.querySelector<HTMLElement>("#info");
const timelineEl = document.querySelector<HTMLElement>("#timeline");
const liveEl = document.querySelector<HTMLElement>("#live");
const loadbar = document.querySelector<HTMLElement>("#loadbar");
const searchForm = document.querySelector<HTMLFormElement>("#search-form");
const searchInput = document.querySelector<HTMLInputElement>("#search");
const suggestionsEl = document.querySelector<HTMLElement>("#suggestions");
const compareToggle = document.querySelector<HTMLButtonElement>("#compare-toggle");
const compareBar = document.querySelector<HTMLElement>("#compare-bar");
const compareSelect = document.querySelector<HTMLSelectElement>("#compare-with");
const swipeInput = document.querySelector<HTMLInputElement>("#swipe");
const opacityInput = document.querySelector<HTMLInputElement>("#opacity");
const swipeHandle = document.querySelector<HTMLButtonElement>("#swipe-handle");
const modeSwipe = document.querySelector<HTMLButtonElement>("#mode-swipe");
const modeOpacity = document.querySelector<HTMLButtonElement>("#mode-opacity");
const offlineEl = document.querySelector<HTMLElement>("#offline");

if (
  !mapEl ||
  !infoEl ||
  !timelineEl ||
  !liveEl ||
  !loadbar ||
  !searchForm ||
  !searchInput ||
  !suggestionsEl ||
  !compareToggle ||
  !compareBar ||
  !compareSelect ||
  !swipeInput ||
  !opacityInput ||
  !swipeHandle ||
  !modeSwipe ||
  !modeOpacity ||
  !offlineEl
) {
  throw new Error("De pagina mist een vast onderdeel.");
}

const ui = {
  mapEl,
  infoEl,
  timelineEl,
  liveEl,
  loadbar,
  searchForm,
  searchInput,
  suggestionsEl,
  compareToggle,
  compareBar,
  compareSelect,
  swipeInput,
  opacityInput,
  swipeHandle,
  modeSwipe,
  modeOpacity,
  offlineEl,
};

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

const mapView = new MapView(
  ui.mapEl,
  { lat: state.lat, lng: state.lng, zoom: state.zoom },
  (lat, lng, zoom) => {
    state = moveView(state, lat, lng, zoom);
    updateCoverage();
    remember();
  },
  (loading) => ui.loadbar.classList.toggle("on", loading),
);

function activeLayer(): MapLayer {
  return layerById(layers, state.layerId) ?? layers[layers.length - 1];
}

function remember(): void {
  const payload = {
    layerId: state.layerId,
    lat: state.lat,
    lng: state.lng,
    zoom: state.zoom,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function renderInfo(): void {
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
    const summary = document.createElement("summary");
    summary.textContent = "Toestemming nodig voor commercieel gebruik";
    const reason = document.createElement("p");
    reason.textContent = layer.premiumReason;
    details.append(summary, reason);
    ui.infoEl.append(details);
  }

  document.title = `Landkaarten · ${layer.title}`;
  ui.liveEl.textContent = `${layer.title}, ${layer.periodLabel}`;
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

function renderTimeline(): void {
  ui.timelineEl.replaceChildren();
  let century = "";
  for (const layer of layers) {
    const label = centuryLabel(layer.year);
    if (label !== century) {
      century = label;
      const heading = document.createElement("p");
      heading.className = "century";
      heading.textContent = label;
      ui.timelineEl.append(heading);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "year-button";
    button.dataset.id = layer.id;
    button.setAttribute("role", "listitem");
    const selected = layer.id === state.layerId;
    button.setAttribute("aria-current", selected ? "true" : "false");
    if (!layerCovers(layer, state.lat, state.lng)) button.classList.add("outside");
    if (layer.premium) button.dataset.premium = "true";

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");

    const year = document.createElement("span");
    year.className = "year";
    year.textContent = layer.timelineLabel;

    const name = document.createElement("span");
    name.className = "year-title";
    name.textContent = layer.title;

    button.append(dot, year, name);
    button.addEventListener("click", () => {
      state = activateLayer(state, layer.id);
      render();
    });
    ui.timelineEl.append(button);
    if (selected) {
      requestAnimationFrame(() => button.scrollIntoView({ block: "nearest" }));
    }
  }
}

function updateCoverage(): void {
  for (const button of ui.timelineEl.querySelectorAll<HTMLButtonElement>(".year-button")) {
    const layer = button.dataset.id ? layerById(layers, button.dataset.id) : undefined;
    button.classList.toggle("outside", layer ? !layerCovers(layer, state.lat, state.lng) : false);
  }
  const layer = activeLayer();
  let warn = ui.infoEl.querySelector<HTMLElement>(".warn");
  const covers = layerCovers(layer, state.lat, state.lng);
  if (!covers && !warn) {
    warn = document.createElement("p");
    warn.className = "warn";
    warn.textContent = "Deze kaart dekt de plek in beeld niet.";
    ui.infoEl.append(warn);
  } else if (covers && warn) {
    warn.remove();
  }
}

function renderCompare(): void {
  const on = state.compareEnabled;
  ui.compareToggle.setAttribute("aria-pressed", on ? "true" : "false");
  ui.compareToggle.textContent = on ? "Stop vergelijking" : "Vergelijk";
  ui.compareBar.hidden = !on;
  ui.swipeHandle.hidden = !on || state.compareMode !== "swipe";
  ui.modeSwipe.setAttribute("aria-pressed", state.compareMode === "swipe" ? "true" : "false");
  ui.modeOpacity.setAttribute("aria-pressed", state.compareMode === "opacity" ? "true" : "false");
  ui.swipeInput.parentElement?.toggleAttribute("hidden", state.compareMode !== "swipe");
  ui.opacityInput.parentElement?.toggleAttribute("hidden", state.compareMode !== "opacity");

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
  positionHandle();
  const compareLayer =
    state.compareEnabled && state.compareId ? (layerById(layers, state.compareId) ?? null) : null;
  mapView.setCompare(compareLayer, state.compareMode, state.swipe, state.opacity);
}

function positionHandle(): void {
  ui.swipeHandle.style.left = `${state.swipe}%`;
  ui.swipeHandle.setAttribute("aria-valuenow", String(Math.round(state.swipe)));
}

function render(): void {
  renderInfo();
  renderTimeline();
  renderCompare();
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
    mapView.flyTo(hit.lat, hit.lng, Math.max(mapView.map.getZoom(), 16));
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    ui.liveEl.textContent = "De plaats is niet gevonden.";
  }
}

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

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node)) return;
  if (ui.searchForm.contains(event.target)) return;
  ui.suggestionsEl.hidden = true;
});

ui.compareToggle.addEventListener("click", () => {
  if (state.compareEnabled) {
    state = { ...state, compareEnabled: false };
  } else {
    state = {
      ...state,
      compareEnabled: true,
      compareId: state.compareId ?? suggestCompareId(layers, state.layerId),
    };
  }
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
  const delta = event.key === "ArrowLeft" ? -4 : 4;
  state = { ...state, swipe: Math.min(96, Math.max(4, state.swipe + delta)) };
  ui.swipeInput.value = String(state.swipe);
  applyCompare();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return;
  }
  if (event.key === "ArrowLeft") {
    state = stepLayer(layers, state, -1);
    render();
  } else if (event.key === "ArrowRight") {
    state = stepLayer(layers, state, 1);
    render();
  }
});

window.addEventListener("offline", () => {
  ui.offlineEl.hidden = false;
});
window.addEventListener("online", () => {
  ui.offlineEl.hidden = true;
});
ui.offlineEl.hidden = navigator.onLine;

render();
registerServiceWorker();
