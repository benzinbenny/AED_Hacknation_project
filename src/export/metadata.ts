import type { AedRecord } from "../domain/types";

export type PublicationMetadataInput = {
  baseUrl: string;
  sourceCount: number;
  modifiedAt?: string | null;
};

export function publicationFacts(records: Array<Pick<AedRecord, "sources" | "localCorrection">>): { sourceCount: number; modifiedAt: string | null } {
  const sourceIds = new Set<string>();
  let latest = -Infinity;
  for (const record of records) {
    if (record.localCorrection) latest = Math.max(latest, Date.parse(record.localCorrection.updatedAt));
    for (const source of record.sources) {
      sourceIds.add(source.sourceId);
      latest = Math.max(latest, Date.parse(source.fetchedAt));
    }
  }
  return {
    sourceCount: sourceIds.size,
    modifiedAt: Number.isFinite(latest) ? new Date(latest).toISOString() : null,
  };
}

type Distribution = {
  "@type": "dcat:Distribution";
  "dct:title": string;
  "dct:format": string;
  "dcat:accessURL": string;
};

export function createPublicationMetadata({ baseUrl, sourceCount, modifiedAt = null }: PublicationMetadataInput): Record<string, unknown> {
  const canonicalBaseUrl = baseUrl.replace(/\/$/, "");
  const distributions: Distribution[] = [
    { "@type": "dcat:Distribution", "dct:title": "Dane AED — CSV", "dct:format": "text/csv", "dcat:accessURL": `${canonicalBaseUrl}/api/export/csv` },
    { "@type": "dcat:Distribution", "dct:title": "Dane AED — JSON", "dct:format": "application/json", "dcat:accessURL": `${canonicalBaseUrl}/api/export/json` },
    { "@type": "dcat:Distribution", "dct:title": "Dane AED — GeoJSON", "dct:format": "application/geo+json", "dcat:accessURL": `${canonicalBaseUrl}/api/export/geojson` },
    { "@type": "dcat:Distribution", "dct:title": "Wzorcowy zakres danych AED — XLSX", "dct:format": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "dcat:accessURL": `${canonicalBaseUrl}/api/standard` },
  ];

  return {
    "@context": "https://www.w3.org/ns/dcat.jsonld",
    "@type": "dcat:Dataset",
    "@id": `${canonicalBaseUrl}/dataset/aed-polska`,
    "dct:title": "Punkt Życia — przygotowanie otwartych danych o AED",
    "dct:description": "Paczka danych AED przygotowana z rozproszonych źródeł po walidacji, kontroli licencji i moderacji. Zakres referencyjny opisuje publikacje źródłowe i nie gwarantuje kompletności, aktualności ani sprawności każdego AED.",
    "dct:language": "pl",
    "dct:hasVersion": "0.2",
    "dct:provenance": `Zachowano pochodzenie, licencję i atrybucję rekordów z ${sourceCount} źródeł. Publikacja w dane.gov.pl wymaga działania uprawnionego podmiotu.`,
    "dct:modified": modifiedAt ?? undefined,
    "dct:accessRights": "public",
    "dct:conformsTo": `${canonicalBaseUrl}/standard`,
    "dcat:distribution": distributions,
  };
}
