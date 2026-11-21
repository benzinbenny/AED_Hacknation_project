import { NextResponse } from "next/server";
import { collectAedSource } from "@/sources/collect";
import { getAedSourceProfile } from "@/sources/catalog";
import { isModeratorRequest } from "@/services/moderator-auth";
import { stageImport } from "@/services/staging";
import { loadAppStore, repository } from "@/storage/repository";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  if (!isModeratorRequest(request)) {
    return NextResponse.json({ error: "Wymagane jest uwierzytelnienie moderatora." }, { status: 401 });
  }

  const { sourceId } = await params;
  if (!getAedSourceProfile(sourceId)) return NextResponse.json({ error: "Nieznane źródło AED." }, { status: 404 });

  try {
    const collection = await collectAedSource(sourceId, { warsawToken: process.env.AED_WARSAW_API_TOKEN });
    await loadAppStore();
    let runId = "";
    await repository.update((store) => {
      const staged = stageImport(store, collection.source, collection.result.records, collection.result.issues, collection.fetchedAt);
      runId = staged.run.id;
      return staged.store;
    });

    return NextResponse.json({
      runId,
      sourceId,
      accepted: collection.result.records.length,
      rejected: collection.result.rejected,
      warningCount: collection.result.issues.filter((issue) => issue.severity === "warning").length,
      issues: collection.result.issues,
      sourceDataDate: collection.source.referenceScope?.sourceDataDate ?? null,
      fetchedAt: collection.fetchedAt,
      moderationRequired: true,
      licenseReviewStatus: "needs_review",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się pobrać i przetworzyć źródła.";
    const status = message.includes("tokenu") ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

