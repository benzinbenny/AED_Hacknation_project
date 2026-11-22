import { defineConfig } from "@playwright/test";
import path from "node:path";
import { testRunDirectory } from "./e2e/run-directory";

const previewDataRoot = testRunDirectory("preview");
const screenshotDistDir = process.env.AED_SCREENSHOT_NEXT_DIST_DIR ?? ".next";
process.env.AED_STORE_PATH = path.join(previewDataRoot, "aed-store.json");
process.env.AED_E2E_DATA_ROOT = previewDataRoot;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "capture-screenshots.spec.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3200",
    channel: "msedge",
    viewport: { width: 1600, height: 900 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      AED_NEXT_DIST_DIR: screenshotDistDir,
      AED_STORE_PATH: process.env.AED_STORE_PATH,
      AED_MODERATOR_TOKEN: "PRESENTATION-ONLY-LOCAL-TOKEN",
      AED_DEMO_MODERATOR_TOKEN: "PUNKT-ZYCIA-DEMO",
      AED_ADMIN_TOKEN: "ADMIN-E2E-ONLY",
    },
  },
});
