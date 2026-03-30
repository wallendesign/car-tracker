import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const body = await req.json()

  // Status-only update
  if ("status" in body && Object.keys(body).length === 1) {
    await sql`UPDATE cars SET status = ${body.status} WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  }

  // AI summary update
  if ("aiModelOverview" in body) {
    const tldr = body.aiTldr ? JSON.stringify(body.aiTldr) : null
    await sql`
      UPDATE cars SET
        ai_model_overview = ${body.aiModelOverview ?? null},
        ai_common_issues = ${body.aiCommonIssues ?? null},
        ai_value_assessment = ${body.aiValueAssessment ?? null},
        ai_score = ${body.aiScore ?? null},
        ai_tldr = ${tldr}
      WHERE id = ${id}
    `
    return NextResponse.json({ ok: true })
  }

  // Full data update (from inline edit or refresh)
  const eq = body.equipment ? JSON.stringify(body.equipment) : null
  const tldr = body.aiTldr ? JSON.stringify(body.aiTldr) : null
  await sql`
    UPDATE cars SET
      listing_url = ${body.listingUrl},
      marketplace = ${body.marketplace},
      make = ${body.make},
      model = ${body.model},
      year = ${body.year},
      price = ${body.price ?? null},
      mileage = ${body.mileage ?? null},
      horsepower = ${body.horsepower ?? null},
      location = ${body.location ?? null},
      photo_url = ${body.photoUrl ?? null},
      body_type = ${body.bodyType ?? null},
      fuel_type = ${body.fuelType ?? null},
      transmission = ${body.transmission ?? null},
      drive_type = ${body.driveType ?? null},
      engine_volume = ${body.engineVolume ?? null},
      color = ${body.color ?? null},
      seats = ${body.seats ?? null},
      registration_date = ${body.registrationDate ?? null},
      listing_date = ${body.listingDate ?? null},
      equipment = ${eq},
      ai_model_overview = ${body.aiModelOverview ?? null},
      ai_common_issues = ${body.aiCommonIssues ?? null},
      ai_value_assessment = ${body.aiValueAssessment ?? null},
      ai_score = ${body.aiScore ?? null},
      ai_tldr = ${tldr}
    WHERE id = ${id}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  await sql`DELETE FROM cars WHERE id = ${parseInt(idStr)}`
  return NextResponse.json({ ok: true })
}
