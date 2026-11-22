import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../../app/api/moderation/[id]/check/route";
import { createDemoStore } from "../data/demo";
import * as storage from "../storage/repository";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("reads the specific OSM object afresh and compares it without updating the approved record", async () => {
  vi.stubEnv("AED_ADMIN_TOKEN", "test-check");
  const store = createDemoStore();
  const r = store.records[0];
  r.sources[0] = { ...r.sources[0], sourceId: "osm-pl", sourceRecordId: "node/123" };
  vi.spyOn(storage, "loadAppStore").mockResolvedValue(store);
  const persist = vi.spyOn(storage.repository, "update");
  const fetcher = vi.fn(async (_url: URL, init: RequestInit) => {
    expect((init.body as URLSearchParams).get("data")).toContain("node(id:123)");
    return Response.json({ elements: [{ type: "node", id: 123, lat: 51, lon: 19, tags: { emergency: "defibrillator", name: "Nowa nazwa" } }] });
  });
  vi.stubGlobal("fetch", fetcher);
  const request = () => new Request("http://localhost/check?source=osm-pl", { method: "POST", headers: { "x-moderator-token": "test-check" } });
  const context = { params: Promise.resolve({ id: r.id }) };
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect((await response.json()).results[0].differences).toContainEqual({ field: "Nazwa", catalog: r.name, source: "Nowa nazwa" });
  store.uninstalledSourceIds = ["osm-pl"];
  expect((await POST(request(), context)).status).toBe(409);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(persist).not.toHaveBeenCalled();
});
