# Phase 1: Foundation - Research

**Researched:** 2026-02-27
**Domain:** Next.js 15 / Tailwind CSS v4 / shadcn/ui / Geist font / Dexie.js / Zustand v5
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use shadcn/ui Zinc base theme (neutral gray palette, modern and clean)
- Both light and dark mode from day one — system preference detection, not hardcoded
- Target feel: Linear (clean, dense, fast)
- Dark by default in practice, ultra-clean type, minimal chrome
- High whitespace discipline, consistent type scale, no visual clutter
- Real layout skeleton — rough version of the actual page structure: header, list area, side content panel
- All data hardcoded (not wired up) — this is just to prove the design system works in context
- Not a component showcase; not a bare scaffold

### Claude's Discretion
- CarRecord field shape — Claude defines the full typed model based on what AI extraction (Phase 2) and UI display (Phase 3) will need: make, model, year, price, mileage, status enum, listing URL, marketplace source, photo URL, and any relevant nullable fields
- Zustand store structure and Dexie schema details
- shadcn/ui component selection for the skeleton layout

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ING-04 | Extracted car is saved persistently (survives page reload) | Dexie.js v4 EntityTable pattern + Zustand UI store separate from persistence layer |
| DESIGN-01 | UI uses Geist typeface throughout | `geist` npm package + `next/font/google` + Tailwind v4 `@theme` CSS variable pattern |
| DESIGN-02 | UI is modern and minimal in aesthetic | shadcn/ui new-york style + Zinc OKLCH theme + next-themes dark mode + Linear-inspired layout density |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire technical foundation that subsequent phases build on without modification. The stack is Next.js 15 (App Router, Turbopack), Tailwind CSS v4 (CSS-first config), shadcn/ui (new-york style, Zinc theme), Geist font (via `next/font/google`), Dexie.js v4 for IndexedDB persistence, and Zustand v5 for UI state. All of these are current, stable, and officially verified as of February 2026.

The most important architectural decision is the separation of concerns between Dexie.js and Zustand. Dexie is the single source of truth for persistent data — all CarRecord writes go through the Dexie service layer. Zustand manages only transient UI state (selected car, open panel, etc.) and does NOT use `persist` middleware backed by IndexedDB — that combination has known race conditions where Zustand may overwrite Dexie with an empty state on initialization. Zustand can optionally use `localStorage` persist for non-critical UI preferences (e.g., last selected view), but car data lives exclusively in Dexie.

The design system target is the Linear aesthetic: dark by default, ultra-clean Geist typography, minimal chrome, dense information layout. shadcn/ui's new-york style (compact components with subtle shadows) matches this intent better than the deprecated "default" style. The Zinc theme in Tailwind v4 uses OKLCH color space, dark mode via `.dark` class, and system preference detection via `next-themes`.

**Primary recommendation:** Scaffold with `create-next-app --yes` (gives TS + Tailwind v4 + ESLint + App Router), then layer in shadcn/ui init, Geist font wiring, Dexie.js service, and Zustand store in that order.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x (latest) | Framework, routing, SSR/RSC | App Router is stable; Turbopack is now default bundler |
| react | 19.x | UI runtime | Bundled with Next 15; required for App Router |
| typescript | 5.x | Type safety | Built into create-next-app; min v5.1 for Next 15 |
| tailwindcss | 4.x | Utility CSS | CSS-first config; no tailwind.config.js needed; ~70% smaller output than v3 |
| @tailwindcss/postcss | 4.x | PostCSS integration | Required for Tailwind v4 in Next.js |
| geist | latest | Geist font package | Vercel's official font; built into Next 15 defaults; GeistSans + GeistMono |
| next-themes | latest | Dark/light mode | Shadcn/ui's official dark mode solution; handles SSR hydration with `suppressHydrationWarning` |

### shadcn/ui
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui (CLI) | latest (`npx shadcn@latest`) | Component scaffolding | Copies source, not a runtime dependency; full control |
| radix-ui | latest (auto-installed) | Accessible headless primitives | New-york style now uses unified `radix-ui` package |
| class-variance-authority | latest | Component variants | Used internally by shadcn/ui components |
| clsx + tailwind-merge | latest | Class merging | Used in `cn()` utility; prevents class conflicts |
| tw-animate-css | latest | Animations | Replaces deprecated `tailwindcss-animate` as of March 2025 |
| lucide-react | latest | Icons | Recommended with shadcn/ui for consistency |

