# Stack Research

**Domain:** Single-user AI-powered car listing tracker web app
**Researched:** 2026-02-27
**Confidence:** MEDIUM-HIGH (core framework HIGH, supporting libraries MEDIUM due to WebFetch restrictions on non-nextjs.org domains)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1 (latest stable) | Full-stack framework, routing, Server Actions, API routes | Turbopack default, React 19.2, stable Tailwind v4 integration, Server Actions handle AI calls cleanly. Industry standard for 2026 greenfield React apps. |
| React | 19.2 | UI rendering | Ships with Next.js 16 App Router. View Transitions, useEffectEvent, Activity component available. |
| TypeScript | 5.1+ | Type safety | Required minimum by Next.js 16. Catches AI SDK schema mismatches before runtime. |
| Tailwind CSS | 4.x | Utility-first styling | v4 released January 2025. Zero-config, CSS-first (`@import "tailwindcss"` — no `tailwind.config.js` needed). Ships PostCSS plugin and Vite plugin. Default in `create-next-app`. |
| Vercel AI SDK (`ai`) | 4.x | AI text generation, structured outputs, streaming | Standard interface for LLM calls in Next.js. `generateText`, `streamText`, `generateObject` with Zod schemas. Provider-agnostic — swap OpenAI for Anthropic without rewriting call sites. |
| OpenAI (`@ai-sdk/openai`) | latest | LLM provider for extraction + summaries | GPT-4o is the most capable general-purpose model for reading HTML and generating structured car data. Claude Sonnet (`@ai-sdk/anthropic`) is a strong alternative for nuanced summaries. |
| Dexie.js | 4.x | Client-side persistence via IndexedDB | Single-user app: no backend DB needed. Dexie wraps IndexedDB with a clean, promise-based API. Handles structured data (car objects with photos, status, metadata) with schema versioning and migrations. |
| Zustand | 5.x | Client UI state management | Lightweight (< 2KB). Manages side panel selection, compare mode selections, and transient UI state. No boilerplate compared to Redux. Works naturally in Next.js App Router client components. |
| Zod | 3.x | Schema validation for AI outputs | Required by Vercel AI SDK's `generateObject` to enforce structured extraction results. Guarantees the AI returns fields like `price`, `mileage`, `year`, `photoUrl` in expected types. |
| Geist | 1.x (`geist` npm package) | Typeface — matches design spec | Vercel's own font package. Used by shadcn/ui default templates and the Vercel design system. Provides `GeistSans` and `GeistMono` via `next/font`-compatible API. |

### UI Component Library

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| shadcn/ui | (no version — copy-paste not a dep) | UI components | Not installed as a dependency — components are copied into your codebase. Built on Radix UI primitives + Tailwind CSS. Minimal aesthetic, fully customizable. Compatible with Geist and Tailwind v4. Use for: Card, Sheet (side panel), Table, Badge (status tags), Dialog (compare view), Button, Input. |
| Radix UI (via shadcn/ui) | latest | Accessible primitive components | Headless, accessible. Handles keyboard navigation, focus management, ARIA for free. shadcn/ui wraps Radix — you get both. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `create-next-app` | Project scaffolding | `npx create-next-app@latest` — auto-configures TypeScript, Tailwind v4, ESLint, App Router, Turbopack, `@/*` alias. |
| Turbopack | Bundler (default in Next.js 16) | No config needed. File system caching stable in 16.1 — restarts are 5-14x faster. |
| ESLint (flat config) | Linting | `eslint.config.mjs` format. Next.js 16 requires manual `eslint` script (no longer runs on `next build`). |
| Biome | Optional: linting + formatting | Faster than ESLint + Prettier combo if you prefer. Not required. |

---

## AI Integration Architecture

The AI layer deserves extra clarity because it's the most complex part of the stack.

### How URL reading works

The LLM cannot natively "visit" a URL. The correct pattern:

1. User pastes URL in frontend
2. Frontend calls a Next.js Server Action or Route Handler (`/api/extract`)
3. Server Action does: `const html = await fetch(url).then(r => r.text())`
4. Pass the HTML as context to the AI SDK call
5. Use `generateObject` with a Zod schema to extract structured fields
6. Return the structured car data to the client

```typescript
// Example Server Action
'use server'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const CarSchema = z.object({
  title: z.string(),
  price: z.number().nullable(),
  mileage: z.number().nullable(),
  year: z.number().nullable(),
  location: z.string().nullable(),
  photoUrl: z.string().url().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
})

export async function extractListing(url: string) {
  const html = await fetch(url).then(r => r.text())
  // Trim HTML to reduce tokens — strip scripts, styles, keep main content
  const trimmedHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[\s\S]*?<\/style>/gi, '')
                          .slice(0, 15000) // ~4k tokens, cost-effective

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'), // cheaper model for extraction
    schema: CarSchema,
    prompt: `Extract car listing data from this HTML: ${trimmedHtml}`,
  })
  return object
}
```

