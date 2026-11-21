# AED Source Connectors Implementation Plan

> **For agentic workers:** Implement inline in this workspace. Use test-driven development for connector and scope behavior.

**Goal:** Add a source register that states each publisher's reference coverage and safely imports verified public AED sources into the existing staging and moderation workflow.

**Architecture:** Keep a static allowlist of known source profiles and source-specific adapters in the TypeScript domain layer. A server-only, moderator-protected route fetches the configured source, normalizes it, and stages records without publishing them. A public source page reports geographic and temporal scope, custodian, format, license, update claim, and verification limits. Unlisted data holders continue to use the existing file submission flow.

**Tech Stack:** Existing Next.js Route Handlers, TypeScript, Zod, Papa Parse, GeoJSON, ExcelJS, Vitest, and Playwright.

**Spec:** `docs/architecture-decisions.md` and `docs/data-standard.md`, based on the user-provided contest PDF and prompt PDF.

## Global Constraints

- Fetch only fixed, reviewed HTTPS source endpoints; never accept a remote URL from a browser request.
- Every imported record remains pending until a moderator reviews its source license and record.
- Retain source ID, source record ID, source link, upstream origin, retrieval time, source data date, license, and attribution.
- Never infer device operation or public access from a schedule or import timestamp.
- Do not silently reorder suspicious coordinates or treat two views of the same upstream database as independent confirmation.
- Keep sources requiring credentials disabled unless a server-side environment secret is configured.
- Treat a publisher's declared geography and update cadence as reference scope, not proof of exhaustiveness or freshness.
- Do not assert one common license for a combined release; preserve per-source terms and attribution for legal review.

## Review Focus

- Mislabelled latitude/longitude and out-of-coverage records must remain unchanged and receive an actionable warning.
- Upstream redirects, oversized responses, invalid JSON, and unexpected formats must fail without staging partial data.
- A public-data resource that is actually documentation or an authenticated API must not be imported as device records.
- PII-bearing source properties must not become public AED fields.
- Repeated collection of the same source record must remain idempotent and pending moderation.

---

### Task 1: Source profiles and reference-scope page

**Files:** Create `src/sources/catalog.ts`, `src/components/SourceCatalog.tsx`, `app/zrodla/page.tsx`; modify `src/domain/types.ts`, `src/components/SiteHeader.tsx`, `src/export/workbook.ts`, `docs/data-standard.md`, `docs/source-register.md`.

- [x] Add source profiles for the national OpenAEDMap export, the portal datasets from Krosno, Marki, and Przemyśl, and Warsaw's token-gated API.
- [x] Record publisher, upstream origin, dataset/resource IDs, declared geography, data date, cadence, format, license, attribution, and connector availability.
- [x] Add tests for source-profile completeness and consistent scope columns in the XLSX dictionary; unknown scope is explicit in public wording.
- [x] Render `/zrodla` with source links and explicit distinction between source date, last fetch, and device verification.

### Task 2: Source-specific normalization

**Files:** Create `src/sources/collect.ts`; modify `src/import/geojson.ts`, `src/import/csv.ts`; add fixtures and tests under `src/sources/` and `src/import/`.

- [x] Normalize OpenAEDMap IDs from `@osm_type` and `@osm_id`, while ignoring contact fields.
- [x] Configure Krosno and Marki CSV mappings separately; map Przemyśl GeoJSON fields and addresses.
- [x] Normalize Warsaw's documented response only when its server-side token exists; otherwise return a clear unavailable status.
- [x] Add tests for IDs, address/access mapping, Marki's out-of-country coordinate warning, and no silent correction.

### Task 3: Protected collection route and moderator controls

**Files:** Create `app/api/collect/[sourceId]/route.ts`; modify `src/components/ModeratorDesk.tsx`, `src/services/staging.ts`, `.env.example`, and `README.md`.

- [x] Implement allowlisted fetch with timeout, byte limit, redirect host checks, content-type checks, and complete-fetch-before-stage behavior.
- [x] Resolve Dane.gov.pl metadata and the configured resource ID before parsing each resource; do not select arbitrary resources.
- [x] Stage the source and import report through the existing repository; do not publish records.
- [x] Add per-source collect actions and report accepted, rejected, warned, source-data date, and retrieval time.
- [x] Add the optional `AED_WARSAW_API_TOKEN` configuration without exposing it to the browser.
- [x] Add tests for unauthorized requests, redirect blocking, failed fetches, and staging only after successful parse.

### Task 4: Documentation and verification

**Files:** Modify `docs/requirements-matrix.md`, `docs/architecture-decisions.md`, `docs/source-register.md`, `docs/security-accessibility.md`, and `docs/verification.md`.

- [x] Record verified source scope, exact public endpoints, licenses, observed formats/counts, data dates, and access constraints.
- [x] Explain that sources on Dane.gov.pl are discovered candidates, not an exhaustive register of every holder in Poland.
- [x] Run unit tests, typecheck, production build, and browser flows; record observed results in `docs/verification.md`.
