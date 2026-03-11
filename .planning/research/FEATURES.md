# Feature Research

**Domain:** Single-user car listing tracker / used car research tool (Swedish marketplaces)
**Researched:** 2026-02-27
**Confidence:** MEDIUM — web access unavailable; findings drawn from training knowledge of Blocket, Bytbil, AutoUncle, and comparable products (AutoTrader, CarGurus, Cars.com, Motorway). Flag for live verification before implementation.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add car by URL | Core concept of the product — one action to capture a listing | LOW | Paste URL, trigger AI extraction; no manual form needed |
| Persistent car list | Users need to return later; volatile state is broken | LOW | Local storage or DB-backed; must survive page reload |
| Display key stats per car | Price, year, mileage, location are the four numbers buyers compare first | LOW | Shown in list row; sourced from AI extraction |
| Listing thumbnail/photo | Visual recognition; users remember cars by photo not model name | LOW | Display first listing photo in list row and detail panel |
| Detail view per car | Clicking a car must show all extracted data + AI summary | MEDIUM | Side panel pattern (PROJECT.md specifies this); avoid full-page navigation |
| Remove car from list | List management is expected; no way to delete = frustrating | LOW | Soft delete or hard delete; no confirmation dialog needed for single-user |
| Status tagging | Users mentally categorize listings; externalizing this is core workflow | LOW | Interested / Contacted / Pass — PROJECT.md specifies exactly these three |
| Side-by-side comparison | Primary research action when narrowing to 2-3 finalists | MEDIUM | Select multiple cars, render comparison table of extracted fields |
| AI-generated summary | The core differentiator that PROJECT.md bets on; expected as the main value prop | HIGH | Model overview, common issues/recalls, price fairness assessment |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by convention, but valuable for this tool's thesis.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI value assessment ("Is this price fair?") | Buyers don't know market rates; a clear verdict replaces hours of Googling | HIGH | Requires AI to reason about current Swedish used car pricing; prompt engineering needed to produce a calibrated verdict rather than hedging |
| Common issues / recall summary | Buyers fear buying a lemon; surfacing known reliability problems per model+year builds trust | MEDIUM | AI knowledge of model-specific issues; caveat that info may be stale — add disclaimer in UI |
| Multi-marketplace ingestion | Blocket, Bytbil, AutoUncle have different page structures; handling all three from one input is genuinely useful | MEDIUM | AI URL reading is marketplace-agnostic; test all three during build |
| Status workflow (Interested / Contacted / Pass) | Most tools show listings; none help manage the funnel | LOW | Simple enum field; color-coded badge per status in list row |
| Zero data entry | Competitors (spreadsheets, Notion) require manual entry; paste URL = done | HIGH | Depends entirely on reliable AI extraction; this is the make-or-break feature |
| Persistent across sessions | Browser-tab tools lose state; this survives device/session change | LOW | DB-backed persistence rather than localStorage |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Saved search / alert on new listings | "Notify me when a matching car appears" seems natural | Requires polling Swedish marketplaces continuously, which violates their ToS and requires background job infrastructure; out of scope for a passive research tool | Out of scope v1; if wanted later, use a separate cron job that the user triggers manually |
| Price history chart | Buyers want to see if price dropped | Requires scraping the same listing repeatedly over time, storing versioned price snapshots — significant infrastructure for a personal tool | Show current price clearly; note in AI summary if price seems above/below average |
| Automated listing refresh | "Re-check this listing for changes" | Same scraping/polling problem; listings get removed without notice on Blocket; stale data is worse than no data | User re-pastes URL if they need a refresh; or manual "refresh" button that re-runs AI extraction on demand |
| Notes per car | "I want to add my own comments" | PROJECT.md explicitly excludes this; the AI summary is intended to replace personal notes | AI summary should be comprehensive enough; status tagging covers categorical decisions |
| User accounts / multi-user | "Share this list with my partner" | Auth complexity out of scope; a personal tool should stay personal | Single-user, no auth; if sharing is needed, export to CSV/PDF |
| Browser extension | "Auto-capture listings as I browse" | Extension development is a separate product track with review/approval overhead; very different tech from web app | URL paste workflow is the designed interaction; it's intentional friction that ensures deliberate curation |
| Email/push notifications | "Alert me about my saved cars" | No backend push infrastructure in a minimal single-user app | Status tagging is the notification system — user checks the list |
| Bulk import from CSV/spreadsheet | Power users want to migrate existing data | Significant data mapping complexity; this tool's value is AI extraction, not data management | Not needed if zero data entry is the value prop |

---

## Feature Dependencies

```
[URL Input]
    └──requires──> [AI Extraction Engine]
                       └──requires──> [LLM Integration (OpenAI / Anthropic)]
                       └──produces──> [Car Record (price, year, mileage, location, photo)]
                       └──produces──> [AI Summary (model overview, issues, value verdict)]

[Car List View]
    └──requires──> [Persistent Storage]
    └──requires──> [Car Record]
    └──enhances──> [Status Tagging]
    └──enhances──> [Listing Photo Display]

[Detail Side Panel]
    └──requires──> [Car Record]
    └──requires──> [AI Summary]
    └──enhances──> [Status Tagging]

[Comparison View]
    └──requires──> [Car Record] (2+ records)
    └──enhances──> [AI Summary] (shown per car in comparison columns)

[Status Tagging]
    └──requires──> [Persistent Storage]
    └──enhances──> [Car List View] (filter or sort by status)

[Remove Car]
    └──requires──> [Persistent Storage]
```

