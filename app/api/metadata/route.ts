import { NextResponse } from "next/server";
import { createPublicationMetadata, publicationFacts } from "@/export/metadata";
import { exportableRecords } from "@/services/licensing";
import { loadAppStore } from "@/storage/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const store = await loadAppStore();
  const facts = publicationFacts(exportableRecords(store));
  const metadata = createPublicationMetadata({
    baseUrl: new URL(request.url).origin,
    sourceCount: facts.sourceCount,
    modifiedAt: facts.modifiedAt,
  });

  return new NextResponse(JSON.stringify(metadata, null, 2), {
    headers: {
      "Content-Type": "application/ld+json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="punkt-zycia-metadata.jsonld"',
      "Cache-Control": "no-store",
    },
  });
}
