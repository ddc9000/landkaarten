/** West, zuid, oost, noord in WGS84. */
export type BBox = [number, number, number, number];

export type LayerKind = "historische-kaart" | "luchtfoto" | "actuele-kaart";

export type XyzTiles = {
  type: "xyz";
  /** `{z}`, `{x}` en `{y}` worden door de kaart ingevuld. `{env.NAAM}` komt uit de omgeving. */
  url: string;
  minZoom: number;
  maxZoom: number;
  maxNativeZoom: number;
};

export type WmsTiles = {
  type: "wms";
  url: string;
  layers: string;
  format: "image/png" | "image/jpeg";
  version: "1.1.1" | "1.3.0";
  transparent: boolean;
  minZoom: number;
  maxZoom: number;
  maxNativeZoom: number;
};

/**
 * Eén kaartlaag. Een nieuwe laag is een object in `data/layers.json`;
 * de app leest dat bestand en hoeft daarvoor niet aangepast te worden.
 *
 * `premium` is de haak voor een latere betaalde laag: true betekent dat
 * commercieel gebruik toestemming van de rechthebbende vraagt. Deze versie
 * toont die lagen wel, en rekent niets aan.
 */
export type MapLayer = {
  id: string;
  title: string;
  /** Sorteerjaar. Bij een periode is dit het beginjaar. */
  year: number;
  /** Kleinere waarde komt eerst als twee lagen hetzelfde jaar hebben. */
  order: number;
  timelineLabel: string;
  periodLabel: string;
  kind: LayerKind;
  explanation: string;
  sourceName: string;
  sourceUrl: string;
  rightsHolder: string;
  licenseName: string;
  licenseUrl: string;
  attribution: string;
  premium: boolean;
  premiumReason: string | null;
  regionId: string;
  coverage: {
    bbox: BBox;
    note?: string;
  };
  tiles: XyzTiles | WmsTiles;
  verifiedOn: string;
};

export type Region = {
  id: string;
  name: string;
  bbox: BBox;
  geocoder: string;
};

export type Place = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

export type CompareMode = "swipe" | "opacity";

export type ViewState = {
  layerId: string;
  compareEnabled: boolean;
  compareId: string | null;
  compareMode: CompareMode;
  /** 0–100, aandeel van de kaart waarop de vergeleken laag links zichtbaar is. */
  swipe: number;
  /** 0–1, dekking van de vergeleken laag. */
  opacity: number;
  lat: number;
  lng: number;
  zoom: number;
};
