import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("skip link moves keyboard focus to the campaign content", async ({ page }) => {
  await page.goto("/kampania");

  const skipLink = page.getByRole("link", { name: "Przejdź do treści" });
  await skipLink.focus();
  await expect(skipLink).toBeVisible();
  await skipLink.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();
});

for (const route of ["/kampania", "/zrodla", "/standard", "/dodaj"]) {
  test(`has no serious automated accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));

    expect(seriousOrCritical).toEqual([]);
  });
}

test("source page remains within a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/zrodla");

  await expect(page.locator(".source-health-board")).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
