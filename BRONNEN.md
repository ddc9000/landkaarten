# Bronnen

Nagekeken op 26 oktober 2026. Een laag staat in de app alleen als een tegel op de Markt van Lokeren (51.104717° N, 3.990575° O, zoom 14 en 16) een echt beeld teruggaf: geen foutpagina, geen lege tegel. Voor Ferraris, Vandermaelen, de topokaart van 1939, de luchtfoto van 1971, het GRB en de nieuwste luchtfoto is dat beeld ook bekeken.

Het midden van de Markt is het midden van de bounding box die de Geopunt-locatiedienst geeft voor “Markt, Lokeren” (`https://geo.api.vlaanderen.be/geolocation/v4/Location?q=Markt,%20Lokeren`). Het kale adrespunt ligt noordelijker, aan het einde van de straat.

Er is geen betaling gebouwd. `"premium": true` in `src/data/layers.json` betekent: commercieel gebruik, een appwinkel of een betaalde laag vraagt toestemming van de rechthebbende. De demo toont die lagen wel.

## Opgenomen

| Id | Jaar in de tijdlijn | Dienst | Premium |
| --- | --- | --- | --- |
| `fricx` | 1712 | WMTS `HISTCART` laag `frickx` | ja |
| `ferraris` | 1777 (opname 1771–1778) | WMTS `HISTCART` laag `ferraris` | ja |
| `abw` | ca. 1841 | WMTS `HISTCART` laag `abw` | ja |
| `popp` | 1842–1879 | WMTS `HISTCART` laag `popp` | ja |
| `vandermaelen` | 1846–1854 | WMTS `HISTCART` laag `vandermaelen` | ja |
| `ngi-1873` | ca. 1873 | NGI/Cartesius `seamless_carto … __140` | ja |
| `ngi-1904` | ca. 1904 | NGI/Cartesius `… __450` | ja |
| `ngi-1939` | ca. 1939 | NGI/Cartesius `… __800` | ja |
| `ngi-1969` | ca. 1969 | NGI/Cartesius `… __1100` | ja |
| `ortho-1971` | 1971 | WMTS `OKZ` laag `okzpan71vl` | nee |
| `ortho-1979` | 1979–1990 | WMTS `OKZ` laag `okzrgb79_90vl` | nee |
| `ngi-1981` | ca. 1981 | NGI/Cartesius `… __1220` | ja |
| `ortho-2000` | 2000–2003 | WMTS `OMW` laag `omwrgb00_03vl` | nee |
| `ortho-2015` | 2015 | WMTS `OMW` laag `omwrgb15vl` | nee |
| `ortho-recent` | meest recent | WMTS `OMWRGBMRVL` laag `omwrgbmrvl` | nee |
| `grb` | vandaag | WMTS `GRB` laag `grb_bsk` | nee |
| `osm` | vandaag | `tile.openstreetmap.be/osmbe-nl/{z}/{x}/{y}.png` | nee |

Tegelpatroon Digitaal Vlaanderen, matrix `GoogleMapsVL` (zelfde zoom als een webkaart):

`https://geo.api.vlaanderen.be/HISTCART/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=<laag>&STYLE=&FORMAT=image/png&TILEMATRIXSET=GoogleMapsVL&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`

Dezelfde vorm werkt voor `OKZ`, `OMW`, `OMWRGBMRVL` en `GRB`. Capabilities: `?service=WMTS&request=GetCapabilities`.

NGI-topokaart:

`https://wmts.ngi.be/arcgis/rest/services/seamless_carto__default__3857__<code>/MapServer/tile/{z}/{y}/{x}`

## Licentie, en wie de rechten heeft

### Vrij te tonen met bronvermelding — `premium: false`

