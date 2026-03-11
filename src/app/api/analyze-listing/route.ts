import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

const CarSchema = z.object({
  make: z.string().describe("Car manufacturer, e.g. Volvo"),
  model: z.string().describe("Model name, e.g. V60"),
  year: z.number().describe("Model year as integer"),
  price: z.number().nullable().describe("Asking price in SEK as integer, null if not found"),
  mileage: z.number().nullable().describe("Odometer reading in km as integer, null if not found"),
  horsepower: z.number().nullable().describe("Engine power in horsepower (hk/hp) as integer, null if not found"),
  location: z.string().nullable().describe("City or region, null if not found"),
  photoUrl: z.string().nullable().describe("Main listing photo URL, null if not found"),
  marketplace: z.enum(["blocket", "bytbil", "autouncle"]),
})

export async function POST(req: NextRequest) {
  const { html, url } = await req.json()

  if (!html || !url) {
    return NextResponse.json({ error: "Missing html or url" }, { status: 400 })
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: CarSchema,
      prompt: `Extract car listing data from this Swedish marketplace page.
URL: ${url}
Page text:
${html}

Extract all available fields. For price and mileage, return numbers only (no units). Return null for any field you cannot find.`,
    })

    return NextResponse.json(object)
  } catch (err) {
    console.error("AI extraction error:", err)
    return NextResponse.json({ error: "AI extraction failed" }, { status: 500 })
  }
}
