import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest, isModeratorRequest } from "@/services/moderator-auth";
import { getAedSourceProfile } from "@/sources/catalog";
import { repository } from "@/storage/repository";

export async function PUT(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Zarządzanie instalacją wymaga klucza administratora." }, { status: isModeratorRequest(request) ? 403 : 401 });
  const body = z.strictObject({ installed: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Wybierz stan instalacji." }, { status: 400 });
  const { sourceId } = await params;
  const known = await repository.update<boolean>((store) => {
    if (!getAedSourceProfile(sourceId) && !store.sources.some((source) => source.id === sourceId)) return { store, result: false };
    const removed = new Set(store.uninstalledSourceIds);
    if (body.data.installed) removed.delete(sourceId);
    else removed.add(sourceId);
    const deletedSourceIds = body.data.installed ? (store.deletedSourceIds ?? []).filter((id) => id !== sourceId) : store.deletedSourceIds;
    return { store: { ...store, uninstalledSourceIds: [...removed], deletedSourceIds }, result: true };
  });
  return known ? NextResponse.json(body.data) : NextResponse.json({ error: "Źródło nie jest dostępne." }, { status: 404 });
}
