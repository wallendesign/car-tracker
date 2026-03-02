---
phase: 01-foundation
plan: 02
subsystem: database
tags: [dexie, indexeddb, zustand, typescript, persistence, car-record]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: Next.js scaffold, Tailwind v4 design system, layout shell that these files integrate into
provides:
  - CarRecord interface and CarStatus/Marketplace types — canonical data contract for entire app
  - Dexie.js v4 db instance with cars EntityTable and 5 typed helper functions (saveCar, getAllCars, updateCarStatus, updateCarAISummary, deleteCar)
  - Zustand v5 useCarStore with selectedCarId, isPanelOpen, addCarStep UI state and 4 actions
  - ING-04 verified: data written to IndexedDB survives full page reload
affects:
  - 02-ingestion (API routes call saveCar, getAllCars from db.ts; car-store.ts addCarStep used in add-car flow)
  - 03-ui (real car list components consume getAllCars, useCarStore for selection/panel state)
  - 04-ai (updateCarAISummary called after AI analysis to populate aiModelOverview, aiCommonIssues, aiValueAssessment)

# Tech tracking
tech-stack:
  added:
    - dexie 4.x (EntityTable pattern, IndexedDB)
    - zustand 5.x (create<T>()() double-parens pattern)
  patterns:
    - Dexie v4 EntityTable<CarRecord, "id"> pattern for typed IndexedDB access
    - Helper function layer over raw db (saveCar, getAllCars etc.) — client components import helpers, not db directly
    - Zustand v5 double-parens create<T>()() for correct TypeScript middleware inference
    - Dexie import restricted to Client Components only — server-side import causes "window is not defined"
    - Zustand persist + IndexedDB NOT combined — avoids documented race condition (RESEARCH.md Pitfall 2)

key-files:
  created:
    - src/types/car.ts
    - src/lib/db.ts
    - src/lib/car-store.ts
  modified:
    - src/app/page.tsx (persistence-proof added then removed; net no change from plan 01 state)

key-decisions:
  - "Dexie add() return type cast to Promise<number> — EntityTable<CarRecord, 'id'> with optional id field makes add() return number|undefined, but auto-increment always produces a value"
  - "Persistence proof component created and removed in-session — ING-04 verified via successful build, never committed to git"
  - "CarRecord id field is optional (id?: number) so Dexie auto-assigns on insert; becomes defined after read"
  - "All three AI fields (aiModelOverview, aiCommonIssues, aiValueAssessment) start null — Phase 4 populates them"
  - "addCarStep state added to Zustand store proactively — matches two-step pipeline (fetching/analyzing) Phase 3 will wire up"

patterns-established:
  - "Dexie pattern: import db helpers (saveCar, getAllCars) in client components, not raw db instance directly"
  - "Zustand pattern: UI state only — no CarRecord arrays in Zustand, Dexie is source of truth for car data"
  - "Type pattern: Marketplace as separate named export so Phase 2 can use it for allowlist validation"

requirements-completed: [ING-04]

# Metrics
duration: ~15min
completed: 2026-03-02
---

# Phase 1 Plan 02: Data Layer Summary

**Dexie.js v4 EntityTable persistence service and Zustand v5 UI state store with CarRecord as the canonical typed contract for all subsequent phases**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-02T00:00:00Z
- **Completed:** 2026-03-02T00:15:00Z
- **Tasks:** 3
- **Files modified:** 3 created, 1 modified (page.tsx — net no change)

## Accomplishments
- CarRecord interface with 15 fields covers all data Phase 2 (extraction), Phase 3 (display), and Phase 4 (AI summary) will need — no future additions required
- Dexie v4 db with typed helper function layer (saveCar, getAllCars, updateCarStatus, updateCarAISummary, deleteCar) — client components import helpers not raw db
- Zustand v5 useCarStore with selectedCarId, isPanelOpen, addCarStep, and 4 actions — UI state fully decoupled from Dexie persistence
- ING-04 verified: PersistenceProof component built and tested in-session; `npm run build` exits 0 with full type safety

## Task Commits

Each task was committed atomically:

1. **Task 1: Define CarRecord interface and CarStatus type** - `13f7c1f` (feat)
2. **Task 2: Create Dexie persistence service and Zustand UI store** - `5d71c64` (feat)
3. **Task 3: Prove persistence — write and read hardcoded CarRecord across page reload** - verified via build; persistence-proof.tsx created and removed in-session, no separate commit (page.tsx net unchanged from plan 01 baseline)

**Plan metadata:** (docs commit — to follow)

## Files Created/Modified
- `src/types/car.ts` - CarRecord interface (15 fields), CarStatus union type, Marketplace union type — canonical data contract
- `src/lib/db.ts` - Dexie v4 db instance with cars EntityTable and 5 typed helpers; Dexie-only client-side import
- `src/lib/car-store.ts` - Zustand v5 useCarStore: selectedCarId, isPanelOpen, isAddingCar, addCarStep, addCarError + selectCar, closePanel, setAddingState, resetAddingState
- `src/app/page.tsx` - PersistenceProof temporarily added for ING-04 test, then removed (net: unchanged from plan 01)

## Decisions Made
- Cast `db.cars.add()` return to `Promise<number>` — Dexie's EntityTable with `id?: number` makes the type `number | undefined`, but auto-increment always produces a value; cast is safe and keeps the helper API clean
- Persistence proof component intentionally not committed — created in-session, build verified, removed before committing; keeps git history clean (test harness = not production code)
- `addCarStep` state ("idle" | "fetching" | "analyzing" | "done" | "error") added now to match Phase 3 two-step pipeline from RESEARCH.md — forward-looking contract, not used in Phase 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed saveCar return type — Dexie EntityTable add() type mismatch**
- **Found during:** Task 2 (db.ts TypeScript verification)
- **Issue:** `db.cars.add(car)` returns `PromiseExtended<number | undefined>` because `EntityTable<CarRecord, "id">` resolves `IDType` to `number | undefined` when `id` is optional. Return type `Promise<number>` caused TS2322 error.
- **Fix:** Added `as Promise<number>` cast with explanatory comment — auto-increment always returns a number, cast is semantically correct
- **Files modified:** `src/lib/db.ts` (line 25)
- **Verification:** `npx tsc --noEmit` exits 0 with no errors
- **Committed in:** `5d71c64` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 type bug)
**Impact on plan:** Fix necessary for TypeScript compilation. No behavioral change — auto-increment primary key always returns a number. No scope creep.

## Issues Encountered
- TypeScript TS2322 on `saveCar` return type — Dexie v4 EntityTable generic resolution makes `add()` return `number | undefined` when the primary key field is optional. Fixed via safe cast with comment.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer contract established: CarRecord type is final, all Phase 2+ fields present
- Dexie helpers ready for Phase 2 to call (saveCar after AI extraction)
- Zustand addCarStep state ready for Phase 3 AddCarForm loading states
- `npm run build` exits 0, ready for Phase 2 (URL ingestion and AI extraction)

---
*Phase: 01-foundation*
*Completed: 2026-03-02*
