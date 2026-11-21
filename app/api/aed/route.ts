import { NextResponse } from "next/server";
import { loadAppStore } from "@/storage/repository";

export const runtime = "nodejs";

export async function GET() {
  const store = await loadAppStore();
  return NextResponse.json({
    records: store.records,
    sources: store.sources.map(({ id, name, licenseReviewStatus, synthetic }) => ({ id, name, licenseReviewStatus, synthetic })),
    syntheticDataIncluded: store.records.some((record) => record.sources.some((source) => store.sources.find((item) => item.id === source.sourceId)?.synthetic)),
  });
}
