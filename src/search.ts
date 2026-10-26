const SUGGEST = "https://geo.api.vlaanderen.be/geolocation/v4/Suggestion";
const LOCATE = "https://geo.api.vlaanderen.be/geolocation/v4/Location";

type LocationResult = {
  FormattedAddress?: string;
  Location?: { Lat_WGS84?: number; Lon_WGS84?: number };
  BoundingBox?: {
    LowerLeft?: { Lat_WGS84?: number; Lon_WGS84?: number };
    UpperRight?: { Lat_WGS84?: number; Lon_WGS84?: number };
  };
};

export type GeocodeHit = {
  label: string;
  lat: number;
  lng: number;
};

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Zoekdienst antwoordde met ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function suggestPlaces(query: string, signal: AbortSignal): Promise<string[]> {
  const url = `${SUGGEST}?c=6&q=${encodeURIComponent(query)}`;
  const body = await readJson<{ SuggestionResult?: string[] }>(url, signal);
  return body.SuggestionResult ?? [];
}

export async function locatePlace(query: string, signal: AbortSignal): Promise<GeocodeHit | null> {
  const url = `${LOCATE}?c=1&q=${encodeURIComponent(query)}`;
  const body = await readJson<{ LocationResult?: LocationResult[] }>(url, signal);
  const hit = body.LocationResult?.[0];
  if (!hit?.Location) return null;

  const box = hit.BoundingBox;
  const south = box?.LowerLeft?.Lat_WGS84;
  const north = box?.UpperRight?.Lat_WGS84;
  const west = box?.LowerLeft?.Lon_WGS84;
  const east = box?.UpperRight?.Lon_WGS84;
  const lat =
    south !== undefined && north !== undefined ? (south + north) / 2 : hit.Location.Lat_WGS84;
  const lng =
    west !== undefined && east !== undefined ? (west + east) / 2 : hit.Location.Lon_WGS84;
  if (lat === undefined || lng === undefined) return null;

  return {
    label: hit.FormattedAddress || query,
    lat,
    lng,
  };
}
