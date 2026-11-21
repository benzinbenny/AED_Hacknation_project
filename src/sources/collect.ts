import type { SourceDescriptor } from "../domain/types";
import type { ImportResult } from "../domain/types";
import { getAedSourceProfile, sourceDescriptor } from "./catalog";
import { normalizeSourcePayload } from "./adapters";

const DATA_GOV_API = "https://api.dane.gov.pl";
const MAX_REDIRECTS = 3;
const MAX_PUBLIC_RESOURCE_BYTES = 8 * 1024 * 1024;
const MAX_NATIONAL_GEOJSON_BYTES = 20 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

export type SourceCollection = {
  source: SourceDescriptor;
  result: ImportResult;
  fetchedAt: string;
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type CollectOptions = {
  fetcher?: Fetcher;
  now?: () => Date;
  warsawToken?: string;
};

function assertAllowedUrl(url: URL, hostname: string) {
  if (url.protocol !== "https:" || url.hostname !== hostname || url.username || url.password) {
    throw new Error("Źródło przekierowało pobieranie do niedozwolonego hosta.");
  }
}

async function fetchFromAllowedHost(
  inputUrl: string,
  hostname: string,
  fetcher: Fetcher,
  init: RequestInit = {},
): Promise<Response> {
  let url = new URL(inputUrl);
  assertAllowedUrl(url, hostname);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetcher(url, {
      ...init,
      cache: "no-store",
      redirect: "manual",
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.ok) throw new Error(`Źródło zwróciło HTTP ${response.status}.`);
      return response;
    }

    if (redirectCount === MAX_REDIRECTS) throw new Error("Źródło przekroczyło limit przekierowań.");
    const location = response.headers.get("location");
    if (!location) throw new Error("Źródło zwróciło niekompletne przekierowanie.");
    await response.body?.cancel();
    url = new URL(location, url);
    assertAllowedUrl(url, hostname);
  }

  throw new Error("Nie udało się pobrać danych ze źródła.");
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const headerLength = Number(response.headers.get("content-length") ?? 0);
  if (headerLength > maxBytes) throw new Error("Źródło przekroczyło dozwolony rozmiar pobrania.");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error("Źródło przekroczyło dozwolony rozmiar pobrania.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function parseJson(text: string, context: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${context} zwróciło niepoprawny JSON.`);
  }
}

function responseData(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { data?: unknown }).data)) return [];
  return (value as { data: unknown[] }).data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
}

