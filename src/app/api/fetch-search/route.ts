import { NextRequest, NextResponse } from "next/server"

// Recursively walk a parsed JSON object and collect all string values
// that look like Blocket listing paths/URLs.
function collectUrlsFromJson(obj: unknown, out: Set<string>): void {
  if (typeof obj === "string") {
    if (obj.includes("/annons/") && !obj.includes("/search/")) {
      const clean = obj.split("?")[0].split("#")[0]
      out.add(clean.startsWith("http") ? clean : `https://www.blocket.se${clean}`)
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) collectUrlsFromJson(item, out)
  } else if (obj !== null && typeof obj === "object") {
    for (const val of Object.values(obj as Record<string, unknown>)) collectUrlsFromJson(val, out)
  }
}

function extractListingUrls(html: string): string[] {
  const urls = new Set<string>()

  // Strategy 1: parse __NEXT_DATA__ and recursively search for /annons/ strings
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1])
      collectUrlsFromJson(json, urls)
    } catch { /* skip malformed JSON */ }
  }

  // Strategy 2: href attributes (case-insensitive path, no restriction on first char)
  for (const m of html.matchAll(/href=["']((?:https?:\/\/(?:www\.)?blocket\.se)?\/annons\/[^"'?#\s]{8,})["']/gi)) {
    const href = m[1]
    urls.add(href.startsWith("http") ? href : `https://www.blocket.se${href}`)
  }

  // Strategy 3: any blocket.se/annons/ URL appearing anywhere in the HTML
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?blocket\.se\/annons\/[^\s"'<>]{8,}/gi)) {
    urls.add(m[0].split("?")[0].split("#")[0])
  }

  const result = [...urls].filter(u => u.includes("/annons/") && !u.includes("/search/"))

  console.log("[fetch-search] total URLs found:", result.length)
  console.log("[fetch-search] sample URLs:", result.slice(0, 5))

  return result
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
  let httpStatus: number
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
    })
    httpStatus = res.status
    html = await res.text()
  } catch {
    return NextResponse.json({ error: "Kunde inte hämta söksidan" }, { status: 502 })
  }

  console.log("[fetch-search] HTTP status:", httpStatus, "HTML length:", html.length)
  console.log("[fetch-search] has __NEXT_DATA__:", html.includes("__NEXT_DATA__"))
  console.log("[fetch-search] has /annons/:", html.includes("/annons/"))
  // Log a chunk of HTML to see structure
  const snippet = html.slice(0, 3000).replace(/\s+/g, " ")
  console.log("[fetch-search] HTML snippet:", snippet)

  if (html.includes("captcha") || html.includes("Access Denied") || html.length < 500) {
    return NextResponse.json({ error: "Blocket blockerade hämtningen — försök igen om en stund" }, { status: 422 })
  }

  const urls = extractListingUrls(html)

  if (urls.length === 0) {
    return NextResponse.json({ error: "Hittade inga annonser på söksidan" }, { status: 404 })
  }

  return NextResponse.json({ urls })
}
