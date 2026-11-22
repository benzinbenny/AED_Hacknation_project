import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = "C:/Users/Bartek/Desktop/Projekt_Haknation";
const runtime = "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1119-907-0_26.1119.907.0_x64__3k8sg7r9htsxt/dependencies";
process.env.RUNTIME_NODE_MODULES = `${runtime}/node/node_modules`;

const { Presentation, PresentationFile } = await import(pathToFileURL(`${runtime}/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs`).href);
const { finalizePresentation, resolvePresentationFont } = await import(pathToFileURL("C:/Users/Bartek/.codex/plugins/cache/openai-primary-runtime/presentations/26.1119.11507/skills/presentations/container_tools/artifact_tool_utils.mjs").href);

const W = 1280;
const H = 720;
const C = {
  teal: "#075D58",
  dark: "#153A3A",
  yellow: "#F2C64B",
  mint: "#E5EFE8",
  paper: "#FAF9F5",
  coral: "#BC5144",
  white: "#FFFFFF",
  muted: "#5F7373",
  line: "#D8E4DE",
  paleYellow: "#FFF6D9",
};

const FONT = resolvePresentationFont({ availableFonts: ["Arial"] });
const NO_LINE = { style: "solid", fill: "none", width: 0 };
const outDir = path.join(root, "artifacts", "presentation");
const draftDir = path.join(root, ".build", "presentation");
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(draftDir, { recursive: true });

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function rect(slide, name, x, y, w, h, fill, radius = 0, line = NO_LINE) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line,
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function text(slide, name, x, y, w, h, value, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: NO_LINE,
  });
  shape.text = value;
  shape.text.style = {
    typeface: options.font ?? FONT,
    fontSize: `${options.size ?? 18}pt`,
    color: options.color ?? C.dark,
    bold: options.bold ?? false,
    alignment: options.align ?? "left",
    verticalAlignment: options.valign ?? "top",
    wrap: "square",
    autoFit: "shrinkText",
    insets: options.insets ?? 0,
  };
  return shape;
}

async function image(slide, name, relPath, alt, x, y, w, h, crop) {
  const bytes = new Uint8Array(await fs.readFile(path.join(root, relPath)));
  return slide.images.add({
    blob: bytes,
    contentType: "image/png",
    alt,
    fit: "cover",
    position: { left: x, top: y, width: w, height: h },
    geometry: "roundRect",
    borderRadius: 14,
    ...(crop ? { crop } : {}),
  });
}

function footer(slide, number, section = "MISJA AED") {
  rect(slide, `footer-line-${number}`, 56, 681, 1168, 1, C.line);
  text(slide, `footer-brand-${number}`, 58, 690, 440, 16, `PUNKT ŻYCIA  /  ${section}`, { size: 8.5, color: C.muted, bold: true, valign: "middle" });
  text(slide, `footer-note-${number}`, 840, 690, 330, 16, "PROTOTYP KONKURSOWY · DANE TESTOWE", { size: 8.5, color: C.muted, align: "right", valign: "middle" });
  text(slide, `footer-page-${number}`, 1184, 688, 38, 18, String(number).padStart(2, "0"), { size: 9, color: C.teal, bold: true, align: "right", valign: "middle" });
}

function heading(slide, number, kicker, titleText, subtitle) {
  text(slide, `kicker-${number}`, 64, 42, 900, 20, kicker.toLocaleUpperCase("pl-PL"), { size: 10, color: C.teal, bold: true, valign: "middle" });
  text(slide, `title-${number}`, 64, 70, 1140, 58, titleText, { size: 31, bold: true, color: C.dark });
  if (subtitle) text(slide, `subtitle-${number}`, 66, 133, 1100, 40, subtitle, { size: 16, color: C.muted });
}

function bullet(slide, number, index, x, y, titleText, detail, width = 455) {
  rect(slide, `bullet-dot-${number}-${index}`, x, y + 8, 10, 10, index === 3 ? C.yellow : C.teal, 5);
  text(slide, `bullet-title-${number}-${index}`, x + 24, y, width - 24, 27, titleText, { size: 17, bold: true, color: C.dark });
  text(slide, `bullet-detail-${number}-${index}`, x + 24, y + 29, width - 24, 47, detail, { size: 13, color: C.muted });
}

function addNotes(slide, note) { slide.speakerNotes.text = note; }

