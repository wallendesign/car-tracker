# Architecture Research

**Domain:** Single-user AI-powered second-hand car listing tracker
**Researched:** 2026-02-27
**Confidence:** MEDIUM (Next.js Route Handler patterns verified via official docs; Claude API integration, persistence, and UI layout patterns from training knowledge with high applicability)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Next.js App)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  CarList     │  │  SidePanel   │  │  CompareView      │  │
│  │  (left pane) │  │  (right pane)│  │  (overlay/modal)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│  ┌──────┴─────────────────┴────────────────────┴──────────┐  │
│  │               React State / Zustand Store               │  │
│  └──────────────────────────┬──────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────┴──────────────────────────────┐  │
│  │                  Client-Side Services                    │  │
│  │  carService.ts  │  storageService.ts  │  formatters.ts  │  │
│  └──────────────────────────┬──────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTP (same origin — no CORS)
┌─────────────────────────────┼───────────────────────────────┐
│              Next.js API Routes (Route Handlers)             │
├─────────────────────────────┼───────────────────────────────┤
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │  POST /api/fetch-listing                             │   │
│  │  1. Receive URL from client                          │   │
│  │  2. fetch() external marketplace URL (server-side)   │   │
│  │  3. Extract relevant HTML / text                     │   │
│  │  4. Return raw content to client                     │   │
│  └───────────────────────────┬──────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────┴──────────────────────────┐   │
│  │  POST /api/analyze-listing                           │   │
│  │  1. Receive raw HTML/text + URL                      │   │
│  │  2. Call Anthropic Claude API                        │   │
│  │  3. Return structured JSON (price, mileage, etc.)    │   │
│  │  4. Return AI summary (model info, issues, value)    │   │
│  └───────────────────────────┬──────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────┐
│                     External Services                         │
├─────────────────────────────┼───────────────────────────────┤
│  ┌──────────────┐           │          ┌──────────────────┐  │
│  │  Blocket     │           │          │  Anthropic API   │  │
│  │  Bytbil      │◄──fetch───┘          │  (Claude model)  │  │
│  │  AutoUncle   │                      └──────────────────┘  │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘

Persistence:
┌─────────────────────────────────────────────────────────────┐
│                     localStorage (browser)                   │
│  Key: "car-tracker-cars"  →  JSON array of CarRecord        │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| CarList | Displays saved cars as cards; handles selection for side panel; handles multi-select for compare | React Store, SidePanel, CompareView |
| SidePanel | Shows full detail of selected car: photo, extracted fields, AI summary, status tag | React Store |
| CompareView | Renders 2-4 cars in column grid for side-by-side comparison; triggered from CarList | React Store |
| AddCarForm | Accepts URL paste, triggers fetch+analyze flow, shows loading state | API layer (POST /api/fetch-listing then POST /api/analyze-listing) |
| React Store (Zustand) | Single source of truth for cars array, selected car ID, compare selection set, loading/error state | All UI components |
| storageService | Reads/writes car data to localStorage; hydrates store on boot | React Store |
| POST /api/fetch-listing | Server-side proxy: receives listing URL, fetches external page, returns HTML/text content | External marketplaces (Blocket, Bytbil, AutoUncle) |
| POST /api/analyze-listing | Sends fetched HTML to Claude API with structured extraction prompt; returns typed JSON + summary string | Anthropic Claude API |

## Recommended Project Structure

```
src/
├── app/
│   ├── page.tsx               # Main layout: CarList + SidePanel
│   ├── layout.tsx             # Root layout, Geist font setup
│   └── api/
│       ├── fetch-listing/
│       │   └── route.ts       # Proxy: fetches external listing URL
│       └── analyze-listing/
│           └── route.ts       # AI: sends content to Claude, returns structured data
├── components/
│   ├── CarList/
│   │   ├── CarList.tsx        # List container
│   │   ├── CarCard.tsx        # Individual car card
│   │   └── AddCarForm.tsx     # URL input + submit
│   ├── SidePanel/
│   │   ├── SidePanel.tsx      # Panel wrapper (right column or drawer)
│   │   ├── CarDetail.tsx      # Full details view
│   │   └── StatusBadge.tsx    # Interested / Contacted / Pass
│   ├── CompareView/
│   │   ├── CompareView.tsx    # Full-screen or modal compare layout
│   │   └── CompareColumn.tsx  # Per-car column
│   └── ui/
│       ├── Button.tsx
│       ├── Spinner.tsx
│       └── EmptyState.tsx
├── store/
│   └── carStore.ts            # Zustand store: cars[], selectedId, compareIds[], status
├── services/
│   ├── storageService.ts      # localStorage read/write/hydrate
│   ├── listingService.ts      # Client: calls /api/fetch-listing and /api/analyze-listing
│   └── formatters.ts          # Price formatting, mileage display, date helpers
├── types/
│   └── car.ts                 # CarRecord, ListingData, AIAnalysis types
└── lib/
    └── anthropic.ts           # Anthropic SDK client (server-only, used by route handlers)
```

