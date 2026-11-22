import { NextResponse } from "next/server";
import { isAdminRequest, isModeratorRequest } from "@/services/moderator-auth";
import { loadAppStore } from "@/storage/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isModeratorRequest(request)) return NextResponse.json({ error: "Brak dostępu do kolejki moderatora." }, { status: 401 });
  const store = await loadAppStore();
  return NextResponse.json({ canEdit: isAdminRequest(request), uninstalledSourceIds: store.uninstalledSourceIds ?? [], deletedSourceIds: store.deletedSourceIds ?? [], forgottenSourceIds: store.forgottenSourceIds ?? [], records: store.records, pendingRecords: store.pendingRecords, sources: store.sources, importRuns: store.importRuns, decisions: store.decisions, mergeHistory: store.mergeHistory }, { headers: { "Cache-Control": "no-store" } });
}
