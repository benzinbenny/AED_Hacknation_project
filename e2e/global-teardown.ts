import { rm } from "node:fs/promises";
import path from "node:path";
import { testRunsRoot } from "./run-directory";

export default async function globalTeardown() {
  const dataRoot = path.resolve(process.env.AED_E2E_DATA_ROOT ?? "");
  if (path.dirname(dataRoot) !== testRunsRoot || !/^run-(e2e|preview)-\d+-\d+$/.test(path.basename(dataRoot))) {
    throw new Error(`Refusing to clean a path outside the test-owned data directory: ${dataRoot}`);
  }
  await rm(dataRoot, { recursive: true, force: true });
}
