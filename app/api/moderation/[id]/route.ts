import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest, isModeratorRequest } from "@/services/moderator-auth";
import { deleteRecord, deletionVersion, EditConflict, editRecord, recordVersion } from "@/services/record-edits";
import { RecordChangesSchema } from "@/domain/types";
import { reviewPendingRecord } from "@/services/staging";
import { loadAppStore, repository } from "@/storage/repository";

export const runtime = "nodejs";

const DecisionBody = z.object({ decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(500).default("") });

const Stage = z.enum(["pending", "published"]);
const EditBody = z.strictObject({
  stage: Stage,
  version: z.string().regex(/^[a-f0-9]{64}$/),
  changes: RecordChangesSchema.refine((changes) => Object.keys(changes).length > 0),
});

function requireAdmin(request: Request) {
  if (isAdminRequest(request)) return null;
  return NextResponse.json({ error: "Edycja wymaga klucza administratora." }, { status: isModeratorRequest(request) ? 403 : 401 });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const stage = Stage.safeParse(new URL(request.url).searchParams.get("stage"));
  if (!stage.success) return NextResponse.json({ error: "Wybierz zbiór wpisów." }, { status: 400 });
  const { id } = await params;
  const store = await loadAppStore();
  const records = stage.data === "pending" ? store.pendingRecords : store.records;
  const record = records.find((item) => item.id === id);
  if (!record) return NextResponse.json({ error: "Wpis nie istnieje w wybranym zbiorze." }, { status: 404 });
  return NextResponse.json({ record, version: recordVersion(record), deletionVersion: deletionVersion(store, id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = EditBody.pick({ stage: true, version: true }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Niepoprawne żądanie usunięcia wpisu." }, { status: 400 });
  const { id } = await params;
  try {
    await repository.update((store) => deleteRecord(store, id, body.data.stage, body.data.version, new Date().toISOString()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof EditConflict) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = EditBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Niepoprawne pola wpisu. Sprawdź tekst, współrzędne i wybrane wartości." }, { status: 400 });
  const { id } = await params;
  const { stage, changes, version } = body.data;
  try {
    await repository.update((store) => editRecord(store, id, stage, version, changes, new Date().toISOString()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof EditConflict) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isModeratorRequest(request)) return NextResponse.json({ error: "Brak dostępu do kolejki moderatora." }, { status: 401 });
  const body = DecisionBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Niepoprawna decyzja moderatora." }, { status: 400 });
  const { id } = await params;
  try {
    await loadAppStore();
    await repository.update((store) => reviewPendingRecord(store, id, body.data.decision, body.data.reason, new Date().toISOString()));
    return NextResponse.json({ ok: true, decision: body.data.decision });
  } catch (error) {
    if (error instanceof Error && error.message.includes("license")) {
      return NextResponse.json({ error: "Najpierw zatwierdź licencję źródła." }, { status: 409 });
    }
    return NextResponse.json({ error: "Rekord oczekujący nie istnieje." }, { status: 404 });
  }
}
