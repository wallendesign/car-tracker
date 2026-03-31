import { NextRequest, NextResponse } from "next/server"

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
}

// Recursively walk any JSON structure and collect strings that look like Blocket listing paths
function collectListingUrls(obj: unknown, out: Set<string>): void {
  if (typeof obj === "string") {
    if (obj.includes("/annons/") && !obj.includes("/search/") && obj.length > 12) {
      const clean = obj.split("?")[0].split("#")[0]
      out.add(clean.startsWith("http") ? clean : `https://www.blocket.se${clean}`)
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) collectListingUrls(item, out)
  } else if (obj !== null && typeof obj === "object") {
    for (const val of Object.values(obj as Record<string, unknown>)) collectListingUrls(val, out)
  }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  const hostname = parsed.hostname.replace("www.", "")
  if (hostname !== "blocket.se") {
    return NextResponse.json({ error: "Endast Blocket-sökningar stöds" }, { status: 400 })
  }
  if (!parsed.pathname.includes("/search/")) {
    return NextResponse.json({ error: "URL är inte en sökning" }, { status: 400 })
  }

  // Step 1: fetch the search page HTML to get the Next.js buildId
  let html: string
  try {
    const res = await fetch(url, {
      headers: { ...FETCH_HEADERS, "Accept": "text/html" },
    })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: "Kunde inte hämta söksidan" }, { status: 502 })
  }

  if (html.length < 500) {
    return NextResponse.json({ error: "Blocket blockerade hämtningen — försök igen" }, { status: 422 })
  }

  const urls = new Set<string>()

  // Step 2: extract buildId from __NEXT_DATA__ and fetch the /_next/data/ JSON endpoint
  // This gives us fully structured page data including all listings, even when they're
  // client-side rendered and absent from the raw HTML.
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]) as { buildId?: string }
      const buildId = nextData.buildId

      if (buildId) {
        // /_next/data/{buildId}/mobility/search/car.json?{same query params}
        const dataUrl = `https://www.blocket.se/_next/data/${buildId}${parsed.pathname}.json${parsed.search}`
        const dataRes = await fetch(dataUrl, {
          headers: { ...FETCH_HEADERS, "Accept": "application/json" },
        })
        if (dataRes.ok) {
          const data = await dataRes.json()
          collectListingUrls(data, urls)
        }
      }

      // Also scan whatever was already in the initial __NEXT_DATA__ SSR payload
      collectListingUrls(nextData, urls)
    } catch { /* skip malformed JSON */ }
  }

  // Step 3: fallback — scan raw HTML for any href="/annons/..." patterns
  if (urls.size === 0) {
    for (const m of html.matchAll(/href=["']([^"']*\/annons\/[^"'?#\s]{8,})["']/gi)) {
      const href = m[1]
      urls.add(href.startsWith("http") ? href : `https://www.blocket.se${href}`)
    }
    // Also any full blocket.se/annons/ URLs in the raw HTML
    for (const m of html.matchAll(/https?:\/\/(?:www\.)?blocket\.se\/annons\/[^\s"'<>]{8,}/gi)) {
      urls.add(m[0].split("?")[0])
    }
  }

  const result = [...urls].filter(u => u.includes("/annons/") && !u.includes("/search/"))

  console.log(`[fetch-search] found ${result.length} listing URLs from ${url}`)

  if (result.length === 0) {
    return NextResponse.json({ error: "Hittade inga annonser på söksidan" }, { status: 404 })
  }

  return NextResponse.json({ urls: result })
}
