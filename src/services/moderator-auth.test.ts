import { afterEach, expect, it, vi } from "vitest";
import { isAdminRequest, isModeratorRequest } from "./moderator-auth";

afterEach(() => vi.unstubAllEnvs());

it("accepts the single administrator key for every administrative operation", () => {
  vi.stubEnv("AED_ADMIN_TOKEN", "123");
  vi.stubEnv("AED_MODERATOR_TOKEN", "old-moderator-key");
  const request = (key: string) => new Request("http://localhost", { headers: { "x-moderator-token": key } });
  expect(isAdminRequest(request("123"))).toBe(true);
  expect(isModeratorRequest(request("123"))).toBe(true);
  expect(isModeratorRequest(request("old-moderator-key"))).toBe(false);
  expect(isAdminRequest(request("wrong"))).toBe(false);
});
