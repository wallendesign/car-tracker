import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

const CarSchema = z.object({
  make: z.string().describe("Car manufacturer, e.g. Volvo"),
  model: z.string().describe("Model name, e.g. V60"),
  year: z.number().describe("Model year as integer"),
  price: z.number().nullable().describe("Asking price in SEK as integer, null if not found"),
  mileage: z.number().nullable().describe("Odometer reading in Swedish mil (1 mil = 10 km) as integer — do NOT convert to km, return the mil value as shown on the listing, null if not found"),
  horsepower: z.number().nullable().describe("Engine power in horsepower (hk/hp) as integer, null if not found"),
  location: z.string().nullable().describe("City or region, null if not found"),
  photoUrl: z.string().nullable().describe("Main listing photo URL, null if not found"),
  marketplace: z.enum(["blocket", "bytbil", "autouncle"]),
  bodyType: z.string().nullable().describe("Body type e.g. Kombi, Sedan, SUV, null if not found"),
  fuelType: z.string().nullable().describe("Fuel type e.g. Bensin, Diesel, El, Hybrid, null if not found"),
  transmission: z.string().nullable().describe("Transmission e.g. Automatisk, Manuell, null if not found"),
  driveType: z.string().nullable().describe("Drive type e.g. Tvåhjulsdriven, Fyrhjulsdriven, null if not found"),
  engineVolume: z.string().nullable().describe("Engine displacement e.g. '2.0 l', null if not found"),
  color: z.string().nullable().describe("Car color in Swedish, null if not found"),
  seats: z.number().nullable().describe("Number of seats as integer, null if not found"),
  registrationDate: z.string().nullable().describe("Registration date as string e.g. '2013-10-09', null if not found"),
  listingDate: z.string().nullable().describe("Date when the listing was published or last updated, as ISO 8601 string e.g. '2026-03-05' or '2026-03-05T10:57:00', null if not found"),
  equipment: z.array(z.string()).nullable().describe("List of equipment/options from the listing, empty array if none found"),
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

Extract all available fields. For price and mileage, return numbers only (no units).
IMPORTANT: Swedish car listings show mileage in "mil" (1 mil = 10 km). Return the mil value as-is — do NOT convert to km.
Return null for any field you cannot find.`,
    })

    return NextResponse.json(object)
  } catch (err) {
    console.error("AI extraction error:", err)
    const msg = err instanceof Error ? err.message.toLowerCase() : ""
    const status = (err as Record<string, unknown>)?.status
    if (status === 429 || msg.includes("rate") || msg.includes("limit"))
      return NextResponse.json({ error: "AI-tjänsten är tillfälligt överbelastad — försök igen om en stund" }, { status: 429 })
    if (msg.includes("timeout") || msg.includes("timed out"))
      return NextResponse.json({ error: "AI-analysen tog för lång tid — försök igen" }, { status: 504 })
    return NextResponse.json({ error: "AI-extraktion misslyckades" }, { status: 500 })
  }
}
