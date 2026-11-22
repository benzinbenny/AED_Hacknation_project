import { NextResponse } from "next/server";
import { compareAtSource } from "@/services/check-record";
import { isModeratorRequest } from "@/services/moderator-auth";
import { requireInstalledSource, SourceUninstalled } from "@/services/staging";
import { getAedSourceProfile } from "@/sources/catalog";
import { collectAedSource, collectDiscoveredDataset } from "@/sources/collect";
import { loadAppStore } from "@/storage/repository";

export const maxDuration = 150;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isModeratorRequest(request)) return NextResponse.json({ error: "Wymagany jest dostęp do moderacji." }, { status: 401 });
  const { id } = await params;
  const store = await loadAppStore();
  const record = store.records.find((r) => r.id === id);
  if (!record) return NextResponse.json({ error: "Wpis nie znajduje się w zatwierdzonych AED." }, { status: 404 });
  const sourceId = new URL(request.url).searchParams.get("source") ?? "";
  const refs = record.sources.filter((s) => s.sourceId === sourceId);
  if (!refs.length) return NextResponse.json({ error: "To źródło nie należy do wpisu." }, { status: 400 });
  try {
    requireInstalledSource(store, sourceId);
    const source = store.sources.find((s) => s.id === sourceId);
    if (!getAedSourceProfile(sourceId) && !source?.datasetId) {
      const ids = new Set(refs.map((s) => s.sourceRecordId));
      const drafts = store.pendingRecords.filter((r) => r.sources.some((s) => s.sourceId === sourceId && ids.has(s.sourceRecordId)));
      if (!source || !drafts.length) {
        return NextResponse.json({ note: source?.synthetic ? "Wpis demonstracyjny. Brak zewnętrznego źródła do sprawdzenia."
          : "Brak nowej wersji w kolejce. Aby ponownie porównać dane, przekaż aktualny plik dysponenta.", results: [] });
      }
      return NextResponse.json({ note: "Porównanie z oczekującą wersją z importu.", results: compareAtSource(record, { source, result: { records: drafts, rejected: 0, issues: [] } }) });
    }
    const collection = source?.datasetId
      ? await collectDiscoveredDataset(source)
      : await collectAedSource(sourceId, { warsawToken: process.env.AED_WARSAW_API_TOKEN, osmRecordIds: refs.map((s) => s.sourceRecordId) });
    return NextResponse.json({ checkedAt: new Date().toISOString(), results: compareAtSource(record, collection) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Nie udało się pobrać danych." }, { status: err instanceof SourceUninstalled ? 409 : 502 });
  }
}
