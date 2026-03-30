import type { CarRecord } from "@/types/car"
import { updateCarData, updateCarStatus } from "@/lib/db"

export type RefreshResult =
  | { status: "sold"; car: CarRecord }
  | { status: "updated"; car: CarRecord }
  | { status: "error"; car: CarRecord; error: string }

type StepCallback = (step: "fetching" | "analyzing" | "summarizing") => void

export async function refreshCar(car: CarRecord, onStep?: StepCallback, otherCars?: CarRecord[]): Promise<RefreshResult> {
  const id = car.id!

  onStep?.("fetching")
  const fetchRes = await fetch("/api/fetch-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: car.listingUrl }),
  })
  const fetchData = await fetchRes.json()
  if (!fetchRes.ok) return { status: "error", car, error: fetchData.error ?? "Kunde inte hämta annonsen" }

  if (fetchData.isSold) {
    await updateCarStatus(id, "sold")
    return { status: "sold", car: { ...car, status: "sold" } }
  }

  onStep?.("analyzing")
  const analyzeRes = await fetch("/api/analyze-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html: fetchData.html, url: car.listingUrl }),
  })
  const analyzeData = await analyzeRes.json()
  if (!analyzeRes.ok) return { status: "error", car, error: analyzeData.error ?? "Analys misslyckades" }

  onStep?.("summarizing")
  const summaryRes = await fetch("/api/summarize-car", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      make: analyzeData.make,
      model: analyzeData.model,
      year: analyzeData.year,
      price: analyzeData.price,
      mileage: analyzeData.mileage,
      horsepower: analyzeData.horsepower,
      fuelType: analyzeData.fuelType,
      transmission: analyzeData.transmission,
      driveType: analyzeData.driveType,
      equipment: analyzeData.equipment,
      otherCars: otherCars?.map(c => ({
        make: c.make,
        model: c.model,
        year: c.year,
        price: c.price,
        mileage: c.mileage,
      })),
    }),
  })
  const summaryData = await summaryRes.json()

  const refreshed: Omit<CarRecord, "id" | "status" | "createdAt"> = {
    listingUrl: car.listingUrl,
    marketplace: analyzeData.marketplace,
    make: analyzeData.make,
    model: analyzeData.model,
    year: analyzeData.year,
    price: analyzeData.price,
    mileage: analyzeData.mileage,
    horsepower: analyzeData.horsepower,
    location: analyzeData.location,
    photoUrl: fetchData.photoUrl ?? analyzeData.photoUrl,
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
    aiModelOverview: summaryRes.ok ? summaryData.aiModelOverview : car.aiModelOverview,
    aiCommonIssues: summaryRes.ok ? summaryData.aiCommonIssues : car.aiCommonIssues,
    aiValueAssessment: summaryRes.ok ? summaryData.aiValueAssessment : car.aiValueAssessment,
    aiScore: summaryRes.ok ? (summaryData.aiScore ?? null) : car.aiScore,
    aiTldr: summaryRes.ok ? (summaryData.aiTldr ?? null) : car.aiTldr,
  }

  await updateCarData(id, refreshed)
  return {
    status: "updated",
    car: { ...refreshed, id, status: car.status, createdAt: car.createdAt },
  }
}
