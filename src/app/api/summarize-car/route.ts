import { NextRequest, NextResponse } from "next/server"
import { generateObject, generateText } from "ai"
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

  const carContext = [
    `${year} ${make} ${model}`,
    price != null ? `Pris: ${price.toLocaleString("sv-SE")} kr` : "Pris: ej angivet",
    mileage != null ? `Miltal: ${mileage.toLocaleString("sv-SE")} mil` : "Miltal: ej angivet",
    horsepower != null ? `Effekt: ${horsepower} hk` : "",
    fuelType ? `Drivmedel: ${fuelType}` : "",
    transmission ? `Växellåda: ${transmission}` : "",
    driveType ? `Drivhjul: ${driveType}` : "",
    equipment?.length ? `Utrustning: ${equipment.join(", ")}` : "",
  ].filter(Boolean).join("\n")

  const comparisonContext = otherCars && otherCars.length > 0
    ? `\nJämförelsebilar:\n${otherCars.map(c =>
        `- ${c.year} ${c.make} ${c.model}${c.price != null ? `, ${c.price.toLocaleString("sv-SE")} kr` : ""}${c.mileage != null ? `, ${c.mileage.toLocaleString("sv-SE")} mil` : ""}`
      ).join("\n")}`
    : ""

  try {
    // Primary call: 3-field summary via generateObject (proven working)
    const { object: summary } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: SummarySchema,
      prompt: `Generera en skanningsbar forskningssammanfattning för denna begagnade bilannons i Sverige:

${carContext}${comparisonContext}

Skriv på svenska. Var kortfattad och direkt — köparen vill snabbt scanna nyckelpunkter, inte läsa långa stycken.
Varje fält ska följa exakt detta format: en kort inledning, sedan punkter som börjar med "• ".`,
    })

    // Secondary call: score + tldr via generateText (avoids zod-to-json-schema issues)
    let scoreResult: { aiScore?: number; aiTldr?: { drawback: string; risk: string; standout: string; recommendation: string } } = {}
    try {
      const currentYear = new Date().getFullYear()
      const age = year ? currentYear - year : null
      const remainingYears = age != null ? Math.max(20 - age, 1) : null
      const costPerYear = price != null && remainingYears != null ? Math.round(price / remainingYears) : null
      const annualMil = mileage != null && age != null && age > 0 ? Math.round(mileage / age) : null

      const scoringHints = [
        costPerYear != null ? `Kostnad per återstående år: ${costPerYear.toLocaleString("sv-SE")} kr` : "",
        annualMil != null ? `Körsträcka per år: ${annualMil.toLocaleString("sv-SE")} mil/år` : "",
        age != null ? `Ålder: ${age} år` : "",
      ].filter(Boolean).join(" | ")

      const { text } = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        prompt: `Du sätter en exakt poäng på denna begagnade bil i Sverige. Poängen MÅSTE spegla bilens faktiska kvalitet — använd hela skalan 0–100, inte en säker medelpoäng.

${carContext}${comparisonContext}
${scoringHints ? `\nBeräknade nyckeltal: ${scoringHints}` : ""}

POÄNGMODELL (räkna ut varje del separat, summera sedan):

A. PRISVÄRDHET (0–30 poäng)
   Kostnad per återstående år (antag 20 år total livslängd):
   <3 000 kr/år → 27–30p | 3–5 000 kr/år → 22–26p | 5–10 000 kr/år → 15–21p
   10–15 000 kr/år → 8–14p | 15–20 000 kr/år → 3–7p | >20 000 kr/år → 0–2p
   Om priset ej angivet: ge 15p (neutralt).

B. TILLFÖRLITLIGHET & RISK (0–25 poäng)
   Baserat på modellens kända rykte, årsmodell och typiska problem:
   Känd pålitlig modell utan allvarliga kända problem → 20–25p
   Genomsnittlig tillförlitlighet med hanterbara problem → 12–19p
   Kända allvarliga problem eller problematisk årsmodell → 5–11p
   Hög risk (dyr att underhålla, känd för motorhaverier etc.) → 0–4p

C. SKICK / MILTAL / ÅLDER (0–25 poäng)
   Kombinera ålder och körsträcka per år (ca 1 500–2 000 mil/år = normalt):
   ≤5 år OCH ≤1 500 mil/år → 22–25p
   ≤8 år OCH ≤2 000 mil/år → 16–21p
   8–12 år ELLER 2 000–3 000 mil/år → 9–15p
   >12 år ELLER >3 000 mil/år → 4–8p
   Mycket gammal (>15 år) OCH högt miltal → 0–3p

D. ÖNSKVÄRDHET & UTRUSTNING (0–20 poäng)
   Välutrustad, attraktiv spec (dragkrok, panorama, premium ljud, fyra-hjulsdrift etc.) → 16–20p
   Normal utrustningsnivå → 10–15p
   Sparsam utrustning, ovanlig färg/kaross, svår att sälja vidare → 4–9p
   Mycket svårsåld, nischad eller daterad spec → 0–3p

Svara ENBART med ett JSON-objekt (inga backticks, inga förklaringar). Du MÅSTE ange scoreA, scoreB, scoreC, scoreD separat — totalpoängen räknas som deras summa:
{"scoreA":<0-30>,"scoreB":<0-25>,"scoreC":<0-25>,"scoreD":<0-20>,"aiTldr":{"drawback":"<1-2 meningar om den tydligaste nackdelen>","risk":"<1 mening om den konkreta störst risken att känna till>","standout":"<1 mening om vad som faktiskt sticker ut positivt>","recommendation":"<1 mening: ska köparen gå vidare ja/nej och varför>"}}`,
      })

      const raw = text.trim().replace(/^```json?\s*/i, "").replace(/\s*```$/,"")
      console.log("[summarize-car] raw model output:", raw)
      const parsed = JSON.parse(raw) as { scoreA?: unknown; scoreB?: unknown; scoreC?: unknown; scoreD?: unknown; aiTldr?: unknown }
      console.log("[summarize-car] parsed scores:", { scoreA: parsed.scoreA, scoreB: parsed.scoreB, scoreC: parsed.scoreC, scoreD: parsed.scoreD })
      const scoreA = typeof parsed.scoreA === "number" ? Math.min(30, Math.max(0, parsed.scoreA)) : null
      const scoreB = typeof parsed.scoreB === "number" ? Math.min(25, Math.max(0, parsed.scoreB)) : null
      const scoreC = typeof parsed.scoreC === "number" ? Math.min(25, Math.max(0, parsed.scoreC)) : null
      const scoreD = typeof parsed.scoreD === "number" ? Math.min(20, Math.max(0, parsed.scoreD)) : null
      const computedScore = scoreA != null && scoreB != null && scoreC != null && scoreD != null
        ? scoreA + scoreB + scoreC + scoreD
        : null
      if (computedScore != null && parsed.aiTldr && typeof parsed.aiTldr === "object") {
        const tldr = parsed.aiTldr as Record<string, unknown>
        if (typeof tldr.drawback === "string" && typeof tldr.risk === "string" &&
            typeof tldr.standout === "string" && typeof tldr.recommendation === "string") {
          scoreResult = { aiScore: computedScore, aiTldr: tldr as { drawback: string; risk: string; standout: string; recommendation: string } }
        }
      }
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
