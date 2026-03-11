# Project Research Summary

**Project:** Car Tracker — Single-User AI-Powered Car Listing Tracker
**Domain:** Personal research tool / used car marketplace aggregator (Swedish marketplaces)
**Researched:** 2026-02-27
**Confidence:** MEDIUM (core stack HIGH; marketplace-specific behaviors LOW — require live testing)

## Executive Summary

This is a single-user, client-heavy web app whose core value proposition is collapsing what is normally a multi-tab, multi-spreadsheet used car research workflow into a single interface. The user pastes a URL from a Swedish marketplace (Blocket, Bytbil, or AutoUncle), an AI pipeline extracts structured listing data and generates a narrative summary (model overview, known reliability issues, price fairness verdict), and the result is saved to a local persistent store with status tagging and side-by-side comparison. The recommended approach is Next.js 16 App Router with the Vercel AI SDK, Dexie.js for IndexedDB persistence, and Zustand for UI state — a modern, well-integrated stack that handles the two most critical concerns cleanly: server-side AI calls (API keys never reach the client) and client-side persistence without a backend database.

The highest-risk element is marketplace HTML retrieval. Swedish marketplaces actively deploy anti-bot protection (Cloudflare, DataDome) that returns 200 OK CAPTCHA pages rather than 4xx errors — meaning a naively implemented fetcher will silently pass garbage to the AI, which will then hallucinate plausible-looking but wrong car data. This is the make-or-break technical risk and must be addressed in the first engineering phase, before any other feature work proceeds. The mitigation strategy is two-pronged: add browser-like request headers and pre-validate fetched HTML for listing signals (price patterns, year) before passing to the AI.

The second major risk is AI extraction reliability. LLMs fill in plausible answers when fields are ambiguous — a mileage value from engine displacement, a price from a sidebar "similar cars" section. The defense is strict output schemas with nullable fields (never force a value), source-text validation for critical fields (price, mileage), and a visible "unverified" indicator in the UI. With these guardrails in place, the AI extraction pipeline is reliable enough to be the product's core mechanic. The comparison and status-tagging features are architecturally straightforward once extraction is solid.

---

## Key Findings

### Recommended Stack

The stack converges on Next.js 16 App Router as the backbone — it handles Server Actions and Route Handlers that keep AI API keys server-side, integrates natively with Tailwind CSS v4 and React 19.2, and ships with Turbopack for fast iteration. The Vercel AI SDK (`ai` 4.x) provides a provider-agnostic abstraction over OpenAI and Anthropic, with `generateObject` + Zod schemas for structured extraction and `generateText` for narrative summaries. No backend database is needed; Dexie.js wraps IndexedDB for client-side persistence, and Zustand 5.x with its `persist` middleware handles UI state that survives page reloads.

A note on the ARCHITECTURE.md vs. STACK.md divergence: ARCHITECTURE.md uses localStorage + direct Anthropic SDK calls in route handlers, while STACK.md recommends Dexie.js (IndexedDB) + Vercel AI SDK. The STACK.md recommendations are more robust — use Dexie.js (handles structured records cleanly, no 5MB ceiling concern in practice), and use the Vercel AI SDK (provider-agnostic, structured output support, streaming-ready). Follow STACK.md here.

**Core technologies:**
- **Next.js 16.1:** Full-stack framework, App Router, Route Handlers, Server Actions — API keys stay server-side
- **Vercel AI SDK 4.x + Zod:** `generateObject` with Zod schemas enforces typed AI output; provider-agnostic swap between OpenAI and Anthropic
- **GPT-4o-mini (extraction) + Claude Sonnet (summaries):** Cheap reliable JSON extraction; nuanced narrative prose for the advisory summary
- **Dexie.js 4.x:** IndexedDB wrapper; handles car records (fields + photo URL + AI summary) with schema versioning
- **Zustand 5.x with `persist` middleware:** UI state (selected car, compare selections, loading) + automatic localStorage sync
- **Tailwind CSS v4 + shadcn/ui:** Zero-config utility styling; shadcn Card, Sheet, Badge, Dialog for the panel/compare UI
- **TypeScript 5.1+:** Required by Next.js 16; catches AI SDK schema mismatches before runtime
- **Geist font:** Matches design spec; works via `next/font`-compatible API

