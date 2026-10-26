import { describe, expect, it } from "vitest";
import { layers, lokeren } from "../src/catalogue";
import {
  activateLayer,
  centuryLabel,
  layerCovers,
  layersNeedingPermission,
  moveView,
  resolveTileUrl,
  sortLayers,
  stepLayer,
  suggestCompareId,
} from "../src/model";
import type { ViewState } from "../src/types";

const baseView = (): ViewState => ({
  layerId: "ortho-recent",
  compareEnabled: false,
  compareId: null,
  compareMode: "swipe",
  swipe: 54,
  opacity: 0.55,
  lat: lokeren.lat,
  lng: lokeren.lng,
  zoom: lokeren.zoom,
});

describe("catalogus", () => {
  it("heeft unieke id's en een https-tegeladres", () => {
    const ids = layers.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(layers.length).toBeGreaterThan(10);
    for (const layer of layers) {
      const url = layer.tiles.url;
      expect(url.startsWith("https://")).toBe(true);
      expect(url.includes("localhost")).toBe(false);
      expect(layer.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(layer.rightsHolder.length).toBeGreaterThan(3);
    }
  });

  it("sorteert van oud naar nieuw en eindigt op vandaag", () => {
    const sorted = sortLayers(layers);
    expect(sorted.map((layer) => layer.id)).toEqual(layers.map((layer) => layer.id));
    expect(sorted[0]?.id).toBe("fricx");
    expect(sorted.at(-1)?.id).toBe("osm");
    expect(sorted.map((layer) => layer.year)).toEqual([...sorted.map((layer) => layer.year)].sort((a, b) => a - b));
  });

  it("dekt de Markt van Lokeren met elke laag", () => {
    for (const layer of layers) {
      expect(layerCovers(layer, lokeren.lat, lokeren.lng), layer.id).toBe(true);
    }
  });

  it("houdt Waalse en Vlaamse dekking uit elkaar", () => {
    const arlon = { lat: 49.6833, lng: 5.8167 };
    expect(layerCovers(layers.find((layer) => layer.id === "ferraris")!, arlon.lat, arlon.lng)).toBe(false);
    expect(layerCovers(layers.find((layer) => layer.id === "ngi-1939")!, arlon.lat, arlon.lng)).toBe(true);
    expect(layerCovers(layers.find((layer) => layer.id === "osm")!, arlon.lat, arlon.lng)).toBe(true);
  });

  it("markeert lagen die toestemming vragen en laat open lagen vrij", () => {
    const premium = layersNeedingPermission(layers).map((layer) => layer.id);
    expect(premium).toEqual(
      expect.arrayContaining(["fricx", "ferraris", "vandermaelen", "popp", "abw", "ngi-1873", "ngi-1939", "ngi-1981"]),
    );
    for (const id of ["ortho-1971", "ortho-recent", "grb", "osm"]) {
      expect(premium).not.toContain(id);
    }
    for (const layer of layers) {
      if (layer.premium) expect(layer.premiumReason && layer.premiumReason.length).toBeGreaterThan(20);
      else expect(layer.premiumReason).toBeNull();
    }
  });
});

describe("tijdlijn", () => {
  it("wisselt van laag zonder de plek of de zoom te veranderen", () => {
    const next = activateLayer(baseView(), "ferraris");
    expect(next.layerId).toBe("ferraris");
    expect(next.lat).toBe(lokeren.lat);
    expect(next.lng).toBe(lokeren.lng);
    expect(next.zoom).toBe(lokeren.zoom);
  });

  it("verwisselt de twee lagen als je op de vergeleken laag klikt", () => {
    const comparing = { ...baseView(), compareEnabled: true, compareId: "ferraris" };
    const swapped = activateLayer(comparing, "ferraris");
    expect(swapped.layerId).toBe("ferraris");
    expect(swapped.compareId).toBe("ortho-recent");
    expect(swapped.lat).toBe(comparing.lat);
  });

  it("stapt naar het vorige en het volgende jaar en stopt aan de rand", () => {
    const older = stepLayer(layers, baseView(), -1);
    expect(older.layerId).toBe("ortho-2015");
    const newest = stepLayer(layers, { ...baseView(), layerId: "osm" }, 1);
    expect(newest.layerId).toBe("osm");
  });

  it("stelt Ferraris voor naast een luchtfoto en de nieuwste luchtfoto naast een oude kaart", () => {
    expect(suggestCompareId(layers, "ortho-recent")).toBe("ferraris");
    expect(suggestCompareId(layers, "ferraris")).toBe("ortho-recent");
  });

  it("bewaart de plek als de kaart verschuift", () => {
    const moved = moveView(baseView(), 51.05, 3.72, 14);
    expect(moved.layerId).toBe("ortho-recent");
    expect(moved.zoom).toBe(14);
  });

  it("benoemt eeuwen", () => {
    expect(centuryLabel(1712)).toBe("18e eeuw");
    expect(centuryLabel(1846)).toBe("19e eeuw");
    expect(centuryLabel(1939)).toBe("20e eeuw");
    expect(centuryLabel(2025)).toBe("21e eeuw");
  });
});

describe("tegeladressen", () => {
  it("vult een optionele sleutel in en laat een ontbrekende sleutel leeg", () => {
    const url = "https://example.test/tiles/{z}/{x}/{y}.png?key={env.VITE_MAP_TILE_KEY}";
    expect(resolveTileUrl(url, { VITE_MAP_TILE_KEY: "abc" })).toBe(
      "https://example.test/tiles/{z}/{x}/{y}.png?key=abc",
    );
    expect(resolveTileUrl(url, {})).toBe("https://example.test/tiles/{z}/{x}/{y}.png?key=");
  });

  it("gebruikt de juiste tegelvolgorde", () => {
    const ferraris = layers.find((layer) => layer.id === "ferraris")!;
    const ngi = layers.find((layer) => layer.id === "ngi-1939")!;
    const osm = layers.find((layer) => layer.id === "osm")!;
    expect(ferraris.tiles.url).toContain("LAYER=ferraris");
    expect(ferraris.tiles.url).toContain("TILEROW={y}");
    expect(ngi.tiles.url).toContain("/{z}/{y}/{x}");
    expect(osm.tiles.url).toContain("/{z}/{x}/{y}.png");
  });
});
