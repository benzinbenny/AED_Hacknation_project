import { FileBlob, PresentationFile } from "file:///C:/Program%20Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1119-907-0_26.1119.907.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";
import path from "node:path";
import fs from "node:fs/promises";

const presentation = await PresentationFile.importPptx(await FileBlob.load(path.resolve("artifacts/presentation/Punkt-Zycia-Misja-AED.pptx")));
const coverLogo = presentation.slides.items[0].images.items[0];
coverLogo.replace({ blob: await fs.readFile(path.resolve("artifacts/brand/punkt-zycia-logo.png")), contentType: "image/png", alt: "Logotyp Punkt Życia", fit: "contain" });
coverLogo.frame = { left: 64, top: 44, width: 84, height: 84 };
for (const [name, value] of [["flow-detail-0", "CSV / GeoJSON / XLSX"], ["flow-detail-4", "CSV / JSON / GeoJSON"]]) {
  const shape = presentation.slides.items[2].shapes.items.find((item) => item.name === name);
  if (shape) shape.text = value;
}
const items = [
  ["Wyszukiwanie urządzeń", "Wpisz nazwę lub adres, a następnie wybierz urządzenie z listy.", "03-wyszukiwanie-i-lista.png"],
  ["Źródła i zasięg danych", "Sprawdź obszar, datę danych, licencję i ograniczenia źródła.", "07-zrodla-zakres-i-swiezosc.png"],
  ["Przekazanie danych", "Dodaj jeden AED ręcznie lub prześlij CSV, GeoJSON albo arkusz XLSX.", "04-import.csv-geojson.png"],
  ["Kolejka administratora", "Sprawdź licencję i zatwierdź wpis. Filtry ułatwiają wybór zgłoszeń.", "12-oczekujace-aed.png"],
  ["Wspólny standard danych", "Arkusz opisuje pola, dozwolone wartości oraz zakres źródła.", "06-standard-danych.png"],
];
for (const [title, description, file] of items) {
  const slide = presentation.slides.add();
  slide.background.fill = "#FAF9F5";
  const heading = slide.shapes.add({ geometry: "textbox", position: { left: 65, top: 35, width: 1140, height: 58 }, fill: "none", line: { fill: "none", width: 0 } });
  heading.text = title;
  heading.text.style = { fontSize: 36, bold: true, color: "#153A3A", fontFamily: "Arial" };
  const subtitle = slide.shapes.add({ geometry: "textbox", position: { left: 66, top: 100, width: 1140, height: 42 }, fill: "none", line: { fill: "none", width: 0 } });
  subtitle.text = description;
  subtitle.text.style = { fontSize: 21, color: "#526A69", fontFamily: "Arial" };
  slide.images.add({ blob: await fs.readFile(path.resolve("artifacts/screenshots", file)), contentType: "image/png", alt: `Zrzut aplikacji — ${title}`, fit: "contain", position: { left: 84, top: 155, width: 1110, height: 500 } });
}
const output = path.resolve("artifacts/presentation/Punkt-Zycia-aktualna.pptx");
await (await PresentationFile.exportPptx(presentation)).save(output);
console.log(`Zapisano ${presentation.slides.items.length} slajdów w ${output}`);
