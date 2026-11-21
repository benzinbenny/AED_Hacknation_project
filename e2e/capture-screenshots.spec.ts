import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("captures real screens for the contest presentation", async ({ page }) => {
  const output = path.resolve("screenshots");
  await mkdir(output, { recursive: true });

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await expect(page.getByText(/To dane demonstracyjne/)).toBeVisible();
  await page.screenshot({ path: path.join(output, "01-katalog.png") });

  await page.getByRole("button", { name: /Mapa/ }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.getElementById("lista-aed")?.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.screenshot({ path: path.join(output, "02-mapa.png") });

  await page.locator("#lista-aed").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Lista/ }).click();
  await page.getByRole("textbox", { name: "Szukaj AED" }).fill("budynek A");
  await expect(page.getByText("2 wyniki")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.getElementById("lista-aed")?.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.screenshot({ path: path.join(output, "03-wyszukiwanie-i-lista.png") });

  await page.goto("/dodaj");
  await expect(page.getByRole("heading", { name: "Dodaj dane o AED" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "aed-sample.csv"));
  await expect(page.getByText("Podgląd pierwszych wierszy")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo({ top: 340, behavior: "instant" });
  });
  await page.screenshot({ path: path.join(output, "04-import.csv-geojson.png") });

  await page.goto("/moderacja");
  await page.getByLabel("Klucz moderatora").fill("PRESENTATION-ONLY-LOCAL-TOKEN");
  await page.getByRole("button", { name: "Otwórz kolejkę" }).click();
  await expect(page.getByRole("heading", { name: "Podobne lokalizacje" })).toBeVisible();
  await page.screenshot({ path: path.join(output, "05-moderacja-i-duplikaty.png") });

  await page.goto("/standard");
  await expect(page.getByRole("heading", { name: "Co oznaczają pola" })).toBeVisible();
  await page.screenshot({ path: path.join(output, "06-standard-danych.png") });
});
