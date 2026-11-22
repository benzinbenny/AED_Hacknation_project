import { NextResponse } from "next/server";
import { z } from "zod";
import { isModeratorRequest } from "@/services/moderator-auth";
import { loadAppStore, repository } from "@/storage/repository";

export const runtime = "nodejs";
const ReviewBody = z.object({ status: z.enum(["approved", "blocked", "needs_review"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isModeratorRequest(request)) return NextResponse.json({ error: "Brak dostępu do rejestru źródeł." }, { status: 401 });
  const body = ReviewBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Niepoprawny status licencji." }, { status: 400 });
  const { id } = await params;
  await loadAppStore();
  const result = await repository.update<"missing" | "deleted" | "updated">((store) => {
    if (!store.sources.some((source) => source.id === id)) return { store, result: "missing" };
    if (store.deletedSourceIds?.includes(id)) return { store, result: "deleted" };
    return { store: { ...store, sources: store.sources.map((source) => source.id === id ? { ...source, licenseReviewStatus: body.data.status } : source) }, result: "updated" };
  });
  if (result === "missing") return NextResponse.json({ error: "Nie znaleziono źródła." }, { status: 404 });
  if (result === "deleted") return NextResponse.json({ error: "Źródło zostało usunięte. Przywróć je przed oceną licencji." }, { status: 409 });
  return NextResponse.json({ ok: true, status: body.data.status });
}
