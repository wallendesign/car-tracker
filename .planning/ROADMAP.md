# Roadmap: Car Tracker

## Overview

Four phases take the project from a bare Next.js scaffold to a fully functional AI-powered car research hub. The build order is dictated by the dependency chain: the persistence layer must exist before any car data can be stored; the AI extraction pipeline must be proven reliable before any UI is built around it; the core UI delivers the primary workflow once extraction is solid; and the AI summary sections complete the value proposition in the final phase. Every v1 requirement maps to exactly one phase.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Next.js scaffold, TypeScript types, persistence layer, and design system
- [ ] **Phase 2: AI Extraction Pipeline** - Server-side marketplace fetching and AI-powered data extraction
- [ ] **Phase 3: Core UI** - Car list, side panel, and status management
- [ ] **Phase 4: AI Summary Display** - AI-generated model overview, known issues, and value assessment

## Phase Details

### Phase 1: Foundation
**Goal**: A working Next.js project with the full design system, typed data model, and persistent storage — so no layer ever needs to be rewritten due to a shape mismatch later
**Depends on**: Nothing (first phase)
**Requirements**: ING-04, DESIGN-01, DESIGN-02
**Success Criteria** (what must be TRUE):
  1. The app runs locally and deploys without errors
  2. A hardcoded car record saved to storage survives a full page reload
  3. Geist typeface renders across all pages with no fallback font visible
  4. The UI reads as modern and minimal — clean whitespace, consistent type scale, no visual clutter
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Next.js 15 scaffold, Tailwind v4, Geist font, shadcn/ui (new-york/Zinc), dark mode, Linear-aesthetic layout skeleton with hardcoded content
- [ ] 01-02-PLAN.md — CarRecord TypeScript types, Dexie.js v4 persistence service, Zustand v5 UI store, persistence proof (ING-04)

### Phase 2: AI Extraction Pipeline
**Goal**: A server-side pipeline that accepts a Swedish marketplace URL and returns a fully typed CarRecord — with anti-bot defenses and AI hallucination guards in place before any UI is built around it
**Depends on**: Phase 1
**Requirements**: ING-01, ING-02, ING-03
**Success Criteria** (what must be TRUE):
  1. User pastes a Blocket, Bytbil, or AutoUncle URL and receives a populated car record
  2. Pasting a non-marketplace URL returns a clear error message, not garbage data
  3. A CAPTCHA or bot-detection page from any marketplace surfaces a "could not read listing" error rather than silently passing to AI
  4. All three marketplaces (Blocket, Bytbil, AutoUncle) return valid extractions from real live URLs
  5. Price and mileage extracted by AI match values visible in the raw listing HTML
**Plans**: TBD

Plans:
- [ ] 02-01: POST /api/fetch-listing route — server-side proxy with domain allowlist, browser-like headers, HTML content validation
- [ ] 02-02: POST /api/analyze-listing route — Vercel AI SDK generateObject with Zod schema, nullable fields, price/mileage cross-validation
- [ ] 02-03: listingService.ts client wrapper, end-to-end integration test with real URLs from all three marketplaces

### Phase 3: Core UI
**Goal**: The complete primary workflow — paste a URL, see the car appear in the list, click to view details in a side panel, tag its status, and remove it when done
**Depends on**: Phase 2
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, PANEL-01, PANEL-02, PANEL-03, PANEL-05, MGMT-01, MGMT-02
**Success Criteria** (what must be TRUE):
  1. User pastes a URL into the input, sees step-specific loading feedback ("Fetching listing..." then "Analyzing with AI..."), and the car appears in the list when done
  2. Each list item shows the listing photo, make/model, year, price, mileage, and status badge
  3. Clicking any list item opens a side panel showing the photo and all extracted listing details without a page navigation
  4. User can change a car's status (Interested / Contacted / Pass) from both the list and the side panel, and the badge updates immediately
  5. User can remove a car and it disappears from the list permanently
**Plans**: TBD

Plans:
- [ ] 03-01: AddCarForm with two-step loading states, image proxy or wildcard remotePatterns for marketplace CDNs
- [ ] 03-02: CarList component — list items with photo thumbnail, key stats, status badge, Zustand store wiring
- [ ] 03-03: SidePanel and CarDetail — photo, extracted listing fields, status controls, reads from store only
- [ ] 03-04: Status management (MGMT-01) and car removal (MGMT-02) wired through Zustand and Dexie.js

### Phase 4: AI Summary Display
**Goal**: The full AI research value — each car's side panel shows listing details alongside an AI-generated model overview, known issues, and price fairness verdict so the user has everything needed to make a decision without leaving the app
**Depends on**: Phase 3
**Requirements**: AI-01, AI-02, AI-03, AI-04, PANEL-04
**Success Criteria** (what must be TRUE):
  1. Side panel shows a listing details section with price, mileage, year, and location
  2. Side panel shows an AI-generated model overview describing the make/model/year in general terms
  3. Side panel shows an AI-generated common issues section covering known problems and things to inspect
  4. Side panel shows an AI-generated value assessment indicating whether the asking price is fair for the market
  5. All four AI summary sections are present and readable for every car added from any of the three marketplaces
**Plans**: TBD

Plans:
- [ ] 04-01: Extend analyze-listing route to generate narrative summary sections (model overview, common issues, value assessment) via generateText
- [ ] 04-02: CarDetail AI summary sections — listing details display (AI-01) and three AI narrative sections (AI-02, AI-03, AI-04) in SidePanel (PANEL-04)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/2 | In progress | - |
| 2. AI Extraction Pipeline | 0/3 | Not started | - |
| 3. Core UI | 0/4 | Not started | - |
| 4. AI Summary Display | 0/2 | Not started | - |
