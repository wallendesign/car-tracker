"use client"

import { useState } from "react"
import { saveCar, updateCarAISummary, getCarByUrl } from "@/lib/db"
import type { CarRecord } from "@/types/car"

interface AddCarFormProps {
  onAdd: (car: CarRecord) => void
  onClose?: () => void
}

type Step = "idle" | "fetching" | "analyzing" | "summarizing" | "error"

const STEP_LABEL: Record<Step, string | null> = {
  idle: null,
  fetching: "Hämtar annons...",
  analyzing: "Analyserar med AI...",
  summarizing: "Genererar sammanfattning...",
  error: null,
}

function validateCar(data: { year: number; price: number | null; mileage: number | null; horsepower: number | null }): string[] {
  const warnings: string[] = []
  const currentYear = new Date().getFullYear()
  if (data.year < 1950 || data.year > currentYear + 1)
    warnings.push(`Årsmodell ${data.year} verkar felaktig`)
  if (data.mileage !== null && data.mileage > 100_000)
    warnings.push(`Miltal ${data.mileage.toLocaleString("sv-SE")} mil verkar ovanligt högt`)
  if (data.price !== null && data.price < 1_000)
    warnings.push(`Pris ${data.price.toLocaleString("sv-SE")} kr verkar ovanligt lågt`)
  if (data.horsepower !== null && (data.horsepower < 10 || data.horsepower > 2_000))
    warnings.push(`Effekt ${data.horsepower} hk verkar felaktig`)
  return warnings
}

export function AddCarForm({ onAdd, onClose }: AddCarFormProps) {
  const [url, setUrl] = useState("")
  const [step, setStep] = useState<Step>("idle")
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setError(null)
    setWarnings([])

    // Duplicate check
    const existing = await getCarByUrl(url.trim())
    if (existing) {
      setError(`${existing.year} ${existing.make} ${existing.model} finns redan i listan`)
      return
    }

    setStep("fetching")

    const fetchRes = await fetch("/api/fetch-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    })
    const fetchData = await fetchRes.json()
    if (!fetchRes.ok) { setError(fetchData.error); setStep("error"); return }

    setStep("analyzing")

    const analyzeRes = await fetch("/api/analyze-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: fetchData.html, url: url.trim() }),
    })
    const analyzeData = await analyzeRes.json()
    if (!analyzeRes.ok) { setError(analyzeData.error); setStep("error"); return }

    // Validation warnings (soft — car still saves)
    const w = validateCar({
      year: analyzeData.year,
      price: analyzeData.price,
      mileage: analyzeData.mileage,
      horsepower: analyzeData.horsepower,
    })
    if (w.length > 0) setWarnings(w)

    const car: Omit<CarRecord, "id"> = {
      listingUrl: url.trim(),
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
      equipment: analyzeData.equipment ?? null,
      aiModelOverview: null,
      aiCommonIssues: null,
      aiValueAssessment: null,
      status: "interested",
      createdAt: Date.now(),
    }

    const id = await saveCar(car)
    const savedCar = { ...car, id }
    onAdd(savedCar)
    onClose?.()
    setUrl("")
    setStep("summarizing")

    // Auto-generate summary in background
    const summaryRes = await fetch("/api/summarize-car", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ make: car.make, model: car.model, year: car.year, price: car.price, mileage: car.mileage, horsepower: car.horsepower, fuelType: car.fuelType, transmission: car.transmission, driveType: car.driveType, equipment: car.equipment }),
    })
    const summaryData = await summaryRes.json()

    if (summaryRes.ok && id) {
      const fields = {
        aiModelOverview: summaryData.aiModelOverview,
        aiCommonIssues: summaryData.aiCommonIssues,
        aiValueAssessment: summaryData.aiValueAssessment,
      }
      await updateCarAISummary(id, fields)
      onAdd({ ...savedCar, ...fields })
    }

    setStep("idle")
  }

  const label = STEP_LABEL[step]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1 border-b border-border px-4 py-3">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Klistra in Blocket, Bytbil eller AutoUncle-länk..."
        disabled={step !== "idle" && step !== "error"}
        autoFocus
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {warnings.map((w, i) => (
        <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{w}</p>
      ))}
    </form>
  )
}
