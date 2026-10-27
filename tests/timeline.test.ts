import { describe, expect, it } from "vitest";
import { layers } from "../src/catalogue";
import {
  buildRuler,
  clampTrackX,
  maxTrackX,
  nearestStop,
  positionFromTrackX,
  projectFlick,
  selectLayerAt,
  snapTrackX,
  trackX,
  trackXForLayer,
} from "../src/timeline";

const sample = [
  { id: "a", year: 1800, order: 0 },
  { id: "b", year: 1810, order: 0 },
  { id: "c", year: 1810, order: 1 },
];

function sampleRuler() {
  return buildRuler(sample, {
    todayYear: 1810,
    futureYears: 10,
    pastYears: 0,
    pxPerYear: 10,
    labelEvery: 10,
  });
}

describe("liniaal", () => {
  it("zet kaarten op volgorde en houdt ruimte vrij na vandaag", () => {
    const ruler = buildRuler(layers, { pastYears: 20, futureYears: 40, labelEvery: 10 });
    expect(ruler.stops.map((stop) => stop.layerId)).toEqual(layers.map((layer) => layer.id));
    expect(ruler.startYear).toBe(1690);
    expect(ruler.todayYear).toBe(2026);
    expect(ruler.endYear).toBe(2066);
    expect(ruler.endYear).toBeGreaterThan(ruler.stops.at(-1)!.year);

    const grb = ruler.stops.find((stop) => stop.layerId === "grb")!;
    const osm = ruler.stops.find((stop) => stop.layerId === "osm")!;
    expect(osm.position).toBeGreaterThan(grb.position);
    expect(grb.year).toBe(2026);
    expect(osm.year).toBe(2026);
  });

  it("maakt lege jaren dim en de jaren na vandaag een toekomstzone", () => {
    const ruler = buildRuler(layers);
    const byYear = (year: number) => ruler.ticks.filter((tick) => tick.year === year);

    expect(byYear(1712).some((tick) => tick.kind === "map" && tick.layerId === "fricx")).toBe(true);
    expect(byYear(1713).every((tick) => tick.kind === "empty" && tick.layerId === null)).toBe(true);
    expect(byYear(1800)[0]).toMatchObject({ kind: "empty", label: "1800" });
    expect(byYear(1801)[0]?.label).toBeNull();
    expect(byYear(2030).every((tick) => tick.kind === "future")).toBe(true);
    expect(byYear(2030)[0]?.label).toBe("2030");

    const mapIds = ruler.ticks.filter((tick) => tick.kind === "map").map((tick) => tick.layerId);
    expect(mapIds).toEqual(layers.map((layer) => layer.id));
    expect(ruler.ticks.some((tick) => tick.kind === "future")).toBe(true);
  });

  it("kiest de dichtstbijzijnde kaart en bij gelijkspel de latere", () => {
    const ruler = sampleRuler();
    expect(selectLayerAt(ruler, 1804.9)).toBe("a");
    expect(selectLayerAt(ruler, 1805)).toBe("b");
    const sameYear = ruler.stops.filter((stop) => stop.year === 1810);
    const mid = (sameYear[0]!.position + sameYear[1]!.position) / 2;
    expect(selectLayerAt(ruler, 1810)).toBe("b");
    expect(selectLayerAt(ruler, mid)).toBe("c");
    expect(selectLayerAt(ruler, mid - 0.05)).toBe("b");
    expect(selectLayerAt(ruler, 1816)).toBe("c");
    expect(nearestStop(ruler, 1790).layerId).toBe("a");
  });

  it("rekent de positie op de liniaal om naar een laag en terug", () => {
    const ruler = sampleRuler();
    expect(trackX(ruler, 1810)).toBe(100);
    expect(positionFromTrackX(ruler, 100)).toBeCloseTo(1810);
    expect(trackXForLayer(ruler, "c")).toBeCloseTo(104);
    expect(snapTrackX(ruler, 96)).toBe(100);
    expect(snapTrackX(ruler, 103)).toBeCloseTo(104);
    expect(clampTrackX(ruler, -20)).toBe(0);
    expect(clampTrackX(ruler, 9999)).toBe(maxTrackX(ruler));
    expect(selectLayerAt(ruler, positionFromTrackX(ruler, snapTrackX(ruler, 50)))).toBe("b");
  });

  it("laat een flick doorlopen en stopt aan de rand", () => {
    expect(projectFlick(100, 1, 0, 1000)).toBe(360);
    expect(projectFlick(100, -1, 0, 1000)).toBe(0);
    expect(projectFlick(900, 2, 0, 1000)).toBe(1000);
  });

  it("zet de echte catalogus vast op Ferraris, Vandermaelen en vandaag", () => {
    const ruler = buildRuler(layers);
    expect(selectLayerAt(ruler, 1744)).toBe("fricx");
    expect(selectLayerAt(ruler, 1745)).toBe("ferraris");
    expect(selectLayerAt(ruler, 1846)).toBe("vandermaelen");
    expect(selectLayerAt(ruler, 2025)).toBe("ortho-recent");
    expect(selectLayerAt(ruler, 2026.05)).toBe("grb");
    expect(selectLayerAt(ruler, 2026.35)).toBe("osm");
    expect(selectLayerAt(ruler, 2050)).toBe("osm");
    expect(snapTrackX(ruler, trackX(ruler, 1939))).toBe(trackXForLayer(ruler, "ngi-1939"));
  });
});