function attributes(item: Record<string, unknown>): Record<string, unknown> {
  return item.attributes && typeof item.attributes === "object" ? item.attributes as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateOnly(value: unknown): string | null {
  const text = stringValue(value);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

async function fetchJson(url: string, hostname: string, fetcher: Fetcher): Promise<unknown> {
  const response = await fetchFromAllowedHost(url, hostname, fetcher, {
    headers: { accept: "application/json", "accept-language": "pl" },
  });
  const text = await readLimitedText(response, 1024 * 1024);
  return parseJson(text, "API katalogu danych");
}

async function collectDaneGovSource(
  sourceId: string,
  fetcher: Fetcher,
  fetchedAt: string,
): Promise<SourceCollection> {
  const profile = getAedSourceProfile(sourceId);
  if (!profile || profile.collection.kind !== "dane-gov") throw new Error("Źródło nie ma konektora Dane.gov.pl.");
  const collection = profile.collection;

  const datasetUrl = `${DATA_GOV_API}/1.4/datasets?id=${encodeURIComponent(collection.datasetId)}&page=1&per_page=1`;
  const dataset = responseData(await fetchJson(datasetUrl, "api.dane.gov.pl", fetcher))
    .find((item) => String(item.id) === collection.datasetId);
  if (!dataset) throw new Error("Zbiór skonfigurowany w katalogu nie jest już dostępny w API Dane.gov.pl.");

  const resourceUrl = `${DATA_GOV_API}/1.4/datasets/${encodeURIComponent(collection.datasetId)}/resources?page=1&per_page=100`;
  const resource = responseData(await fetchJson(resourceUrl, "api.dane.gov.pl", fetcher))
    .find((item) => String(item.id) === collection.resourceId);
  if (!resource) throw new Error("Skonfigurowany zasób nie znajduje się już w zbiorze Dane.gov.pl.");

  const resourceAttributes = attributes(resource);
  const actualFormat = stringValue(resourceAttributes.format)?.toLowerCase();
  if (actualFormat !== collection.format) throw new Error("Format zasobu zmienił się względem konfiguracji konektora.");
  const downloadUrl = stringValue(resourceAttributes.download_url);
  if (!downloadUrl) throw new Error("API katalogu nie zwróciło adresu pobrania zasobu.");
  const parsedDownloadUrl = new URL(downloadUrl);
  assertAllowedUrl(parsedDownloadUrl, "api.dane.gov.pl");
  if (!parsedDownloadUrl.pathname.startsWith(`/resources/${collection.resourceId}`)) {
    throw new Error("Adres pobierania nie odpowiada skonfigurowanemu identyfikatorowi zasobu.");
  }

  const response = await fetchFromAllowedHost(downloadUrl, "api.dane.gov.pl", fetcher, {
    headers: { accept: collection.format === "csv" ? "text/csv,application/octet-stream" : "application/geo+json,application/json" },
  });
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  const acceptedContentTypes = collection.format === "csv"
    ? ["text/csv", "text/plain", "application/octet-stream", "application/vnd.ms-excel"]
    : ["application/geo+json", "application/json", "application/octet-stream"];
  if (!acceptedContentTypes.includes(contentType)) throw new Error("Format odpowiedzi źródła jest niezgodny z zasobem AED.");
  const payloadText = await readLimitedText(response, MAX_PUBLIC_RESOURCE_BYTES);
  const payload = collection.format === "csv" ? payloadText : parseJson(payloadText, profile.name);
  const datasetAttributes = attributes(dataset);
  const sourceDataDate = dateOnly(resourceAttributes.data_date);
  const liveLicense = stringValue(datasetAttributes.license_name) ?? "unknown";
  const baseSource = sourceDescriptor(profile, sourceDataDate);
  const source: SourceDescriptor = {
    ...baseSource,
    licenseId: liveLicense,
    attribution: liveLicense === "unknown" ? profile.name : profile.attribution,
    referenceScope: baseSource.referenceScope && sourceDataDate
      ? { ...baseSource.referenceScope, temporalDescription: `Najnowszy zasób pobrany z katalogu ma datę danych ${sourceDataDate}.` }
      : baseSource.referenceScope,
  };

  return { source, result: normalizeSourcePayload(sourceId, payload, fetchedAt), fetchedAt };
}

export async function collectAedSource(sourceId: string, options: CollectOptions = {}): Promise<SourceCollection> {
  const profile = getAedSourceProfile(sourceId);
  if (!profile) throw new Error("Nieznane źródło AED.");
  const fetcher = options.fetcher ?? fetch;
  const fetchedAt = (options.now ?? (() => new Date()))().toISOString();

  if (profile.collection.kind === "dane-gov") return collectDaneGovSource(sourceId, fetcher, fetchedAt);
  if (profile.collection.kind === "warsaw-api") {
    const token = options.warsawToken?.trim();
    if (!token) throw new Error("Pobieranie źródła Warszawy wymaga tokenu AED_WARSAW_API_TOKEN.");
    const response = await fetchFromAllowedHost(profile.collection.endpoint, "dane.um.warszawa.pl", fetcher, {
      method: "POST",
      headers: { accept: "application/json", authorization: `token_${token}` },
    });
    const text = await readLimitedText(response, MAX_PUBLIC_RESOURCE_BYTES);
    return { source: sourceDescriptor(profile), result: normalizeSourcePayload(sourceId, parseJson(text, profile.name), fetchedAt), fetchedAt };
  }

  const response = await fetchFromAllowedHost(profile.collection.endpoint, "openaedmap.org", fetcher, {
    headers: { accept: "application/geo+json,application/json" },
  });
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("json")) throw new Error("OpenAEDMap nie zwrócił GeoJSON.");
  const text = await readLimitedText(response, MAX_NATIONAL_GEOJSON_BYTES);
  const payload = parseJson(text, profile.name);
  return { source: sourceDescriptor(profile), result: normalizeSourcePayload(sourceId, payload, fetchedAt), fetchedAt };
}

