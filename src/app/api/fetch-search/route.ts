import { NextRequest, NextResponse } from "next/server"

function extractListingUrls(html: string): string[] {
  const urls = new Set<string>()

  // Strategy 1: __NEXT_DATA__ — Blocket embeds all ad data here
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      const jsonStr = nextDataMatch[1]
      // Full blocket.se/annons/... URLs in the JSON blob
      for (const m of jsonStr.matchAll(/"(https?:\/\/(?:www\.)?blocket\.se\/annons\/[^"?#\\]+)"/g)) {
        urls.add(m[1].replace(/\\/g, ""))
      }
      // Relative /annons/... paths
      for (const m of jsonStr.matchAll(/"(\/annons\/[a-z][^"?#\\]{5,})"/g)) {
        urls.add(`https://www.blocket.se${m[1].replace(/\\/g, "")}`)
      }
    } catch { /* skip malformed JSON */ }
  }

  // Strategy 2: href attributes in raw HTML
  for (const m of html.matchAll(/href=["']((?:https?:\/\/(?:www\.)?blocket\.se)?\/annons\/[a-z][^"'?#\s]{5,})["']/gi)) {
    const href = m[1]
    urls.add(href.startsWith("http") ? href : `https://www.blocket.se${href}`)
  }

  return [...urls].filter(u => u.includes("/annons/") && !u.includes("/search/"))
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

  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      },
    })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: "Kunde inte hämta söksidan" }, { status: 502 })
  }

  if (html.includes("captcha") || html.includes("Access Denied") || html.length < 500) {
    return NextResponse.json({ error: "Blocket blockerade hämtningen — försök igen om en stund" }, { status: 422 })
  }

  const urls = extractListingUrls(html)

  if (urls.length === 0) {
    return NextResponse.json({ error: "Hittade inga annonser på söksidan" }, { status: 404 })
  }

  return NextResponse.json({ urls })
}
