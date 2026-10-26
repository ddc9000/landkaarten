import layersData from "./data/layers.json";
import placesData from "./data/places.json";
import regionsData from "./data/regions.json";
import { assertCatalogue, sortLayers } from "./model";
import type { MapLayer, Place, Region } from "./types";

/**
 * Markt van Lokeren.
 * Geopunt-locatie "Markt, Lokeren" (basisregisters), nagekeken op 26 oktober 2026.
 * Het adrespunt ligt aan de noordkant van de straat (51.10542, 3.98974).
 * Het midden van de officiële bounding box is het midden van het plein.
 */
export const lokeren = {
  label: "Markt, Lokeren",
  lat: 51.104717,
  lng: 3.990575,
  zoom: 16,
};

export const defaultLayerId = "ortho-recent";

export const layers: MapLayer[] = sortLayers(layersData as MapLayer[]);
export const regions = regionsData.regions as Region[];
export const places = placesData as Place[];

assertCatalogue(layers);

export function regionById(id: string): Region | undefined {
  return regions.find((region) => region.id === id);
}