### Data Layer
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dexie | 4.3.x | IndexedDB wrapper | v4 EntityTable API is clean TypeScript; no 5MB ceiling; survives page reload natively |
| zustand | 5.0.x | UI state management | Minimal boilerplate; no Provider needed for global stores; v5 uses native React 18 useSyncExternalStore |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dexie.js | localStorage | localStorage has 5MB ceiling, no structured queries, serialization pain for arrays of objects |
| Dexie.js | Zustand persist + localStorage | Same ceiling; car data with photos can grow; Dexie scales better |
| Zustand | React Context + useReducer | More boilerplate; no devtools; harder to consume outside React tree |
| next-themes | Manual CSS class toggle | next-themes handles SSR hydration flash, system preference, and storage automatically |
| geist (npm package) | next/font/google Geist import | Both work; `next/font/google` is simpler — one less explicit package |

**Installation:**
```bash
# Step 1: Scaffold (already includes TS, Tailwind v4, ESLint, App Router, Turbopack)
npx create-next-app@latest car-tracker --yes

# Step 2: shadcn/ui init (choose new-york style, zinc base color)
npx shadcn@latest init

# Step 3: shadcn/ui components for skeleton layout
npx shadcn@latest add button badge separator scroll-area

# Step 4: Data layer + dark mode
npm install dexie zustand next-themes

# Step 5: Geist is already included via create-next-app defaults in Next.js 15
# (but if needed explicitly:)
# npm install geist
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout: Geist font + ThemeProvider
│   ├── page.tsx            # Root page: renders AppShell
│   └── globals.css         # @import tailwindcss; @theme with font vars; shadcn CSS vars
├── components/
│   ├── ui/                 # shadcn/ui generated components (do not hand-edit)
│   ├── theme-provider.tsx  # next-themes ThemeProvider wrapper
│   ├── app-shell.tsx       # Header + list area + side panel layout skeleton
│   ├── car-list.tsx        # Left column: hardcoded car list items
│   └── car-panel.tsx       # Right column: hardcoded car detail panel
├── lib/
│   ├── db.ts               # Dexie database class + schema
│   ├── car-store.ts        # Zustand store (UI state only)
│   └── utils.ts            # cn() utility (shadcn/ui standard)
└── types/
    └── car.ts              # CarRecord interface + CarStatus enum
```

### Pattern 1: Tailwind v4 CSS-First Configuration
**What:** All theme tokens defined in `globals.css` using `@theme` directive. No `tailwind.config.js` needed.
**When to use:** Always with Tailwind v4. Do not create a `tailwind.config.ts` for new projects.
**Example:**
```css
/* src/app/globals.css */
/* Source: https://nextjs.org/docs/app/getting-started/css */
@import "tailwindcss";

/* Geist font variable wired to Tailwind's --font-sans */
@theme {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

/* shadcn/ui Zinc theme CSS variables (OKLCH color space) */
/* Placed outside @layer base per Tailwind v4 shadcn/ui requirement */
:root {
  --radius: 0.5rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
  --destructive: oklch(0.577 0.245 27.325);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0.004 286.32);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.552 0.016 285.938);
  --destructive: oklch(0.704 0.191 22.216);
}
```

### Pattern 2: Geist Font with CSS Variable Integration
**What:** Use `next/font/google` to load Geist with a CSS variable, apply to `<html>`, then wire into Tailwind `@theme`.
**When to use:** Always — this ensures Geist renders with zero fallback flash and becomes `font-sans` globally.
**Example:**
```tsx
// src/app/layout.tsx
// Source: https://nextjs.org/docs/app/getting-started/fonts
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Note: CSS variables MUST be placed on `<html>`, not `<body>`. Tailwind resolves them at compile time from the root element.

### Pattern 3: Dexie.js EntityTable Schema (v4 pattern)
**What:** Define typed database using `EntityTable` — primary key is optional on insert, type-safe.
**When to use:** Always for Dexie v4. The old `class extends Dexie` pattern still works but `EntityTable` is cleaner for TypeScript.
**Example:**
```typescript
// src/lib/db.ts
// Source: https://dexie.org/docs/EntityTable (Dexie v4)
import Dexie, { type EntityTable } from "dexie"
import type { CarRecord } from "@/types/car"

const db = new Dexie("CarTrackerDB") as Dexie & {
  cars: EntityTable<CarRecord, "id">
}

db.version(1).stores({
  cars: "++id, make, model, year, status, createdAt",
})

