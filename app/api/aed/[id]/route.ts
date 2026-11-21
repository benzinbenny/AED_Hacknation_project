import { NextResponse } from "next/server";
import { loadAppStore } from "@/storage/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await loadAppStore();
  const record = store.records.find((item) => item.id === id);
  return record ? NextResponse.json(record) : NextResponse.json({ error: "Nie znaleziono rekordu." }, { status: 404 });
}