**Critical version requirement:** Node.js 20.9+ (Next.js 16 dropped Node.js 18).

### Expected Features

The product's feature set is well-defined in FEATURES.md. The entire user experience is gated on reliable AI extraction — every other feature depends on it. The feature dependency chain is: URL Input → AI Extraction Engine → Car Record → everything else. Build in that order.

**Must have (table stakes — v1 launch):**
- URL input that triggers AI extraction from any of the three marketplaces
- AI extraction of: price, year, mileage, location, first photo URL
- AI summary: model overview, known issues, price fairness verdict
- Persistent car list that survives page reload (Dexie.js)
- List row shows: thumbnail, make/model/year, price, mileage, status badge
- Detail side panel on row click — all extracted fields + full AI summary
- Status tagging: Interested / Contacted / Pass (toggled from list or panel)
- Remove car — no confirmation dialog needed for a single-user tool
- Side-by-side comparison: 2–4 cars, key fields in columns

**Should have (v1.x — after extraction is reliable):**
- Manual refresh of an existing listing (re-run extraction on demand)
- Filter list by status (becomes necessary when list exceeds ~10 cars)
- Sort list by price / mileage / year
- AI summary links to Transportstyrelsen recall database

**Defer (v2+):**
- Export to CSV / PDF
- Price history tracking (requires polling infrastructure)
- Additional marketplaces (Kvdbil, Wayke)
- Notes per car (PROJECT.md explicitly out of scope)
- Saved search alerts (ToS risk + background job complexity)

**Key competitive insight:** AutoUncle already aggregates Swedish marketplaces and provides price ratings. This app's differentiator is not aggregation or scoring — it is the AI-generated narrative summary and the personal research workspace (track, tag, compare your shortlist). Position as a decision tool, not a search tool.

### Architecture Approach

The architecture is a two-layer system: a Next.js App Router application that handles server-side operations (marketplace fetching via Route Handlers, AI calls via Server Actions / Route Handlers), and a fully client-side state layer (Zustand + Dexie.js) that needs no backend database. The critical pattern is a two-step sequential pipeline: `POST /api/fetch-listing` (server-side proxy that bypasses CORS and marketplace restrictions) followed by `POST /api/analyze-listing` (AI extraction call). Splitting these into two route handlers allows independent retry, granular loading states, and isolation of fetch failures from AI failures.

**Major components:**
1. **`POST /api/fetch-listing`** — Server-side proxy; receives user URL, fetches external HTML with browser-like headers, strips scripts/styles, returns cleaned HTML; never calls AI
2. **`POST /api/analyze-listing`** — Receives cleaned HTML; calls AI SDK `generateObject` with Zod schema for structured extraction + `generateText` for narrative summary; returns typed `CarRecord`
3. **Zustand store (`carStore.ts`)** — Single source of truth for `cars[]`, `selectedId`, `compareIds[]`, loading/error state; `persist` middleware syncs to Dexie.js or localStorage automatically
4. **`CarList` + `AddCarForm`** — Primary UI; orchestrates the two-step pipeline via `listingService.ts`; shows step-specific loading states
5. **`SidePanel` + `CarDetail`** — Reads from store only; zero API calls on view; shows full extracted data + AI summary + status controls
6. **`CompareView`** — Reads from store only; renders 2–4 car columns; strictly limited to 5–6 decision-relevant fields

**Build order from ARCHITECTURE.md (follow this precisely):**
1. Types (`types/car.ts`) — shared shape referenced everywhere
2. Storage + Store (`storageService.ts`, `carStore.ts`) — foundation for all UI
3. API Route: `fetch-listing` — test marketplace fetching in isolation
4. API Route: `analyze-listing` — test AI extraction with real HTML samples
5. `listingService.ts` — client wrapper orchestrating both routes
6. `CarList` + `AddCarForm` — wires service to store
7. `SidePanel` — reads from store; simple once store works
8. `CompareView` — last; needs multiple cars to test

