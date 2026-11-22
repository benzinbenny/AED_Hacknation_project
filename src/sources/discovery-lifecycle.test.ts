import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";

it("finds, installs, collects, removes and forgets a new dataset", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "aed-discovery-"));
  vi.stubEnv("AED_STORE_PATH", path.join(directory, "store.json"));
  vi.stubEnv("AED_ADMIN_TOKEN", "test-admin");
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/datasets?") && url.includes("q=")) return Response.json({ data: [{ id: "999", attributes: { title: "Rejestr AED", formats: ["csv"], license_name: "CC0" } }], links: { next: null } });
    if (url.includes("/datasets?id=999")) return Response.json({ data: [{ id: "999", attributes: { license_name: "CC0" } }] });
    if (url.includes("/datasets/999/resources")) return Response.json({ data: [{ id: "123", attributes: { format: "csv", download_url: "https://api.dane.gov.pl/resources/123,file" } }] });
    if (url.includes("/resources/123,file")) return new Response("id,name,latitude,longitude\n1,AED,52.2,21.0");
    throw new Error(`Nieoczekiwane żądanie: ${url}`);
  }));
  try {
    vi.resetModules();
    const [{ POST: discover }, { PUT: install }, { POST: collect }, { DELETE: remove }, storage] = await Promise.all([
      import("../../app/api/moderation/discover/route"), import("../../app/api/moderation/sources/[sourceId]/installation/route"),
      import("../../app/api/collect/[sourceId]/route"), import("../../app/api/moderation/sources/[sourceId]/route"), import("../storage/repository"),
    ]);
    const headers = { "x-moderator-token": "test-admin", "content-type": "application/json" };
    const id = "dane-gov-dataset-999";
    const context = { params: Promise.resolve({ sourceId: id }) };
    expect((await discover(new Request("http://localhost/discover", { method: "POST", headers }))).status).toBe(200);
    expect((await storage.loadAppStore()).uninstalledSourceIds).toContain(id);
    expect((await install(new Request("http://localhost/install", { method: "PUT", headers, body: JSON.stringify({ installed: true }) }), context)).status).toBe(200);
    expect((await collect(new Request("http://localhost/collect", { method: "POST", headers }), context)).status).toBe(201);
    expect((await storage.loadAppStore()).pendingRecords.some((record) => record.name === "AED")).toBe(true);
    expect((await remove(new Request("http://localhost/source", { method: "DELETE", headers }), context)).status).toBe(200);
    expect((await storage.loadAppStore()).pendingRecords.some((record) => record.name === "AED")).toBe(false);
    expect((await remove(new Request("http://localhost/source?permanent=true", { method: "DELETE", headers }), context)).status).toBe(200);
    expect((await storage.loadAppStore()).sources.some((source) => source.id === id)).toBe(false);
    expect((await discover(new Request("http://localhost/discover", { method: "POST", headers }))).status).toBe(200);
    expect((await storage.loadAppStore()).uninstalledSourceIds).toContain(id);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});
