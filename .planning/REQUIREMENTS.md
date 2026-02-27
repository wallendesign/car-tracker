# Requirements: Car Tracker

**Defined:** 2026-02-27
**Core Value:** AI-powered research hub that eliminates browser tab chaos — every listing you're considering is saved, summarized, and trackable in one minimal interface.

## v1 Requirements

Requirements for initial release.

### Ingestion

- [ ] **ING-01**: User can add a car by pasting a marketplace URL (Blocket, Bytbil, AutoUncle)
- [ ] **ING-02**: App fetches the listing page server-side and passes HTML to AI for extraction
- [ ] **ING-03**: AI extracts: make/model, year, price, mileage, location, and main photo URL
- [ ] **ING-04**: Extracted car is saved persistently (survives page reload)

### AI Summary

- [ ] **AI-01**: Each car displays a listing details section (price, mileage, year, location)
- [ ] **AI-02**: Each car has an AI-generated model overview (general info about that make/model/year)
- [ ] **AI-03**: Each car has an AI-generated common issues section (known problems, recalls, things to inspect)
- [ ] **AI-04**: Each car has an AI-generated value assessment (is the asking price fair for the market?)

### List View

- [ ] **LIST-01**: User sees all saved cars in a persistent list
- [ ] **LIST-02**: Each list item shows the main listing photo
- [ ] **LIST-03**: Each list item shows key stats: make/model, year, price, mileage
- [ ] **LIST-04**: Each list item shows the car's current status badge

### Side Panel

- [ ] **PANEL-01**: User can click any car in the list to open it in a side panel
- [ ] **PANEL-02**: Side panel shows the main listing photo
- [ ] **PANEL-03**: Side panel shows all extracted listing details
- [ ] **PANEL-04**: Side panel shows the full AI summary (model overview, common issues, value assessment)
- [ ] **PANEL-05**: Side panel allows changing the car's status

### Management

- [ ] **MGMT-01**: User can tag each car with a status: Interested / Contacted / Pass
- [ ] **MGMT-02**: User can remove a car from the list

### Design

- [x] **DESIGN-01**: UI uses Geist typeface throughout
- [x] **DESIGN-02**: UI is modern and minimal in aesthetic

## v2 Requirements

Deferred to future release.

### Comparison

- **COMP-01**: User can select multiple cars and compare them side by side
- **COMP-02**: Comparison view shows key fields (price, year, mileage, status) per car
- **COMP-03**: AI summary is visible per car in comparison view

### Polish

- **POLISH-01**: User can filter list by status
- **POLISH-02**: User can sort list by price / mileage / year
- **POLISH-03**: Manual refresh — re-run AI extraction on demand for an existing listing

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Single user, no auth needed |
| Personal notes per car | AI summary is sufficient replacement |
| Non-Swedish marketplaces (v1) | Blocket, Bytbil, AutoUncle only |
| Mobile app | Web-first |
| Saved search / alerts | Requires polling; ToS risk; infrastructure complexity |
| Price history tracking | Requires repeated polling and snapshot storage |
| Export to CSV/PDF | Defer until sharing need is expressed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ING-01 | Phase 2 | Pending |
| ING-02 | Phase 2 | Pending |
| ING-03 | Phase 2 | Pending |
| ING-04 | Phase 1 | Pending |
| AI-01 | Phase 4 | Pending |
| AI-02 | Phase 4 | Pending |
| AI-03 | Phase 4 | Pending |
| AI-04 | Phase 4 | Pending |
| LIST-01 | Phase 3 | Pending |
| LIST-02 | Phase 3 | Pending |
| LIST-03 | Phase 3 | Pending |
| LIST-04 | Phase 3 | Pending |
| PANEL-01 | Phase 3 | Pending |
| PANEL-02 | Phase 3 | Pending |
| PANEL-03 | Phase 3 | Pending |
| PANEL-04 | Phase 4 | Pending |
| PANEL-05 | Phase 3 | Pending |
| MGMT-01 | Phase 3 | Pending |
| MGMT-02 | Phase 3 | Pending |
| DESIGN-01 | Phase 1 | Complete |
| DESIGN-02 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after Plan 01-01 completion (DESIGN-01, DESIGN-02 marked complete)*
