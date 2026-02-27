---
phase: 01-foundation
plan: 01
subsystem: ui
tags: [nextjs, tailwind, shadcn, geist, next-themes, dexie, zustand, dark-mode, oklch]

# Dependency graph
requires: []
provides:
  - Next.js 16.x project with TypeScript, Tailwind CSS v4, ESLint, App Router, src/ directory layout
  - shadcn/ui initialized (new-york style, Zinc base color) with badge, separator, scroll-area components
  - Geist Sans and Geist Mono font variables wired via next/font/google
  - Tailwind v4 CSS-first @theme config with Zinc OKLCH design tokens for :root and .dark
  - next-themes ThemeProvider for system-preference-based dark/light mode
  - Linear-aesthetic layout shell: fixed header + 320px scrollable sidebar + flexible main panel
  - Hardcoded CarList with 2 placeholder cars and status badges
  - Hardcoded CarPanel with photo placeholder, field grid, and AI summary placeholder
affects:
  - 01-foundation-02 (Dexie schema and Zustand store build on this scaffold)
  - 02-ingestion (API routes will use the same Next.js app structure)
  - 03-ui (real components replace the hardcoded placeholders)

# Tech tracking
tech-stack:
  added:
    - next 16.x (Next.js 15+ series)
    - react 19.x
    - tailwindcss 4.x (CSS-first, no config file)
    - tw-animate-css (replaces tailwindcss-animate)
    - shadcn/ui 3.x (new-york style, zinc base)
    - next-themes 0.4.x
    - dexie 4.x
    - dexie-react-hooks 4.x
    - zustand 5.x
    - class-variance-authority, clsx, tailwind-merge, lucide-react, radix-ui
  patterns:
    - Tailwind v4 CSS-first configuration via @theme inline (no tailwind.config.ts)
    - Zinc OKLCH color tokens for design system (dark/light mode via CSS variables)
    - Font variables on <html> element (not <body>) for correct Tailwind resolution
    - suppressHydrationWarning on <html> to prevent next-themes hydration mismatch
    - ThemeProvider wrapping <body> with attribute="class" defaultTheme="system" enableSystem

key-files:
  created:
    - src/components/theme-provider.tsx
    - src/components/app-shell.tsx
    - src/components/car-list.tsx
    - src/components/car-panel.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/scroll-area.tsx
    - src/lib/utils.ts
    - components.json
  modified:
    - src/app/layout.tsx
    - src/app/globals.css
    - src/app/page.tsx
    - package.json

key-decisions:
  - "Used --base-color zinc flag with shadcn init to set Zinc base color non-interactively (new-york style selected automatically)"
  - "Scaffolded in temp directory due to create-next-app conflict with existing .planning/ and .claude/ dirs, then copied files"
  - "Kept shadcn-generated globals.css OKLCH Zinc tokens (matching plan spec exactly) and reformatted to use plain CSS base styles instead of @layer base with @apply"
  - "Font variables placed on <html> element per Tailwind v4 requirement — resolves @theme CSS vars from document root"

patterns-established:
  - "Tailwind v4 pattern: CSS-first config via @theme inline, never tailwind.config.ts"
  - "shadcn/ui pattern: components added via CLI (npx shadcn@latest add), not manual creation"
  - "Dark mode pattern: next-themes ThemeProvider with attribute=class, system default — never hardcode dark"
  - "Font pattern: Geist via next/font/google with CSS variable output, applied to <html> className"

requirements-completed: [DESIGN-01, DESIGN-02]

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 1 Plan 01: Foundation Scaffold Summary