// 1 — cover
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  rect(slide, "cover-field", 0, 0, W, 574, C.teal);
  rect(slide, "cover-brand-chip", 58, 48, 312, 88, C.paper, 12);
  await image(slide, "brand-lockup", "artifacts/brand/punkt-zycia-logo.png", "Logo koncepcyjne Punkt Życia", 64, 54, 300, 75);
  text(slide, "cover-kicker", 66, 190, 980, 26, "MISJA AED · DANE NA RATUNEK", { size: 13, color: C.yellow, bold: true, valign: "middle" });
  text(slide, "cover-title", 64, 244, 1020, 130, "Dane, które pomagają\nznaleźć AED.", { size: 43, bold: true, color: C.white });
  text(slide, "cover-subtitle", 68, 400, 845, 65, "Punkt Życia porządkuje źródła, statusy i dostęp\nw czytelny katalog oraz ścieżkę weryfikacji.", { size: 21, color: C.mint });
  rect(slide, "cover-tag", 68, 495, 376, 38, C.yellow, 18);
  text(slide, "cover-tag-text", 84, 502, 345, 25, "PROTOTYP APLIKACJI · TYPESCRIPT / NEXT.JS", { size: 11, bold: true, color: C.dark, valign: "middle" });
  text(slide, "cover-disclaimer", 66, 620, 1110, 32, "Wizualizacja używa wyłącznie syntetycznych punktów testowych. Nie służy do nawigacji w nagłym wypadku.", { size: 12, color: C.muted, valign: "middle" });
  text(slide, "cover-date", 66, 658, 350, 20, "21 listopada 2026", { size: 10, color: C.muted, valign: "middle" });
  addNotes(slide, "Źródła i kontekst: „MC DZD - Pełna treść zadania konkursowego.pdf” oraz prompt projektowy „Dokument bez nazwy.pdf” przekazane przez użytkownika. Nazwa i znak Punkt Życia są roboczą koncepcją; nie sprawdzono kolizji znaków towarowych.");
}

// 2 — problem and design response
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  heading(slide, 2, "Dlaczego ta aplikacja", "Wspólny widok wymaga wspólnych zasad.", "Źródła mogą różnić się formatem, świeżością, licencją i tym, co naprawdę potwierdzają.");
  const rows = [
    ["01", "Różne źródła", "Dane trzeba zebrać i ujednolicić bez utraty identyfikatora ani pochodzenia."],
    ["02", "Różne znaczenia", "Godziny dostępu nie potwierdzają działania urządzenia; brak informacji pozostaje nieznany."],
    ["03", "Różne uprawnienia", "Możliwość pobrania pliku nie oznacza zgody na jego dalsze udostępnienie."],
  ];
  rows.forEach((row, i) => {
    const y = 208 + i * 112;
    text(slide, `problem-no-${i}`, 74, y, 64, 40, row[0], { size: 22, color: C.teal, bold: true, valign: "middle" });
    text(slide, `problem-title-${i}`, 155, y, 270, 32, row[1], { size: 19, bold: true, valign: "middle" });
    text(slide, `problem-detail-${i}`, 155, y + 39, 810, 48, row[2], { size: 15, color: C.muted });
    if (i < 2) rect(slide, `problem-rule-${i}`, 155, y + 99, 940, 1, C.line);
  });
  rect(slide, "design-response", 972, 212, 242, 320, C.mint, 20);
  text(slide, "response-label", 996, 238, 190, 22, "ODPOWIEDŹ PROJEKTU", { size: 10, color: C.teal, bold: true });
  text(slide, "response-title", 996, 281, 198, 100, "Źródło.\nStatus.\nDecyzja.", { size: 25, bold: true, color: C.dark });
  text(slide, "response-copy", 996, 405, 188, 88, "Każda informacja ma kontekst, a niepewność jest widoczna.", { size: 14, color: C.muted });
  footer(slide, 2, "ZAŁOŻENIA");
  addNotes(slide, "Źródło: brief konkursowy „MC DZD - Pełna treść zadania konkursowego.pdf” i wymagania z „Dokument bez nazwy.pdf”. To podsumowanie problemu przyjętego do prototypu, bez liczbowych szacunków rynku.");
}