### Critical Pitfalls

1. **Anti-bot blocking returns 200 OK CAPTCHA pages** — Validate fetched HTML for listing signals (price pattern `/\d[\s\d]*\s*kr/`, year pattern) before passing to AI. Surface a clear "could not read listing" error rather than passing challenge page content to AI. Consider Playwright headless rendering for Bytbil (JavaScript-heavy SPA). Add Swedish-locale headers (`Accept-Language: sv-SE`). Verify from a deployed server, not localhost — IP reputation differs.

2. **AI hallucination of field values** — Use strict Zod schema with nullable fields; never force a non-null value. For price and mileage, cross-validate the AI-extracted value against a regex on the raw HTML. If the value isn't in the source text, flag it as "unverified" in the UI. Show "N/A" for confirmed-null fields; show "?" for low-confidence fields.

3. **Next.js Image domain whitelist gaps cause production image failures** — Audit all three marketplace CDN hostnames before implementing image display. Use wildcard `remotePatterns` (e.g., `**.blocket.se`). Better: implement a server-side `/api/image-proxy` route that fetches and streams images, bypassing domain config entirely and handling CDN hostname changes gracefully.

4. **External image URLs expire (signed tokens, session params)** — Store raw URL but implement `onError` fallback with a car silhouette placeholder. For MVP, this is acceptable. Long-term: download and re-serve images from own storage, or proxy on-demand via image proxy route.

5. **SSRF via unchecked URL input** — Validate pasted URLs against an allowlist of known marketplace domains (`*.blocket.se`, `*.bytbil.com`, `*.autouncle.se`) before server-side fetching. Add this on day one of fetching implementation. Test with `http://localhost` and `http://192.168.1.1` — both must return errors.

---

## Implications for Roadmap

Based on the dependency chain in FEATURES.md, the architectural build order in ARCHITECTURE.md, and the pitfall-to-phase mapping in PITFALLS.md, a 4-phase structure is recommended.

### Phase 1: Foundation — Types, Storage, and Project Scaffold

**Rationale:** Everything else depends on the TypeScript types and the persistence layer. Building these first means no component ever has to be rewritten due to a shape mismatch. This phase has zero external dependencies and zero risk.

**Delivers:** Working Next.js project with Dexie.js persistence, Zustand store, and fully typed `CarRecord` shape. Dev can add hardcoded test data and see it survive a page reload.

**Addresses features:** Persistent car list (the foundational requirement for status tagging, removal, comparison).

**Avoids pitfalls:** Writing to localStorage directly from components (enforced by funneling all writes through `storageService.ts` + Zustand `persist` from the start).

**Stack used:** Next.js 16 scaffold (`create-next-app`), TypeScript, Dexie.js, Zustand, Tailwind CSS v4, shadcn/ui init.

**Research flag:** Standard patterns — skip research-phase.

---

### Phase 2: AI Extraction Pipeline

**Rationale:** This is the highest-risk phase and the make-or-break feature. All other UI features are worthless without reliable extraction. Isolate and validate it before building any UI around it. The two-step split (fetch route + analyze route) must be established here.

**Delivers:** Working `POST /api/fetch-listing` and `POST /api/analyze-listing` routes; `listingService.ts` orchestrating both; end-to-end test with real URLs from all three marketplaces returning a valid `CarRecord` JSON.

**Addresses features:** URL input + AI extraction, AI summary (model overview, known issues, price fairness verdict), zero data entry.

**Avoids pitfalls:** Anti-bot blocking (validate HTML content before AI call; add browser-like headers); AI hallucination (Zod schema with nullable fields, price cross-validation regex); SSRF (domain allowlist on `fetch-listing` route from day one); API key exposure (route handlers only, no `NEXT_PUBLIC_` prefix).

