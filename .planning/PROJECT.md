# Car Tracker

## What This Is

A single-user web app for researching and tracking second-hand car listings from Swedish marketplaces (Blocket, Bytbil, AutoUncle). Paste a URL, and the app uses AI to extract listing details and generate a comprehensive summary — so you can evaluate, compare, and track every car you're considering from one place.

## Core Value

AI-powered research hub that eliminates browser tab chaos: every listing you're considering is saved, summarized, and comparable in one minimal interface.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can add a car by pasting a marketplace URL
- [ ] AI reads the URL and extracts: price, mileage, year, location, and main photo
- [ ] AI generates a summary covering: model overview, common issues/recalls, and value assessment (is the price fair?)
- [ ] Main listing photo is displayed in the car list and side panel
- [ ] Cars are saved in a persistent list
- [ ] User can open any car in a side panel view
- [ ] User can tag each car with a status: Interested / Contacted / Pass
- [ ] User can select multiple cars and compare them side by side
- [ ] UI is modern, minimal, uses Geist typeface

### Out of Scope

- User accounts / authentication — single user, no auth needed
- Personal notes per car — AI summary is sufficient
- Non-Swedish marketplaces (v1) — Blocket, Bytbil, AutoUncle only
- Mobile app — web-first

## Context

- Targets Swedish marketplaces: Blocket, Bytbil, AutoUncle
- AI reads listing URLs directly — no manual data entry
- Single user, no backend auth required
- Design aesthetic: modern, minimal, Geist typeface

## Constraints

- **Design**: Modern, minimal UI — Geist typeface throughout
- **Scope**: Swedish marketplaces only for v1
- **Auth**: None — single user app

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI reads URLs directly | Avoids brittle scrapers per marketplace; AI handles varied page structures | — Pending |
| No auth | Single user, no need for accounts | — Pending |
| Side panel layout | Browse list + view details without losing context | — Pending |

---
*Last updated: 2026-02-27 after initialization*
