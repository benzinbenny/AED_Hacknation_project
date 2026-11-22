import { defineConfig } from "@playwright/test";
import path from "node:path";
import { testRunDirectory } from "./e2e/run-directory";

const e2eDataRoot = testRunDirectory("e2e");
const e2ePort = 31_111;
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
process.env.AED_STORE_PATH = path.join(e2eDataRoot, "aed-store.json");
process.env.AED_E2E_DATA_ROOT = e2eDataRoot;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: e2eBaseUrl,
    channel: "msedge",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${e2ePort}`,
    url: e2eBaseUrl,
    env: {
      AED_NEXT_DIST_DIR: ".next-e2e-isolated",
      AED_STORE_PATH: process.env.AED_STORE_PATH,
      AED_MODERATOR_TOKEN: "",
      AED_DEMO_MODERATOR_TOKEN: "PRESENTATION-ONLY-LOCAL-TOKEN",
      AED_ADMIN_TOKEN: "ADMIN-E2E-ONLY",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