**Stack used:** Vercel AI SDK `generateObject` + Zod (extraction); `generateText` + Anthropic (summary); `gpt-4o-mini` for extraction, `claude-3-5-sonnet` for summary.

**Research flag:** NEEDS RESEARCH-PHASE — Blocket, Bytbil, and AutoUncle HTML structures must be tested live from a deployed server. Bytbil is a JavaScript SPA and may require Playwright/headless rendering. Do not proceed to Phase 3 until extraction is validated with real URLs from all three sites.

---

### Phase 3: Core UI — List, Side Panel, and Status

**Rationale:** With a working extraction pipeline and persistence layer in place, the UI can be built with real data from the start. This phase delivers the full primary workflow: paste URL → see car in list → click → see detail panel → tag status → remove. No comparison yet — build the simpler interaction patterns first.

**Delivers:** Complete primary user journey. List view with photo thumbnails, key stats, status badges. Detail side panel. Status tagging (Interested / Contacted / Pass). Remove car. AddCarForm with two-step loading states ("Fetching listing..." / "Analyzing with AI...").

**Addresses features:** All P1 features except comparison.

**Avoids pitfalls:** No loading state during processing (implement step-specific loading from the start; disable input during processing to prevent duplicate submissions); image display failures (implement image proxy or wildcard remotePatterns before first end-to-end test); broken image UX (onError fallback with placeholder silhouette).

**Stack used:** shadcn/ui Card, Sheet (side panel), Badge (status); Zustand selectors; Dexie.js `useLiveQuery`.

**Research flag:** Standard patterns — skip research-phase. shadcn/ui Sheet and Badge have well-documented usage.

---

### Phase 4: Comparison View and Polish

**Rationale:** Comparison requires multiple cars in the store to test meaningfully, which is why it comes last. It also has the most significant UX design risk (complexity explosion), so it should be designed with real data in hand rather than speculatively.

**Delivers:** Multi-car comparison table (2–4 cars); strictly limited to 5–6 decision-relevant fields; AI summary collapsed to expandable row (not inline); compare enable/disable logic (minimum 2 cars selected); sort and filter on the list view.

**Addresses features:** Side-by-side comparison (P1), filter/sort (P2).

**Avoids pitfalls:** Compare UI complexity explosion (define the 5–6 comparison fields before writing any component code; cap at 4 cars in the store logic from Phase 1; put AI summary in a collapsed row).

**Stack used:** shadcn/ui Dialog or full-page layout for compare; Zustand `compareIds[]` state (already wired in Phase 1).

**Research flag:** Standard patterns — skip research-phase. The comparison grid pattern is well-established.

---

### Phase Ordering Rationale

