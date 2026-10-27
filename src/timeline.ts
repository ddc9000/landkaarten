/**
 * Horizontale tijdlijn. Puur rekenwerk: geen DOM.
 * Het verleden staat links, de toekomst rechts. De gebruiker schuift de liniaal
 * onder een vast middelpunt; loslaten klikt vast op de dichtstbijzijnde kaart.
 */

export type RulerInput = {
  id: string;
  year: number;
  order: number;
};

export const PX_PER_YEAR = 18;
/** Ruimte tussen twee kaarten die hetzelfde jaar delen, in jaren. */
export const STOP_GAP = 0.4;
export const FUTURE_YEARS = 40;
export const PAST_YEARS = 20;
export const LABEL_EVERY = 10;
/** Hoe ver een flick doorloopt, in milliseconden aan de laatste snelheid. */
export const FLICK_MS = 260;

export type RulerStop = {
  layerId: string;
  year: number;
  order: number;
  position: number;
};

export type TickKind = "empty" | "map" | "future";

export type RulerTick = {
  year: number;
  position: number;
  kind: TickKind;
  label: string | null;
  layerId: string | null;
};

export type Ruler = {
  startYear: number;
  todayYear: number;
  endYear: number;
  pxPerYear: number;
  stops: RulerStop[];
  ticks: RulerTick[];
};

export function buildRuler(
  layers: RulerInput[],
  options?: {
    todayYear?: number;
    futureYears?: number;
    pastYears?: number;
    pxPerYear?: number;
    labelEvery?: number;
  },
): Ruler {
  if (layers.length === 0) throw new Error("De tijdlijn heeft geen lagen.");

  const pxPerYear = options?.pxPerYear ?? PX_PER_YEAR;
  const labelEvery = options?.labelEvery ?? LABEL_EVERY;
  const futureYears = options?.futureYears ?? FUTURE_YEARS;
  const pastYears = options?.pastYears ?? PAST_YEARS;
  const sorted = [...layers].sort(
    (a, b) => a.year - b.year || a.order - b.order || a.id.localeCompare(b.id, "nl"),
  );
  const latest = sorted[sorted.length - 1]!.year;
  const todayYear = Math.max(options?.todayYear ?? latest, latest);
  const startYear = Math.floor(sorted[0]!.year / labelEvery) * labelEvery - pastYears;
  const endYear = todayYear + futureYears;

  const stops: RulerStop[] = sorted
    .map((layer) => ({
      layerId: layer.id,
      year: layer.year,
      order: layer.order,
      position: layer.year + layer.order * STOP_GAP,
    }))
    .sort((a, b) => a.position - b.position);

  const yearsWithMap = new Set(stops.map((stop) => stop.year));
  const ticks: RulerTick[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    if (yearsWithMap.has(year)) continue;
    ticks.push({
      year,
      position: year,
      kind: year > todayYear ? "future" : "empty",
      label: year % labelEvery === 0 ? String(year) : null,
      layerId: null,
    });
  }

  for (const stop of stops) {
    const onDecade = stop.order === 0 && stop.year % labelEvery === 0;
    ticks.push({
      year: stop.year,
      position: stop.position,
      kind: "map",
      label: onDecade ? String(stop.year) : null,
      layerId: stop.layerId,
    });
  }

  ticks.sort((a, b) => a.position - b.position || (a.layerId ? 1 : 0) - (b.layerId ? 1 : 0));

  return { startYear, todayYear, endYear, pxPerYear, stops, ticks };
}

/** Bij gelijke afstand wint de latere kaart, zodat de liniaal vooruit valt. */
export function nearestStop(ruler: Ruler, position: number): RulerStop {
  let best = ruler.stops[0]!;
  let bestDist = Math.abs(best.position - position);
  for (const stop of ruler.stops) {
    const dist = Math.abs(stop.position - position);
    if (dist < bestDist || (dist === bestDist && stop.position > best.position)) {
      best = stop;
      bestDist = dist;
    }
  }
  return best;
}

export function selectLayerAt(ruler: Ruler, position: number): string {
  return nearestStop(ruler, position).layerId;
}

export function trackX(ruler: Ruler, position: number): number {
  return (position - ruler.startYear) * ruler.pxPerYear;
}

export function positionFromTrackX(ruler: Ruler, x: number): number {
  return ruler.startYear + x / ruler.pxPerYear;
}

export function maxTrackX(ruler: Ruler): number {
  return trackX(ruler, ruler.endYear);
}

export function clampTrackX(ruler: Ruler, x: number): number {
  return Math.min(maxTrackX(ruler), Math.max(0, x));
}

export function trackXForLayer(ruler: Ruler, layerId: string): number {
  const stop = ruler.stops.find((item) => item.layerId === layerId);
  if (!stop) throw new Error(`Onbekende laag op de tijdlijn: ${layerId}`);
  return trackX(ruler, stop.position);
}

export function snapTrackX(ruler: Ruler, x: number): number {
  const clamped = clampTrackX(ruler, x);
  return trackX(ruler, nearestStop(ruler, positionFromTrackX(ruler, clamped)).position);
}

export function projectFlick(x: number, velocityPxPerMs: number, min: number, max: number): number {
  const next = x + velocityPxPerMs * FLICK_MS;
  return Math.min(max, Math.max(min, next));
}