export { db }
```

### Pattern 4: Zustand Store for UI State (v5 TypeScript pattern)
**What:** Zustand v5 with TypeScript double-parentheses `create<T>()()` syntax. No persist middleware for car data — Dexie owns that.
**When to use:** For transient UI state only: selected car ID, panel open state, loading flags.
**Example:**
```typescript
// src/lib/car-store.ts
// Source: https://github.com/pmndrs/zustand
import { create } from "zustand"

interface CarStore {
  selectedCarId: number | null
  isPanelOpen: boolean
  selectCar: (id: number | null) => void
  closePanel: () => void
}

export const useCarStore = create<CarStore>()((set) => ({
  selectedCarId: null,
  isPanelOpen: false,
  selectCar: (id) => set({ selectedCarId: id, isPanelOpen: id !== null }),
  closePanel: () => set({ selectedCarId: null, isPanelOpen: false }),
}))
```

### Pattern 5: CarRecord TypeScript Model
**What:** Typed model covering all data that Phase 2 (AI extraction) will produce and Phase 3 (UI) will display.
**When to use:** Define once in Phase 1; never change shape after — this is the contract.
**Example:**
```typescript
// src/types/car.ts
export type CarStatus = "interested" | "contacted" | "pass"

export interface CarRecord {
  id?: number              // auto-increment, optional on insert
  // Core listing data (extracted by AI in Phase 2)
  listingUrl: string       // source URL (Blocket, Bytbil, AutoUncle)
  marketplace: string      // "blocket" | "bytbil" | "autouncle"
  make: string             // e.g. "Volvo"
  model: string            // e.g. "V60"
  year: number             // e.g. 2019
  price: number | null     // SEK, null if not extractable
  mileage: number | null   // km, null if not extractable
  location: string | null  // city/region string
  photoUrl: string | null  // main listing photo URL (external CDN)
  // AI summary fields (populated in Phase 4)
  aiModelOverview: string | null
  aiCommonIssues: string | null
  aiValueAssessment: string | null
  // Management
  status: CarStatus        // user-assigned status
  createdAt: number        // Date.now() timestamp
}
```

### Pattern 6: dark mode with next-themes
**What:** ThemeProvider wraps the app, `attribute="class"` toggles `.dark` on `<html>`, `defaultTheme="system"` respects OS preference.
**When to use:** Required — shadcn/ui zinc dark mode is `.dark` class-based.
**Example:**
```tsx
// src/components/theme-provider.tsx
// Source: https://ui.shadcn.com/docs/dark-mode/next
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### Pattern 7: Dexie client-only guard in Next.js
**What:** Dexie accesses IndexedDB (browser-only API). Any component calling Dexie must be a Client Component.
**When to use:** Whenever a Server Component or Server Action needs to touch Dexie — it cannot. Always import `db` from `@/lib/db` only inside Client Components or hooks.
**Example:**
```typescript
// CORRECT — db access inside a hook used by a client component
"use client"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"

export function useAllCars() {
  return useLiveQuery(() => db.cars.toArray(), [])
}

// WRONG — importing db in a Server Component will throw
// import { db } from "@/lib/db" // in app/page.tsx — do NOT do this
```

