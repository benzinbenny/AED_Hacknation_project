import type { SourceDescriptor, SourceReferenceScope } from "../domain/types";
import type { CsvFieldMapping } from "../import/csv";

type PublicEndpointCollection = {
  kind: "openaedmap";
  endpoint: string;
  format: "geojson";
  requiresToken: false;
};

type DaneGovCollection = {
  kind: "dane-gov";
  datasetId: string;
  resourceId: string;
  format: "csv" | "geojson";
  requiresToken: false;
  mapping?: CsvFieldMapping;
};

type WarsawCollection = {
  kind: "warsaw-api";
  endpoint: string;
  format: "json";
  requiresToken: true;
};

export type AedSourceProfile = SourceDescriptor & {
  publisher: string;
  catalogUrl: string;
  formatLabel: string;
  referenceScope: SourceReferenceScope;
  collection: PublicEndpointCollection | DaneGovCollection | WarsawCollection;
};

const nationalScope: SourceReferenceScope = {
  geographyLabel: "Polska — zasięg krajowy eksportu",
  geographyLevel: "country",
  temporalDescription: "Stan bazy OpenStreetMap w chwili pobrania; endpoint nie podaje osobnego okresu obserwacji urządzeń.",
  sourceDataDate: null,
  updateFrequency: "Brak deklarowanego harmonogramu eksportu",
  basis: "observed_export",
  limitations: "Zasięg endpointu krajowy, kompletność zależy od mapowania społeczności OSM; nie potwierdza istnienia, dostępności ani sprawności urządzenia.",
};

