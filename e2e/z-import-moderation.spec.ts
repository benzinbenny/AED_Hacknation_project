import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";

async function uploadCsv(page: import("@playwright/test").Page, licenseId: string) {
  await page.goto("/dodaj");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "aed-sample.csv"));
  await page.getByLabel("Nazwa źródła *").fill("Test syntetyczny E2E");
  await page.getByLabel("Adres strony źródłowej *").fill("https://example.invalid/e2e-aed.csv");
  await page.getByLabel("Identyfikator licencji").fill(licenseId);
  await page.getByLabel("Wymagane oznaczenie / atrybucja").fill("Syntetyczny test E2E");
  await page.getByText("Zakres źródła i data danych (opcjonalne)").click();
  await page.getByLabel("Zakres geograficzny").fill("Gmina testowa");
  await page.getByLabel("Poziom zasięgu").selectOption("county");
  await page.getByLabel("Data danych u źródła").fill("2026-10-01");
  await page.getByLabel("Deklarowana częstotliwość").fill("co miesiąc");
  await page.getByLabel("Podstawa opisu").selectOption("publisher_declared");
  await page.getByRole("button", { name: "Sprawdź i dodaj do weryfikacji" }).click();
  await expect(page.getByRole("status")).toContainText("Import zakończony");
  await expect(page.getByRole("status")).toContainText("Przyjęte rekordy: 1");
}

async function createCanonicalXlsx(): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Dane_AED");
  sheet.addRow(["source_id", "source_record_id", "nazwa", "latitude", "longitude", "access_type", "operational_status", "record_status", "fetched_at", "license_id", "attribution", "source_url", "synthetic_demo"]);
  sheet.addRow(["e2e-xlsx-source", "xlsx-e2e-1", "AED przekazany w XLSX", 52.2297, 21.0122, "public", "unknown", "active", "2026-11-21T12:00:00.000Z", "CC0-1.0", "Zespół E2E", "https://example.invalid/xlsx-aed", "false"]);
  const outputDirectory = process.env.AED_E2E_DATA_ROOT ?? path.resolve(process.cwd(), ".data-e2e-fixtures");
  await mkdir(outputDirectory, { recursive: true });
  const filePath = path.join(outputDirectory, "xlsx-template.xlsx");
  await writeFile(filePath, Buffer.from(await workbook.xlsx.writeBuffer()));
  return filePath;
}

test("import preserves provenance and blocks release until license review", async ({ page }) => {
  await uploadCsv(page, "");
  await page.goto("/zrodla");
  const contributedSource = page.locator(".source-profile-card").filter({ hasText: "Test syntetyczny E2E" });
  await expect(contributedSource).toContainText("Gmina testowa");
  await expect(contributedSource).toContainText("county");
  await expect(contributedSource).toContainText("2026-10-01");

  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await page.getByRole("button", { name: /Do moderacji/ }).click();
  await expect(page.getByRole("heading", { name: "Oczekujące AED" })).toBeVisible();
  const sourceCard = page.locator(".source-card").filter({ hasText: "Test syntetyczny E2E" });
  await expect(sourceCard).toContainText("unknown");
  await expect(sourceCard.getByText(/nie można zatwierdzić/)).toBeVisible();
  const recordCard = page.locator(".pending-card").filter({ hasText: "AED demonstracyjny E2E" });
  await expect(recordCard.getByRole("button", { name: "Zatwierdź rekord" })).toBeDisabled();

  await uploadCsv(page, "CC0-1.0");
  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await page.getByRole("button", { name: /Do moderacji/ }).click();
  const reviewedSource = page.locator(".source-card").filter({ hasText: "Test syntetyczny E2E" });
  await reviewedSource.getByRole("button", { name: "Zatwierdź licencję" }).click();
  const reviewedRecord = page.locator(".pending-card").filter({ hasText: "AED demonstracyjny E2E" });
  await expect(reviewedRecord.getByRole("button", { name: "Zatwierdź rekord" })).toBeEnabled();
  await reviewedRecord.getByRole("button", { name: "Zatwierdź rekord" }).click();
  await expect(reviewedRecord).toHaveCount(0);
  await reviewedSource.getByRole("button", { name: "Odinstaluj" }).click();
  await reviewedSource.getByRole("button", { name: "Potwierdź odinstalowanie" }).click();
  await expect(reviewedSource.getByText("Źródło odinstalowane")).toBeVisible();
  await reviewedSource.getByRole("button", { name: "Zainstaluj", exact: true }).click();
  await expect(reviewedSource.getByRole("button", { name: "Odinstaluj" })).toBeVisible();

  const exportResponse = await page.request.get("/api/export/json");
  expect(exportResponse.status()).toBe(200);
  const exportText = await exportResponse.text();
  expect(exportText).toContain("E2E-AED-1");
  expect(exportText).toContain('"syntheticIncluded": false');

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AED demonstracyjny E2E" })).toBeVisible();
  await expect(page.getByText(/To dane źródłowe po licencyjnej kontroli i moderacji/)).toBeVisible();
});

