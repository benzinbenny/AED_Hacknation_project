import { describe, expect, it } from "vitest";
import { POST } from "../../app/api/collect/[sourceId]/route";

describe("POST /api/collect/[sourceId]", () => {
  it("requires moderator authorization before starting a remote fetch", async () => {
    const response = await POST(
      new Request("http://localhost/api/collect/openaedmap-pl", { method: "POST" }),
      { params: Promise.resolve({ sourceId: "openaedmap-pl" }) },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
  });
});
