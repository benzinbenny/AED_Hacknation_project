# Punkt Życia — źródła, standard XLSX i kampania Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AED prototype a demonstrable, future-ready collaboration and publication-preparation tool for distributed AED data.

**Architecture:** Keep the current Next.js App Router and domain boundaries. Add pure source-health and metadata-export modules, feed them to route handlers and server pages, and reuse the existing GeoJSON importer after parsing the canonical XLSX worksheet. Deliver accessibility through semantic markup and verified browser tests.

**Tech Stack:** TypeScript 7, Next.js 16 App Router, React 19, Zod 4, ExcelJS, Vitest 5, Playwright 1.65, Axe Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-aed-data-stewardship-design.md`

## Global Constraints

- Preserve source provenance, licensing gate and human moderation for every public record.
- Treat source status as data freshness, never as AED operational status.
- Accept XLSX only through the `Dane_AED` sheet and apply existing coordinate/record validation.
- Do not automate a write to dane.gov.pl or claim full nationwide coverage.
- Respect `prefers-reduced-motion` and keep a non-map, keyboard-accessible alternative.
- Use the installed Next.js 16 App Router patterns and keep route handlers under `app/api`.
- Do not claim WCAG 2.2 AA certification; document automated evidence and remaining manual checks.

## Review Focus

- A daily source with an old collection must become `stale`, while a one-time reference remains `reference`.
- A malformed or missing `Dane_AED` XLSX sheet must return a controlled import issue rather than crash.
- An XLSX row must retain source ID, source URL, license and factual `unknown` values through the common import path.
- JSON-LD must contain no assertion that data are complete, current or automatically published to dane.gov.pl.
- At 375 px the campaign, source catalogue and import call to action must remain usable and keyboard-reachable.

---

### Task 1: Source health and coverage overview

**Files:**
- Create: `src/sources/freshness.ts`
- Create: `src/sources/freshness.test.ts`
- Modify: `src/components/SourceCatalog.tsx`
- Modify: `app/source-catalog.css`

**Interfaces:**
- Produces: `assessSourceFreshness(scope, lastFetchedAt, now): SourceFreshness`
- Consumes: `SourceReferenceScope`, optional import-run `fetchedAt`

- [ ] **Step 1: Write failing tests** for daily fresh/stale, not-collected and one-time reference source states.
- [ ] **Step 2: Run `npm test -- src/sources/freshness.test.ts`** and confirm expected missing-module failure.
- [ ] **Step 3: Implement `assessSourceFreshness`** with bounded, explainable age thresholds and Polish labels.
- [ ] **Step 4: Run the focused test** and confirm it passes.
- [ ] **Step 5: Add coverage summary and per-source status** to the source catalogue, with CSS status badges and explanatory language.
- [ ] **Step 6: Run `npm run typecheck`** and confirm it passes.

### Task 2: Import canonical XLSX

**Files:**
- Create: `src/import/xlsx.ts`
- Create: `src/import/xlsx.test.ts`
- Modify: `app/api/import/route.ts`
- Modify: `src/components/UploadWizard.tsx`
- Modify: `docs/data-standard.md`
- Modify: `src/export/workbook.ts`

**Interfaces:**
- Produces: `importAedXlsx(buffer, source, fetchedAt): Promise<ImportResult>`
- Consumes: `SourceDescriptor`, common `importAedGeoJson`

- [ ] **Step 1: Write failing tests** for a valid `Dane_AED` row and a workbook without the canonical sheet.
- [ ] **Step 2: Run `npm test -- src/import/xlsx.test.ts`** and confirm expected missing-module failure.
- [ ] **Step 3: Implement XLSX worksheet parsing** and map row values into the existing GeoJSON import path.
- [ ] **Step 4: Run the focused test** and confirm it passes.
- [ ] **Step 5: Extend the upload route and wizard** to accept `.xlsx`, make explicit that `Dane_AED` is required and preserve CSV mapping behavior.
- [ ] **Step 6: Update the generated workbook version to 0.2** and document its closed import loop.
- [ ] **Step 7: Run `npm test -- src/import/xlsx.test.ts src/import/csv.test.ts src/import/geojson.test.ts`** and confirm it passes.

### Task 3: Publication metadata

**Files:**
- Create: `src/export/metadata.ts`
- Create: `src/export/metadata.test.ts`
- Create: `app/api/metadata/route.ts`
- Modify: `app/standard/page.tsx`

**Interfaces:**
- Produces: `createPublicationMetadata(input): Record<string, unknown>`
- Consumes: source catalogue and public distribution URLs

- [ ] **Step 1: Write a failing metadata test** that expects JSON-LD context, named dataset, distributions and explicit provenance wording.
- [ ] **Step 2: Run `npm test -- src/export/metadata.test.ts`** and confirm expected missing-module failure.
- [ ] **Step 3: Implement metadata builder and route** with `application/ld+json` content type.
- [ ] **Step 4: Run the focused test** and confirm it passes.
- [ ] **Step 5: Add a standard-page action** for the JSON-LD download.

### Task 4: Campaign, accessibility and responsive evidence

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/kampania/page.tsx`
- Modify: `app/zrodla/page.tsx`
- Modify: `app/standard/page.tsx`
- Modify: `app/dodaj/page.tsx`
- Modify: `app/moderacja/page.tsx`
- Modify: `src/components/AedMap.tsx`
- Modify: `src/components/SourceCatalog.tsx`
- Modify: `src/components/UploadWizard.tsx`
- Modify: `app/globals.css`
- Create: `e2e/accessibility.spec.ts`
- Modify: `e2e/public-experience.spec.ts`

**Interfaces:**
- Produces: keyboard-visible landmarks, motion-safe campaign flow and browser evidence
- Consumes: current public page routes and generated content

- [ ] **Step 1: Write failing browser tests** for the skip link and the main campaign/source routes with Axe.
- [ ] **Step 2: Run `npm run e2e -- --grep "skip link|accessibility" --workers=1`** and confirm the expected failure.
- [ ] **Step 3: Add skip navigation, table regions, descriptive map semantics and external-link labels.**
- [ ] **Step 4: Add the campaign call to action and decorative CSS data-flow animation** guarded by `prefers-reduced-motion`.
- [ ] **Step 5: Add 375 px and 768 px browser checks** for horizontal overflow and primary navigation/CTA accessibility.
- [ ] **Step 6: Run focused E2E tests** and confirm they pass.

### Task 5: Submission artefacts and documentation

**Files:**
- Create: `artifacts/submission/Punkt-Zycia-standard-danych-AED.xlsx`
- Create: `docs/submission-checklist.md`
- Modify: `README.md`
- Modify: `docs/security-accessibility.md`
- Modify: `docs/verification.md`

**Interfaces:**
- Produces: physical XLSX submission deliverable and evidence-backed compliance checklist

- [ ] **Step 1: Export the validated standard workbook** from the application endpoint into the submission artifact directory.
- [ ] **Step 2: Inspect workbook sheets and filename** to confirm the deliverable contains the documented tabs.
- [ ] **Step 3: Document the formal deliverables, automated evidence and remaining human checks.**
- [ ] **Step 4: Run `npm test`, `npm run typecheck`, `npm run build` and relevant E2E tests** and record actual outcomes.
