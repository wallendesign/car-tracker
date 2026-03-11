# Pitfalls Research

**Domain:** AI-powered URL listing tracker (second-hand car marketplaces)
**Researched:** 2026-02-27
**Confidence:** MEDIUM — based on training knowledge of scraping, LLM extraction, and Next.js image proxying. External verification was unavailable during this session; flag items marked LOW for re-verification.

---

## Critical Pitfalls

### Pitfall 1: Marketplace Anti-Bot Blocking Silently Returns Garbage

**What goes wrong:**
Blocket, Bytbil, and AutoUncle actively detect automated HTTP requests. When a server-side fetch hits their anti-bot layer (Cloudflare, DataDome, or custom WAF), the response is not a 4xx error — it is a 200 OK with a CAPTCHA page, a JavaScript challenge page, or a "please enable JavaScript" redirect. The AI then "reads" that challenge page and either returns empty fields, hallucinates plausible-looking data, or confidently summarizes the CAPTCHA page as if it were a car listing.

**Why it happens:**
Developers test with curl or server-side fetch against a live URL, see HTML come back, and assume it is the real page. They never see the status code (200) deviate, and the error only appears when the AI returns nonsensical output. The root cause is conflating "HTTP 200 = real content" with "HTTP 200 = listing content."

**How to avoid:**
- Before calling the AI, validate that the fetched HTML actually contains expected listing signals: presence of a price pattern (e.g., `/\d[\s\d]*\s*kr/`), presence of a year (`/\b(19|20)\d{2}\b/`), or a known listing container class/ID. If validation fails, surface a clear error ("Could not read this listing — the page may be blocking automated access") rather than passing garbage to the AI.
- Use browser-rendering fetch (Playwright headless, or a service like Browserless) rather than plain `fetch()` or `axios` for the initial HTML retrieval. Full browser execution passes most JS challenges. (Confidence: MEDIUM — verify Blocket/Bytbil specifically require this.)
- Rotate a realistic `User-Agent` header matching a real Chrome version. This alone will not bypass Cloudflare but prevents the most trivial blocks.
- Add a `Referer` header and standard browser `Accept` / `Accept-Language` headers. Missing these is a fingerprinting signal.

**Warning signs:**
- AI extraction returns empty price, year, or mileage on first attempt with a real URL.
- The fetched HTML contains strings like "Please verify you are human", "Just a moment", "cf-browser-verification", or "enable JavaScript".
- Extraction succeeds on your dev machine but fails on the deployed server (IP reputation differs).

**Phase to address:** URL fetching / data ingestion phase (the first engineering phase that implements "paste a URL, get data").

---

### Pitfall 2: AI Hallucinates or Confidently Extracts Wrong Fields

**What goes wrong:**
LLMs (including GPT-4o, Claude) will produce a structured JSON response even when the source HTML is ambiguous, missing fields, or structured differently than expected. Common failure modes:
- Mileage extracted from a different number on the page (e.g., engine displacement in cm³ reported as mileage in km).
- Price extracted from a related listing shown in a "similar cars" sidebar, not the main listing.
- Year taken from a model generation description ("third generation, 2018–2023") rather than the car's registration year.
- Model overview fabricated from training knowledge when the page didn't contain enough descriptive text.

**Why it happens:**
LLMs are trained to complete the task. When asked "extract mileage from this page" and the field is ambiguous or absent, they fill in a plausible answer rather than returning null. This is fundamental to how generative models work, not a bug that can be patched.

**How to avoid:**
- Design the AI prompt to output explicit confidence or a `"source_text"` field for each extracted value — the exact substring from the HTML that justified the answer. Validate that substring is present in the raw HTML before trusting the extracted value.
- Use a strict output schema (JSON mode / structured outputs) with nullable fields. A field being null is far better than a hallucinated value.
- For the price field specifically: cross-validate with a regex on the raw HTML (`/\d[\s\d]*\s*kr/`). If the AI price doesn't match any regex hit, flag it as unverified.
- Display extracted values with a visual "unverified" indicator until the user has seen and implicitly accepted them by opening the car detail view.

**Warning signs:**
- Mileage values outside plausible range (e.g., < 100 km or > 500,000 km) without a flag.
- Price that doesn't appear anywhere in the raw HTML.
- Year more than 2 years off from the model mentioned in the title.
- AI returns all fields populated for a URL that returned a 200 CAPTCHA page.

**Phase to address:** AI extraction phase. Build validation logic into the extraction pipeline before the save-to-database step.

---

