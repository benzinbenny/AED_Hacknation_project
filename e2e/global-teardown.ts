import { rm } from "node:fs/promises";
import path from "node:path";

export default async function globalTeardown() {
  const workspaceRoot = path.resolve(process.cwd());
  const dataRoot = path.resolve(process.env.AED_E2E_DATA_ROOT ?? "");
  if (!dataRoot.startsWith(`${workspaceRoot}${path.sep}`) || !path.basename(dataRoot).startsWith(".data-e2e-")) {
    throw new Error(`Refusing to clean a path outside the test-owned data directory: ${dataRoot}`);
  }
  await rm(dataRoot, { recursive: true, force: true });
}