// 3 — workflow
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  heading(slide, 3, "Przepływ danych", "Od pliku do eksportu — z decyzją człowieka.", "Walidacja pomaga znaleźć błędy. Publikacja następuje dopiero po przeglądzie źródła i rekordu.");
  const steps = [
    ["01", "Pozyskaj", "CSV / GeoJSON"],
    ["02", "Sprawdź", "schemat i punkty"],
    ["03", "Zachowaj", "źródło i licencję"],
    ["04", "Rozpatrz", "rekord i duplikat"],
    ["05", "Przygotuj", "CSV / JSON / XLSX"],
  ];
  const sx = [62, 302, 542, 782, 1022];
  steps.forEach((step, i) => {
    rect(slide, `flow-card-${i}`, sx[i], 237, 194, 180, i === 4 ? C.mint : C.white, 16, { style: "solid", fill: C.line, width: 1 });
    text(slide, `flow-num-${i}`, sx[i] + 18, 255, 48, 27, step[0], { size: 12, color: C.teal, bold: true, valign: "middle" });
    text(slide, `flow-title-${i}`, sx[i] + 18, 296, 160, 40, step[1], { size: 18, color: C.dark, bold: true, valign: "middle" });
    text(slide, `flow-detail-${i}`, sx[i] + 18, 350, 160, 43, step[2], { size: 13, color: C.muted, valign: "middle" });
    if (i < 4) rect(slide, `flow-connector-${i}`, sx[i] + 194, 325, 46, 2, C.yellow);
  });
  rect(slide, "handoff-bar", 64, 465, 1150, 112, C.dark, 18);
  text(slide, "handoff-label", 91, 485, 230, 20, "GRANICA INTEGRACJI", { size: 10, color: C.yellow, bold: true });
  text(slide, "handoff-copy", 91, 516, 1070, 43, "Prototyp tworzy pliki do dalszej publikacji. Zapis do dane.gov.pl wymaga uzgodnionego dostępu i procesu po stronie uprawnionego podmiotu.", { size: 16, color: C.white, valign: "middle" });
  footer(slide, 3, "PRZEPŁYW");
  addNotes(slide, "Źródło: brief konkursowy oraz założenia promptu użytkownika. Podział na etap przygotowania pliku i publikację jest zgodny z zakresem prototypu; nie symulujemy zapisu do portalu dane.gov.pl.");
}

// 4 — import
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  heading(slide, 4, "Współtworzenie zbioru", "Import, który zachowuje kontekst.", "Walidacja działa przed kolejką moderacyjną, a błędny rekord nie znika bez wyjaśnienia.");
  bullet(slide, 4, 1, 70, 218, "CSV i GeoJSON", "Format wejściowy, ograniczenie rozmiaru i kontrola współrzędnych.");
  bullet(slide, 4, 2, 70, 327, "Pochodzenie", "Rejestrujemy nazwę źródła, URL, ID źródłowe, pobranie i licencję.");
  bullet(slide, 4, 3, 70, 436, "Kolejka zamiast automatu", "Import tworzy rekord do przeglądu; sam nie publikuje danych.");
  rect(slide, "import-format-chip", 92, 566, 354, 42, C.paleYellow, 19);
  text(slide, "import-format-chip-label", 110, 574, 320, 26, "PODPOWIEDZI KOLUMN MOŻNA ZMIENIĆ", { size: 10, color: C.dark, bold: true, valign: "middle" });
  await image(slide, "import-screen", "artifacts/screenshots/04-import.csv-geojson.png", "Zrzut mapowania kolumn w importerze, z syntetycznego pliku CSV", 520, 208, 690, 388, { left: 0.07, top: 0.33, right: 0.26, bottom: 0 });
  footer(slide, 4, "IMPORT");
  addNotes(slide, "Źródła: prototyp Punkt Życia, widok /dodaj; schemat opisany w docs/data-standard.md. Wymogi zachowania pochodzenia i przeglądu wynikają z briefu konkursowego oraz promptu użytkownika.");
}

// 5 — moderation
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  heading(slide, 5, "Kontrola jakości", "Podobieństwo jest wskazówką, nie werdyktem.", "Panel pokazuje osobno decyzję o źródle i o każdym rekordzie.");
  bullet(slide, 5, 1, 70, 220, "Licencja źródła", "Nieznane warunki blokują eksport publiczny do czasu sprawdzenia.");
  bullet(slide, 5, 2, 70, 329, "Rekord AED", "Moderator podejmuje decyzję i zapisuje ją w historii.");
  bullet(slide, 5, 3, 70, 438, "Kandydat na duplikat", "Ręczne scalenie można cofnąć; źródła obu wpisów zostają przypięte.");
  rect(slide, "moderation-note", 91, 566, 355, 48, C.mint, 16);
  text(slide, "moderation-note-text", 108, 574, 320, 32, "Dwa AED w jednym budynku mogą być prawdziwe.", { size: 12, color: C.dark, bold: true, valign: "middle" });
  await image(slide, "moderation-screen", "artifacts/screenshots/05-moderacja-i-duplikaty.png", "Zrzut panelu moderacji z kandydatem do ręcznego sprawdzenia; dane syntetyczne", 520, 205, 690, 388, { left: 0.1, top: 0, right: 0.1, bottom: 0.1 });
  footer(slide, 5, "MODERACJA");
  addNotes(slide, "Źródła: prototyp Punkt Życia, widok /moderacja; brief konkursowy i prompt projektowy. Lista kandydatów nie jest automatycznym scaleniem. Przykładowe dwa wpisy w zrzucie są syntetyczne.");
}

