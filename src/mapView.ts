import L from "leaflet";
import { resolveTileUrl } from "./model";
import type { CompareMode, MapLayer } from "./types";

const TRANSPARENT =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

type Env = Record<string, string | undefined>;

function makeTileLayer(layer: MapLayer, pane: string, env: Env): L.TileLayer {
  const tiles = layer.tiles;
  const shared = {
    pane,
    attribution: layer.attribution,
    minZoom: tiles.minZoom,
    maxZoom: tiles.maxZoom,
    maxNativeZoom: tiles.maxNativeZoom,
    errorTileUrl: TRANSPARENT,
  };

  if (tiles.type === "wms") {
    return L.tileLayer.wms(resolveTileUrl(tiles.url, env), {
      ...shared,
      layers: tiles.layers,
      format: tiles.format,
      version: tiles.version,
      transparent: tiles.transparent,
    });
  }

  return L.tileLayer(resolveTileUrl(tiles.url, env), shared);
}

function prefersStill(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tweenOpacity(
  layer: L.TileLayer,
  to: number,
  ms: number,
  alive: () => boolean,
  done?: () => void,
): void {
  const from = layer.options.opacity ?? 1;
  if (ms <= 0) {
    layer.setOpacity(to);
    done?.();
    return;
  }
  const started = performance.now();
  const step = (now: number) => {
    if (!alive()) return;
    const t = Math.min(1, (now - started) / ms);
    layer.setOpacity(from + (to - from) * t);
    if (t < 1) requestAnimationFrame(step);
    else done?.();
  };
  requestAnimationFrame(step);
}

export class MapView {
  readonly map: L.Map;
  private readonly env: Env;
  private readonly bases = new Map<string, L.TileLayer>();
  private current: L.TileLayer | null = null;
  private currentId: string | null = null;
  private compare: L.TileLayer | null = null;
  private compareId: string | null = null;
  private fading: L.TileLayer | null = null;
  private token = 0;
  private loads = 0;

  constructor(
    container: HTMLElement,
    view: { lat: number; lng: number; zoom: number },
    private readonly onMove: (lat: number, lng: number, zoom: number) => void,
    private readonly onLoading: (loading: boolean) => void,
    env: Env = import.meta.env as Env,
  ) {
    this.env = env;
    this.map = L.map(container, {
      zoomControl: false,
      attributionControl: true,
      minZoom: 7,
      maxZoom: 19,
    }).setView([view.lat, view.lng], view.zoom);

    L.control.zoom({ position: "topleft" }).addTo(this.map);
    L.control.scale({ imperial: false, metric: true, position: "bottomleft" }).addTo(this.map);

    this.map.createPane("basePane");
    this.map.createPane("comparePane");
    const basePane = this.map.getPane("basePane");
    const comparePane = this.map.getPane("comparePane");
    if (basePane) basePane.style.zIndex = "200";
    if (comparePane) comparePane.style.zIndex = "350";

    this.map.on("moveend", () => this.emitMove());
  }

  private emitMove(): void {
    const center = this.map.getCenter();
    this.onMove(center.lat, center.lng, this.map.getZoom());
  }

  private bindLoading(layer: L.TileLayer): void {
    layer.on("loading", () => {
      this.loads += 1;
      this.onLoading(true);
    });
    layer.on("load", () => {
      this.loads = Math.max(0, this.loads - 1);
      this.onLoading(this.loads > 0);
    });
  }

  private ensureBase(layer: MapLayer): L.TileLayer {
    const cached = this.bases.get(layer.id);
    if (cached) return cached;
    const tile = makeTileLayer(layer, "basePane", this.env);
    this.bindLoading(tile);
    this.bases.set(layer.id, tile);
    return tile;
  }

  setBase(layer: MapLayer): void {
    const next = this.ensureBase(layer);
    if (this.current === next) return;

    const prev = this.current;
    if (this.fading && this.fading !== next && this.fading !== prev) {
      this.fading.remove();
      this.fading = null;
    }

    this.token += 1;
    const token = this.token;
    const alive = () => this.token === token;
    next.addTo(this.map);
    this.current = next;
    this.currentId = layer.id;

    const duration = prefersStill() ? 0 : 280;
    if (!prev || duration === 0) {
      next.setOpacity(1);
      prev?.remove();
      return;
    }

    next.setOpacity(0);
    this.fading = prev;
    tweenOpacity(next, 1, duration, alive);
    tweenOpacity(prev, 0, duration, alive, () => {
      if (this.current !== prev) prev.remove();
      if (this.fading === prev) this.fading = null;
    });
  }

  setCompare(layer: MapLayer | null, mode: CompareMode, swipe: number, opacity: number): void {
    const pane = this.map.getPane("comparePane");
    if (!layer) {
      this.compare?.remove();
      this.compare = null;
      this.compareId = null;
      if (pane) pane.style.clipPath = "none";
      return;
    }

    if (this.compareId !== layer.id) {
      this.compare?.remove();
      this.compare = makeTileLayer(layer, "comparePane", this.env);
      this.bindLoading(this.compare);
      this.compare.addTo(this.map);
      this.compareId = layer.id;
    }

    if (!this.compare || !pane) return;
    if (mode === "swipe") {
      this.compare.setOpacity(1);
      const right = Math.min(100, Math.max(0, 100 - swipe));
      pane.style.clipPath = `inset(0 ${right}% 0 0)`;
    } else {
      pane.style.clipPath = "none";
      this.compare.setOpacity(opacity);
    }
  }

  flyTo(lat: number, lng: number, zoom = this.map.getZoom()): void {
    const duration = prefersStill() ? 0 : 0.9;
    this.map.flyTo([lat, lng], zoom, { duration });
  }

  get activeBaseId(): string | null {
    return this.currentId;
  }
}
