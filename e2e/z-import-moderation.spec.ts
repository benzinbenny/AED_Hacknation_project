import path from "node:path";
import { expect, test } from "@playwright/test";

async function uploadCsv(page: import("@playwright/test").Page, licenseId: string) {
  await page.goto("/dodaj");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "aed-sample.csv"));
  await page.getByLabel("Nazwa źródła *").fill("Test syntetyczny E2E");
  await page.getByLabel("Adres strony źródłowej *").fill("https://example.invalid/e2e-aed.csv");
  await page.getByLabel("Identyfikator licencji").fill(licenseId);
  await page.getByLabel("Wymagane oznaczenie / atrybucja").fill("Syntetyczny test E2E");
  await page.getByLabel("Zakres geograficzny").fill("Gmina testowa");
  await page.getByLabel("Poziom zasięgu").selectOption("county");
  await page.getByLabel("Data danych u źródła").fill("2026-10-01");
  await page.getByLabel("Deklarowana częstotliwość").fill("co miesiąc");
  await page.getByLabel("Podstawa opisu").selectOption("publisher_declared");
  await page.getByRole("button", { name: "Sprawdź i dodaj do weryfikacji" }).click();
  await expect(page.getByRole("status")).toContainText("Import zakończony");
  await expect(page.getByRole("status")).toContainText("Przyjęte rekordy: 1");
}

test("import preserves provenance and blocks release until license review", async ({ page }) => {
  await uploadCsv(page, "");
  await page.goto("/zrodla");
  const contributedSource = page.locator(".source-profile-card").filter({ hasText: "Test syntetyczny E2E" });
  await expect(contributedSource).toContainText("Gmina testowa");
  await expect(contributedSource).toContainText("county");
  await expect(contributedSource).toContainText("2026-10-01");

  await page.goto("/moderacja");
  await expect(page.getByRole("heading", { name: "Oczekujące AED" })).toBeVisible();
  const sourceCard = page.locator(".source-card").filter({ hasText: "Test syntetyczny E2E" });
  await expect(sourceCard).toContainText("unknown");
  await expect(sourceCard.getByText(/nie można zatwierdzić/)).toBeVisible();
  const recordCard = page.locator(".pending-card").filter({ hasText: "AED demonstracyjny E2E" });
  await expect(recordCard.getByRole("button", { name: "Zatwierdź rekord" })).toBeDisabled();

  await uploadCsv(page, "CC0-1.0");
  await page.goto("/moderacja");
  const reviewedSource = page.locator(".source-card").filter({ hasText: "Test syntetyczny E2E" });
  await reviewedSource.getByRole("button", { name: "Zatwierdź licencję" }).click();
  const reviewedRecord = page.locator(".pending-card").filter({ hasText: "AED demonstracyjny E2E" });
  await expect(reviewedRecord.getByRole("button", { name: "Zatwierdź rekord" })).toBeEnabled();
  await reviewedRecord.getByRole("button", { name: "Zatwierdź rekord" }).click();

  const exportResponse = await page.request.get("/api/export/json");
  expect(exportResponse.status()).toBe(200);
  const exportText = await exportResponse.text();
  expect(exportText).toContain("E2E-AED-1");
  expect(exportText).toContain('"syntheticIncluded": false');
});
