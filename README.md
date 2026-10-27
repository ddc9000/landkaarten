# Landkaarten

Landkaarten legt historische en huidige kaarten van Vlaanderen op dezelfde plek. Je opent op de Markt van Lokeren, zoekt een ander adres in Vlaanderen, en schuift onderaan door de tijd. De kaart wisselt, de plek en de zoom blijven staan.

De eerste versie is een demo: een volle kaart, een tijdlijn met lagen die echt laden, en een vergelijking tussen twee periodes. Er zit geen betaling in. Lagen die later toestemming of een licentie vragen, hebben in de catalogus `"premium": true`.

## Starten

Je hebt Node.js 20 of nieuwer nodig.

```bash
npm install
npm run dev
```

Daarna staat de app op `http://127.0.0.1:5173`.

```bash
npm test
npm run build
npm run preview
```

`npm run build` maakt de map `dist/`. Dat is een statische site: een webserver hoeft alleen bestanden uit te delen.

Er zijn geen sleutels nodig. Zie `.env.example` als je later een bron met een sleutel toevoegt. Een ingevuld `.env`-bestand hoort niet in git.

## Wat je ziet

- De kaart opent op het midden van de Markt in Lokeren (het midden van de officiële bounding box van “Markt, Lokeren” in het Vlaamse adressenregister).
- Zoeken gebruikt de Geopunt-locatiedienst van Digitaal Vlaanderen en blijft daardoor in Vlaanderen.
- Onderaan staat één liniaal. Het verleden ligt links, vandaag rechts, met een dimme strook toekomst zodat “nu” in het midden kan staan. Een oranje driehoek wijst het gekozen jaar aan. Slepen of vegen klikt vast op de dichtstbijzijnde kaart. Tikken op een streep springt erheen.
- De tijdlijn toont alleen lagen die op 26 oktober 2026 een echte tegel teruggaven op die Markt. Jaren zonder kaart blijven een korte, doffe streep.
- Zoeken, vergelijken en de bron zitten achter kleine knoppen. De kaart blijft vol beeld.
- Een kompas, de coördinaten, de zoom en de schaalbalk blijven als kleine instrumenten op de kaart staan.
- **Vergelijk** legt twee lagen op elkaar. *Schuiven* trekt een lijn over de kaart, *Dekking* maakt de tweede laag doorzichtig.
- Pijltjes links en rechts kiezen het vorige of volgende jaar, zolang je niet in een invoerveld zit.

De bron, de licentie, de rechthebbende en een korte uitleg staan achter de infoknop. De verplichte bronvermelding blijft ook klein op de kaart zelf, via Leaflet. Een onderbroken streep op de liniaal vraagt toestemming voor commercieel gebruik. In deze demo blijft die laag zichtbaar.

## Een laag toevoegen

Alle kaarten staan in [`src/data/layers.json`](src/data/layers.json). Een nieuwe laag is een extra object. De tijdlijn, de vergelijking en de bronvermelding lezen dat bestand; je past daar geen TypeScript voor aan.

Gebieden staan in [`src/data/regions.json`](src/data/regions.json): `flanders`, `belgium` en `world`. Een laag verwijst met `regionId` naar een gebied en heeft een eigen `coverage.bbox` in de volgorde west, zuid, oost, noord (WGS84). Zo kan later een laag voor Wallonië of Nederland erbij, met een bbox die alleen dát gebied dekt. Buiten die bbox toont de app dat de kaart de plek niet dekt.

Snelkoppelingen voor de zoeklijst staan in [`src/data/places.json`](src/data/places.json).

Minimaal voorbeeld:

```json
{
  "id": "ortho-2018",
  "title": "Luchtfoto 2018",
  "year": 2018,
  "order": 0,
  "timelineLabel": "2018",
  "periodLabel": "2018",
  "kind": "luchtfoto",
  "explanation": "Korte Nederlandse uitleg van wat je ziet.",
  "sourceName": "Digitaal Vlaanderen",
  "sourceUrl": "https://geo.api.vlaanderen.be/OMW/wmts?service=WMTS&request=GetCapabilities",
  "rightsHolder": "agentschap Digitaal Vlaanderen",
  "licenseName": "Gebruiksrecht geografische webdiensten, met bronvermelding",
  "licenseUrl": "https://www.vlaanderen.be/digitaal-vlaanderen/onze-diensten-en-platformen/geografische-webdiensten/gebruiksrecht-en-privacyverklaring-geografische-webdiensten",
  "attribution": "Orthofoto 2018 © Digitaal Vlaanderen",
  "premium": false,
  "premiumReason": null,
  "regionId": "flanders",
  "coverage": { "bbox": [2.52, 50.64, 5.95, 51.51] },
  "tiles": {
    "type": "xyz",
    "url": "https://geo.api.vlaanderen.be/OMW/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=omwrgb18vl&STYLE=&FORMAT=image/png&TILEMATRIXSET=GoogleMapsVL&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    "minZoom": 6,
    "maxZoom": 20,
    "maxNativeZoom": 19
  },
  "verifiedOn": "2026-10-26"
}
```