// 6 — catalog
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  heading(slide, 6, "Katalog publiczny", "Czytelna lista i jawny poziom pewności.", "Odbiorca może filtrować dane, a przy rekordzie zobaczyć stan weryfikacji i pochodzenie.");
  bullet(slide, 6, 1, 70, 218, "Wyszukiwanie", "Po nazwie i opisie; filtr typu dostępu pomaga zawęzić listę.");
  bullet(slide, 6, 2, 70, 327, "Status tekstem", "„Niepotwierdzony” nie oznacza „sprawny” ani „dostępny teraz”.");
  bullet(slide, 6, 3, 70, 436, "Mapa i lista", "Lista pozostaje dostępna także wtedy, gdy kafelki mapy nie są osiągalne.");
  rect(slide, "synthetic-note", 91, 566, 354, 48, C.paleYellow, 16);
  text(slide, "synthetic-note-text", 108, 574, 320, 32, "Wszystkie widoczne punkty są fikcyjne.", { size: 12, color: C.dark, bold: true, valign: "middle" });
  await image(slide, "catalog-screen", "artifacts/screenshots/03-wyszukiwanie-i-lista.png", "Zrzut wyszukiwanej listy syntetycznych wpisów AED", 520, 205, 690, 388, { left: 0.1, top: 0, right: 0.1, bottom: 0.2 });
  footer(slide, 6, "KATALOG");
  addNotes(slide, "Źródło: prototyp Punkt Życia, katalog / i syntetyczne dane demonstracyjne. Zrzut dokumentuje interfejs oraz ostrzeżenie o danych fikcyjnych; nie pokazuje rzeczywistego rejestru AED.");
}

// 7 — future-ready architecture
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  heading(slide, 7, "Technologia i standard", "TypeScript daje wspólny kontrakt dla całej aplikacji.", "Next.js i React obsługują interfejs oraz API; logika danych pozostaje odseparowana od warstwy widoków.");
  const cols = [
    { x: 64, title: "Interfejs", detail: "React + Next.js\nKatalog · import · moderacja", tint: C.mint },
    { x: 352, title: "Domena", detail: "TypeScript\nSchemat · licencje · jakość", tint: C.white },
    { x: 640, title: "Repozytorium", detail: "JSON w prototypie\nInterfejs do późniejszego PostgreSQL", tint: C.white },
    { x: 928, title: "Wymiana", detail: "CSV · JSON · GeoJSON\nXLSX jako szablon", tint: C.mint },
  ];
  cols.forEach((col, i) => {
    rect(slide, `architecture-card-${i}`, col.x, 226, 258, 166, col.tint, 17, { style: "solid", fill: C.line, width: 1 });
    text(slide, `architecture-title-${i}`, col.x + 20, 248, 218, 35, col.title, { size: 18, bold: true, color: C.teal });
    text(slide, `architecture-detail-${i}`, col.x + 20, 298, 218, 70, col.detail, { size: 13, color: C.dark });
    if (i < 3) rect(slide, `architecture-link-${i}`, col.x + 258, 307, 30, 2, C.yellow);
  });
  text(slide, "stack-choice", 68, 433, 450, 24, "DLACZEGO TEN ZESTAW?", { size: 10, color: C.teal, bold: true });
  text(slide, "stack-reason", 68, 465, 516, 94, "Jeden typ danych dla formularzy, API i walidacji zmniejsza rozjazdy. Granica repozytorium pozwala wymienić magazyn demonstracyjny na bazę transakcyjną bez przepisywania modelu domenowego.", { size: 15, color: C.dark });
  text(slide, "formats-choice", 665, 433, 500, 24, "FORMATY DO DALSZEJ PRACY", { size: 10, color: C.teal, bold: true });
  text(slide, "formats-reason", 665, 465, 520, 94, "CSV i GeoJSON ułatwiają wymianę danych; JSON obsługuje API; XLSX prowadzi dostawcę przez słownik pól i kontrolowane wartości.", { size: 15, color: C.dark });
  footer(slide, 7, "ARCHITEKTURA");
  addNotes(slide, "Źródła: docs/architecture-decisions.md, docs/data-standard.md i docs/source-register.md w repozytorium prototypu. Materiały referencyjne wskazane przez użytkownika: https://dane.gov.pl/source-code/ oraz https://dane.gov.pl/pl/knowledgebase/useful-materials. Prototyp nie kopiuje kodu dane.gov.pl.");
}

