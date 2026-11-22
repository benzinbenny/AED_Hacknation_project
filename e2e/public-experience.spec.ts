import { expect, test } from "@playwright/test";

test("public directory searches while clearly identifying synthetic data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Wiedzieć, gdzie jest AED/ })).toBeVisible();
  await expect(page.getByText(/To dane demonstracyjne, nie mapa rzeczywistych defibrylatorów/)).toBeVisible();
  await expect(page.getByText("4 wyniki")).toBeVisible();

  await page.getByRole("textbox", { name: "Szukaj AED" }).fill("budynek A");
  await expect(page.getByText("2 wyniki")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AED demonstracyjny 01" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AED demonstracyjny 03" })).toHaveCount(0);
});

test("map view keeps the accessible record list available", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Mapa/ }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AED demonstracyjny 01" })).toBeVisible();
  await expect(page.getByText(/Pełna lista punktów jest dostępna bez kafelków mapy/)).toBeVisible();
});

test("data standard page can download the workbook template", async ({ page }) => {
  await page.goto("/standard");
  await expect(page.getByRole("heading", { name: /Jasne zasady opisu/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Co oznaczają pola" })).toBeVisible();
  await expect(page.getByText(/TERYT TERC\/SIMC/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: /Pobierz szablon XLSX/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("standard-danych-AED.xlsx");
});

test("source directory shows reference coverage, source dates, and connector limits", async ({ page }) => {
  await page.goto("/zrodla");
  await expect(page.getByRole("heading", { name: "Źródła danych o AED" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OpenAEDMap — eksport Polski" })).toBeVisible();
  await expect(page.getByText(/2024-02-19/)).toBeVisible();
  const warsaw = page.locator(".source-profile-card").filter({ hasText: "Warszawa" });
  await expect(warsaw.getByText("Wymaga tokenu", { exact: true })).toBeVisible();
  await expect(page.getByText(/nie gwarantuje jej kompletności/)).toBeVisible();
  await page.getByLabel("Szukaj źródła").fill("Krosno");
  await expect(page.getByRole("heading", { name: /Defibrylatory zlokalizowane w Mieście Krosno/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OpenAEDMap — eksport Polski" })).toHaveCount(0);
  await page.getByLabel("Szukaj źródła").clear();
  await page.getByRole("combobox", { name: "Zasięg" }).selectOption("country");
  await expect(page.getByRole("heading", { name: "OpenAEDMap — eksport Polski" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Defibrylatory zlokalizowane w Mieście Krosno/ })).toHaveCount(0);
});

test("moderation shows near records as review candidates, never auto-merges them", async ({ page }) => {
  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await expect(page.getByRole("heading", { name: "Pobierz ze źródła" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Odśwież publiczne źródła" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Pobierz \(wymaga tokenu\)/ })).toBeVisible();
  await page.getByRole("button", { name: /Historia i scalenia/ }).click();
  await expect(page.getByRole("heading", { name: "Podobne lokalizacje" })).toBeVisible();
  await expect(page.getByText(/13\s*m/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Zachowaj 1., scal 2." })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Historia łączenia rekordów" })).toBeVisible();
});
