import { NextResponse } from "next/server";
import { isModeratorRequest } from "@/services/moderator-auth";
import { loadAppStore } from "@/storage/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isModeratorRequest(request)) return NextResponse.json({ error: "Brak dostępu do kolejki moderatora." }, { status: 401 });
  const store = await loadAppStore();
  return NextResponse.json({ records: store.records, pendingRecords: store.pendingRecords, sources: store.sources, importRuns: store.importRuns, decisions: store.decisions, mergeHistory: store.mergeHistory });
}
