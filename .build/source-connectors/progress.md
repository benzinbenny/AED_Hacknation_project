# Source connectors implementation ledger

## Workspace ruling

- Existing workspace reused: `C:\Users\Bartek\Desktop\Projekt_Haknation`.
- `git rev-parse --is-inside-work-tree` reported that the workspace is not a Git repository; no worktree or commit was created.
- Implementation plan: `docs/superpowers/plans/2026-11-21-source-connectors.md`.

## Shared interfaces

- `SourceReferenceScope` carries geography level and label, temporal description, source data date, declared frequency, basis, and limitations.
- `AedSourceProfile` is an explicit allowlist entry; format-specific adapters normalize sources into the canonical AED record.
- `AedRecord` has backward-compatible optional metadata for geography/TERYT, placement, accuracy, access, verification, and source data date.
- Import routes stage records and metadata; moderation remains the only release gate.

## Completed

- Added national OpenAEDMap plus Krosno, Marki, Przemyśl, and token-gated Warsaw source profiles.
- Added protected, bounded, allowlisted server collection; Dane.gov.pl uses exact dataset/resource IDs and the portal API, not arbitrary resource selection.
- Added the public `/zrodla` registry and moderator collect controls. The form import accepts the shared field set and records source reference scope for additional organizations.
- Extended CSV/GeoJSON normalization and CSV/JSON/GeoJSON/XLSX output to preserve shared fields and provenance.
- Reworked duplicate candidate matching to use a spatial grid; pending review UI now pages records and limits candidate rendering.
- Documented source coverage, licensing, access limitations, non-exhaustiveness, publication handoff, and verification results.

## Verification observed

- `npm test -- --reporter=dot`: 13 test files, 35 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed after allowing Next.js to create a junction outside the sandbox.
- `npm run e2e -- --workers=1`: 7 browser tests passed.
- Edge reported an existing hydration mismatch on `caret-color: transparent`; see `docs/verification.md`.

## Remaining product boundary

- The five configured profiles are not a complete directory of AED holders in Poland. Other holders can import standardized CSV/GeoJSON and describe their source scope; further automated connectors need reviewed profiles.
- The Warsaw connector requires authorized server-side credentials and was not tested with a live token.
- The prototype uses single-process JSON storage and exports a package for an authorized dane.gov.pl publisher. It does not write into dane.gov.pl.