`kind` is `historische-kaart`, `luchtfoto` of `actuele-kaart`. `year` sorteert de tijdlijn; `order` breekt gelijke jaren (0 komt eerst). `timelineLabel` is het jaartal in het groot op de liniaal.

`tiles.type` kan ook `wms` zijn, met `url`, `layers`, `format` (`image/png` of `image/jpeg`), `version` (`1.1.1` of `1.3.0`) en `transparent`. Handig voor een dienst die geen XYZ-tegels aanbiedt.

Heeft een tegeladres een sleutel, schrijf dan `{env.VITE_MAP_TILE_KEY}` in de URL en zet de naam in `.env`. Blijft de waarde leeg, dan wordt de plaatsaanduiding leeg en probeert de laag zonder sleutel te laden.

`"premium": true` betekent: deze laag hoort later achter toestemming van de rechthebbende, een betaalde laag of een verdeling van inkomsten. Zet dan ook `premiumReason`, met wie de rechten heeft en waarom. Deze versie toont de laag gewoon en rekent niets aan.

Neem een laag pas op als een tegel op de bedoelde plek een echt beeld teruggeeft. [`BRONNEN.md`](BRONNEN.md) houdt bij wat nagekeken is, wat is weggelaten, en welke licentie erbij hoort.

## Bestanden

| Bestand | Rol |
| --- | --- |
| `src/data/layers.json` | De catalogus. Hier voeg je kaarten toe. |
| `src/data/regions.json` | Gebieden en hun bbox, klaar voor latere regio's. |
| `src/model.ts` | Sortering, dekking, laagwissel en de premium-selectie. Zonder kaartbibliotheek, daarom goed te testen. |
| `src/timeline.ts` | De liniaal: jaren, vastklikken, flick. Ook zonder de kaart te testen. |
| `src/mapView.ts` | Leaflet: tegels, overgang en vergelijking. |
| `src/main.ts` | De Nederlandse interface. |
| `tests/` | Tests voor catalogus, tijdlijn en het PWA-manifest. |

## Publiceren

Elke push naar `main` publiceert de site via [`.github/workflows/pages.yml`](.github/workflows/pages.yml). De live site staat op <https://ddc9000.github.io/landkaarten/>. `npm run build` schrijft dezelfde statische site naar `dist/`. `base` in `vite.config.ts` staat op `./`, zodat dezelfde build werkt op GitHub Pages, in de hoofdmap van een domein, en later in een Capacitor-app.

### Website

1. `npm test` en `npm run build`.
2. **Netlify:** build command `npm run build`, publish directory `dist`. Geen environment variables nodig.
3. **Vercel:** framework Vite, output `dist`, build `npm run build`.
4. **GitHub Pages:** een push naar `main` doet dit al. De workflow draait de tests, bouwt `dist/` en publiceert die map.
5. De site is een PWA. In Chrome of Edge: het installatie-icoon in de adresbalk. Op een telefoon: “Zet op beginscherm”. Het manifest, de pictogrammen en een service worker zitten in de build. De worker bewaart de app-schil (HTML, CSS, JavaScript, pictogrammen), niet de kaarttegels. Zonder netwerk blijft de schil open en meldt de app dat de kaarten een verbinding nodig hebben.

### App (later, met Capacitor)

Er is nog geen iOS- of Android-project. De webapp is er wel op voorbereid:

- relatieve paden, geen server die de HTML moet herschrijven;
- `viewport-fit=cover` en safe-area-marges voor de rand van een telefoon;
- gewone `fetch` voor het zoeken, geen pop-ups;
- de service worker wordt niet geregistreerd als `window.Capacitor.isNativePlatform()` waar is, zodat de ingepakte app haar eigen bestanden laadt.

Als je later inpakt:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Landkaarten be.landkaarten.app --web-dir dist
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

De webview heeft https-toegang nodig tot `geo.api.vlaanderen.be`, `wmts.ngi.be` en `tile.openstreetmap.be`.

Lees vóór een publieke site of een appwinkel [`BRONNEN.md`](BRONNEN.md). Lagen met `"premium": true` mag je niet zomaar commercieel publiceren. De demo toont ze zodat de tijdlijn klopt; een winkelrelease vraagt toestemming van de rechthebbende.

## Licenties van de code

De broncode van deze app is van het project. De kaarten blijven van hun rechthebbenden. Leaflet blijft in de bronvermelding op de kaart staan.