### Pitfall 3: External Image Display Breaks in Production Due to Next.js Domain Whitelist

**What goes wrong:**
The Next.js `<Image>` component requires all external image hostnames to be explicitly whitelisted in `next.config.js` under `images.remotePatterns`. In development, images may appear to work if you use a plain `<img>` tag. When you switch to `<Image>` for optimization, or when the app is deployed, images from Blocket CDN, Bytbil's image hosts, or AutoUncle's asset servers fail to load with a 400 error ("hostname not configured").

The deeper problem: each marketplace uses different CDN hostnames, sometimes multiple per marketplace, and those hostnames may change or use subdomain patterns like `img1.blocket.se`, `img2.blocket.se`, etc.

**Why it happens:**
Developers add the first hostname they encounter during development, test it, and move on. The second marketplace they test has a different CDN. The stored image URL works at save-time but the Next.js image optimizer rejects it at render-time.

**How to avoid:**
- Audit all three marketplaces' image CDN hostnames before implementing image display. Use wildcard patterns in `remotePatterns` where the CDN uses numbered subdomains (e.g., `{ protocol: 'https', hostname: '**.blocket.se' }`).
- Alternatively, implement a server-side image proxy route (`/api/image-proxy?url=...`) that fetches the image server-side and streams it to the client. This sidesteps Next.js domain whitelisting entirely and also prevents CORS issues in the browser. The tradeoff is bandwidth cost on your server (acceptable for a single-user app).
- Store the original image URL in the database but proxy all display through your own route. This also makes the app resilient if the marketplace later changes its CDN hostname — only the proxy logic changes, not stored data.

**Warning signs:**
- Images display locally but show broken image icon on Vercel/production.
- Console errors: "hostname not configured under images in next.config.js".
- Images load for Blocket listings but not Bytbil listings (or vice versa) — indicates per-marketplace CDN differences.

**Phase to address:** UI / listing display phase. Implement the image proxy before the first end-to-end URL paste test.

---

### Pitfall 4: Storing Raw External Image URLs That Expire or Rotate

**What goes wrong:**
Marketplace listing image URLs often include signed tokens, session-based parameters, or CDN expiry timestamps. A URL that works when the listing is first saved may return 403 or 404 hours or days later. The car remains in the database with a broken image permanently.

**Why it happens:**
URL-based image storage feels simple and correct at implementation time. The issue only surfaces after the listing has aged, which is after the feature appears "done."

**How to avoid:**
- Do not store the raw marketplace image URL as the image source of truth if you can avoid it.
- On first save, download and store the image to your own storage (a simple `public/` folder or object storage). Display your copy, not the marketplace's URL. For a single-user app, local storage is entirely sufficient.
- If you choose to store the external URL anyway (simpler MVP), treat images as "may fail" and build a graceful fallback: show a car silhouette placeholder when the image 404s. Log broken images and re-fetch on next listing open.

**Warning signs:**
- Images start failing for listings saved more than 48–72 hours ago.
- URL contains query parameters like `?expires=`, `?token=`, `?sig=`, or a long hash.
- All images from one marketplace fail simultaneously (CDN host rotation).

**Phase to address:** Data storage design phase (before first full save-and-display cycle is implemented).

---

### Pitfall 5: Compare UI Complexity Explosion from Too Many Dimensions

**What goes wrong:**
The compare feature starts as "show two cars side by side." Then each car has 8+ fields (price, year, mileage, fuel type, gearbox, location, color, condition). Add 3 cars and you have a 3×8 grid. Add an AI-generated summary (multi-sentence text) to each column and the table becomes unreadable on any screen. The visual comparison stops being useful because users cannot scan rows at a glance.

**Why it happens:**
The feature is designed in terms of what data exists, not what the user needs to decide. Every field gets added because "it's available." The compare view becomes a data dump rather than a decision tool.

**How to avoid:**
- Limit the compare view to the 5–6 fields that actually drive purchase decisions: price, year, mileage, asking price vs. market value (the "is it fair?" field), status tag. Everything else is secondary.
- Put the AI summary as a collapsed row or tooltip — readable on demand, not always visible. Inline multi-paragraph text in a comparison grid is the most common readability killer.
- Cap the compare selection at 3–4 cars maximum. More than 4 columns makes the grid unmanageable. Enforce this in the UI.
- Design the comparison row layout before implementing it: sketch which fields matter, not which fields exist.

