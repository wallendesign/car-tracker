import { NextRequest, NextResponse } from "next/server"

const ALLOWED_DOMAINS = ["blocket.se", "bytbil.com", "autouncle.se"]

function extractPhotoUrl(html: string): string | null {
  // 1. og:image meta tag (both attribute orders)
  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (ogMatch?.[1]) return ogMatch[1]

  // 2. JSON-LD structured data — "image" field
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      const content = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "")
      try {
        const json = JSON.parse(content)
        const img = json.image ?? json.images?.[0]
        if (typeof img === "string" && img.startsWith("http")) return img
        if (Array.isArray(img) && img[0]?.startsWith("http")) return img[0]
        if (typeof img?.url === "string") return img.url
      } catch { /* skip malformed JSON */ }
    }
  }

  // 3. __NEXT_DATA__ — Blocket and other Next.js marketplaces embed all listing data here
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1])
      const jsonStr = JSON.stringify(json)
      // Look for image CDN URLs in the JSON blob
      const cdnMatch = jsonStr.match(/https?:\/\/[^"]*(?:cdn|img|image|photo|media|upload)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*/)
      if (cdnMatch) return cdnMatch[0]
    } catch { /* skip */ }
  }

  // 4. Any https image URL in the raw HTML that looks like a listing photo
  const srcMatch = html.match(/https?:\/\/[^"'\s]*(?:cdn|img|photo|media|upload)[^"'\s]*\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?/)
  return srcMatch?.[0] ?? null
}

const SOLD_PATTERNS = [
  // Blocket
  "annonsen finns inte längre",
  "annonsen är borttagen",
  "annonsen har tagits bort",
  "annonsen är inte aktiv",
  "annonsen är inte längre aktiv",
  "annonsen är avslutad",
  // Bytbil
  "bilen är tyvärr såld",
  "annonsen är tyvärr borttagen",
  "inte längre tillgänglig",
  "bilen är såld",
  // AutoUncle
  "this listing is no longer available",
  "this car has been sold",
  "listing not found",
  // Generic
  "har tagits bort",
  "no longer available",
  "has been sold",
  "page not found",
  "404 not found",
]

function detectSold(html: string, httpStatus: number): boolean {
  if (httpStatus === 404 || httpStatus === 410) return true
  const lower = html.toLowerCase()
  return SOLD_PATTERNS.some((p) => lower.includes(p))
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }

  let hostname: string
  try {
    hostname = new URL(url).hostname.replace("www.", "")
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  if (!ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d))) {
    return NextResponse.json(
      { error: "Only Blocket, Bytbil, and AutoUncle URLs are supported" },
      { status: 400 }
    )
  }

  let html: string
  let httpStatus: number
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      },
    })
    httpStatus = res.status
    html = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED"))
      return NextResponse.json({ error: "Kunde inte nå webbplatsen" }, { status: 502 })
    if (msg.includes("timeout") || msg.includes("ETIMEDOUT"))
      return NextResponse.json({ error: "Hämtningen tog för lång tid — försök igen" }, { status: 504 })
    return NextResponse.json({ error: "Kunde inte hämta annonsen" }, { status: 502 })
  }

  // Detect bot/CAPTCHA pages
  if (
    html.includes("captcha") ||
    html.includes("Cloudflare") ||
    html.includes("Access Denied") ||
    html.length < 500
  ) {
    return NextResponse.json(
      { error: "Could not read listing — bot protection detected" },
      { status: 422 }
    )
  }

  // Detect sold/removed listings — check raw HTML before stripping
  if (detectSold(html, httpStatus)) {
    return NextResponse.json({ isSold: true, html: "", url, photoUrl: null })
  }

  // Extract photo before stripping scripts/tags
  const photoUrl = extractPhotoUrl(html)

  // Strip scripts/styles to reduce token count
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 15000)

  return NextResponse.json({ isSold: false, html: stripped, url, photoUrl })
}
