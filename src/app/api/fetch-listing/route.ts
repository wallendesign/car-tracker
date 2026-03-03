import { NextRequest, NextResponse } from "next/server"

const ALLOWED_DOMAINS = ["blocket.se", "bytbil.com", "autouncle.se"]

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
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      },
    })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: "Could not fetch listing" }, { status: 502 })
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

  // Extract image URLs before stripping tags
  const imgUrls: string[] = []
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1]
    // Only keep large images (likely listing photos, not icons/logos)
    if (
      src.startsWith("http") &&
      !src.includes("logo") &&
      !src.includes("icon") &&
      !src.includes("avatar") &&
      !src.includes("sprite") &&
      (src.includes("cdn") || src.includes("img") || src.includes("photo") || src.includes("image") || src.includes("media") || src.includes("upload"))
    ) {
      imgUrls.push(src)
    }
  }

  // Also check og:image meta tag — most reliable for main listing photo
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  const ogImage = ogImageMatch?.[1] ?? null

  // Strip scripts/styles to reduce token count, keep meaningful text
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 15000)

  // Best photo: og:image first, then first matching img src
  const photoUrl = ogImage ?? imgUrls[0] ?? null

  return NextResponse.json({ html: stripped, url, photoUrl })
}