**Warning signs:**
- The compare table requires horizontal scrolling on a 1440px monitor.
- The AI summary field in the compare view is taller than all other rows combined.
- You find yourself adding "show/hide columns" complexity to fix readability — this is a signal the base design has too many columns.

**Phase to address:** Compare UI design phase. Make the field selection decision before building the component, not after.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use plain `<img>` instead of Next.js `<Image>` | No domain config needed | No optimization, larger payloads, layout shift | MVP only — replace before any performance work |
| Store raw marketplace image URL, not a copy | No storage code needed | Images expire, break silently | MVP only if graceful fallback placeholder is built immediately |
| Pass full raw HTML to LLM without pre-processing | Simpler code | Higher token cost, more hallucination risk from noise | Never — at minimum strip `<script>`, `<style>`, and nav/footer HTML before sending |
| Skip per-field extraction validation | Faster to build | Silent data corruption (wrong mileage, wrong price) | Never — nulls are safer than wrong data |
| Implement compare with all available fields | "Complete" immediately | Unusable UI, comparison debt requiring refactor | Never — field selection is a design decision, not a later optimization |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Blocket fetch | Server-side `fetch()` with default Node.js headers | Use browser-like headers (`User-Agent`, `Accept`, `Accept-Language`, `Referer`); consider Playwright for JS-rendered content |
| Bytbil fetch | Assuming same CDN as Blocket | Audit Bytbil image hostnames separately — they use their own CDN infrastructure |
| AutoUncle fetch | Treating it as a listing source like the others | AutoUncle is an aggregator with price valuations — the "is the price fair?" AI prompt maps naturally to their existing valuation data, but the page structure differs significantly from Blocket/Bytbil listing pages |
| OpenAI / Anthropic API | Sending full raw HTML (often 100–500KB) | Pre-process: strip scripts/styles/nav/footer, extract main content block only; reduces tokens and hallucination from noise |
| Next.js Image | Adding one hostname at a time as you discover them | Audit all three marketplace CDNs upfront; use wildcard `hostname` patterns where possible |
| Any marketplace URL | Assuming URL structure is permanent | Listing URLs may include session tokens or be replaced when the listing is re-posted; store the canonical URL but handle 404 gracefully |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching + AI extraction on the UI request thread (no queue) | UI hangs for 5–15 seconds while paste is processing; timeout errors | Run fetch+AI as a background job, return job ID immediately, poll or use SSE for completion | From first use — latency is always bad |
| Passing 500KB raw HTML to the LLM per extraction | High per-request token cost; slow responses; higher hallucination rate | Strip HTML to content-only before sending; target < 20KB per prompt | Every request — cost scales linearly |
| No caching of already-fetched listings | Re-fetching the same URL on every page load | Cache fetched HTML for the session; only re-fetch if user explicitly refreshes | From second load of the same listing |
| Inline image display without lazy loading | Page loads slow when list has 20+ cars | Use Next.js `<Image>` with lazy loading or add `loading="lazy"` to `<img>` | Around 15–20 listings in the list |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| SSRF via unchecked URL input | User pastes `http://localhost/admin` or internal network URL; server fetches it | Validate pasted URLs against an allowlist of known marketplace domains before fetching (e.g., only allow `*.blocket.se`, `*.bytbil.com`, `*.autouncle.se`) |
| Storing and rendering user-supplied HTML from AI output | XSS if AI returns HTML in its extraction output | Never render AI output as raw HTML; treat all AI-returned strings as plain text; use React's default text rendering (not `dangerouslySetInnerHTML`) |
| API key exposed in client bundle | OpenAI/Anthropic key leaked; unauthorized usage | Always call AI APIs from server-side routes (`/api/...`), never from client-side code |
| No rate limiting on the fetch+AI endpoint | Accidental loop or tab refresh triggers many expensive API calls | Even for a single-user app, add simple in-memory rate limiting (1 request per URL per 60 seconds) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state during URL paste processing | User pastes URL, nothing happens for 5–10 seconds, pastes again, duplicates are created | Show immediate "Processing..." state on paste; disable the input; show progress step labels (Fetching, Extracting, Saving) |
| Showing broken image silently | User doesn't know if image failed to load or never existed | Always show a placeholder silhouette on image error with an `onError` fallback |
| No way to distinguish "AI couldn't find a field" from "field doesn't exist" | User sees empty price and doesn't know if listing is free or AI failed | Use "N/A" for fields AI returned null on, and "?" or "unverified" badge for fields AI returned with low confidence |
| Compare immediately available for all cars regardless of count | User selects 1 car, hits Compare, sees one-column table | Require minimum 2 cars selected to enable compare; show a hint "Select at least 2 cars to compare" |
| Status tags (Interested/Contacted/Pass) with no visual weight hierarchy | All statuses look the same; user loses track of workflow state | Color-code: Pass = muted/gray, Interested = neutral/blue, Contacted = accent/green — makes the list scannable at a glance |