### Structure Rationale

- **app/api/**: Route Handlers run server-side, giving access to secrets (ANTHROPIC_API_KEY) and bypassing CORS entirely. The two-step split (fetch then analyze) keeps each handler single-responsibility and makes error handling granular.
- **store/**: Zustand keeps the entire UI synchronized from one source. No prop drilling. Components subscribe to slices they need.
- **services/**: Pure functions with no UI coupling. storageService owns localStorage exclusively — no component writes directly to storage.
- **types/**: Shared TypeScript types ensure the AI response shape is enforced across route handler and client.
- **lib/**: Server-only SDK instance. Never imported from client code (enforced by keeping it outside `app/` components).

## Architectural Patterns

### Pattern 1: Two-Step Fetch-then-Analyze Pipeline

**What:** Separate the URL fetch (I/O-bound, potentially slow, may fail for anti-scraping reasons) from the AI analysis (expensive, billing-critical). Two distinct API routes, called sequentially from the client.

**When to use:** Always — for this app. Allows independent retry of each step. Shows granular loading states ("Fetching listing..." vs "Analyzing with AI...").

**Trade-offs:** Two round trips to server instead of one. Acceptable for an add-car flow that is not latency-sensitive.

**Example:**

```typescript
// services/listingService.ts
export async function addCarFromUrl(url: string): Promise<CarRecord> {
  // Step 1: Server-side fetch (bypasses CORS)
  const fetchRes = await fetch('/api/fetch-listing', {
    method: 'POST',
    body: JSON.stringify({ url }),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!fetchRes.ok) throw new Error('Could not fetch listing page')
  const { html } = await fetchRes.json()

  // Step 2: AI extraction
  const analyzeRes = await fetch('/api/analyze-listing', {
    method: 'POST',
    body: JSON.stringify({ url, html }),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!analyzeRes.ok) throw new Error('AI analysis failed')
  return analyzeRes.json() // Returns CarRecord shape
}
```

### Pattern 2: Server-Side Proxy for CORS Bypass

**What:** Browser cannot directly fetch external marketplace pages (CORS + no-CORS mode blocks readable responses). A Next.js Route Handler runs on the server, calls `fetch()` without CORS restrictions, and returns the HTML to the client.

**When to use:** Any time the app needs to read content from a third-party domain the browser cannot access directly.

**Trade-offs:** Adds server-side processing. Marketplaces may detect and block server-side scrapers by user-agent or rate limiting. Mitigation: set a realistic `User-Agent` header; handle 403/429 gracefully with informative errors.

**Example:**

```typescript
// app/api/fetch-listing/route.ts
export async function POST(request: Request) {
  const { url } = await request.json()

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CarTracker/1.0)',
      'Accept-Language': 'sv-SE,sv;q=0.9',
    },
  })

  if (!response.ok) {
    return Response.json(
      { error: `Marketplace returned ${response.status}` },
      { status: 502 }
    )
  }

  const html = await response.text()
  // Optionally trim: strip <script>/<style> tags to reduce token count before sending to Claude
  return Response.json({ html })
}
```

### Pattern 3: Structured Extraction Prompt for AI

**What:** Send the fetched HTML to Claude with a prompt that requests a typed JSON response. Use a schema defined in TypeScript and reflected in the prompt to ensure consistent output.

**When to use:** Always when calling Claude for data extraction (vs. open-ended generation). Structured output means the client can parse without guessing.

**Trade-offs:** Prompt engineering requires iteration. Claude may return partial data if the page is unusual. Handle missing fields gracefully with fallback nulls.

**Example:**

```typescript
// app/api/analyze-listing/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { ListingExtractionSchema } from '@/types/car'

const client = new Anthropic() // Uses ANTHROPIC_API_KEY from env

export async function POST(request: Request) {
  const { url, html } = await request.json()

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are analyzing a Swedish second-hand car listing page.
Extract the following fields from the HTML and respond ONLY with valid JSON:
{
  "make": string,
  "model": string,
  "year": number | null,
  "price_sek": number | null,
  "mileage_km": number | null,
  "location": string | null,
  "main_photo_url": string | null,
  "summary": string  // 2-3 sentences: model overview, common issues, price assessment
}

Listing URL: ${url}

Page HTML:
${html.slice(0, 80000)}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const data = JSON.parse(text)
  return Response.json(data)
}
```

### Pattern 4: localStorage for Single-User Persistence

**What:** Persist the cars array as a JSON string in `localStorage` under a single key. Zustand store hydrates from localStorage on mount and writes back on every state change.

**When to use:** Single-user apps with fewer than ~100 records and records under ~50KB each. For this app, a car record (fields + AI summary + photo URL) is well under 10KB. 100 cars = ~1MB, far below the ~5MB localStorage limit.

**Trade-offs:** Data is browser-local and not synced across devices. Acceptable per project scope (single user, no backend). If data grows, IndexedDB is the upgrade path but adds significant complexity for no current benefit.

**Example:**

```typescript
// services/storageService.ts
const STORAGE_KEY = 'car-tracker-cars'

export function loadCars(): CarRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCars(cars: CarRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cars))
}

// store/carStore.ts (Zustand with persistence)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCarStore = create(
  persist(
    (set) => ({
      cars: [] as CarRecord[],
      selectedId: null as string | null,
      compareIds: [] as string[],
      addCar: (car: CarRecord) => set((s) => ({ cars: [car, ...s.cars] })),
      selectCar: (id: string | null) => set({ selectedId: id }),
      toggleCompare: (id: string) =>
        set((s) => ({
          compareIds: s.compareIds.includes(id)
            ? s.compareIds.filter((c) => c !== id)
            : [...s.compareIds.slice(-3), id], // max 4
        })),
      updateStatus: (id: string, status: CarStatus) =>
        set((s) => ({
          cars: s.cars.map((c) => (c.id === id ? { ...c, status } : c)),
        })),
    }),
    { name: 'car-tracker-cars' }
  )
)
```

## Data Flow

### Add Car Flow (primary user journey)

```
User pastes URL into AddCarForm
    ↓
listingService.addCarFromUrl(url) called
    ↓
POST /api/fetch-listing  →  external marketplace fetch (server-side)
    ↓ html string
POST /api/analyze-listing  →  Anthropic Claude API
    ↓ CarRecord JSON
useCarStore.addCar(record)  →  Zustand state update
    ↓ (zustand/persist middleware)
localStorage.setItem("car-tracker-cars", JSON.stringify(cars))
    ↓
React re-render  →  CarList shows new card
```

### View Car Flow

```
User clicks CarCard in CarList
    ↓
useCarStore.selectCar(id)
    ↓
SidePanel reads useCarStore.selectedId
    ↓
SidePanel renders CarDetail with full data
(No API calls — all data already in store)
```

### Compare Flow

```
User checks multiple CarCards (up to 4)
    ↓
useCarStore.toggleCompare(id) for each
    ↓
User clicks "Compare" button
    ↓
CompareView renders, reads compareIds from store
    ↓
CompareView maps ids to car records and renders columns
(No API calls — all data already in store)
```

### State Management

```
localStorage (boot)
    ↓ hydrate (zustand/persist)
Zustand Store [cars, selectedId, compareIds, status]
    ↓ subscribe
CarList ←→ addCar action
SidePanel ←→ selectCar action, updateStatus action
CompareView ←→ toggleCompare action
```

## Scaling Considerations

This is a single-user tool. Scaling is not a concern. The table below covers the only relevant range.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user, <100 cars | Current architecture — localStorage, no backend, no auth. Appropriate. |
| 1 user, 100-500 cars | localStorage still works (JSON <5MB). Consider adding a delete/archive feature. |
| Multi-user (out of scope v1) | Replace localStorage with a database (SQLite/Postgres via Prisma); add auth (NextAuth or Clerk); move car data behind user-scoped API routes. Full rewrite of persistence layer. |

### Scaling Priorities

1. **First bottleneck:** AI API cost and latency. Each add-car call makes a Claude API request that can cost $0.01-0.05 and take 5-15 seconds. Mitigation: show streaming progress, cache results (already done via localStorage — re-analyzing the same URL is prevented by checking for duplicates).
2. **Second bottleneck:** Marketplace blocking. Blocket and Bytbil may rate-limit or block the server-side fetcher. Mitigation: respectful User-Agent headers, handle 429/403 with clear user-facing messages.

## Anti-Patterns

### Anti-Pattern 1: Fetching External URLs from the Browser

**What people do:** Call `fetch('https://www.blocket.se/...')` directly from a React component or client service.

**Why it's wrong:** Browsers enforce CORS. External sites do not set `Access-Control-Allow-Origin: *`. The fetch will succeed in no-CORS mode but the response body is opaque (unreadable). The listing data is inaccessible.

**Do this instead:** Always proxy through a Next.js Route Handler (`POST /api/fetch-listing`). The server-side `fetch()` has no CORS restrictions.

### Anti-Pattern 2: Exposing the Anthropic API Key to the Client

**What people do:** Import `@anthropic-ai/sdk` in a React component or client-side service, passing the API key via an environment variable prefixed `NEXT_PUBLIC_`.

**Why it's wrong:** The API key becomes visible in the browser's network tab and JavaScript bundle. Any visitor can steal it and run up API charges.

**Do this instead:** Call Claude only from a Route Handler (server-side). Keep the key in `.env.local` as `ANTHROPIC_API_KEY` (no `NEXT_PUBLIC_` prefix). Next.js never exposes unprefixed env vars to the browser.

### Anti-Pattern 3: Sending Full Raw HTML to Claude Without Trimming

**What people do:** Pass the entire HTML response (including all `<script>`, `<style>`, navigation, footer content) to Claude.

**Why it's wrong:** Blocket pages can be 200KB+ of HTML. Claude's context window is not the constraint — token cost and latency are. Sending 150K tokens of irrelevant JavaScript wastes money and slows response time.

**Do this instead:** Strip `<script>` and `<style>` tags server-side before forwarding to Claude. A simple regex or `node-html-parser` parse cuts content by 60-80%. Optionally extract only the main content region by targeting known CSS selectors.

### Anti-Pattern 4: Writing to localStorage Directly from Components

**What people do:** Call `localStorage.setItem(...)` inside a React component's event handler or `useEffect`.

**Why it's wrong:** Creates hidden coupling between components and storage. Makes testing hard. Causes hydration mismatches in Next.js (server has no localStorage). Multiple components writing independently can cause race conditions.

**Do this instead:** All localStorage access goes through `storageService.ts`. All state changes go through Zustand actions. Use Zustand's `persist` middleware, which handles storage writes automatically after state updates.

### Anti-Pattern 5: Collapsing Fetch + Analyze into One Route Handler

**What people do:** Create a single `POST /api/add-car` that fetches the URL and calls Claude in sequence, returning only on full completion.

**Why it's wrong:** Total time is 10-20 seconds. The client sees a loading spinner with no feedback. If the fetch succeeds but Claude fails, the entire operation is lost and must retry from the beginning.

**Do this instead:** Two route handlers, sequential calls from the client. Client shows step-specific states: "Fetching listing..." → "Analyzing with AI..." → "Done." Each step can fail and retry independently.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Blocket (blocket.se) | Server-side fetch from Route Handler | May require Swedish-locale headers; expect occasional 403 |
| Bytbil (bytbil.com) | Server-side fetch from Route Handler | JavaScript-heavy SPA — static HTML may be minimal; Claude handles ambiguity |
| AutoUncle (autouncle.se) | Server-side fetch from Route Handler | Similar to Bytbil; test early in development |
| Anthropic Claude API | SDK call from Route Handler, ANTHROPIC_API_KEY in server env | Use `claude-opus-4-5` or `claude-sonnet-4-5` model; structured JSON prompt |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI components ↔ Zustand store | Direct hook calls (`useCarStore()`) | Components never import storageService |
| Zustand store ↔ localStorage | Zustand `persist` middleware | Automatic; no manual wiring needed |
| Client services ↔ API routes | HTTP POST with JSON body | Same-origin, no CORS headers needed |
| API routes ↔ Anthropic SDK | `@anthropic-ai/sdk` (server-only) | Never imported in `app/` components |
| API routes ↔ External URLs | Node.js `fetch()` | No CORS constraints server-side |

## Build Order Implications

The architectural dependencies dictate this build sequence:

1. **Types first** (`types/car.ts`) — CarRecord shape is referenced by store, services, and components. Define it before anything else.
2. **Storage + Store** (`storageService.ts`, `carStore.ts`) — Foundation for all UI components. Build and test persistence in isolation.
3. **API Route: fetch-listing** — Standalone proxy, no AI dependency. Validates that external marketplace fetching works before involving Claude.
4. **API Route: analyze-listing** — Depends on knowing what HTML arrives from step 3. Build and test with real HTML samples.
5. **listingService** — Client wrapper that orchestrates the two API calls. Now both routes exist to test against.
6. **CarList + AddCarForm** — Core UI. Wires listingService to store.
7. **SidePanel** — Reads from store only. No API calls. Simple once store is working.
8. **CompareView** — Last because it depends on having multiple cars in the store to test.

## Sources

- Next.js Route Handlers official docs: https://nextjs.org/docs/app/api-reference/file-conventions/route (verified 2026-02-24, HIGH confidence)
- Next.js CORS patterns confirmed in Route Handler docs (HIGH confidence)
- Anthropic SDK patterns: training knowledge corroborated by project structure conventions (MEDIUM confidence — verify actual model names and SDK import paths against current docs)
- localStorage limits (~5MB, browser-dependent): widely documented MDN baseline (MEDIUM confidence for exact limits; behavior is correct)
- Zustand persist middleware: well-established pattern in Zustand documentation (MEDIUM confidence — verify current API with Context7 during implementation)

---
*Architecture research for: Single-user AI-powered car listing tracker (Swedish marketplaces)*
*Researched: 2026-02-27*