test("canonical XLSX completes the same source-submission flow", async ({ page }) => {
  await page.goto("/dodaj");
  await page.locator('input[type="file"]').setInputFiles(await createCanonicalXlsx());
  await expect(page.getByText(/Arkusz musi zawierać zakładkę Dane_AED/)).toBeVisible();
  await page.getByLabel("Nazwa źródła *").fill("Arkusz XLSX E2E");
  await page.getByLabel("Adres strony źródłowej *").fill("https://example.invalid/xlsx-aed");
  await page.getByLabel("Identyfikator licencji").fill("CC0-1.0");
  await page.getByRole("button", { name: "Sprawdź i dodaj do weryfikacji" }).click();

  await expect(page.getByRole("status")).toContainText("Przyjęte rekordy: 1");
  await page.goto("/zrodla");
  await expect(page.locator(".source-profile-card").filter({ hasText: "Arkusz XLSX E2E" })).toBeVisible();
});

test("only the admin can edit a record and the saved change reaches the public API", async ({ page }) => {
  const id = "88a770a6-ea72-5baf-a1e0-ff1000000004";
  const endpoint = `/api/moderation/${id}`;
  expect((await page.request.patch(endpoint)).status()).toBe(401);
  expect((await page.request.patch(endpoint, { headers: { "x-moderator-token": "PRESENTATION-ONLY-LOCAL-TOKEN" } })).status()).toBe(401);
  await page.goto("/moderacja");
  await expect(page.getByRole("heading", { name: "Edycja wpisów AED" })).toHaveCount(0);
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await page.getByRole("button", { name: /Zatwierdzone AED/ }).click();
  const editor = page.getByRole("region", { name: "Edycja wpisów AED" });
  const headers = { "x-moderator-token": "ADMIN-E2E-ONLY" };
  const authQueue = await (await page.request.get("/api/moderation", { headers })).json();
  const target = authQueue.records.find((r: { name: string }) => r.name === "AED demonstracyjny E2E") ?? authQueue.records.find((r: { id: string }) => r.id === id);
  await editor.getByLabel("Szukaj wpisu do edycji").fill(target.id);
  await editor.getByRole("button", { name: "Sprawdź dane wpisu" }).click();
  await expect(editor.getByText(/Brak nowej wersji w kolejce|Brak zewnętrznego źródła/)).toBeVisible();
  await editor.getByRole("button", { name: "Uzupełnij dane" }).click();
  await editor.getByLabel("Opis lokalizacji").fill("Na ścianie przy wejściu E2E");
  await editor.getByLabel("Warunki dostępu").fill("Klucz w recepcji");
  await editor.getByRole("button", { name: "Zapisz zmiany" }).click();
  await expect(editor.getByRole("status")).toContainText("Zapisano zmiany");
  const detail = await page.request.get(`/api/aed/${target.id}`);
  expect(detail.status()).toBe(200);
  const saved = await detail.text();
  expect(saved).toContain("Na ścianie przy wejściu E2E");
  expect(saved).toContain("Klucz w recepcji");
  const adminEndpoint = `/api/moderation/${target.id}`;
  const { version } = await (await page.request.get(adminEndpoint + "?stage=published", { headers })).json();
  for (const changes of [{ sources: [] }, { location: { latitude: 120, longitude: 20 } }]) {
    expect((await page.request.patch(adminEndpoint, { headers, data: { stage: "published", version, changes } })).status()).toBe(400);
  }
  expect((await page.request.delete(adminEndpoint)).status()).toBe(401);
  expect((await page.request.delete(adminEndpoint, { headers: { "x-moderator-token": "PRESENTATION-ONLY-LOCAL-TOKEN" } })).status()).toBe(401);
  await editor.getByRole("button", { name: "Usuń AED", exact: true }).click();
  await editor.getByRole("button", { name: "Wróć do edycji" }).click();
  expect((await page.request.get(`/api/aed/${target.id}`)).status()).toBe(200);
  await editor.getByRole("button", { name: "Usuń wpis", exact: true }).click();
  await editor.getByRole("button", { name: "Potwierdź usunięcie" }).click();
  await expect(editor.getByRole("status")).toContainText("Usunięto wpis AED");
  expect((await page.request.get(`/api/aed/${target.id}`)).status()).toBe(404);
  expect(await (await page.request.get("/api/export/json")).text()).not.toContain(target.id);
  await uploadCsv(page, "CC0-1.0");
  const afterReimport = await (await page.request.get("/api/moderation", { headers })).json();
  expect(afterReimport.pendingRecords.some((r: { id: string }) => r.id === target.id)).toBe(true);
  expect((await page.request.get(`/api/aed/${target.id}`)).status()).toBe(404);
  const approval = await page.request.post(adminEndpoint, { headers, data: { decision: "approved", reason: "Ponowne dodanie po usunięciu" } });
  expect(approval.status()).toBe(200);
  expect((await page.request.get(`/api/aed/${target.id}`)).status()).toBe(200);
});
