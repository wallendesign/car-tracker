import { NextRequest, NextResponse } from "next/server"

const ALLOWED_DOMAINS = ["blocket.se", "bytbil.com", "autouncle.se", "blocketcdn.se", "bytbil-cdn.com"]

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")

  if (!url) {
    return new NextResponse("Missing url", { status: 400 })
  }

  let hostname: string
  try {
    hostname = new URL(url).hostname.replace("www.", "")
  } catch {
    return new NextResponse("Invalid url", { status: 400 })
  }

  const allowed = ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d))
  if (!allowed) {
    return new NextResponse("Domain not allowed", { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": `https://${hostname}/`,
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    })

    if (!res.ok) {
      return new NextResponse("Image fetch failed", { status: 502 })
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg"
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return new NextResponse("Image fetch failed", { status: 502 })
  }
}