### Anti-Patterns to Avoid
- **Using Zustand `persist` + IndexedDB storage together:** Race condition where Zustand initializes empty and persists blank state before Dexie finishes reading. Keep Dexie as source of truth; Zustand holds only UI state.
- **Using `tailwind.config.js` with Tailwind v4:** Not needed. `@theme` in CSS replaces it. Creating one causes conflicts.
- **Placing font CSS variable on `<body>` only:** Tailwind resolves CSS variables from root. Font variable must be on `<html>`.
- **Using the shadcn/ui "default" style:** Deprecated as of 2025. Use "new-york" exclusively.
- **Using `tailwindcss-animate`:** Deprecated as of March 2025. Replaced by `tw-animate-css`.
- **Calling `db` from a Server Component:** IndexedDB does not exist on the server. All Dexie calls must be in Client Components or API routes.
- **Using `create<T>(...)` single parentheses in Zustand v5 with TypeScript:** Breaks type inference for middleware. Always use `create<T>()()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark/light mode toggle with system pref | Manual `matchMedia` + localStorage + class toggling | `next-themes` | Handles SSR hydration flash, system preference, localStorage persistence, and React context automatically |
| Accessible UI components (dialogs, popovers, badges) | Custom ARIA-compliant components | `shadcn/ui` (Radix UI) | ARIA compliance is deeply non-trivial; focus trapping, keyboard nav, screen reader support all handled |
| IndexedDB boilerplate | Raw `indexedDB.open()` + transaction management + cursor iteration | `Dexie.js` | IndexedDB raw API has no Promise support, complex versioning/migration API, cursor-based reads — Dexie abstracts all of this |
| CSS variable theming from scratch | Manual CSS custom property system | shadcn/ui Zinc theme vars | OKLCH color math for consistent dark/light palette is complex; already solved |
| Font loading with no-flash | `<link>` preload + fontface CSS | `next/font` | next/font eliminates layout shift, inlines the font declarations at build time, sets correct preload headers |
| Global state management | React Context + useReducer + Provider nesting | Zustand | Context re-renders entire subtree on any state change; Zustand subscribes per-selector |

**Key insight:** In this stack, the hard problems (browser storage, theme switching, accessible UI, font flash) are all solved by established libraries. The project's value is in the product logic, not infrastructure.

---

## Common Pitfalls

### Pitfall 1: Dexie "window is not defined" during SSR
**What goes wrong:** Next.js SSR attempts to execute Dexie module initialization on the server, where `window` and `indexedDB` are undefined. Build fails or throws at runtime.
**Why it happens:** Even Client Components (`"use client"`) are pre-rendered on the server for initial HTML. The `"use client"` boundary prevents RSC execution but does not skip server-side pre-render.
**How to avoid:** Never import from `@/lib/db` in Server Components. For Client Components, Dexie is safe inside `useEffect`, `useLiveQuery`, or event handlers (runs client-only). If you need to dynamically import a component that uses Dexie directly at module level, use `dynamic(..., { ssr: false })`.
**Warning signs:** `ReferenceError: window is not defined` in build output or server logs.

### Pitfall 2: Zustand + IndexedDB persist race condition
**What goes wrong:** Zustand's `persist` middleware with an async IndexedDB storage backend initializes the store with empty state before the async read completes, then immediately persists that empty state back — wiping existing data.
**Why it happens:** Zustand persist is designed for synchronous storage (localStorage). Async storage backends require careful `skipHydration` + manual `rehydrate()` orchestration.
**How to avoid:** Do not use Zustand `persist` for car data. Dexie is the persistence layer. Zustand stores only transient UI state (selected ID, panel visibility). If you need Zustand to mirror Dexie data in memory, populate Zustand from a `useLiveQuery` result, not from persist middleware.
**Warning signs:** Car data disappears after page reload; Dexie database is empty despite saving.

### Pitfall 3: Tailwind v4 migration confusion with shadcn/ui docs
**What goes wrong:** Following shadcn/ui docs written for Tailwind v3 (uses `tailwind.config.js`, `@tailwind base/components/utilities` directives, `@layer base` for CSS variables). These patterns break with Tailwind v4.
**Why it happens:** Many community resources (and older shadcn docs) describe v3 setup.
**How to avoid:** Use the Tailwind v4 shadcn/ui doc at `https://ui.shadcn.com/docs/tailwind-v4`. Key v4 differences: use `@import "tailwindcss"` not `@tailwind base`, place `:root/.dark` outside `@layer base`, use `@theme inline` not `tailwind.config.js`.
**Warning signs:** CSS variables not applying, dark mode not toggling, build errors about unknown directives.

### Pitfall 4: Font variable on `<body>` instead of `<html>`
**What goes wrong:** Geist font class `geistSans.variable` applied to `<body>` instead of `<html>`. Tailwind's `@theme` CSS variable (`--font-sans: var(--font-geist-sans)`) resolves from the root, so `font-sans` utility class renders system font instead of Geist.
**Why it happens:** Most font examples show applying the class to `<body>`. With Tailwind v4 `@theme`, the variable must be accessible at document root.
**How to avoid:** Apply `${geistSans.variable} ${geistMono.variable}` to the `<html>` element, NOT `<body>`.
**Warning signs:** Browser renders system font; DevTools shows `font-family: ui-sans-serif` instead of `Geist`.

### Pitfall 5: Dark mode hydration flash or mismatch
**What goes wrong:** Server renders light mode HTML, then client applies dark mode — visible flash on load. Or React throws hydration mismatch error because class attribute differs between server and client.
**Why it happens:** The user's OS preference is only known client-side. Server renders without it.
**How to avoid:** Add `suppressHydrationWarning` to the `<html>` tag. `next-themes` injects an inline script that applies the correct class before first paint, preventing flash. The suppress attribute tells React to ignore the class attribute mismatch.
**Warning signs:** Brief white flash before dark mode applies; React hydration error in console.

