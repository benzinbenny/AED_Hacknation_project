import { NextResponse } from "next/server";
import { isModeratorRequest } from "@/services/moderator-auth";
import { loadAppStore, repository } from "@/storage/repository";
import { undoPublicMerge } from "@/services/staging";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isModeratorRequest(request)) return NextResponse.json({ error: "Brak dostępu do moderacji." }, { status: 401 });
  const { id } = await params;
  await loadAppStore();
  try {
    await repository.update((store) => undoPublicMerge(store, id, new Date().toISOString()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się cofnąć scalenia." }, { status: 409 });
  }
}
