import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"
import type { CarRecord } from "@/types/car"

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY,
      listing_url TEXT NOT NULL,
      marketplace TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      price INTEGER,
      mileage INTEGER,
      horsepower INTEGER,
      location TEXT,
      photo_url TEXT,
      body_type TEXT,
      fuel_type TEXT,
      transmission TEXT,
      drive_type TEXT,
      engine_volume TEXT,
      color TEXT,
      seats INTEGER,
      registration_date TEXT,
      equipment TEXT,
      ai_model_overview TEXT,
      ai_common_issues TEXT,
      ai_value_assessment TEXT,
      status TEXT NOT NULL DEFAULT 'interested',
      created_at BIGINT NOT NULL
    )
  `
}

function rowToCar(row: Record<string, unknown>): CarRecord {
  return {
    id: row.id as number,
    listingUrl: row.listing_url as string,
    marketplace: row.marketplace as CarRecord["marketplace"],
    make: row.make as string,
    model: row.model as string,
    year: row.year as number,
    price: row.price as number | null,
    mileage: row.mileage as number | null,
    horsepower: row.horsepower as number | null,
    location: row.location as string | null,
    photoUrl: row.photo_url as string | null,
    bodyType: row.body_type as string | null,
    fuelType: row.fuel_type as string | null,
    transmission: row.transmission as string | null,
    driveType: row.drive_type as string | null,
    engineVolume: row.engine_volume as string | null,
    color: row.color as string | null,
    seats: row.seats as number | null,
    registrationDate: row.registration_date as string | null,
    equipment: row.equipment ? (JSON.parse(row.equipment as string) as string[]) : null,
    aiModelOverview: row.ai_model_overview as string | null,
    aiCommonIssues: row.ai_common_issues as string | null,
    aiValueAssessment: row.ai_value_assessment as string | null,
    status: row.status as CarRecord["status"],
    createdAt: Number(row.created_at),
  }
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const url = req.nextUrl.searchParams.get("url")
  if (url) {
    const { rows } = await sql`SELECT * FROM cars WHERE listing_url = ${url} LIMIT 1`
    return NextResponse.json(rows[0] ? rowToCar(rows[0]) : null)
  }
  const { rows } = await sql`SELECT * FROM cars ORDER BY created_at DESC`
  return NextResponse.json(rows.map(rowToCar))
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const car: Omit<CarRecord, "id"> = await req.json()
  const eq = car.equipment ? JSON.stringify(car.equipment) : null

  const { rows } = await sql`
    INSERT INTO cars (
      listing_url, marketplace, make, model, year, price, mileage, horsepower,
      location, photo_url, body_type, fuel_type, transmission, drive_type,
      engine_volume, color, seats, registration_date, equipment,
      ai_model_overview, ai_common_issues, ai_value_assessment, status, created_at
    ) VALUES (
      ${car.listingUrl}, ${car.marketplace}, ${car.make}, ${car.model}, ${car.year},
      ${car.price}, ${car.mileage}, ${car.horsepower}, ${car.location}, ${car.photoUrl},
      ${car.bodyType}, ${car.fuelType}, ${car.transmission}, ${car.driveType},
      ${car.engineVolume}, ${car.color}, ${car.seats}, ${car.registrationDate},
      ${eq}, ${car.aiModelOverview}, ${car.aiCommonIssues}, ${car.aiValueAssessment},
      ${car.status}, ${car.createdAt}
    )
    RETURNING *
  `
  return NextResponse.json(rowToCar(rows[0]), { status: 201 })
}
