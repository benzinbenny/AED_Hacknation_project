import path from "node:path";

export const testRunsRoot = path.resolve(".build", "test-runs");

export function testRunDirectory(prefix: "e2e" | "preview") {
  const inherited = process.env.AED_E2E_DATA_ROOT;
  if (inherited && path.dirname(path.resolve(inherited)) === testRunsRoot && /^run-(e2e|preview)-\d+-\d+$/.test(path.basename(inherited))) {
    return inherited;
  }
  return path.join(testRunsRoot, `run-${prefix}-${process.pid}-${Date.now()}`);
}