### Dependency Notes

- **URL Input requires AI Extraction Engine:** The entire product is gated on reliable AI extraction. If extraction is unreliable for any marketplace, the product breaks. This is the highest-risk dependency.
- **Comparison View requires Car Record (2+):** Comparison is only useful after the user has added at least two cars. Build list first, comparison second.
- **Status Tagging requires Persistent Storage:** Tagging is meaningless if it resets on reload. DB-backed storage must precede status tagging in the build sequence.
- **AI Summary enhances Comparison View:** Showing the AI summary per car in comparison columns multiplies the value of comparison; implement this enhancement after basic field comparison works.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] URL input field — triggers AI extraction from Blocket, Bytbil, or AutoUncle URL
- [ ] AI extraction of: price, year, mileage, location, first photo URL
- [ ] AI summary: model overview, known issues, price fairness verdict
- [ ] Persistent car list — survives page reload
- [ ] List row shows: photo thumbnail, make/model/year, price, mileage, status badge
- [ ] Detail side panel — opens on row click; shows all fields + full AI summary
- [ ] Status tagging — Interested / Contacted / Pass — toggled from list or side panel
- [ ] Remove car — button in side panel or list row
- [ ] Side-by-side comparison — select 2-4 cars, render comparison table of key fields

### Add After Validation (v1.x)

Features to add once core is working and extraction is reliable.

- [ ] Manual refresh of an existing listing — re-run AI extraction on demand (trigger: user wants to check if listing is still live or price changed)
- [ ] Filter list by status — (trigger: list grows beyond ~10 cars and becomes unwieldy)
- [ ] Sort list by price / mileage / year — (trigger: comparison becomes the primary workflow)
- [ ] AI summary includes link to official model recall database (Transportstyrelsen) — (trigger: reliability research is a clear user pattern)

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Export to CSV / PDF — defer until user expresses need to share or archive
- [ ] Notes per car — PROJECT.md out of scope; only add if AI summary proves insufficient
- [ ] Price history tracking — requires polling infrastructure; only if persistence proves reliable first
- [ ] Additional marketplaces (Kvdbil, Wayke) — defer until v1 marketplaces are stable

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| URL input + AI extraction | HIGH | HIGH | P1 |
| AI summary (issues + value verdict) | HIGH | HIGH | P1 |
| Persistent car list | HIGH | LOW | P1 |
| List photo + key stats display | HIGH | LOW | P1 |
| Status tagging | HIGH | LOW | P1 |
| Detail side panel | HIGH | MEDIUM | P1 |
| Remove car | MEDIUM | LOW | P1 |
| Side-by-side comparison | HIGH | MEDIUM | P1 |
| Filter/sort list | MEDIUM | LOW | P2 |
| Manual listing refresh | MEDIUM | LOW | P2 |
| Recall database links | MEDIUM | LOW | P2 |
| Export CSV/PDF | LOW | MEDIUM | P3 |
| Price history chart | LOW | HIGH | P3 |
| Saved searches / alerts | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Confidence: MEDIUM — based on training knowledge; live verification recommended.

| Feature | Blocket (native) | AutoUncle | CarGurus (US analog) | Our Approach |
|---------|-----------------|-----------|----------------------|--------------|
| Saved search alerts | Yes (email) | Yes | Yes | Anti-feature — out of scope v1 |
| Favourites / watchlist | Yes (account required) | Yes (account required) | Yes (account required) | Yes — no account needed; local persistence |
| Price analysis / fairness | No | Yes (AutoUncle's core feature: price rating) | Yes (CarGurus deal rating) | Yes — AI verdict; more opinionated than a rating scale |
| Model reliability info | No | Partial (aggregated reviews) | Partial (user reviews) | Yes — AI summary of known issues; more concise |
| Comparison tool | No | Partial | No | Yes — multi-car side-by-side table |
| Notes per car | No | No | No | No — out of scope; AI summary is sufficient |
| Mobile app | Yes | Yes | Yes | No — web-first per PROJECT.md |
| Multi-marketplace aggregation | No | Yes (aggregates) | N/A (US only) | Yes — Blocket, Bytbil, AutoUncle |
| AI-generated summary | No | No | No | Yes — core differentiator |

### Key Observation

AutoUncle already provides a "price rating" for Swedish listings and aggregates across marketplaces. Our differentiator is not aggregation or price scoring — it's the AI-generated narrative summary (model overview, reliability, value verdict in prose) and the personal research workspace (track, tag, compare your shortlisted cars). AutoUncle is a search tool; this app is a research and decision tool.

---

## Sources

- PROJECT.md — primary specification (project description, requirements, out-of-scope decisions)
- Training knowledge of Blocket.se, Bytbil.com, AutoUncle.se feature sets (MEDIUM confidence — verify live)
- Training knowledge of CarGurus, AutoTrader feature patterns used as analogs (MEDIUM confidence)
- Training knowledge of personal productivity / saved search tool patterns (MEDIUM confidence)

---

*Feature research for: Single-user car listing tracker / used car research tool (Swedish marketplaces)*
*Researched: 2026-02-27*
