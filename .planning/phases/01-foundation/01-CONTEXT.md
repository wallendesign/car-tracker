# Phase 1: Foundation - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A working Next.js project with the full design system (Tailwind CSS v4, Geist font, shadcn/ui), typed CarRecord data model, and persistent storage (Dexie.js + Zustand) — the layer that every subsequent phase builds on without rewriting.

</domain>

<decisions>
## Implementation Decisions

### Design system — theme
- Use shadcn/ui Zinc base theme (neutral gray palette, modern and clean)
- Both light and dark mode from day one — system preference detection, not hardcoded

### Design system — visual aesthetic
- Target feel: Linear (clean, dense, fast)
- Dark by default in practice, ultra-clean type, minimal chrome
- High whitespace discipline, consistent type scale, no visual clutter

### Baseline UI for design system proof
- Real layout skeleton — rough version of the actual page structure: header, list area, side content panel
- All data hardcoded (not wired up) — this is just to prove the design system works in context
- Not a component showcase; not a bare scaffold

### Claude's Discretion
- CarRecord field shape — Claude defines the full typed model based on what AI extraction (Phase 2) and UI display (Phase 3) will need: make, model, year, price, mileage, status enum, listing URL, marketplace source, photo URL, and any relevant nullable fields
- Zustand store structure and Dexie schema details
- shadcn/ui component selection for the skeleton layout

</decisions>

<specifics>
## Specific Ideas

- "I want it to feel like Linear" — dark by default, ultra-clean type, minimal chrome, productivity tool aesthetic
- Real layout skeleton (not a component showcase) so the design system is visible in its actual intended context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-27*