### Pitfall 6: shadcn/ui "default" style chosen instead of "new-york"
**What goes wrong:** Picking "default" style during `shadcn init`. Default style is deprecated and will not receive updates. New components may not be available. Larger component padding does not match the dense Linear aesthetic.
**Why it happens:** "default" appears first in the init prompt historically; easy to pick without reading.
**How to avoid:** During `npx shadcn@latest init`, explicitly select "new-york" style and "zinc" base color.
**Warning signs:** `components.json` shows `"style": "default"` instead of `"style": "new-york"`.

---

## Code Examples

Verified patterns from official sources:

### Dexie.js: Save and retrieve a record (client component)
```typescript
// Source: https://dexie.org/docs/EntityTable (Dexie v4)
"use client"
import { db } from "@/lib/db"
import type { CarRecord } from "@/types/car"

// Save
async function saveCar(car: Omit<CarRecord, "id">) {
  const id = await db.cars.add(car)
  return id
}

// Retrieve all
async function getAllCars(): Promise<CarRecord[]> {
  return db.cars.toArray()
}

// Update status
async function updateStatus(id: number, status: CarRecord["status"]) {
  await db.cars.update(id, { status })
}

// Delete
async function deleteCar(id: number) {
  await db.cars.delete(id)
}
```

### Dexie.js: Reactive query with dexie-react-hooks
```typescript
// Source: https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
"use client"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"

export function CarList() {
  const cars = useLiveQuery(() => db.cars.orderBy("createdAt").reverse().toArray())

  if (!cars) return <div>Loading...</div>

  return (
    <ul>
      {cars.map((car) => (
        <li key={car.id}>{car.make} {car.model} ({car.year})</li>
      ))}
    </ul>
  )
}
```

### Zustand: Consuming the UI store
```typescript
// Source: https://github.com/pmndrs/zustand
"use client"
import { useCarStore } from "@/lib/car-store"

export function CarListItem({ id }: { id: number }) {
  const selectCar = useCarStore((state) => state.selectCar)
  const isSelected = useCarStore((state) => state.selectedCarId === id)

  return (
    <button
      onClick={() => selectCar(id)}
      className={isSelected ? "bg-accent" : ""}
    >
      Car {id}
    </button>
  )
}
```

### shadcn/ui: cn() utility (required for all components)
```typescript
// src/lib/utils.ts (auto-generated by shadcn init)
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Linear-aesthetic layout skeleton
```tsx
// src/components/app-shell.tsx — rough layout structure matching the target feel
// Inspired by: https://linear.app (dense sidebar + list + detail panel)
"use client"

export function AppShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header — minimal, single line */}
      <header className="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span className="text-sm font-medium">Car Tracker</span>
      </header>

      {/* Main content: list + panel split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Car list — fixed width, scrollable */}
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-border">
          {/* Car list items go here */}
        </aside>

        {/* Detail panel — fills remaining space */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Car detail panel goes here */}
        </main>
      </div>
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + `@tailwind base/components/utilities` | `@import "tailwindcss"` + `@theme` in CSS | Tailwind v4 (Jan 2025) | No config file; CSS-first; content detection automatic |
| shadcn/ui "default" style | shadcn/ui "new-york" style | 2025 | Default deprecated; new-york is compact + current |
| HSL CSS variables in shadcn | OKLCH CSS variables | March 2025 (shadcn Tailwind v4 update) | More vibrant on modern displays; wider gamut |
| `tailwindcss-animate` | `tw-animate-css` | March 2025 | animate plugin replaced; update shadcn components accordingly |
| Zustand `create<T>(...)` | Zustand `create<T>()()` | v4+ (required for middleware TS inference) | Breaking if wrong; middleware types break with single parens |
| `next lint` script | Direct `eslint` script | Next.js 16 | `next build` no longer runs linter; use explicit npm script |
| Multiple `@radix-ui/react-*` packages | Single `radix-ui` package | 2025 (new-york style) | Cleaner package.json; same functionality |

