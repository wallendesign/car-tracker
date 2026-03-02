import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

const SummarySchema = z.object({
  aiModelOverview: z.string().describe("2-3 sentences about this make/model/year in general — reliability, what it's known for, who it suits"),
  aiCommonIssues: z.string().describe("2-3 sentences on known problems, recalls, things to inspect when buying this specific model year"),
  aiValueAssessment: z.string().describe("1-2 sentences on whether the asking price is fair given the mileage and Swedish market — be direct"),
})

export async function POST(req: NextRequest) {
  const { make, model, year, price, mileage } = await req.json()

  if (!make || !model || !year) {
    return NextResponse.json({ error: "Missing car data" }, { status: 400 })
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: SummarySchema,
      prompt: `Generate a research summary for this used car listing in Sweden:

${year} ${make} ${model}
${price != null ? `Asking price: ${price.toLocaleString("sv-SE")} SEK` : "Price: not listed"}
${mileage != null ? `Mileage: ${mileage.toLocaleString("sv-SE")} km` : "Mileage: not listed"}

Write in English. Be concise and practical — this is for a buyer doing research.`,
    })

    return NextResponse.json(object)
  } catch (err) {
    console.error("Summary generation error:", err)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}