// 8 — next steps and limits
{
  const slide = deck.slides.add();
  slide.background.fill = C.dark;
  text(slide, "roadmap-kicker", 66, 44, 850, 20, "PRZED PILOTAŻEM Z PRAWDZIWYMI DANYMI", { size: 10, color: C.yellow, bold: true });
  text(slide, "roadmap-title", 64, 80, 1100, 72, "Najpierw partnerzy i odpowiedzialność.", { size: 31, color: C.white, bold: true });
  text(slide, "roadmap-subtitle", 68, 158, 1040, 44, "Techniczny prototyp porządkuje proces. Wiarygodność operacyjna zależy od źródeł, właścicieli i utrzymania danych.", { size: 16, color: C.mint });
  const next = [
    ["1", "Dane i licencje", "Uzgodnić właścicieli zbiorów, podstawę ponownego użycia i atrybucję."],
    ["2", "Weryfikacja", "Ustalić, kto i jak często potwierdza dostępność oraz stan urządzenia."],
    ["3", "Produkcja", "Dodać PostgreSQL, migracje, uwierzytelnianie ról, monitoring i kopie."],
    ["4", "Publikacja", "Uzgodnić proces przekazania lub integrację z uprawnionym operatorem portalu."],
  ];
  next.forEach((item, i) => {
    const x = i % 2 === 0 ? 68 : 655;
    const y = i < 2 ? 260 : 420;
    text(slide, `roadmap-no-${i}`, x, y, 42, 36, item[0], { size: 20, color: C.yellow, bold: true, valign: "middle" });
    text(slide, `roadmap-heading-${i}`, x + 55, y, 430, 30, item[1], { size: 18, color: C.white, bold: true, valign: "middle" });
    text(slide, `roadmap-detail-${i}`, x + 55, y + 39, 470, 66, item[2], { size: 13, color: C.mint });
  });
  rect(slide, "roadmap-warning", 68, 588, 1144, 55, C.yellow, 13);
  text(slide, "roadmap-warning-text", 87, 600, 1100, 30, "Dane w wersji demonstracyjnej są syntetyczne. Aplikacji nie używać jako źródła lokalizacji podczas akcji ratunkowej.", { size: 12, color: C.dark, bold: true, valign: "middle" });
  text(slide, "roadmap-footer", 68, 683, 1110, 18, "PUNKT ŻYCIA  /  PROTOTYP KONKURSOWY", { size: 8.5, color: C.mint, bold: true, valign: "middle" });
  text(slide, "roadmap-page", 1184, 681, 38, 18, "08", { size: 9, color: C.yellow, bold: true, align: "right", valign: "middle" });
  addNotes(slide, "Źródła: docs/requirements-matrix.md, docs/security-accessibility.md i docs/README.md w repozytorium prototypu oraz brief konkursowy. Elementy produkcyjne pozostają pracą do uzgodnienia z właścicielami danych i operatorem publikacji.");
}

for (let i = 0; i < deck.slides.items.length; i++) {
  const png = await deck.export({ slide: deck.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(path.join(draftDir, `slide-${String(i + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
}

const candidatePath = path.join(draftDir, "Punkt-Zycia-Misja-AED.candidate.pptx");
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(candidatePath);

const skillTools = "C:/Users/Bartek/.codex/plugins/cache/openai-primary-runtime/presentations/26.1119.11507/skills/presentations/container_tools";
const finalPath = path.join(outDir, "Punkt-Zycia-Misja-AED.pptx");
const receiptPath = path.join(draftDir, "Punkt-Zycia-Misja-AED-v5.validation.json");
const result = await finalizePresentation({
  workspaceDir: root,
  candidatePath,
  finalPath,
  receiptPath,
  integrityValidatorPath: path.join(skillTools, "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillTools, "inspect_presentation_layout_geometry.py"),
  pythonExecutable: `${runtime}/python/python.exe`,
  fontPolicy: { basis: "design", families: [FONT], scriptFonts: { cs: FONT } },
  layoutArgs: ["--expected-aspect", "16:9", "--expected-slide-count", "8", "--require-uniform-font-family", "--validate-heading-fit"],
});

console.log(JSON.stringify({
  font: FONT,
  slideCount: deck.slides.items.length,
  candidatePath,
  finalPath: result.finalPath,
  receiptPath: result.receiptPath,
  sha256: result.finalSha256,
  bytes: result.byteCount,
  layoutPassed: result.presentationLayout?.exitCode === 0,
  importPassed: result.firstPartyImport?.passed === true,
}, null, 2));