export const AED_SOURCE_CATALOG: AedSourceProfile[] = [
  {
    id: "openaedmap-pl",
    name: "OpenAEDMap — eksport Polski",
    url: "https://openaedmap.org/pl/",
    catalogUrl: "https://openaedmap.org/pl/",
    publisher: "Społeczność OpenStreetMap / OpenAEDMap",
    upstreamOrigin: "OpenStreetMap",
    licenseId: "ODbL-1.0",
    attribution: "© OpenStreetMap contributors; dane na licencji ODbL 1.0",
    formatLabel: "GeoJSON",
    referenceScope: nationalScope,
    collection: {
      kind: "openaedmap",
      endpoint: "https://openaedmap.org/api/v1/countries/PL.geojson",
      format: "geojson",
      requiresToken: false,
    },
  },
  {
    id: "dane-gov-krosno",
    name: "Defibrylatory zlokalizowane w Mieście Krosno",
    url: "https://dane.gov.pl/pl/dataset/3624",
    catalogUrl: "https://dane.gov.pl/pl/dataset/3624",
    publisher: "Urząd Miasta Krosna",
    upstreamOrigin: "Urząd Miasta Krosna",
    licenseId: "CC0 1.0",
    attribution: "Urząd Miasta Krosna, dane.gov.pl (CC0 1.0)",
    formatLabel: "CSV",
    referenceScope: {
      geographyLabel: "Miasto Krosno",
      geographyLevel: "municipality",
      temporalDescription: "Zasób oznaczony datą danych 2024-02-19; brak okresu obserwacji poszczególnych AED.",
      sourceDataDate: "2024-02-19",
      updateFrequency: "Nie dotyczy według metadanych zbioru",
      basis: "publisher_declared",
      limitations: "Jednorazowy opublikowany zasób; jego data nie potwierdza aktualnej lokalizacji ani działania urządzeń.",
    },
    collection: {
      kind: "dane-gov",
      datasetId: "3624",
      resourceId: "54632",
      format: "csv",
      requiresToken: false,
      mapping: {
        sourceRecordId: "Numer Id",
        name: "Nazwa",
        latitude: "Szerokość geograficzna",
        longitude: "Długość geograficzna",
        operatorName: "Lokalizacja",
        address: "Adres",
      },
    },
  },
  {
    id: "dane-gov-marki",
    name: "Defibrylatory zlokalizowane na terenie Miasta Marki",
    url: "https://dane.gov.pl/pl/dataset/4955",
    catalogUrl: "https://dane.gov.pl/pl/dataset/4955",
    publisher: "Urząd Miasta Marki",
    upstreamOrigin: "Urząd Miasta Marki",
    licenseId: "CC BY 4.0",
    attribution: "Urząd Miasta Marki, dane.gov.pl (CC BY 4.0)",
    formatLabel: "CSV",
    referenceScope: {
      geographyLabel: "Miasto Marki",
      geographyLevel: "municipality",
      temporalDescription: "Zasób oznaczony datą danych 2025-07-10; brak okresu obserwacji poszczególnych AED.",
      sourceDataDate: "2025-07-10",
      updateFrequency: "Jednorazowe udostępnienie według metadanych zbioru",
      basis: "publisher_declared",
      limitations: "W pliku nagłówki szerokości i długości są zamienione względem większości wartości; jeden rekord wskazuje poza Polskę. Import zachowuje wartości i zgłasza ostrzeżenie.",
    },
    collection: {
      kind: "dane-gov",
      datasetId: "4955",
      resourceId: "68353",
      format: "csv",
      requiresToken: false,
      mapping: {
        sourceRecordId: "Numer Id",
        name: "Nazwa",
        latitude: "Długość geograficzna",
        longitude: "Szerokość geograficzna",
        operatorName: "Lokalizacja",
        address: "Adres",
      },
    },
  },
  {
    id: "dane-gov-przemysl",
    name: "Lokalizacje AED w Przemyślu",
    url: "https://dane.gov.pl/pl/dataset/4581",
    catalogUrl: "https://dane.gov.pl/pl/dataset/4581",
    publisher: "Urząd Miejski w Przemyślu",
    upstreamOrigin: "Urząd Miejski w Przemyślu",
    licenseId: "CC0 1.0",
    attribution: "Urząd Miejski w Przemyślu, dane.gov.pl (CC0 1.0)",
    formatLabel: "GeoJSON",
    referenceScope: {
      geographyLabel: "Miasto Przemyśl",
      geographyLevel: "municipality",
      temporalDescription: "Zasób GeoJSON oznaczony datą danych 2024-11-06; zbiór deklaruje codzienną aktualizację.",
      sourceDataDate: "2024-11-06",
      updateFrequency: "Codziennie według metadanych zbioru",
      basis: "publisher_declared",
      limitations: "Data ostatniego zasobu jest starsza niż deklarowana częstotliwość; stan dostępu i działania AED pozostaje nieznany.",
    },
    collection: {
      kind: "dane-gov",
      datasetId: "4581",
      resourceId: "62093",
      format: "geojson",
      requiresToken: false,
    },
  },
  {
    id: "warszawa-scb-aed",
    name: "Lokalizacja defibrylatorów (AED) — Warszawa",
    url: "https://dane.gov.pl/pl/dataset/39512",
    catalogUrl: "https://dane.gov.pl/pl/dataset/39512",
    publisher: "Stołeczne Centrum Bezpieczeństwa",
    upstreamOrigin: "Stołeczne Centrum Bezpieczeństwa m.st. Warszawy",
    licenseId: "CC BY 4.0",
    attribution: "Stołeczne Centrum Bezpieczeństwa m.st. Warszawy (CC BY 4.0)",
    formatLabel: "JSON przez API wymagające tokenu",
    referenceScope: {
      geographyLabel: "m.st. Warszawa",
      geographyLevel: "municipality",
      temporalDescription: "Zasób portalowy podaje datę danych 2025-10-10; bezpośredni endpoint wymaga tokenu dostępowego.",
      sourceDataDate: "2025-10-10",
      updateFrequency: "Codziennie według strony zbioru",
      basis: "publisher_declared",
      limitations: "Bez tokenu nie można pobrać rekordów z API; plik JSON w sekcji zasobów opisuje sposób wywołania, a nie zawiera lokalizacji AED.",
    },
    collection: {
      kind: "warsaw-api",
      endpoint: "https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow",
      format: "json",
      requiresToken: true,
    },
  },
];

export function getAedSourceProfile(sourceId: string): AedSourceProfile | undefined {
  return AED_SOURCE_CATALOG.find((source) => source.id === sourceId);
}

export function sourceDescriptor(profile: AedSourceProfile, sourceDataDate = profile.referenceScope.sourceDataDate): SourceDescriptor {
  return {
    id: profile.id,
    name: profile.name,
    url: profile.url,
    upstreamOrigin: profile.upstreamOrigin,
    licenseId: profile.licenseId,
    attribution: profile.attribution,
    referenceScope: {
      ...profile.referenceScope,
      sourceDataDate,
    },
  };
}
