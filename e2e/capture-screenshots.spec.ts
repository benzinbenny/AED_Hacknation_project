import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("captures real screens for the contest presentation", async ({ page }) => {
  const output = path.resolve("artifacts", "screenshots");
  await mkdir(output, { recursive: true });

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await expect(page.getByText(/To dane demonstracyjne/)).toBeVisible();
  await page.screenshot({ path: path.join(output, "01-katalog.png"), caret: "initial" });

  await page.getByRole("button", { name: /Mapa/ }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.getElementById("lista-aed")?.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.screenshot({ path: path.join(output, "02-mapa.png"), caret: "initial" });

  await page.locator("#lista-aed").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Lista/ }).click();
  await page.getByRole("textbox", { name: "Szukaj AED" }).fill("budynek A");
  await expect(page.getByText("2 wyniki")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.getElementById("lista-aed")?.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.screenshot({ path: path.join(output, "03-wyszukiwanie-i-lista.png"), caret: "initial" });

  await page.goto("/dodaj");
  await expect(page.getByRole("heading", { name: "Dodaj dane o AED" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "aed-sample.csv"));
  await expect(page.getByText("Podgląd pierwszych wierszy")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo({ top: 340, behavior: "instant" });
  });
  await page.screenshot({ path: path.join(output, "04-import.csv-geojson.png"), caret: "initial" });
  await page.getByLabel("Nazwa źródła *").fill("Dane przykładowe do prezentacji");
  await page.getByLabel("Adres strony źródłowej *").fill("https://example.invalid/prezentacja");
  await page.getByLabel("Identyfikator licencji").fill("CC0-1.0");
  await page.getByRole("button", { name: "Sprawdź i dodaj do weryfikacji" }).click();
  await expect(page.getByRole("status")).toContainText("Przyjęte rekordy: 1");

  await page.goto("/moderacja");
  await page.getByLabel("Klucz administratora").fill("ADMIN-E2E-ONLY");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await expect(page.getByRole("button", { name: /Zainstalowane źródła/ })).toBeVisible();
  await page.screenshot({ path: path.join(output, "10-moderacja-kafelki.png"), caret: "initial" });
  await page.getByRole("button", { name: /Do moderacji/ }).click();
  await page.getByRole("heading", { name: /Oczekujące AED/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, "12-oczekujace-aed.png"), caret: "initial" });
  await page.getByRole("button", { name: /Historia i scalenia/ }).click();
  await expect(page.getByRole("heading", { name: "Podobne lokalizacje" })).toBeVisible();
  await page.screenshot({ path: path.join(output, "05-moderacja-i-duplikaty.png"), caret: "initial" });

  await page.goto("/standard");
  await expect(page.getByRole("heading", { name: "Co oznaczają pola" })).toBeVisible();
  await page.screenshot({ path: path.join(output, "06-standard-danych.png"), caret: "initial" });

  await page.goto("/zrodla");
  await expect(page.getByRole("heading", { name: "Co wiemy o zasięgu źródeł" })).toBeVisible();
  await page.screenshot({ path: path.join(output, "07-zrodla-zakres-i-swiezosc.png"), caret: "initial" });

  await page.goto("/kampania");
  await expect(page.getByRole("heading", { name: /Masz dane o AED\? Udostępnij je raz/ })).toBeVisible();
  await page.screenshot({ path: path.join(output, "08-kampania-dane-na-ratunek.png"), caret: "initial" });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/zrodla");
  await page.screenshot({ path: path.join(output, "09-zrodla-mobile.png"), fullPage: true, caret: "initial" });
  await page.goto("/dodaj");
  await page.getByRole("button", { name: /Jeden AED/ }).click();
  await page.screenshot({ path: path.join(output, "11-dodaj-aed-telefon.png"), fullPage: true, caret: "initial" });
});