---

## "Looks Done But Isn't" Checklist

- [ ] **URL Fetching:** Tested with a real Blocket URL from a deployed server (not localhost) — verify actual listing HTML is returned, not a CAPTCHA page.
- [ ] **AI Extraction:** Verified that the raw HTML sent to the AI does NOT contain the CAPTCHA/bot-challenge page by logging it during development.
- [ ] **Image Display:** Tested with URLs from all three marketplaces (Blocket, Bytbil, AutoUncle) — not just whichever was used during development.
- [ ] **Image Expiry:** Checked that images still load 48 hours after a listing was saved — not just immediately after saving.
- [ ] **Null Handling:** AI extraction tested with a listing that is missing at least one field (e.g., mileage not listed) — confirm the UI handles null gracefully.
- [ ] **Compare at limit:** Tested compare with the maximum allowed number of cars, not just 2.
- [ ] **SSRF:** Confirmed that pasting `http://localhost` or `http://192.168.1.1` as a URL returns an error, not internal content.
- [ ] **AI API key:** Confirmed the API key is not present in the client-side JS bundle (check Network tab, view source).
- [ ] **Duplicate prevention:** Pasting the same URL twice doesn't create two identical listings — or if it does, it is a conscious decision with a "duplicate" warning.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Anti-bot blocking discovered after launch | MEDIUM | Add Playwright/browser rendering to the fetch layer; this is a self-contained change to the fetching module if extraction is separated from fetching |
| AI hallucination discovered in stored data | MEDIUM | Add a "re-fetch and re-extract" action per listing; surface it in the UI as "Refresh data" |
| Image URLs expired for old listings | LOW-MEDIUM | Build a background job that checks all stored image URLs and re-fetches from the listing page if they return 404; or implement the server-side proxy to serve from the listing URL on-demand |
| Compare UI deemed unusable after build | MEDIUM | Reduce to 5 fields, collapse AI summary to expandable row — component refactor, not a rewrite |
| SSRF vulnerability found | HIGH | Immediately add domain allowlist to fetch route; audit logs for any suspicious requests; rotate API keys if there's any chance of compromise |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Anti-bot blocking returns CAPTCHA garbage | URL fetching implementation | Deploy a test endpoint that logs the raw HTML returned for a real Blocket URL; confirm it is not a challenge page |
| AI hallucinates field values | AI extraction implementation | Run extraction against 5 real listings from each marketplace; manually compare extracted values to actual page values |
| Next.js image domain whitelist gaps | UI / listing display implementation | Test image display for a listing from each of the 3 marketplaces on the deployed environment |
| External image URLs expire | Data storage design | Implement `onError` image fallback before first save-and-display cycle; decide storage strategy before implementing |
| Compare UI complexity explosion | Compare feature design | Sketch and agree on field list before writing any component code |
| SSRF via user URL input | URL fetching implementation | Add domain allowlist on day one of fetching implementation; test with non-marketplace URLs |
| API key in client bundle | API route implementation | Check browser network tab on first working end-to-end test |
| No loading state during processing | UI / listing ingestion | Test the "paste URL" flow on a slow connection (Chrome DevTools throttle) before marking feature complete |

---

## Sources

- Next.js Image component documentation (official) — domain whitelisting behavior and `remotePatterns` config: https://nextjs.org/docs/app/api-reference/components/image (MEDIUM confidence — based on training knowledge; verify current `remotePatterns` syntax for Next.js 14/15)
- OpenAI structured outputs documentation — JSON mode and null field handling behavior (MEDIUM confidence — training knowledge, verify current behavior)
- General anti-scraping / bot detection patterns — Cloudflare, DataDome behavior on Swedish marketplaces (LOW confidence — specific to Blocket/Bytbil/AutoUncle; verify with a real test fetch from a deployed server)
- SSRF prevention patterns — OWASP Server-Side Request Forgery guidance (HIGH confidence — well-established security pattern)
- Next.js App Router API routes for server-side fetching (MEDIUM confidence — training knowledge of current patterns)

---

*Pitfalls research for: AI-powered second-hand car listing tracker (Blocket, Bytbil, AutoUncle)*
*Researched: 2026-02-27*
