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
  let found = false;
  await repository.update((store) => {
    found = store.sources.some((source) => source.id === id);
    return { ...store, sources: store.sources.map((source) => source.id === id ? { ...source, licenseReviewStatus: body.data.status } : source) };
  });
  if (!found) return NextResponse.json({ error: "Nie znaleziono źródła." }, { status: 404 });
  return NextResponse.json({ ok: true, status: body.data.status });
}
