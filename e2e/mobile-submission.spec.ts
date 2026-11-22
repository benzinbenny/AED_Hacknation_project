import { expect, test } from "@playwright/test";

test.use({ isMobile: true, hasTouch: true });
for (const width of [320, 390]) {
  test(`submits AED data using touch at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    if (width === 320) {
      const rows = Array.from({ length: 35 }, (_, i) => `old-${i},Starszy AED ${i},52.22,21.01`);
      const response = await page.request.post("/api/import", { multipart: {
        name: "Starsze zgłoszenia", url: "https://example.invalid/starsze", licenseId: "CC0-1.0",
        file: { name: "starsze.csv", mimeType: "text/csv", buffer: Buffer.from(["id,name,latitude,longitude", ...rows].join("\n")) },
      } });
      expect(response.status()).toBe(201);
      expect((await response.json()).accepted).toBe(35);
    }
    await page.goto("/");
    await page.getByText("Menu", { exact: true }).tap();
    await page.getByRole("link", { name: "Dodaj dane", exact: true }).tap();
    if (width === 320) {
      await page.getByRole("button", { name: /Jeden AED/ }).tap();
      await page.getByLabel("Identyfikator w źródle").fill("mobile-01");
      await page.getByLabel("Nazwa AED").fill("Wpis mobilny");
      await page.getByLabel("Szerokość geograficzna").fill("52,2297");
      await page.getByLabel("Długość geograficzna").fill("21,0122");
    } else {
      await page.getByLabel("Wybierz plik z danymi AED").setInputFiles({
        name: "rejestr_" + "AED".repeat(40) + ".csv", mimeType: "text/csv",
        buffer: Buffer.from("id,nazwa,pierwsza,druga,adres\naed01,AED test,52.22,21.01,Recepcja"),
      });
      await page.getByLabel(/Szerokość geograficzna/).selectOption("pierwsza");
      await page.getByLabel(/Długość geograficzna/).selectOption("druga");
      await page.getByText(/Pozostałe kolumny/).tap();
      await expect(page.getByLabel("TERYT TERC")).toBeVisible();
    }
    await page.getByLabel("Nazwa źródła *").fill("Test mobilny " + width);
    await page.getByLabel("Adres strony źródłowej *").fill("https://example.invalid/mobile-" + width);
    await page.getByText("Zakres źródła i data danych (opcjonalne)").tap();
    await page.getByLabel("Zakres geograficzny").fill("Gmina testowa");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.getByRole("button", { name: "Sprawdź i dodaj do weryfikacji" }).tap();
    await expect(page.getByRole("status")).toContainText("Przyjęte rekordy: 1");
    await page.goto("/moderacja");
    await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
    await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
    await page.getByRole("button", { name: /Do moderacji/ }).click();
    const search = page.getByLabel("Szukaj oczekującego AED lub źródła");
    const entry = page.locator(".pending-card").filter({ hasText: width === 320 ? "Wpis mobilny" : "AED test" });
    await expect(entry).toBeVisible();
    await expect(entry).toContainText(width === 320 ? "Dodano ręcznie" : "Przesłano w pliku");
    const method = page.getByLabel("Sposób dodania");
    await method.selectOption(width === 320 ? "manual" : "file");
    await expect(entry).toBeVisible();
    await method.selectOption(width === 320 ? "file" : "manual");
    await expect(entry).toHaveCount(0);
    await method.selectOption(width === 320 ? "manual" : "file");
    await page.getByRole("combobox", { name: "Źródło", exact: true }).selectOption({ label: "Test mobilny " + width });
    await expect(entry).toBeVisible();
    await search.fill("Test mobilny " + width);
    await expect(entry).toContainText("Test mobilny " + width);
    await expect(entry.getByRole("button", { name: "Zatwierdź rekord" })).toBeDisabled();
    await expect(page.locator(".source-card").filter({ hasText: "Test mobilny " + width })).toBeVisible();
    await page.reload();
    await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
    await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
    await page.getByRole("button", { name: /Do moderacji/ }).click();
    await page.getByLabel("Sposób dodania").selectOption(width === 320 ? "manual" : "file");
    await expect(entry).toBeVisible();
  });
}
