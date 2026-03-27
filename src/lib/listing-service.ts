import type { CarRecord } from "@/types/car"
import { saveCar } from "@/lib/db"

export type AddCarResult =
  | { success: true; car: CarRecord }
  | { success: false; error: string }

export async function addCarFromUrl(url: string): Promise<AddCarResult> {
  // Step 1: Fetch listing HTML server-side
  const fetchRes = await fetch("/api/fetch-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  })

  const fetchData = await fetchRes.json()
  if (!fetchRes.ok) return { success: false, error: fetchData.error }

  // Step 2: Extract car data with AI
  const analyzeRes = await fetch("/api/analyze-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html: fetchData.html, url }),
  })

  const analyzeData = await analyzeRes.json()
  if (!analyzeRes.ok) return { success: false, error: analyzeData.error }

  // Step 3: Save to Dexie
  const car: Omit<CarRecord, "id"> = {
    listingUrl: url,
    marketplace: analyzeData.marketplace,
    make: analyzeData.make,
    model: analyzeData.model,
    year: analyzeData.year,
    price: analyzeData.price,
    mileage: analyzeData.mileage,
    horsepower: analyzeData.horsepower ?? null,
    location: analyzeData.location,
    bodyType: analyzeData.bodyType ?? null,
    fuelType: analyzeData.fuelType ?? null,
    transmission: analyzeData.transmission ?? null,
    driveType: analyzeData.driveType ?? null,
    engineVolume: analyzeData.engineVolume ?? null,
    color: analyzeData.color ?? null,
    seats: analyzeData.seats ?? null,
    registrationDate: analyzeData.registrationDate ?? null,
    listingDate: analyzeData.listingDate ?? null,
    equipment: analyzeData.equipment ?? null,
    photoUrl: analyzeData.photoUrl,
    aiModelOverview: null,
    aiCommonIssues: null,
    aiValueAssessment: null,
    status: "interested",
    createdAt: Date.now(),
  }

  const id = await saveCar(car)
  return { success: true, car: { ...car, id } }
}
