"use client"

import { useState } from "react"
import { saveCar, updateCarAISummary, getCarByUrl } from "@/lib/db"
import type { CarRecord } from "@/types/car"

interface AddCarFormProps {
  projectId: number
  onAdd: (car: CarRecord) => void
  onClose?: () => void
  onProcessing?: (url: string, tempId: string) => void
  onProcessingError?: (tempId: string) => void
  onBulkProcessingStart?: (items: { url: string; tempId: string }[]) => void
}

type Step =
  | "idle"
  | "fetching"
  | "analyzing"
  | "summarizing"
  | "error"
  | "search-fetching"
  | "search-confirm"
  | "search-importing"

const STEP_LABEL: Partial<Record<Step, string>> = {
  fetching: "Hämtar annons...",
  analyzing: "Analyserar med AI...",
  summarizing: "Genererar sammanfattning...",
  "search-fetching": "Hämtar sökresultat...",
}

function isBlocketSearchUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname.replace("www.", "") === "blocket.se" && u.pathname.includes("/search/")
  } catch { return false }
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

export function AddCarForm({ projectId, onAdd, onClose, onProcessing, onProcessingError, onBulkProcessingStart }: AddCarFormProps) {
  const [url, setUrl] = useState("")
  const [step, setStep] = useState<Step>("idle")
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [searchUrls, setSearchUrls] = useState<string[]>([])
  const [searchProgress, setSearchProgress] = useState<{ done: number; total: number } | null>(null)

  async function addSingleListing(listingUrl: string, tempId?: string): Promise<CarRecord | null> {
    const fetchRes = await fetch("/api/fetch-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: listingUrl }),
    })
    const fetchData = await fetchRes.json()
    if (!fetchRes.ok) { if (tempId) onProcessingError?.(tempId); return null }

    const analyzeRes = await fetch("/api/analyze-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: fetchData.html, url: listingUrl }),
    })
    const analyzeData = await analyzeRes.json()
    if (!analyzeRes.ok) { if (tempId) onProcessingError?.(tempId); return null }

    const car: Omit<CarRecord, "id"> = {
      projectId,
      listingUrl,
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
      aiModelOverview: null,
      aiCommonIssues: null,
      aiValueAssessment: null,
      aiScore: null,
      aiTldr: null,
      status: "interested",
      createdAt: Date.now(),
    }

    const id = await saveCar(car)
    const savedCar = { ...car, id }
    onAdd(savedCar)

    // Generate AI summary in background (fire and forget for bulk, await for single)
    const summaryRes = await fetch("/api/summarize-car", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: car.make, model: car.model, year: car.year, price: car.price,
        mileage: car.mileage, horsepower: car.horsepower, fuelType: car.fuelType,
        transmission: car.transmission, driveType: car.driveType, equipment: car.equipment,
      }),
    })
    const summaryData = await summaryRes.json()

    if (summaryRes.ok && id) {
      const fields = {
        aiModelOverview: summaryData.aiModelOverview,
        aiCommonIssues: summaryData.aiCommonIssues,
        aiValueAssessment: summaryData.aiValueAssessment,
        aiScore: summaryData.aiScore ?? null,
        aiTldr: summaryData.aiTldr ?? null,
      }
      await updateCarAISummary(id, fields)
      onAdd({ ...savedCar, ...fields })
    }

    return savedCar
  }

  async function handleFetchSearch() {
    setStep("search-fetching")
    setError(null)

    const res = await fetch("/api/fetch-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Kunde inte hämta sökning")
      setStep("error")
      return
    }

    setSearchUrls(data.urls)
    setStep("search-confirm")
  }

  async function handleImportSearch() {
    const urls = searchUrls

    // Duplicate-check all URLs upfront, build list of new ones with tempIds
    const items: { url: string; tempId: string }[] = []
    for (const listingUrl of urls) {
      const existing = await getCarByUrl(listingUrl, projectId)
      if (!existing) {
        items.push({ url: listingUrl, tempId: `temp-${Date.now()}-${Math.random()}` })
      }
    }

    // Reset form and close modal immediately, adding all skeleton rows at once
    setUrl("")
    setSearchUrls([])
    setSearchProgress(null)
    setStep("idle")
    if (items.length > 0) {
      onBulkProcessingStart?.(items)
    } else {
      onClose?.()
      return
    }

    // Process each listing sequentially — skeleton row is removed when onAdd fires
    for (const { url: listingUrl, tempId } of items) {
      try {
        await addSingleListing(listingUrl, tempId)
      } catch {
        onProcessingError?.(tempId)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    // Search import confirm step: pressing enter/submit starts the import
    if (step === "search-confirm") {
      await handleImportSearch()
      return
    }

    setError(null)
    setWarnings([])

    // Detect Blocket search URL
    if (isBlocketSearchUrl(url.trim())) {
      await handleFetchSearch()
      return
    }

    // Single listing flow
    const existing = await getCarByUrl(url.trim(), projectId)
    if (existing) {
      setError(`${existing.year} ${existing.make} ${existing.model} finns redan i listan`)
      return
    }

    const tempId = `temp-${Date.now()}`
    onProcessing?.(url.trim(), tempId)
    setStep("fetching")

    const fetchRes = await fetch("/api/fetch-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    })
    const fetchData = await fetchRes.json()
    if (!fetchRes.ok) { onProcessingError?.(tempId); setError(fetchData.error); setStep("error"); return }

    setStep("analyzing")

    const analyzeRes = await fetch("/api/analyze-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: fetchData.html, url: url.trim() }),
    })
    const analyzeData = await analyzeRes.json()
    if (!analyzeRes.ok) { onProcessingError?.(tempId); setError(analyzeData.error); setStep("error"); return }

    const w = validateCar({
      year: analyzeData.year,
      price: analyzeData.price,
      mileage: analyzeData.mileage,
      horsepower: analyzeData.horsepower,
    })
    if (w.length > 0) setWarnings(w)

    const car: Omit<CarRecord, "id"> = {
      projectId,
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
      listingDate: analyzeData.listingDate ?? null,
      equipment: analyzeData.equipment ?? null,
      aiModelOverview: null,
      aiCommonIssues: null,
      aiValueAssessment: null,
      aiScore: null,
      aiTldr: null,
      status: "interested",
      createdAt: Date.now(),
    }

    const id = await saveCar(car)
    const savedCar = { ...car, id }
    onAdd(savedCar)
    if (!onProcessing) onClose?.()
    setUrl("")
    setStep("summarizing")

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
        aiScore: summaryData.aiScore ?? null,
        aiTldr: summaryData.aiTldr ?? null,
      }
      await updateCarAISummary(id, fields)
      onAdd({ ...savedCar, ...fields })
    }

    setStep("idle")
  }

  const isDisabled = step !== "idle" && step !== "error" && step !== "search-confirm"
  const statusLabel = STEP_LABEL[step] ?? null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1 border-b border-border px-4 py-3">
      <input
        type="url"
        value={url}
        onChange={(e) => { setUrl(e.target.value); if (step === "search-confirm") { setStep("idle"); setSearchUrls([]) } }}
        placeholder="Klistra in annons eller Blocket-sökning..."
        disabled={isDisabled}
        autoFocus
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />

      {step === "search-confirm" && (
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-xs text-muted-foreground">
            Hittade {searchUrls.length} annonser
          </span>
          <button
            type="submit"
            className="rounded bg-foreground px-2 py-0.5 text-xs font-medium text-background hover:opacity-80"
          >
            Importera alla
          </button>
          <button
            type="button"
            onClick={() => { setStep("idle"); setSearchUrls([]) }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Avbryt
          </button>
        </div>
      )}

      {step === "search-importing" && searchProgress && (
        <p className="text-xs text-muted-foreground">
          Importerar {searchProgress.done}/{searchProgress.total}...
        </p>
      )}

      {statusLabel && <p className="text-xs text-muted-foreground">{statusLabel}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {warnings.map((w, i) => (
        <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{w}</p>
      ))}
    </form>
  )
}
