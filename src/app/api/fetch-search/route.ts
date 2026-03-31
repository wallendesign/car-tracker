import { NextRequest, NextResponse } from "next/server"

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
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
      headers: { ...FETCH_HEADERS, "Accept": "text/html" },
    })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: "Kunde inte hämta söksidan" }, { status: 502 })
  }

  if (html.length < 500) {
    return NextResponse.json({ error: "Blocket blockerade hämtningen — försök igen" }, { status: 422 })
  }

  // Blocket mobility listings are at /mobility/item/{id} — extract all unique IDs
  const seen = new Set<string>()
  const urls: string[] = []
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?blocket\.se\/mobility\/item\/(\d+)/gi)) {
    const id = m[1]
    if (!seen.has(id)) {
      seen.add(id)
      urls.push(`https://www.blocket.se/mobility/item/${id}`)
    }
  }

  console.log(`[fetch-search] found ${urls.length} listings from ${url}`)

  if (urls.length === 0) {
    return NextResponse.json({ error: "Hittade inga annonser på söksidan" }, { status: 404 })
  }

  return NextResponse.json({ urls })
}
