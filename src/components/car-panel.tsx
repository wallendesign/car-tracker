"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { updateCarStatus, deleteCar, updateCarAISummary } from "@/lib/db"
import type { CarRecord, CarStatus } from "@/types/car"

function parseSummaryField(text: string): { intro: string; bullets: string[] } {
  const bullets: string[] = []
  const introLines: string[] = []

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    if (/^[•\-\*]/.test(line)) {
      // Whole line is a bullet
      bullets.push(line.replace(/^[•\-\*]\s*/, ""))
    } else if (line.includes("•")) {
      // Inline bullets: "Intro sentence. • point 1 • point 2"
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

const STATUSES: CarStatus[] = ["interested", "contacted", "pass"]

const STATUS_LABEL: Record<CarStatus, string> = {
  interested: "Intresserad",
  contacted: "Kontaktad",
  pass: "Passar ej",
}

const STATUS_VARIANT: Record<CarStatus, "default" | "secondary" | "outline"> = {
  interested: "default",
  contacted: "secondary",
  pass: "outline",
}

interface CarPanelProps {
  car: CarRecord | null
  onStatusChange: (id: number, status: CarStatus) => void
  onDelete: (id: number) => void
  onSummaryGenerated: (id: number, fields: Pick<CarRecord, "aiModelOverview" | "aiCommonIssues" | "aiValueAssessment">) => void
}

export function CarPanel({ car, onStatusChange, onDelete, onSummaryGenerated }: CarPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

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

  const fields = [
    car.price != null && { label: "Pris", value: `${car.price.toLocaleString("sv-SE")} kr` },
    car.mileage != null && { label: "Miltal", value: `${car.mileage.toLocaleString("sv-SE")} mil` },
    { label: "Årsmodell", value: String(car.year) },
    car.location && { label: "Ort", value: car.location },
  ].filter(Boolean) as { label: string; value: string }[]

  const hasSummary = car.aiModelOverview || car.aiCommonIssues || car.aiValueAssessment

  return (
    <div className="flex flex-col gap-6">
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
        <div>
          <h2 className="text-lg font-semibold">
            {car.year} {car.make} {car.model}
          </h2>
          <a
            href={car.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:underline"
          >
            {car.marketplace} annons ↗
          </a>
        </div>
        <Badge variant={STATUS_VARIANT[car.status]}>{STATUS_LABEL[car.status]}</Badge>
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
        <div className="flex gap-2">
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
      <button
        onClick={handleDelete}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left"
      >
        Ta bort bil
      </button>
    </div>
  )
}
