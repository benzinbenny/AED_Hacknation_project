import { timingSafeEqual } from "node:crypto";

export function configuredModeratorToken(): string | null {
  if (process.env.AED_MODERATOR_TOKEN) return process.env.AED_MODERATOR_TOKEN;
  if (process.env.NODE_ENV !== "production") return process.env.AED_DEMO_MODERATOR_TOKEN ?? "PUNKT-ZYCIA-DEMO";
  return null;
}

export function isModeratorRequest(request: Request): boolean {
  const expected = configuredModeratorToken();
  const provided = request.headers.get("x-moderator-token") ?? "";
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

export function demoModeratorTokenForUi(): string | null {
  return process.env.NODE_ENV === "production" ? null : configuredModeratorToken();
}
