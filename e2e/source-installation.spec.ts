import { expect, test } from "@playwright/test";

test("uninstall persists, blocks collection at the API and is reversible by an admin", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const endpoint = "/api/moderation/sources/dane-gov-krosno/installation";
  const mod = { "x-moderator-token": "PRESENTATION-ONLY-LOCAL-TOKEN" };
  expect((await page.request.put(endpoint, { headers: mod, data: { installed: false } })).status()).toBe(401);
  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  const card = page.locator(".inventory-card").filter({ hasText: /Krosno/ });
  await card.getByRole("button", { name: "Odinstaluj" }).click();
  await card.getByRole("button", { name: "Potwierdź odinstalowanie" }).click();
  await expect(page.getByRole("button", { name: /Do zainstalowania/ })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("button", { name: "Zainstaluj", exact: true })).toBeVisible();
  const response = await page.request.post("/api/collect/dane-gov-krosno", { headers: { "x-moderator-token": "ADMIN-E2E-ONLY" } });
  expect(response.status()).toBe(409);
  await page.reload();
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await page.getByRole("button", { name: /Do zainstalowania/ }).click();
  await card.getByRole("button", { name: "Zainstaluj", exact: true }).click();
  await expect(page.getByRole("button", { name: /Zainstalowane źródła/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Zainstalowane źródła/ }).click();
  await expect(card.getByRole("button", { name: "Pobierz dane" })).toBeVisible();
  await page.getByRole("button", { name: /Do moderacji/ }).click();
  const demo = page.locator(".source-card").filter({ hasText: "Zbiór syntetyczny — demonstracja" });
  await demo.getByRole("button", { name: "Odinstaluj" }).click();
  await demo.getByRole("button", { name: "Potwierdź odinstalowanie" }).click();
  await expect(demo.getByText("Źródło odinstalowane")).toBeVisible();
  await demo.getByRole("button", { name: "Zainstaluj", exact: true }).click();
  await expect(demo.getByRole("button", { name: "Odinstaluj" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
});

test("deletes a submitted source and associated AED, blocks import until restored", async ({ page }) => {
  const sourceUrl = "https://example.invalid/delete-source";
  const multipart = {
    name: "Źródło do usunięcia", url: sourceUrl, licenseId: "CC0-1.0",
    file: { name: "aed.csv", mimeType: "text/csv", buffer: Buffer.from("id,name,latitude,longitude\n1,AED do usunięcia,52.2,21.0") },
  };
  const imported = await page.request.post("/api/import", { multipart });
  expect(imported.status()).toBe(201);
  const admin = { "x-moderator-token": "ADMIN-E2E-ONLY" };
  const queue = await (await page.request.get("/api/moderation", { headers: admin })).json();
  const source = queue.sources.find((item: { name: string }) => item.name === "Źródło do usunięcia");
  const record = queue.pendingRecords.find((item: { name: string }) => item.name === "AED do usunięcia");
  expect(source).toBeTruthy();
  expect(record).toBeTruthy();
  expect((await page.request.post(`/api/moderation/source/${source.id}`, { headers: admin, data: { status: "approved" } })).status()).toBe(200);
  expect((await page.request.post(`/api/moderation/${record.id}`, { headers: admin, data: { decision: "approved", reason: "Test" } })).status()).toBe(200);
  expect((await page.request.post("/api/import", { multipart })).status()).toBe(201);
  expect((await page.request.get(`/api/aed/${record.id}`)).status()).toBe(200);
  expect((await page.request.delete(`/api/moderation/sources/${source.id}`)).status()).toBe(401);
  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  const card = page.locator(".inventory-card").filter({ hasText: "Źródło do usunięcia" });
  await card.getByRole("button", { name: "Odinstaluj" }).click();
  await card.getByRole("button", { name: "Potwierdź odinstalowanie" }).click();
  await expect(page.getByRole("button", { name: /Do zainstalowania/ })).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Usuń źródło", exact: true }).click();
  await expect(card.getByText(/1 zatwierdzonych i 1 oczekujących/)).toBeVisible();
  await card.getByRole("button", { name: "Potwierdź usunięcie źródła i AED" }).click();
  await expect(page.getByRole("button", { name: /Usunięte źródła/ })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("button", { name: "Usuń trwale" })).toBeVisible();
  expect((await page.request.post("/api/import", { multipart })).status()).toBe(409);
  expect((await page.request.post(`/api/moderation/source/${source.id}`, { headers: admin, data: { status: "approved" } })).status()).toBe(409);
  const afterDelete = await (await page.request.get("/api/moderation", { headers: admin })).json();
  expect(afterDelete.pendingRecords.some((item: { id: string }) => item.id === record.id)).toBe(false);
  expect((await page.request.get(`/api/aed/${record.id}`)).status()).toBe(404);
  await page.goto("/zrodla");
  await expect(page.getByRole("heading", { name: "Źródło do usunięcia" })).toHaveCount(0);
  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await page.getByRole("button", { name: /Usunięte źródła/ }).click();
  await card.getByRole("button", { name: "Usuń trwale" }).click();
  await card.getByRole("button", { name: "Potwierdź trwałe usunięcie" }).click();
  await expect(card).toHaveCount(0);
  expect((await page.request.post("/api/import", { multipart })).status()).toBe(201);
  const afterRestore = await (await page.request.get("/api/moderation", { headers: admin })).json();
  expect(afterRestore.pendingRecords.some((item: { id: string }) => item.id === record.id)).toBe(true);
});

test("refresh discovers sources without reinstalling deleted or uninstalled profiles", async ({ page }) => {
  const admin = { "x-moderator-token": "ADMIN-E2E-ONLY" };
  expect((await page.request.delete("/api/moderation/sources/dane-gov-krosno", { headers: admin })).status()).toBe(200);
  expect((await page.request.put("/api/moderation/sources/dane-gov-przemysl/installation", { headers: admin, data: { installed: false } })).status()).toBe(200);
  const collected: string[] = [];
  await page.route("**/api/moderation/discover", async (route) => {
    await route.fulfill({ json: { datasets: [{ id: "3624", title: "Krosno AED", url: "https://dane.gov.pl/pl/dataset/3624", license: "CC0 1.0", formats: ["csv"], modified: null }], errors: [] } });
  });
  await page.route("**/api/collect/*", async (route) => {
    collected.push(new URL(route.request().url()).pathname.split("/").pop()!);
    await route.fulfill({ json: { accepted: 1, rejected: 0 } });
  });
  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await page.getByRole("button", { name: "Odśwież publiczne źródła" }).click();
  await expect(page.getByRole("status")).toContainText("Wyszukiwanie zakończone");
  expect(collected).not.toContain("dane-gov-krosno");
  expect(collected).not.toContain("dane-gov-przemysl");
  await expect(page.getByRole("heading", { name: /Wynik wyszukiwania w dane.gov.pl/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Do zainstalowania/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".inventory-card").filter({ hasText: "Krosno" })).toHaveCount(0);
  await page.reload();
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await page.getByRole("button", { name: /Usunięte źródła/ }).click();
  await expect(page.locator(".inventory-card").filter({ hasText: "Krosno" })).toBeVisible();
});

test("deleting an uninstalled source opens the deleted sources tab", async ({ page }) => {
  const headers = { "x-moderator-token": "ADMIN-E2E-ONLY" };
  expect((await page.request.put("/api/moderation/sources/warszawa-scb-aed/installation", { headers, data: { installed: false } })).status()).toBe(200);
  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  const tab = page.getByRole("button", { name: /Do zainstalowania/ });
  await tab.click();
  const card = page.locator(".inventory-card").filter({ hasText: "Warszawa" });
  await card.getByRole("button", { name: "Usuń źródło" }).click();
  await card.getByRole("button", { name: "Potwierdź usunięcie źródła i AED" }).click();
  await expect(page.getByRole("button", { name: /Usunięte źródła/ })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("button", { name: "Usuń trwale" })).toBeVisible();
  await page.reload();
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await expect(card).toHaveCount(0);
});
