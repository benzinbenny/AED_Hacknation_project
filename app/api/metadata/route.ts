import { NextResponse } from "next/server";
import { createPublicationMetadata } from "@/export/metadata";
import { AED_SOURCE_CATALOG } from "@/sources/catalog";
import { loadAppStore } from "@/storage/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const store = await loadAppStore();
  const knownIds = new Set(AED_SOURCE_CATALOG.map((source) => source.id));
  const contributedCount = store.sources.filter((source) => !knownIds.has(source.id)).length;
  const metadata = createPublicationMetadata({
    baseUrl: new URL(request.url).origin,
    sourceCount: AED_SOURCE_CATALOG.length + contributedCount,
    modifiedAt: store.importRuns[0]?.fetchedAt ?? null,
  });

  return new NextResponse(JSON.stringify(metadata, null, 2), {
    headers: {
      "Content-Type": "application/ld+json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="punkt-zycia-metadata.jsonld"',
      "Cache-Control": "no-store",
    },
  });
}
