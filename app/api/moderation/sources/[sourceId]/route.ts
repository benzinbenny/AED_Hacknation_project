import { NextResponse } from "next/server";
import { isAdminRequest } from "@/services/moderator-auth";
import { deleteSourceRecords } from "@/services/record-edits";
import { getAedSourceProfile } from "@/sources/catalog";
import { loadAppStore, repository } from "@/storage/repository";

export async function DELETE(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Usunięcie źródła wymaga klucza administratora." }, { status: 401 });
  const { sourceId } = await params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  await loadAppStore();
  const result = await repository.update<{ found: boolean; removedCount: number }>((store) => {
    if (permanent) {
      if (!store.deletedSourceIds?.includes(sourceId)) return { store, result: { found: false, removedCount: 0 } };
      return { store: {
        ...store,
        sources: store.sources.filter((source) => source.id !== sourceId),
        deletedSourceIds: store.deletedSourceIds.filter((id) => id !== sourceId),
        forgottenSourceIds: [...new Set([...(store.forgottenSourceIds ?? []), sourceId])],
      }, result: { found: true, removedCount: 0 } };
    }
    if (store.deletedSourceIds?.includes(sourceId) || (!getAedSourceProfile(sourceId) && !store.sources.some((source) => source.id === sourceId))) {
      return { store, result: { found: false, removedCount: 0 } };
    }
    const deleted = deleteSourceRecords(store, sourceId, new Date().toISOString());
    return { store: deleted.store, result: { found: true, removedCount: deleted.removedCount } };
  }) as { found: boolean; removedCount: number };
  return result.found ? NextResponse.json(result) : NextResponse.json({ error: "Źródło nie jest dostępne." }, { status: 404 });
}