**Why `gpt-4o-mini` for extraction:** Fast, cheap, sufficient for structured data from HTML. Use `gpt-4o` or `claude-3-5-sonnet` for the richer summary generation (common issues, value assessment).

### Summary generation

A separate AI call for the narrative summary:

```typescript
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function generateSummary(car: CarData) {
  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    prompt: `You are a car buying advisor. Analyze this listing:
    ${JSON.stringify(car)}

    Write a summary covering:
    1. Model overview and reputation
    2. Common issues and recalls for this make/model/year
    3. Value assessment: is ${car.price} SEK fair for ${car.mileage}km?

    Be direct and helpful. 2-3 paragraphs.`,
  })
  return text
}
```

**Why Anthropic for summaries:** Claude excels at nuanced, well-structured prose. GPT-4o-mini is too terse for quality summaries. Use what produces best results — the AI SDK makes switching trivial.

---

## Installation

```bash
# Scaffold project
npx create-next-app@latest car-tracker --typescript --tailwind --app --turbopack

# AI SDK core + providers
npm install ai @ai-sdk/openai @ai-sdk/anthropic

# Schema validation (AI structured outputs)
npm install zod

# Client persistence
npm install dexie

# Client state
npm install zustand

# Geist font
npm install geist

# shadcn/ui CLI (to add components one by one)
npx shadcn@latest init

# Add shadcn components as needed:
npx shadcn@latest add card sheet badge button input table dialog
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Vite + React SPA | If you want zero server, pure client-side app. Loses Server Actions, which make AI calls clean and secure (no API key on client). |
| Vercel AI SDK | Direct OpenAI SDK (`openai` npm) | If you only ever use one provider and don't want the abstraction. AI SDK's structured outputs and streaming are easier to use, worth the dependency. |
| Dexie.js (IndexedDB) | localStorage | localStorage is synchronous, limited to ~5MB, and stores only strings. Car listings with photo URLs and summaries will exceed limits. Dexie handles kilobytes of structured data per record with no size concerns. |
| Dexie.js (IndexedDB) | SQLite via WASM (e.g., wa-sqlite) | SQLite WASM is powerful but adds significant bundle weight (~3MB). Overkill for a single-user app with < 100 records. |
| Zustand | Jotai / Nanostores | Both are excellent. Zustand has simpler mental model for side panel + compare selection state. Any of these work; Zustand has the largest community. |
| shadcn/ui | Radix Themes | Radix Themes is higher-level but less customizable. shadcn/ui gives you the same accessibility primitives with full control over styling — better for a custom minimal aesthetic. |
| Tailwind CSS v4 | CSS Modules | CSS Modules are valid. Tailwind v4 is faster to iterate with and shadcn/ui components assume Tailwind. Don't mix both. |
| GPT-4o-mini (extraction) | Claude Haiku / Gemini Flash | All three are cheap, fast models. GPT-4o-mini has best JSON/structured output reliability in benchmarks. |
| Claude Sonnet (summary) | GPT-4o | Both produce excellent prose. Claude Sonnet tends to be more concise and direct — better for actionable car advice. Either works fine. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| LangChain / LangChain.js | Massive, complex abstraction layer. Adds 20+ transitive dependencies for capabilities the AI SDK covers with 1. Slow to update, overly opinionated. | Vercel AI SDK (`ai`) |
| `react-query` / TanStack Query | Designed for server state that needs cache invalidation. Car data is local — stored in Dexie, loaded once. TanStack Query adds complexity without benefit here. | Direct Dexie reads + Zustand |
| Prisma / Drizzle / any SQL ORM | Server-side DB is unnecessary for a single-user no-auth app. No backend = no attack surface, no hosting cost, no schema migrations in production. | Dexie.js (client IndexedDB) |
| NextAuth / Auth.js | Project requirement: no auth. Adding auth infrastructure would add 3+ hours of setup for zero user-facing value. | Nothing — no auth needed |
| `cheerio` / Puppeteer for scraping | HTML scraping libraries are brittle against site changes. GPT-4o-mini understands malformed, compressed HTML and handles layout changes gracefully. | Server-side `fetch` + AI extraction |
| Redux / Redux Toolkit | Massive boilerplate for managing "which car is selected in the side panel". Zustand handles this in 10 lines. | Zustand |
| CSS-in-JS (styled-components, Emotion) | Not compatible with React Server Components. Next.js 16 App Router requires CSS-in-JS libraries to use client boundaries everywhere — defeats the purpose. Use Tailwind or CSS Modules instead. | Tailwind CSS v4 |
| React Server Components for AI streaming | Server Components can't stream AI responses to the client in real time. Use Client Components with `useChat`/`useCompletion` hooks from the AI SDK, or Server Actions that return completed responses. | Server Actions + Client Components |

---

## Stack Patterns by Variant

**For extraction (structured data from URL):**
- Use Server Action + `generateObject` + Zod schema + `gpt-4o-mini`
- Because: cheap, reliable JSON output, no API key exposure on client

**For summary generation (narrative prose):**
- Use Server Action + `generateText` + `claude-3-5-sonnet` (or `gpt-4o`)
- Because: longer context, better reasoning for "is this a good deal?" analysis

**For persistence:**
- Use Dexie.js in client components only (`'use client'`)
- Because: IndexedDB is browser-only — never access in Server Components or Server Actions

**For UI state (selected car, compare selections):**
- Use Zustand store accessed in client components
- Because: transient, no need to persist between sessions

**For persistent UI preferences (e.g., column sort order):**
- Use `localStorage` via a simple wrapper
- Because: simple key-value is fine for preferences, no need for Dexie overhead

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.1 | Node.js 20.9+ | Node.js 18 dropped in Next.js 16. Verify local Node.js version. |
| Next.js 16.1 | React 19.2 | Bundled by App Router. Pages Router supports React 18. |
| Next.js 16.1 | Tailwind CSS v4 | Tailwind v4 is the default in `create-next-app` since Next.js 16. |
| Next.js 16.1 | TypeScript 5.1+ | Minimum enforced. TypeScript 5.x supports decorators natively if needed. |
| shadcn/ui | Tailwind CSS v4 | shadcn/ui components target Tailwind — verify v4 compatibility during `shadcn init`. Some components may need minor CSS variable adjustments. |
| Dexie.js 4.x | React 19.2 | Dexie's React hooks (`useLiveQuery`) work with React 18/19. No issues expected. |
| Vercel AI SDK 4.x | Next.js 16 Server Actions | AI SDK is designed for Next.js Server Actions. Fully compatible. |
| `geist` font | `next/font` | Use `next/font/local` pattern or the `geist` package's `GeistSans` / `GeistMono` exports directly in `layout.tsx`. |

---

## Swedish Marketplace Considerations

The three target sites (Blocket, Bytbil, AutoUncle) present specific technical realities:

- **Blocket** uses server-rendered HTML with Next.js internals — standard `fetch` returns full HTML. The AI can extract data reliably.
- **Bytbil** is a JavaScript-heavy SPA. `fetch` returns the shell HTML only. The AI will find minimal data. **Potential blocker** — may require either a headless browser (Puppeteer/Playwright in a server route) or detecting this and prompting the user.
- **AutoUncle** — unknown rendering strategy. Likely similar to Bytbil. Verify during implementation.

**Mitigation strategy:** Start with simple `fetch` + AI extraction. If a site returns empty/minimal HTML, implement a fallback using a serverless Puppeteer solution (e.g., `@sparticuz/chromium` for Vercel edge) or prompt the user to paste the page text manually. Do not block MVP on solving all three sites — test each at implementation time.

This is the highest-risk technical unknown in the project.

---

## Sources

- Next.js 16 official release blog: https://nextjs.org/blog/next-16 — **HIGH confidence** (official, verified 2026-02-27)
- Next.js 16.1 official release blog: https://nextjs.org/blog/next-16-1 — **HIGH confidence** (official, December 18, 2025)
- Next.js installation docs: https://nextjs.org/docs/app/getting-started/installation — **HIGH confidence** (last updated 2026-02-24)
- Tailwind CSS v4 release blog: https://tailwindcss.com/blog/tailwindcss-v4 — **HIGH confidence** (official, January 2025)
- Vercel AI SDK docs — **MEDIUM confidence** (WebFetch blocked; based on training knowledge to August 2025; AI SDK 4.x confirmed released Oct 2024)
- Dexie.js v4 — **MEDIUM confidence** (training knowledge; v4 was released in 2024)
- shadcn/ui + Geist — **MEDIUM confidence** (training knowledge; actively maintained, no breaking changes observed)
- Zustand v5 — **MEDIUM confidence** (training knowledge; v5 released late 2024)

---

*Stack research for: Car Tracker — single-user AI-powered car listing tracker*
*Researched: 2026-02-27*
