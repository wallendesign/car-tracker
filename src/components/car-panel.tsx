"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { updateCarStatus, deleteCar, updateCarAISummary, updateCarData } from "@/lib/db"
import { refreshCar } from "@/lib/refresh-car"
import type { CarRecord, CarStatus } from "@/types/car"

function parseSummaryField(text: string): { intro: string; bullets: string[] } {
  const bullets: string[] = []
  const introLines: string[] = []

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    if (/^[•\-\*]/.test(line)) {
      bullets.push(line.replace(/^[•\-\*]\s*/, ""))
    } else if (line.includes("•")) {
      const parts = line.split("•").map((p) => p.trim()).filter(Boolean)
      if (parts[0] && !/^[•\-\*]/.test(parts[0])) introLines.push(parts[0])
      bullets.push(...parts.slice(1))
    } else {
      introLines.push(line)
    }
  }

  return { intro: introLines.join(" "), bullets }
}

function SummaryField({ label, text }: { label: string; text: string }) {
  const { intro, bullets } = parseSummaryField(text)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {intro && <p className="text-sm">{intro}</p>}
      {bullets.length > 0 && (
        <ul className="flex flex-col gap-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-muted-foreground shrink-0 mt-px">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const STATUSES: CarStatus[] = ["interested", "contacted", "pass", "sold"]

const STATUS_LABEL: Record<CarStatus, string> = {
  interested: "Intresserad",
  contacted: "Kontaktad",
  pass: "Passar ej",
  sold: "Såld",
}

const STATUS_VARIANT: Record<CarStatus, "default" | "secondary" | "outline"> = {
  interested: "default",
  contacted: "secondary",
  pass: "outline",
  sold: "outline",
}

type RefreshStep = "idle" | "fetching" | "analyzing" | "summarizing" | "error"

const REFRESH_LABEL: Record<RefreshStep, string> = {
  idle: "Uppdatera",
  fetching: "Hämtar annons...",
  analyzing: "Analyserar...",
  summarizing: "Sammanfattar...",
  error: "Försök igen",
}

interface CarPanelProps {
  car: CarRecord | null
  onStatusChange: (id: number, status: CarStatus) => void
  onDelete: (id: number) => void
  onRefresh: (car: CarRecord) => void
  onSummaryGenerated: (id: number, fields: Pick<CarRecord, "aiModelOverview" | "aiCommonIssues" | "aiValueAssessment">) => void
  onEdit: (car: CarRecord) => void
  onClose: () => void
}

export function CarPanel({ car, onStatusChange, onDelete, onRefresh, onSummaryGenerated, onEdit, onClose }: CarPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [refreshStep, setRefreshStep] = useState<RefreshStep>("idle")
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<Partial<CarRecord>>({})
  const panelRef = useRef<HTMLDivElement>(null)

  // Reset edit/confirm state when car changes
  useEffect(() => {
    setConfirmDelete(false)
    setIsEditing(false)
    setEditDraft({})
  }, [car?.id])

  // Keyboard handler
  useEffect(() => {
    if (!car) return

    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA"

      if ((e.key === "Delete" || e.key === "Backspace") && !inInput) {
        e.preventDefault()
        setConfirmDelete(true)
        return
      }

      if (e.key === "Escape") {
        if (confirmDelete) {
          setConfirmDelete(false)
          setIsEditing(false)
          return
        }
        if (isEditing) {
          setIsEditing(false)
          setEditDraft({})
          return
        }
        onClose()
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [car, confirmDelete, isEditing, onClose])

  if (!car) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Välj en bil för att visa detaljer
      </div>
    )
  }

  async function handleStatusChange(status: CarStatus) {
    if (!car?.id) return
    await updateCarStatus(car.id, status)
    onStatusChange(car.id, status)
  }

  async function handleDelete() {
    if (!car?.id) return
    await deleteCar(car.id)
    onDelete(car.id)
  }

  async function handleRefresh() {
    if (!car?.id) return
    setRefreshError(null)
    const result = await refreshCar(car, setRefreshStep)
    if (result.status === "error") {
      setRefreshError(result.error)
      setRefreshStep("error")
      return
    }
    onRefresh(result.car)
    setRefreshStep("idle")
  }

  async function handleGenerateSummary() {
    if (!car?.id) return
    setGenerating(true)
    setGenError(null)

    const res = await fetch("/api/summarize-car", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: car.make,
        model: car.model,
        year: car.year,
        price: car.price,
        mileage: car.mileage,
        horsepower: car.horsepower,
        fuelType: car.fuelType,
        transmission: car.transmission,
        driveType: car.driveType,
        equipment: car.equipment,
      }),
    })

    const data = await res.json()
    setGenerating(false)

    if (!res.ok) {
      setGenError(data.error)
      return
    }

    const fields = {
      aiModelOverview: data.aiModelOverview,
      aiCommonIssues: data.aiCommonIssues,
      aiValueAssessment: data.aiValueAssessment,
    }

    await updateCarAISummary(car.id, fields)
    onSummaryGenerated(car.id, fields)
  }

  function startEditing() {
    if (!car) return
    setEditDraft({
      make: car.make,
      model: car.model,
      year: car.year,
      price: car.price,
      mileage: car.mileage,
      horsepower: car.horsepower,
      location: car.location,
    })
    setIsEditing(true)
  }

  async function saveEdit() {
    if (!car?.id) return
    const updated: CarRecord = { ...car, ...editDraft }
    await updateCarData(car.id, {
      listingUrl: updated.listingUrl,
      marketplace: updated.marketplace,
      make: updated.make,
      model: updated.model,
      year: updated.year,
      price: updated.price,
      mileage: updated.mileage,
      horsepower: updated.horsepower,
      location: updated.location,
      photoUrl: updated.photoUrl,
      bodyType: updated.bodyType,
      fuelType: updated.fuelType,
      transmission: updated.transmission,
      driveType: updated.driveType,
      engineVolume: updated.engineVolume,
      color: updated.color,
      seats: updated.seats,
      registrationDate: updated.registrationDate,
      equipment: updated.equipment,
      aiModelOverview: updated.aiModelOverview,
      aiCommonIssues: updated.aiCommonIssues,
      aiValueAssessment: updated.aiValueAssessment,
    })
    onEdit(updated)
    setIsEditing(false)
    setEditDraft({})
  }

  const fields = [
    car.price != null && { label: "Pris", value: `${car.price.toLocaleString("sv-SE")} kr` },
    car.mileage != null && { label: "Miltal", value: `${car.mileage.toLocaleString("sv-SE")} mil` },
    { label: "Årsmodell", value: String(car.year) },
    car.location && { label: "Ort", value: car.location },
  ].filter(Boolean) as { label: string; value: string }[]

  const hasSummary = car.aiModelOverview || car.aiCommonIssues || car.aiValueAssessment

  const inputClass = "w-full bg-muted rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-foreground/30"

  return (
    <div ref={panelRef} className="flex flex-col gap-6">
      {/* Photo */}
      {car.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/image-proxy?url=${encodeURIComponent(car.photoUrl)}`}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="aspect-video w-full rounded-md object-cover bg-muted"
        />
      ) : (
        <div className="aspect-video w-full rounded-md bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Ingen bild</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-col gap-2 mr-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className={inputClass}
                  value={editDraft.make ?? ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, make: e.target.value }))}
                  placeholder="Märke"
                />
                <input
                  className={inputClass}
                  value={editDraft.model ?? ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, model: e.target.value }))}
                  placeholder="Modell"
                />
                <input
                  className={`${inputClass} sm:w-20`}
                  type="number"
                  value={editDraft.year ?? ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, year: Number(e.target.value) }))}
                  placeholder="År"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className={inputClass}
                  type="number"
                  value={editDraft.price ?? ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Pris (kr)"
                />
                <input
                  className={inputClass}
                  type="number"
                  value={editDraft.mileage ?? ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, mileage: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Miltal (mil)"
                />
                <input
                  className={inputClass}
                  type="number"
                  value={editDraft.horsepower ?? ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, horsepower: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="HK"
                />
              </div>
              <input
                className={inputClass}
                value={editDraft.location ?? ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, location: e.target.value || null }))}
                placeholder="Ort"
              />
              <div className="flex gap-3">
                <button onClick={saveEdit} className="text-xs text-foreground hover:underline font-medium">Spara</button>
                <button onClick={() => { setIsEditing(false); setEditDraft({}) }} className="text-xs text-muted-foreground hover:text-foreground">Avbryt</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold">
                {car.year} {car.make} {car.model}
              </h2>
              <div className="flex items-center gap-3">
                <a
                  href={car.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {car.marketplace} annons ↗
                </a>
                <button
                  onClick={handleRefresh}
                  disabled={refreshStep !== "idle" && refreshStep !== "error"}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {REFRESH_LABEL[refreshStep]}
                </button>
                <button
                  onClick={startEditing}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Redigera
                </button>
              </div>
              {refreshError && <p className="text-xs text-destructive mt-1">{refreshError}</p>}
            </>
          )}
        </div>
        {!isEditing && <Badge variant={STATUS_VARIANT[car.status]}>{STATUS_LABEL[car.status]}</Badge>}
      </div>

      <Separator />

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Status */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statusändring</span>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`text-xs px-3 py-1 rounded border transition-colors ${
                car.status === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* AI Summary */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI-sammanfattning</span>
          <button
            onClick={handleGenerateSummary}
            disabled={generating}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {generating ? "Genererar..." : hasSummary ? "Regenerera" : "Generera"}
          </button>
        </div>

        {genError && <p className="text-xs text-destructive">{genError}</p>}

        {hasSummary ? (
          <div className="flex flex-col gap-4">
            {car.aiModelOverview && <SummaryField label="Översikt" text={car.aiModelOverview} />}
            {car.aiCommonIssues && <SummaryField label="Kända problem" text={car.aiCommonIssues} />}
            {car.aiValueAssessment && <SummaryField label="Värdebedömning" text={car.aiValueAssessment} />}
          </div>
        ) : !generating && (
          <p className="text-xs text-muted-foreground">
            Få en AI-genererad översikt, kända problem och prisvärdering för denna bil.
          </p>
        )}
      </div>

      {/* Specs */}
      {(() => {
        const specs = [
          car.bodyType && { label: "Biltyp", value: car.bodyType },
          car.fuelType && { label: "Drivmedel", value: car.fuelType },
          car.transmission && { label: "Växellåda", value: car.transmission },
          car.driveType && { label: "Drivhjul", value: car.driveType },
          car.engineVolume && { label: "Motorvolym", value: car.engineVolume },
          car.color && { label: "Färg", value: car.color },
          car.seats != null && { label: "Säten", value: String(car.seats) },
          car.registrationDate && { label: "Reg.datum", value: car.registrationDate },
        ].filter(Boolean) as { label: string; value: string }[]
        if (specs.length === 0) return null
        return (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Specifikationer</span>
              <div className="grid grid-cols-2 gap-3">
                {specs.map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      })()}

      {/* Equipment */}
      {car.equipment && car.equipment.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Utrustning</span>
            <div className="flex flex-wrap gap-1">
              {car.equipment.map((item) => (
                <span key={item} className="text-xs border border-border rounded px-2 py-0.5 text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-3">
          <span className="text-xs text-destructive">Är du säker?</span>
          <button onClick={handleDelete} className="text-xs text-destructive hover:underline">Ta bort</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:text-foreground">Avbryt</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left"
        >
          Ta bort bil
        </button>
      )}
    </div>
  )
}