- **Luchtfoto's Digitaal Vlaanderen** (1971, 1979–1990, 2000–2003, 2015, nieuwste mozaïek). Rechthebbende: agentschap Digitaal Vlaanderen. De webdiensten zijn publiek. In web- en mobiele toepassingen vragen ze een bronvermelding, bijvoorbeeld “Orthofoto 1971 © Digitaal Vlaanderen” of “Bron: Luchtopnamen Vlaanderen, Digitaal Vlaanderen”. Voorwaarden: [gebruiksrecht webdiensten](https://www.vlaanderen.be/digitaal-vlaanderen/onze-diensten-en-platformen/geografische-webdiensten/gebruiksrecht-en-privacyverklaring-geografische-webdiensten) en de [bronvermelding voor luchtopnamen](https://www.vlaanderen.be/digitaal-vlaanderen/onze-diensten-en-platformen/luchtopnamen/middenschalige-winterluchtopnamen). De app toont de officiële tegeldienst en bewaart de tegels niet. De beelden zelf herverkopen is iets anders dan deze raadpleegdienst tonen.
- **GRB-basiskaart.** Rechthebbende: agentschap Digitaal Vlaanderen. Licentie: [Gratis open data licentie Vlaanderen v1.02](https://www.vlaanderen.be/digitaal-vlaanderen/onze-oplossingen/open-data/voorwaarden-voor-het-hergebruik-van-overheidsinformatie). Commercieel gebruik mag. Verplichte vermelding: “Bron: Grootschalig Referentiebestand Vlaanderen, Digitaal Vlaanderen”. [GRB-webdiensten](https://www.vlaanderen.be/digitaal-vlaanderen/onze-diensten-en-platformen/basiskaart-vlaanderen-grb/grb-webdiensten).
- **OpenStreetMap België.** Rechthebbenden: de OpenStreetMap-bijdragers. Licentie van de data: [ODbL](https://www.openstreetmap.org/copyright). Commercieel gebruik mag, met naamsvermelding. De tegelserver is een gemeenschapsdienst zonder capaciteitsgarantie. Voor een drukke site of app horen eigen tegels of een andere provider.

### Toestemming nodig voor commercieel gebruik — `premium: true`

Dit zijn de bronnen van hoge kwaliteit die een latere betaalde laag of een verdeling van inkomsten zouden raken. De demo toont ze. Een publieke commerciële site of appwinkel niet, zolang de toestemming er niet is.

- **Ferrariskaart, Vandermaelenkaart en Fricxkaart.** Rechthebbenden: **KBR** (Koninklijke Bibliotheek van België) en **agentschap Digitaal Vlaanderen**, onverdeeld, op het gegeorefereerde product. De originelen zijn oud; de rechten gaan over de digitale, geplaatste kaart. [Geopunt](https://www.vlaanderen.be/geopunt/vlaams-geoportaal/gebruiksvoorwaarden/disclaimer/intellectuele-eigendomsrechten) schrijft dat de KBR de kaarten liet ontsluiten ter raadpleging. Verder verspreiden, een download aanbieden en commerciële diensten zijn uitgesloten. De namen (en volgens die tekst de logo's) van KBR en Digitaal Vlaanderen moeten blijven staan. Dienst: `https://geo.api.vlaanderen.be/HISTCART/wmts`.
- **Popp-kaart (1842–1879).** Rechthebbende van de dataset: **agentschap Digitaal Vlaanderen**. Bronmateriaal: scans van de **KBR**, aangevuld met kopieën van de **UGent**. [Datavindplaats](https://www.vlaanderen.be/datavindplaats/catalogus/popp-atlas-cadastrale-parcellaire-de-la-belgique-1842-1879). Popp wordt niet genoemd in het KBR-verbod dat Ferraris, Vandermaelen en Fricx opsomt, en er is ook geen open-datalicentie zoals bij het GRB gevonden. Vóór commercieel gebruik: Digitaal Vlaanderen, en navragen of KBR of UGent nog rechten op de scans claimt.
- **Atlas der Buurtwegen (ca. 1841).** Rechthebbende van de raadpleegdienst: **agentschap Digitaal Vlaanderen**. De atlassen komen uit de provincies. Geen aparte open-datalicentie gevonden. Zelfde advies: toestemming vragen vóór een commerciële app. Dienst: WMTS `HISTCART`, laag `abw`.
- **Topokaarten NGI 1873, 1904, 1939, 1969 en 1981.** Rechthebbende: **Nationaal Geografisch Instituut**. De tegels zijn de Cartesius-mozaïeken (`wmts.ngi.be`). Het NGI schrijft in zijn [FAQ](https://ngi.be/faq/) dat die eindpunten geen officieel product zijn, en dat gebruik buiten eenvoudige consultatie en MyCartesius voorafgaande toestemming vraagt. Commercieel gebruik is in die voorwaarden uitgesloten. Historische kaarten staan ook niet in de open data van het NGI ([open-data-FAQ](https://ngi.be/faq-open-data-en/)); een licentie loopt via sales@ngi.be. De voorwaarden noemen daarnaast de KBR, het Rijksarchief en het KMMA als instellingen waarvan de producten niet beconcurreerd mogen worden.

De service worker cachet deze tegels niet. Elke bezoeker haalt ze zelf bij de bronhouder op.

## Nagekeken, niet in de tijdlijn

De tijdlijn blijft bewust kort, rond de Markt van Lokeren. Onderstaande diensten bestaan. Ze zitten er niet in omdat ze de demo niet scherper maken, de plek niet dekken, of leeg terugkwamen.

| Bron | Wat er gebeurde |
| --- | --- |
| Villaret 1745–1748, WMS `histcart` laag `Villaret` | Overzicht van Vlaanderen laadt. Vanaf zoom 12 is de tegel op de Markt leeg, dus het plein is niet te volgen. Uitgever van de dataset: Onroerend Erfgoed. Rechten niet verder uitgeklaard. |
| Pourbus 1571, WMTS laag `pourbus` | Beeld op de Markt van Brugge, lege tegel op Lokeren. Alleen het Brugse Vrije. |
| Claeissens 1601, WMS laag `claeissens` | Zelfde: Brugge wel, Lokeren niet. |
| Masse 1729–1730, WMS laag `Masse` | Alleen de uiterste westkust (Koksijde wel, Lokeren niet). |
| Grenskaart 1843, WMS laag `grenskaart1843` | Alleen de rijksgrens, niet het plein. |
| NGI-orthofoto's 1947, 1948, 1952, 1954 | Officiële WMTS `https://wmts.ngi.be/orthophotos_1940s/1.0.0/` en `…/orthophotos_1950s/`. Het sjabloon antwoordt, maar de tegel op Lokeren is leeg (355 bytes, geen beeld). Dekking is onvolledig. Historische luchtfoto's van het NGI zijn geen open data; rechten bij het NGI, licentie via sales@ngi.be. |
| NGI-mozaïek 1989 (`seamless_carto … __1300`) | Op de Markt, zoom 14 en 16, byte voor byte dezelfde tegel als 1981. |
| Oudere ArcGIS-paden `ortho__default__3857__1947-1954` | HTTP 404. Vervangen door de WMTS hierboven, die op Lokeren leeg is. |
| Jaarlijkse winterluchtfoto's 2005–2007, 2008–2011 en 2012–2014, 2016–2025 (`omwrgb05_07vl`, `omwrgb08_11vl`, `omwrgb12vl` … `omwrgb25vl`) | Tegels op Lokeren gecontroleerd en in orde, inclusief 2023, 2024 en 2025. Niet allemaal in de tijdlijn gezet, zodat die leesbaar blijft. Toevoegen kan met het voorbeeld in de README; laagnaam `omwrgb18vl` voor 2018, enzovoort. Zelfde licentie als de andere luchtfoto's van Digitaal Vlaanderen. |
| Grootschalige winterluchtfoto 2013–2015 (`OGW`, `ogwrgb13_15vl`) | Laadt. Weggelaten omdat de middenschalige reeks dat decennium al toont. |
| Zomerreeksen `OMZ` (2009, 2012, 2015, 2018, ook infrarood) | Niet in de demo. Zelfde familie als de winterreeks; de winterreeks is de doorlopende lijn. |
| CartoWeb.be actuele topokaart | WMTS `https://cartoweb.wmts.ngi.be/1.0.0/topo/default/3857/{z}/{y}/{x}.png` laadt op Lokeren. Licentie [CC BY-NC](https://ngi.be/gebruiksvoorwaarden-cartoweb-be/): gratis voor niet-commercieel gebruik, commerciële organisaties betalen het NGI een jaarvergoeding. Op grote schalen ook vermelding van TomTom. Weggelaten omdat GRB en OpenStreetMap “vandaag” al tonen zonder die beperking. Rechthebbende: Nationaal Geografisch Instituut. |
| David Rumsey, Old Maps Online, Mercator-kaarten van rond 1500–1600 | Geen gegeorefereerde tegeldienst gevonden die heel Lokeren dekt. Pourbus is het oudste werkende blad en dekt de stad niet. |
| Waze, Google, Esri en andere wereldbasiskaarten uit losse tegellijsten | Niet gebruikt. Licentie dekt deze app niet, of er is een sleutel nodig. |

## Zoeken

`https://geo.api.vlaanderen.be/geolocation/v4/Suggestion` en `…/Location`. Publiek, CORS staat open, geen sleutel. De dienst zoekt in Vlaanderen.
