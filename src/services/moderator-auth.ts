import { timingSafeEqual } from "node:crypto";

export function isModeratorRequest(request: Request): boolean {
  return isAdminRequest(request);
}

export function isAdminRequest(request: Request): boolean {
  const adminToken = process.env.AED_ADMIN_TOKEN;
  return Boolean(adminToken && tokenMatches(request, adminToken));
}

function tokenMatches(request: Request, expected?: string | null): boolean {
  const provided = request.headers.get("x-moderator-token") ?? "";
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

export function demoModeratorTokenForUi(): string | null {
  return null;
}
