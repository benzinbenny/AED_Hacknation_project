import { NextResponse } from "next/server";
import { publicRecords } from "@/services/licensing";
import { loadAppStore } from "@/storage/repository";

export const runtime = "nodejs";

export async function GET() {
  const store = await loadAppStore();
  const records = publicRecords(store);
  return NextResponse.json({
    records,
    sources: store.sources.filter((source) => !store.deletedSourceIds?.includes(source.id)).map(({ id, name, licenseReviewStatus, synthetic }) => ({ id, name, licenseReviewStatus, synthetic })),
    syntheticDataIncluded: records.some((record) => record.sources.some((source) => store.sources.find((item) => item.id === source.sourceId)?.synthetic)),
  });
}
