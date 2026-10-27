import type { BBox, MapLayer, ViewState } from "./types";

const ENV_TOKEN = /\{env\.([A-Z0-9_]+)\}/g;

export function sortLayers(layers: MapLayer[]): MapLayer[] {
  return [...layers].sort(
    (a, b) => a.year - b.year || a.order - b.order || a.title.localeCompare(b.title, "nl"),
  );
}

export function layerById(layers: MapLayer[], id: string): MapLayer | undefined {
  return layers.find((layer) => layer.id === id);
}

export function pointInBbox(lng: number, lat: number, bbox: BBox): boolean {
  const [west, south, east, north] = bbox;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export function layerCovers(layer: MapLayer, lat: number, lng: number): boolean {
  return pointInBbox(lng, lat, layer.coverage.bbox);
}

export function layersNeedingPermission(layers: MapLayer[]): MapLayer[] {
  return sortLayers(layers.filter((layer) => layer.premium));
}

/** Vervangt `{env.VITE_...}` in een tegeladres. Een ontbrekende sleutel wordt leeg. */
export function resolveTileUrl(url: string, env: Record<string, string | undefined>): string {
  return url.replace(ENV_TOKEN, (_match, key: string) => env[key] ?? "");
}

export function centuryLabel(year: number): string {
  const century = Math.floor(year / 100) + 1;
  return `${century}e eeuw`;
}

/**
 * Houdt plaats en zoom vast. Klikken op de laag waarmee je vergelijkt,
 * wisselt de twee lagen zodat geen van beide verdwijnt.
 */
export function activateLayer(state: ViewState, id: string): ViewState {
  if (id === state.layerId) return state;
  if (state.compareEnabled && state.compareId === id) {
    return { ...state, layerId: id, compareId: state.layerId };
  }
  return { ...state, layerId: id };
}

export function stepLayer(layers: MapLayer[], state: ViewState, direction: -1 | 1): ViewState {
  const sorted = sortLayers(layers);
  const index = sorted.findIndex((layer) => layer.id === state.layerId);
  const next = sorted[index + direction];
  if (!next) return state;
  return activateLayer(state, next.id);
}

export function moveView(state: ViewState, lat: number, lng: number, zoom: number): ViewState {
  return { ...state, lat, lng, zoom };
}

/** Luchtfoto of kaart van vandaag naast Ferraris; een oude kaart naast de nieuwste luchtfoto. */
export function suggestCompareId(layers: MapLayer[], activeId: string): string {
  const active = layerById(layers, activeId);
  const prefer =
    active && (active.kind === "luchtfoto" || active.kind === "actuele-kaart")
      ? "ferraris"
      : "ortho-recent";
  if (prefer !== activeId && layerById(layers, prefer)) return prefer;
  return layers.find((layer) => layer.id !== activeId)?.id ?? activeId;
}

export function kindLabel(kind: MapLayer["kind"]): string {
  if (kind === "luchtfoto") return "Luchtfoto";
  if (kind === "actuele-kaart") return "Vandaag";
  return "Kaart";
}

/** Vaste breedte, zoals een instrument. Breedtegraad past in 8 tekens, lengtegraad in 9. */
export function formatDegree(value: number, positive: string, negative: string, width = 8): string {
  const hemi = value >= 0 ? positive : negative;
  const digits = Math.abs(value).toFixed(5).padStart(width, "0");
  return `${digits}° ${hemi}`;
}

export function formatZoom(zoom: number): string {
  const rounded = Math.round(zoom * 10) / 10;
  return Number.isInteger(rounded) ? `Z ${rounded.toFixed(0)}` : `Z ${rounded.toFixed(1)}`;
}

export function assertCatalogue(layers: MapLayer[]): void {
  const ids = new Set<string>();
  for (const layer of layers) {
    if (!layer.id || ids.has(layer.id)) {
      throw new Error(`Ongeldige of dubbele laag-id: ${layer.id || "(leeg)"}`);
    }
    ids.add(layer.id);
    if (!layer.title || !layer.tiles) {
      throw new Error(`Onvolledige laag: ${layer.id}`);
    }
    const url = layer.tiles.type === "xyz" ? layer.tiles.url : layer.tiles.url;
    if (!url.startsWith("https://")) {
      throw new Error(`Laag ${layer.id} heeft geen https-tegeladres`);
    }
    if (layer.tiles.type === "xyz" && !url.includes("{z}")) {
      throw new Error(`Laag ${layer.id} mist {z} in het tegeladres`);
    }
    if (layer.premium && !layer.premiumReason) {
      throw new Error(`Premiumlaag ${layer.id} mist premiumReason`);
    }
    if (!layer.premium && layer.premiumReason) {
      throw new Error(`Laag ${layer.id} heeft een premiumreden maar premium staat uit`);
    }
    if (!layer.rightsHolder || !layer.attribution) {
      throw new Error(`Laag ${layer.id} mist rechthebbende of bronvermelding`);
    }
  }
}
