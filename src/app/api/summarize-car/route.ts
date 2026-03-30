import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

const SummarySchema = z.object({
  aiModelOverview: z.string().describe(
    "1-2 sentence intro about this make/model/year, then 3-4 bullet points each starting with '• ' covering: reliability reputation, key strengths, who it suits, and one notable weakness. No other formatting."
  ),
  aiCommonIssues: z.string().describe(
    "1 sentence framing the risk level for this model year, then 3-4 bullet points each starting with '• ' listing specific known problems, recalls, or things to physically inspect when viewing the car. No other formatting."
  ),
  aiValueAssessment: z.string().describe(
    "1-2 sentence direct verdict on whether the price is fair given mileage and Swedish market, then 2-3 bullet points each starting with '• ' with specific supporting context: typical market price range, mileage assessment, and one key value factor. No other formatting."
  ),
})

const ScoreSchema = z.object({
  aiScore: z.number().min(0).max(100).describe(
    "Composite score 0–100 based on: value for money (30%), reliability/risk (25%), condition indicators (mileage/age, 25%), and overall desirability (20%). Higher is better. Return a whole number integer."
  ),
  aiTldr: z.object({
    drawback: z.string().describe("1–2 sentences describing the main drawbacks of this specific car"),
    risk: z.string().describe("One sentence about the biggest risk or concern with this car"),
    standout: z.string().describe("One sentence about what makes this car stand out positively"),
    recommendation: z.string().describe("One direct sentence: should the buyer pursue this car or not, and why"),
  }),
})

interface OtherCar {
  make: string
  model: string
  year: number
  price: number | null
  mileage: number | null
}

export async function POST(req: NextRequest) {
  const { make, model, year, price, mileage, fuelType, transmission, driveType, horsepower, equipment, otherCars } = await req.json() as {
    make: string
    model: string
    year: number
    price: number | null
    mileage: number | null
    fuelType?: string | null
    transmission?: string | null
    driveType?: string | null
    horsepower?: number | null
    equipment?: string[] | null
    otherCars?: OtherCar[]
  }

  if (!make || !model || !year) {
    return NextResponse.json({ error: "Missing car data" }, { status: 400 })
  }

  const carContext = `${year} ${make} ${model}
${price != null ? `Begärt pris: ${price.toLocaleString("sv-SE")} kr` : "Pris: ej angivet"}
${mileage != null ? `Miltal: ${mileage.toLocaleString("sv-SE")} mil (svenska mil, 1 mil = 10 km)` : "Miltal: ej angivet"}
${horsepower != null ? `Effekt: ${horsepower} hk` : ""}
${fuelType ? `Drivmedel: ${fuelType}` : ""}
${transmission ? `Växellåda: ${transmission}` : ""}
${driveType ? `Drivhjul: ${driveType}` : ""}
${equipment?.length ? `Utrustning: ${equipment.join(", ")}` : ""}`

  const comparisonContext = otherCars && otherCars.length > 0
    ? `\nJämförelsebilar i listan:\n${otherCars.map(c =>
        `- ${c.year} ${c.make} ${c.model}${c.price != null ? `, ${c.price.toLocaleString("sv-SE")} kr` : ""}${c.mileage != null ? `, ${c.mileage.toLocaleString("sv-SE")} mil` : ""}`
      ).join("\n")}`
    : ""

  try {
    // Primary call: proven 3-field summary
    const { object: summary } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: SummarySchema,
      prompt: `Generera en skanningsbar forskningssammanfattning för denna begagnade bilannons i Sverige:

${carContext}${comparisonContext}

Skriv på svenska. Var kortfattad och direkt — köparen vill snabbt scanna nyckelpunkter, inte läsa långa stycken.
Varje fält ska följa exakt detta format: en kort inledning, sedan punkter som börjar med "• ".`,
    })

    // Secondary call: score + tldr (non-fatal if it fails)
    let scoreResult: { aiScore?: number; aiTldr?: { drawback: string; risk: string; standout: string; recommendation: string } } = {}
    try {
      const { object: scored } = await generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: ScoreSchema,
        prompt: `Du analyserar denna begagnade bil i Sverige:

${carContext}${comparisonContext}

Ge ett helhetsbetyg 0–100 och en TL;DR-analys på svenska. Var kortfattad och direkt.`,
      })
      scoreResult = scored
    } catch (scoreErr) {
      console.error("Score generation failed (non-fatal):", scoreErr)
    }

    return NextResponse.json({ ...summary, ...scoreResult })
  } catch (err) {
    console.error("Summary generation error:", err)
    const msg = err instanceof Error ? err.message.toLowerCase() : ""
    const status = (err as Record<string, unknown>)?.status
    if (status === 429 || msg.includes("rate") || msg.includes("limit"))
      return NextResponse.json({ error: "AI-tjänsten är tillfälligt överbelastad — försök igen om en stund" }, { status: 429 })
    if (msg.includes("timeout") || msg.includes("timed out"))
      return NextResponse.json({ error: "AI-analysen tog för lång tid — försök igen" }, { status: 504 })
    return NextResponse.json({ error: "Sammanfattning misslyckades" }, { status: 500 })
  }
}