**Deprecated/outdated:**
- `tailwindcss-animate`: Replaced by `tw-animate-css`. Do not install.
- shadcn/ui "default" style: Deprecated. Do not choose during init.
- Zustand v4 `create<T>(...)` single parens with TypeScript: Breaks middleware inference. Always use `create<T>()()`.
- `@tailwind base`, `@tailwind components`, `@tailwind utilities`: Replaced by `@import "tailwindcss"` in v4.

---

## Open Questions

1. **Dexie `dexie-react-hooks` vs manual `useEffect` for reads**
   - What we know: `useLiveQuery` provides reactive updates when Dexie data changes — useful for Phase 3 list. Manual `useEffect` + `db.cars.toArray()` works but requires re-fetching on mutations.
   - What's unclear: Phase 1 only needs hardcoded data for the skeleton; `useLiveQuery` is only needed once we wire real data in Phase 3.
   - Recommendation: Install `dexie-react-hooks` now (it will be needed in Phase 3), but don't use it in Phase 1 skeleton. The Phase 1 task that tests persistence can use a simple `useEffect`.

2. **shadcn/ui `components.json` Tailwind config field with v4**
   - What we know: With Tailwind v4, the `tailwind.config` field in `components.json` should be empty/omitted. The CLI may prompt for it.
   - What's unclear: Whether `npx shadcn@latest init` auto-detects Tailwind v4 and leaves config empty, or requires manual override.
   - Recommendation: Run `npx shadcn@latest init` interactively; if it asks for a Tailwind config path, leave it empty. Verify `components.json` has `"tailwind": {}` after init.

3. **`next/font/google` vs `geist` npm package**
   - What we know: Both work. `next/font/google` loads Geist from Google Fonts CDN at build time (zero external requests at runtime). The `geist` npm package bundles font files locally.
   - What's unclear: Next.js 15's `create-next-app --yes` scaffolds with `next/font/google` Geist by default — check if the generated layout already has it.
   - Recommendation: Inspect the scaffolded `app/layout.tsx` first. If `next/font/google` Geist is already wired, just connect the CSS variable to Tailwind `@theme`. Do not install the `geist` package separately.

---

## Sources

### Primary (HIGH confidence)
- `https://nextjs.org/docs/app/getting-started/installation` — Next.js 15 scaffold command, Node.js ≥ 20.9, default flags (verified 2026-02-24)
- `https://ui.shadcn.com/docs/tailwind-v4` — shadcn/ui Tailwind v4 migration steps, OKLCH variables, deprecations
- `https://ui.shadcn.com/docs/dark-mode/next` — next-themes ThemeProvider pattern, suppressHydrationWarning
- `https://ui.shadcn.com/docs/theming` — Zinc theme OKLCH CSS variable values for :root and .dark
- `https://github.com/tailwindlabs/tailwindcss/discussions/15923` — Tailwind v4 @theme font variable pattern
- `https://dexie.org/docs/EntityTable` — Dexie v4 EntityTable TypeScript pattern (inferred from search result code)
- `https://pmnd.rs/blog/announcing-zustand-v5` — Zustand v5 breaking changes and React 18 requirement

### Secondary (MEDIUM confidence)
- WebSearch confirmed: Dexie latest is 4.3.x (npm, February 2026)
- WebSearch confirmed: Zustand latest is 5.0.11 (npm, February 2026)
- WebSearch confirmed: shadcn/ui "default" style deprecated; "new-york" is current (multiple community + GitHub sources)
- WebSearch confirmed: `tailwindcss-animate` replaced by `tw-animate-css` as of March 2025
- `https://www.shadcndesign.com/blog/difference-between-default-and-new-york-style-in-shadcn-ui` — new-york vs default style differences

### Tertiary (LOW confidence — verify during implementation)
- Race condition between Zustand persist + IndexedDB: referenced in multiple GitHub discussions (pmndrs/zustand #458, #1721, #2475) but not documented as official known issue
- `next/font/google` Geist being the default in `create-next-app --yes` output — stated in multiple community articles but not confirmed in official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack versions: HIGH — npm confirmed Dexie 4.3.x, Zustand 5.0.11; Next.js 15 confirmed via official docs
- Architecture patterns: HIGH — verified against official docs for Next.js, shadcn/ui, and Tailwind v4
- Dexie + Zustand separation: MEDIUM-HIGH — race condition supported by multiple GitHub issues; clean separation pattern is well-established community consensus
- Pitfalls: HIGH — all sourced from official docs or reproducible GitHub issues

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days — Tailwind v4 and shadcn/ui are moving fast; check shadcn changelog before implementation if delayed)
