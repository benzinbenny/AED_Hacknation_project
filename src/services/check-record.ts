import type { AedRecord } from "../domain/types";
import type { SourceCollection } from "../sources/collect";

function values(r: AedRecord): Record<string, string | null> {
  const access = { public: "Publiczny", customers: "Dla klientów", private: "Prywatny", restricted: "Ograniczony", unknown: "Nieznany" };
  const status = { reported_operational: "Zgłoszono sprawność", reported_out_of_service: "Zgłoszono niedostępność", unknown: "Niepotwierdzony" };
  return { Nazwa: r.name, Adres: r.address, "Opis miejsca": r.locationDescription, Operator: r.operatorName,
    Współrzędne: `${r.location.latitude}, ${r.location.longitude}`, Dostęp: access[r.accessType],
    "Warunki dostępu": r.accessNotes, Godziny: r.availability.rawHours, "Stan urządzenia": status[r.operationalStatus] };
}

export function compareAtSource(published: AedRecord, collection: Pick<SourceCollection, "source" | "result">) {
  const current = values(published);
  const indexed = new Map(collection.result.records.flatMap((r) => r.sources.map((ref) => [ref.sourceRecordId, r] as const)));
  return published.sources.filter((s) => s.sourceId === collection.source.id).map((ref) => {
    const fresh = indexed.get(ref.sourceRecordId);
    if (!fresh) return { id: ref.sourceRecordId, status: collection.result.rejected
      ? "Brak dopasowania w poprawnych rekordach. Źródło zawiera również odrzucone wiersze."
      : "Brak identyfikatora w aktualnie pobranym zbiorze.", differences: [] };
    const differences = Object.entries(values(fresh)).filter(([field, value]) => value !== current[field])
      .map(([field, value]) => ({ field, catalog: current[field], source: value }));
    const freshRef = fresh.sources.find((s) => s.sourceRecordId === ref.sourceRecordId)!;
    if (ref.licenseId !== freshRef.licenseId) differences.push({ field: "Licencja", catalog: ref.licenseId ?? null, source: freshRef.licenseId ?? null });
    const status = differences.length ? "Wartości w katalogu i źródle różnią się."
      : freshRef.rawRecordHash && ref.rawRecordHash && freshRef.rawRecordHash !== ref.rawRecordHash
        ? "Zmienił się zapis źródłowy. Porównane pola katalogu są zgodne."
        : "Porównane pola katalogu są zgodne ze źródłem.";
    return { id: ref.sourceRecordId, status, differences };
  });
}

export type RecordCheckResult = ReturnType<typeof compareAtSource>;
