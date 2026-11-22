import { NextResponse } from "next/server";
import { isAdminRequest } from "@/services/moderator-auth";
import { discoverAedDatasets, registerDiscoveredSources } from "@/sources/discover";
import { loadAppStore, repository } from "@/storage/repository";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Wyszukiwanie wymaga klucza administratora." }, { status: 401 });
  const result = await discoverAedDatasets();
  await loadAppStore();
  await repository.update((store) => registerDiscoveredSources(store, result.datasets));
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
