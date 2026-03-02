"use client"

import { useState } from "react"
import { saveCar } from "@/lib/db"
import type { CarRecord } from "@/types/car"

interface AddCarFormProps {
  onAdd: (car: CarRecord) => void
}

export function AddCarForm({ onAdd }: AddCarFormProps) {
  const [url, setUrl] = useState("")
  const [step, setStep] = useState<"idle" | "fetching" | "analyzing" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setError(null)
    setStep("fetching")

    const fetchRes = await fetch("/api/fetch-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    })
    const fetchData = await fetchRes.json()
    if (!fetchRes.ok) {
      setError(fetchData.error)
      setStep("error")
      return
    }

    setStep("analyzing")

    const analyzeRes = await fetch("/api/analyze-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: fetchData.html, url: url.trim() }),
    })
    const analyzeData = await analyzeRes.json()
    if (!analyzeRes.ok) {
      setError(analyzeData.error)
      setStep("error")
      return
    }

    const car: Omit<CarRecord, "id"> = {
      listingUrl: url.trim(),
      marketplace: analyzeData.marketplace,
      make: analyzeData.make,
      model: analyzeData.model,
      year: analyzeData.year,
      price: analyzeData.price,
      mileage: analyzeData.mileage,
      location: analyzeData.location,
      photoUrl: analyzeData.photoUrl,
      aiModelOverview: null,
      aiCommonIssues: null,
      aiValueAssessment: null,
      status: "interested",
      createdAt: Date.now(),
    }

    const id = await saveCar(car)
    setUrl("")
    setStep("idle")
    onAdd({ ...car, id })
  }

  const label =
    step === "fetching" ? "Fetching listing..." :
    step === "analyzing" ? "Analyzing with AI..." :
    null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1 border-b border-border px-4 py-3">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste Blocket, Bytbil or AutoUncle URL..."
        disabled={step === "fetching" || step === "analyzing"}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