- **Types and storage first** — the Zustand store and Dexie.js schema are referenced by every other layer. Changing the `CarRecord` shape after components are built is expensive. Front-load this.
- **Extraction pipeline before UI** — the AI extraction is the highest-risk dependency in the project. Validating it early with real marketplace URLs (from a deployed environment, not localhost) surfaces the anti-bot blocking issue before UI work is sunk into it.
- **Core UI before comparison** — comparison requires real data and a working list. It is the most UX-risky feature. Building it last means real data is available to validate the design decisions.
- **No auth, no backend database** — the architecture research confirms single-user + IndexedDB is entirely sufficient. Avoid introducing backend infrastructure at any phase.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (AI Extraction Pipeline):** Real marketplace HTML structures, anti-bot behavior on Blocket/Bytbil/AutoUncle from a deployed server, and Bytbil's SPA rendering requirements cannot be known in advance. Run a live test fetch from a deployed Next.js route and log the raw HTML before writing any AI integration code. Playwright/headless rendering may be required for Bytbil specifically.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Next.js scaffold + Dexie.js + Zustand setup is fully documented with established patterns.
- **Phase 3 (Core UI):** shadcn/ui Sheet, Card, Badge, and form handling are extensively documented.
- **Phase 4 (Comparison):** Grid/table comparison patterns are standard; the design decision (which 5–6 fields to show) is a product choice, not a technical unknown.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16.1 verified via official docs; Vercel AI SDK, Dexie.js, Zustand from training knowledge but all released and stable; Tailwind v4 default in create-next-app confirmed |
| Features | MEDIUM | Feature set derived from PROJECT.md (HIGH) + training knowledge of Swedish marketplace capabilities (MEDIUM); live feature verification of Blocket/Bytbil/AutoUncle not possible during research |
| Architecture | MEDIUM | Route Handler patterns verified via Next.js official docs (HIGH); Zustand persist, Dexie.js integration patterns from training knowledge (MEDIUM); note divergence between ARCHITECTURE.md (localStorage) and STACK.md (Dexie.js) — STACK.md is more robust |
| Pitfalls | MEDIUM | SSRF prevention and Next.js Image domain config are well-documented (HIGH); anti-bot behavior of specific Swedish marketplaces is LOW confidence — requires live testing from deployed server |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Bytbil SPA rendering:** Bytbil is JavaScript-heavy; plain `fetch()` likely returns shell HTML only. Verify with a real deployed test. May require Playwright/headless rendering (`@sparticuz/chromium` for Vercel). Do not assume `fetch()` + AI extraction works for Bytbil until tested.
- **AutoUncle page structure:** Unknown rendering strategy. Test early in Phase 2 — similar risk as Bytbil.
- **Blocket CDN image hostnames:** Multiple CDN subdomains suspected (`img1.blocket.se`, `img2.blocket.se`, etc.). Audit and configure wildcard `remotePatterns` or implement image proxy before Phase 3.
- **AI model selection for extraction:** STACK.md recommends `gpt-4o-mini` for extraction; ARCHITECTURE.md uses Anthropic Claude for everything. The Vercel AI SDK makes switching trivial — test both on real marketplace HTML and choose based on extraction accuracy and cost. Either is valid.
- **Zustand persist vs. manual Dexie.js:** STACK.md recommends Dexie.js for richer structured storage; ARCHITECTURE.md uses localStorage via Zustand persist. For MVP, Zustand `persist` to localStorage is simpler and sufficient (car records are well under the 5MB ceiling). Upgrade to Dexie.js if data volume or query complexity grows. Decide in Phase 1 based on estimated record size.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16.1 official release blog (nextjs.org/blog/next-16-1) — Next.js version, Turbopack, React 19.2, Tailwind v4 integration
- Next.js App Router installation docs (nextjs.org/docs/app/getting-started/installation) — scaffold command, TypeScript/Tailwind defaults
- Next.js Route Handler docs (nextjs.org/docs/app/api-reference/file-conventions/route) — server-side fetch patterns, CORS behavior
- OWASP SSRF guidance — domain allowlist pattern for user-supplied URLs

### Secondary (MEDIUM confidence)
- Tailwind CSS v4 release blog (tailwindcss.com/blog/tailwindcss-v4) — zero-config CSS-first setup
- Vercel AI SDK 4.x — `generateObject`, `generateText`, Zod schema integration (training knowledge; v4 confirmed released Oct 2024)
- Dexie.js 4.x — IndexedDB wrapper, `useLiveQuery`, React 18/19 compatibility (training knowledge; v4 released 2024)
- Zustand 5.x — `persist` middleware, client state management (training knowledge; v5 released late 2024)
- shadcn/ui + Radix UI + Geist — component library, accessibility primitives (training knowledge; actively maintained)
- AutoTrader, CarGurus, AutoUncle feature analysis — used as analogues for feature gap analysis

### Tertiary (LOW confidence)
- Blocket, Bytbil, AutoUncle anti-bot behavior — specific WAF/Cloudflare/DataDome deployment; requires live verification from deployed server
- Marketplace CDN hostname patterns — wildcard subdomain structure for image proxy; requires live audit of each marketplace

---

*Research completed: 2026-02-27*
*Ready for roadmap: yes*
