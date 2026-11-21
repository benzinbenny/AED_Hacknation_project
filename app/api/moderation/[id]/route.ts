import { NextResponse } from "next/server";
import { z } from "zod";
import { isModeratorRequest } from "@/services/moderator-auth";
import { reviewPendingRecord } from "@/services/staging";
import { loadAppStore, repository } from "@/storage/repository";

export const runtime = "nodejs";

const DecisionBody = z.object({ decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(500).default("") });

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
