import { NextResponse } from "next/server";
import { z } from "zod";
import { isModeratorRequest } from "@/services/moderator-auth";
import { mergePublicRecords } from "@/services/staging";
import { loadAppStore, repository } from "@/storage/repository";

export const runtime = "nodejs";
const MergeBody = z.object({ survivingRecordId: z.string().uuid(), mergedRecordId: z.string().uuid(), reason: z.string().trim().min(5).max(500) });

export async function POST(request: Request) {
  if (!isModeratorRequest(request)) return NextResponse.json({ error: "Brak dostępu do moderacji." }, { status: 401 });
  const body = MergeBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Podaj dwa różne rekordy i krótkie uzasadnienie scalenia." }, { status: 400 });
  await loadAppStore();
  try {
    await repository.update((store) => mergePublicRecords(store, body.data.survivingRecordId, body.data.mergedRecordId, body.data.reason, new Date().toISOString()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się scalić rekordów." }, { status: 409 });
  }
}
