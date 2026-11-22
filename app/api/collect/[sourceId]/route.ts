import { NextResponse } from "next/server";
import { collectAedSource, collectDiscoveredDataset } from "@/sources/collect";
import { getAedSourceProfile } from "@/sources/catalog";
import { isModeratorRequest } from "@/services/moderator-auth";
import { requireInstalledSource, SourceUninstalled, stageImport } from "@/services/staging";
import { loadAppStore, repository } from "@/storage/repository";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  if (!isModeratorRequest(request)) {
    return NextResponse.json({ error: "Wymagane jest uwierzytelnienie administratora." }, { status: 401 });
  }

  const { sourceId } = await params;
  try {
    const state = await loadAppStore();
    const storedSource = state.sources.find((source) => source.id === sourceId);
    if (!getAedSourceProfile(sourceId) && !storedSource?.datasetId) return NextResponse.json({ error: "Źródło nie ma konektora pobierania." }, { status: 404 });
    requireInstalledSource(state, sourceId);
    if (sourceId === "osm-pl" && (state.uninstalledSourceIds?.includes("openaedmap-pl") || state.deletedSourceIds?.includes("openaedmap-pl"))) {
      return NextResponse.json({ error: "Krajowy import OSM wymaga instalacji indeksu OpenAEDMap." }, { status: 409 });
    }
    const collection = storedSource?.datasetId
      ? await collectDiscoveredDataset(storedSource)
      : await collectAedSource(sourceId, { warsawToken: process.env.AED_WARSAW_API_TOKEN });
    let runId = "";
    let accepted = 0;
    let licenseReviewStatus = "needs_review";
    await repository.update((store) => {
      if (sourceId === "osm-pl") requireInstalledSource(store, "openaedmap-pl");
      const staged = stageImport(store, collection.source, collection.result.records, collection.result.issues, collection.fetchedAt);
      runId = staged.run.id;
      accepted = staged.run.importedCount;
      licenseReviewStatus = staged.store.sources.find((source) => source.id === collection.source.id)?.licenseReviewStatus ?? "needs_review";
      return staged.store;
    });

    return NextResponse.json({
      runId,
      sourceId,
      accepted,
      skippedDeleted: collection.result.records.length - accepted,
      rejected: collection.result.rejected,
      warningCount: collection.result.issues.filter((issue) => issue.severity === "warning").length,
      issues: collection.result.issues,
      sourceDataDate: collection.source.referenceScope?.sourceDataDate ?? null,
      fetchedAt: collection.fetchedAt,
      moderationRequired: true,
      licenseReviewStatus,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się pobrać i przetworzyć źródła.";
    const status = error instanceof SourceUninstalled || message.includes("tokenu") ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