**Next.js 16 app with Tailwind v4 CSS-first config, Geist font, Zinc OKLCH dark/light theme via next-themes, shadcn/ui (new-york/zinc), and a Linear-aesthetic shell layout with hardcoded car placeholders**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T14:38:19Z
- **Completed:** 2026-02-27T14:42:28Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Fully working Next.js project with Tailwind v4 CSS-first design system using Zinc OKLCH tokens
- Geist Sans/Mono fonts wired via next/font/google with variables on `<html>` for correct Tailwind resolution
- System-preference dark/light mode with next-themes ThemeProvider, zero hydration warnings
- Linear-aesthetic layout shell: 40px header, 320px scrollable sidebar, flexible scrollable main panel
- 2 hardcoded car list items (Volvo V60, BMW 320d) with status badges; detail panel with photo placeholder and AI summary placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15 project and install design system dependencies** - `affc195` (chore)
2. **Task 2: Wire Geist font, Tailwind v4 theme, dark mode, and root layout** - `aabbeea` (feat)
3. **Task 3: Build Linear-aesthetic layout skeleton with hardcoded placeholder content** - `e2675c7` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/app/layout.tsx` - Root layout with Geist font vars on `<html>`, suppressHydrationWarning, ThemeProvider wrapping body
- `src/app/globals.css` - Tailwind v4 @import, @theme inline with Zinc OKLCH vars, :root and .dark design tokens
- `src/app/page.tsx` - Root page rendering AppShell
- `src/components/theme-provider.tsx` - next-themes ThemeProvider wrapper component
- `src/components/app-shell.tsx` - Linear-style layout: fixed header + scrollable sidebar + main panel
- `src/components/car-list.tsx` - Hardcoded 2-item car list with shadcn/ui Badge for status
- `src/components/car-panel.tsx` - Hardcoded car detail panel with photo placeholder, field grid, AI summary placeholder
- `src/components/ui/badge.tsx` - shadcn/ui Badge component (new-york style)
- `src/components/ui/separator.tsx` - shadcn/ui Separator component
- `src/components/ui/scroll-area.tsx` - shadcn/ui ScrollArea component
- `src/lib/utils.ts` - shadcn/ui cn() utility (clsx + tailwind-merge)
- `components.json` - shadcn/ui config: style=new-york, baseColor=zinc, cssVariables=true
- `package.json` - All dependencies including dexie 4.x, zustand 5.x, next-themes

## Decisions Made
- Scaffolded Next.js in a temp directory first to avoid conflict with existing `.planning/` and `.claude/` directories, then copied files to the project root
- Used `--base-color zinc` flag with `npx shadcn@latest init` for non-interactive initialization (new-york style picked automatically)
- Kept globals.css font vars in `@theme inline` with full fallback stack (`ui-sans-serif, system-ui, sans-serif`) per plan spec
- Node_modules reinstalled fresh after file copy to fix corrupted binary symlinks from the copy operation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scaffolded in temp directory to bypass create-next-app conflict**
- **Found during:** Task 1 (scaffold step)
- **Issue:** `create-next-app` refuses to run in a directory containing existing files (`.planning/`, `.claude/`) with "Either try using a new directory name, or remove the files listed above"
- **Fix:** Scaffolded in `/tmp-portfolio` sibling directory, then copied all files to the project root. Removed temp directory. Reinstalled node_modules fresh to fix binary symlinks broken by the copy.
- **Files modified:** All Next.js scaffold files copied to project root
- **Verification:** `npm run build` succeeded after fresh `npm install`
- **Committed in:** affc195 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — scaffolding workaround)
**Impact on plan:** Workaround necessary due to create-next-app refusing to scaffold in non-empty directories. No scope creep, all planned files produced.

## Issues Encountered
- `create-next-app` blocked by existing `.planning/` and `.claude/` directories — resolved by scaffolding in sibling temp directory and copying files
- Node module binary symlinks broken after directory copy — resolved by reinstalling dependencies fresh with `npm install`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full design system established: Tailwind v4 + shadcn/ui + Geist font + Zinc OKLCH tokens
- ThemeProvider and dark/light mode working
- Layout shell ready for real data wiring in Plan 02 (Dexie + Zustand) and Phase 2 (URL ingestion)
- `npm run build` exits 0, ready for Phase 1 Plan 02 execution

## Self-Check: PASSED

All critical files verified present on disk:
- src/app/layout.tsx: FOUND
- src/app/globals.css: FOUND
- src/app/page.tsx: FOUND
- src/components/theme-provider.tsx: FOUND
- src/components/app-shell.tsx: FOUND
- src/components/car-list.tsx: FOUND
- src/components/car-panel.tsx: FOUND
- components.json: FOUND
- .planning/phases/01-foundation/01-01-SUMMARY.md: FOUND

All task commits verified in git history:
- affc195 (Task 1): FOUND
- aabbeea (Task 2): FOUND
- e2675c7 (Task 3): FOUND

---
*Phase: 01-foundation*
*Completed: 2026-02-27*
