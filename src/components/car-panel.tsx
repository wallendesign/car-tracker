"use client"

import { useState, useEffect, useRef } from "react"
import { Tooltip } from "radix-ui"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { updateCarStatus, deleteCar, updateCarAISummary, updateCarData } from "@/lib/db"
import { refreshCar } from "@/lib/refresh-car"
import {
  gradeYear,
  gradeHorsepower,
  gradeMileage,
  gradePrice,
  gradeListingAge,
  gradeScore,
  type Grade,
  type GradeLevel,
} from "@/lib/grade-metrics"
import type { CarRecord, CarStatus } from "@/types/car"

// ── Grade pill ────────────────────────────────────────────────────────────────

const GRADE_CLASS: Record<GradeLevel, string> = {
  great: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  good: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  avg: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  poor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  bad: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
}

const GRADE_LABEL: Record<GradeLevel, string> = {
  great: "Utmärkt",
  good: "Bra",
  avg: "OK",
  poor: "Sämre",
  bad: "Dåligt",
}

function GradePill({ grade }: { grade: Grade }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-medium leading-5 cursor-default shrink-0",
            GRADE_CLASS[grade.level]
          )}
        >
          {GRADE_LABEL[grade.level]}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={5}
          className="z-50 max-w-[240px] rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md border border-border"
        >
          {grade.tooltip}
          <Tooltip.Arrow className="fill-popover" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAge(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24))
  if (days === 0) return "Idag"
  if (days === 1) return "Igår"
  if (days < 7) return `${days} dagar sedan`
  const weeks = Math.floor(days / 7)
  if (days < 30) return `${weeks} vecka${weeks > 1 ? "r" : ""} sedan`
  const months = Math.floor(days / 30)
  if (days < 365) return `${months} månad${months > 1 ? "er" : ""} sedan`
  const years = Math.floor(days / 365)
  return `${years} år sedan`
}

function formatListingDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const hasTime = /T\d{2}:\d{2}/.test(dateStr)
  const datePart = date.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" })
  if (hasTime) {
    const timePart = date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
    return `${datePart}, ${timePart}`
  }
  return datePart
}

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

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: CarStatus[] = ["interested", "contacted", "test_driven", "pass", "sold"]

const STATUS_LABEL: Record<CarStatus, string> = {
  interested: "Tillagd",
  contacted: "Favorit",
  test_driven: "Provkörd",
  pass: "Ej intressant",
  sold: "Såld",
}

const STATUS_BADGE_CLASS: Record<CarStatus, string> = {
  interested: "text-zinc-400 ring-1 ring-inset ring-zinc-300 dark:text-zinc-500 dark:ring-zinc-700",
  contacted: "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900",
  test_driven: "bg-zinc-600 text-zinc-50 dark:bg-zinc-500 dark:text-zinc-50",
  pass: "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
  sold: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
}

type RefreshStep = "idle" | "fetching" | "analyzing" | "summarizing" | "error"

const REFRESH_LABEL: Record<RefreshStep, string> = {
  idle: "Uppdatera",
  fetching: "Hämtar annons...",
  analyzing: "Analyserar...",
  summarizing: "Sammanfattar...",
  error: "Försök igen",
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CarPanelProps {
  car: CarRecord | null
  allCars?: CarRecord[]
  showHeader?: boolean
  onStatusChange: (id: number, status: CarStatus) => void
  onDelete: (id: number) => void
  onRefresh: (car: CarRecord) => void
  onSummaryGenerated: (id: number, fields: Pick<CarRecord, "aiModelOverview" | "aiCommonIssues" | "aiValueAssessment" | "aiScore" | "aiTldr">) => void
  onEdit: (car: CarRecord) => void
  onClose: () => void
  pendingAction?: { carId: number; action: "refresh" | "edit" } | null
  onPendingActionConsumed?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CarPanel({
  car,
  allCars,
  showHeader,
  onStatusChange,
  onDelete,
  onRefresh,
  onSummaryGenerated,
  onEdit,
  onClose,
  pendingAction,
  onPendingActionConsumed,
}: CarPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [refreshStep, setRefreshStep] = useState<RefreshStep>("idle")
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<Partial<CarRecord>>({})
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [statusMenuPos, setStatusMenuPos] = useState({ top: 0, left: 0 })
  const [panelMenuOpen, setPanelMenuOpen] = useState(false)
  const statusBadgeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setConfirmDelete(false)
    setIsEditing(false)
    setEditDraft({})
    setStatusMenuOpen(false)
    setPanelMenuOpen(false)
  }, [car?.id])

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
        if (statusMenuOpen) { setStatusMenuOpen(false); return }
        if (panelMenuOpen) { setPanelMenuOpen(false); return }
        if (confirmDelete) { setConfirmDelete(false); setIsEditing(false); return }
        if (isEditing) { setIsEditing(false); setEditDraft({}); return }
        onClose()
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [car, confirmDelete, isEditing, statusMenuOpen, panelMenuOpen, onClose])

  // Handle pending actions triggered from outside (e.g., row context menu)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingAction || car?.id !== pendingAction.carId) return
    onPendingActionConsumed?.()
    if (pendingAction.action === "edit") {
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
    } else if (pendingAction.action === "refresh") {
      handleRefresh()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, car?.id])

  if (!car) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Välj en bil för att visa detaljer
      </div>
    )
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

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
    const otherCars = (allCars ?? []).filter(c => c.id !== car.id)
    const result = await refreshCar(car, setRefreshStep, otherCars)
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

    const otherCars = (allCars ?? []).filter(c => c.id !== car.id)
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
        otherCars: otherCars.map(c => ({
          make: c.make,
          model: c.model,
          year: c.year,
          price: c.price,
          mileage: c.mileage,
        })),
      }),
    })

    const data = await res.json()
    setGenerating(false)

    if (!res.ok) { setGenError(data.error); return }

    const fields = {
      aiModelOverview: data.aiModelOverview,
      aiCommonIssues: data.aiCommonIssues,
      aiValueAssessment: data.aiValueAssessment,
      aiScore: data.aiScore ?? null,
      aiTldr: data.aiTldr ?? null,
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
      listingDate: updated.listingDate,
      equipment: updated.equipment,
      aiModelOverview: updated.aiModelOverview,
      aiCommonIssues: updated.aiCommonIssues,
      aiValueAssessment: updated.aiValueAssessment,
      aiScore: updated.aiScore,
      aiTldr: updated.aiTldr,
    })
    onEdit(updated)
    setIsEditing(false)
    setEditDraft({})
  }

  function openStatusMenu() {
    const el = statusBadgeRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setStatusMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
    setStatusMenuOpen(true)
  }

  // ── Grades ──────────────────────────────────────────────────────────────────

  const allCarsCtx = allCars ?? []
  const yearGrade = gradeYear(car.year, allCarsCtx)
  const priceGrade = car.price != null ? gradePrice(car.price, car.year, allCarsCtx) : null
  const mileageGrade = car.mileage != null ? gradeMileage(car.mileage, car.year, allCarsCtx) : null
  const hpGrade = car.horsepower != null ? gradeHorsepower(car.horsepower, allCarsCtx) : null
  const listingAgeGrade = gradeListingAge(car.listingDate ?? null)
  const scoreGrade = gradeScore(car.aiScore)

  const hasSummary = car.aiModelOverview || car.aiCommonIssues || car.aiValueAssessment
  const inputClass = "w-full bg-muted rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-foreground/30"

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="flex flex-col">

        {/* ── Panel sticky header ── */}
        {showHeader && (
          <div className="sticky top-0 z-10 bg-background border-b border-border flex items-center h-10 px-4 shrink-0 gap-2">
            <span className="text-sm font-medium truncate flex-1 min-w-0">
              {isEditing ? "Redigera bil" : `${car.year} ${car.make} ${car.model}`}
            </span>

            {/* Refresh progress in header */}
            {refreshStep !== "idle" && refreshStep !== "error" && (
              <span className="text-xs text-muted-foreground shrink-0">{REFRESH_LABEL[refreshStep]}</span>
            )}

            {/* Panel 3-dots menu */}
            <div className="relative shrink-0">
              <button
                onClick={() => setPanelMenuOpen(v => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors px-1 text-lg leading-none"
                aria-label="Åtgärder"
              >
                ···
              </button>
              {panelMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setPanelMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-40 rounded-md border border-border bg-background shadow-md py-1 text-sm">
                    <button
                      onClick={() => { setPanelMenuOpen(false); handleRefresh() }}
                      disabled={refreshStep !== "idle" && refreshStep !== "error"}
                      className="w-full text-left px-4 py-2 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {REFRESH_LABEL[refreshStep]}
                    </button>
                    <button
                      onClick={() => { setPanelMenuOpen(false); startEditing() }}
                      className="w-full text-left px-4 py-2 hover:bg-accent transition-colors"
                    >
                      Redigera
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => { setPanelMenuOpen(false); setConfirmDelete(true) }}
                      className="w-full text-left px-4 py-2 hover:bg-accent transition-colors text-destructive"
                    >
                      Ta bort bil
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors leading-none"
              aria-label="Stäng panel"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className={cn(
          "flex flex-col gap-6 p-6 transition-opacity duration-300",
          (refreshStep !== "idle" && refreshStep !== "error") || generating ? "opacity-40 pointer-events-none" : ""
        )}>

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

          {/* Title / edit form */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input className={inputClass} value={editDraft.make ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, make: e.target.value }))} placeholder="Märke" />
                <input className={inputClass} value={editDraft.model ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, model: e.target.value }))} placeholder="Modell" />
                <input className={`${inputClass} sm:w-20`} type="number" value={editDraft.year ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, year: Number(e.target.value) }))} placeholder="År" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input className={inputClass} type="number" value={editDraft.price ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value ? Number(e.target.value) : null }))} placeholder="Pris (kr)" />
                <input className={inputClass} type="number" value={editDraft.mileage ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, mileage: e.target.value ? Number(e.target.value) : null }))} placeholder="Miltal (mil)" />
                <input className={inputClass} type="number" value={editDraft.horsepower ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, horsepower: e.target.value ? Number(e.target.value) : null }))} placeholder="HK" />
              </div>
              <input className={inputClass} value={editDraft.location ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, location: e.target.value || null }))} placeholder="Ort" />
              <div className="flex gap-3">
                <button onClick={saveEdit} className="text-xs text-foreground hover:underline font-medium">Spara</button>
                <button onClick={() => { setIsEditing(false); setEditDraft({}) }} className="text-xs text-muted-foreground hover:text-foreground">Avbryt</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold">{car.year} {car.make} {car.model}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={car.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {car.marketplace.charAt(0).toUpperCase() + car.marketplace.slice(1)} ↗
                  </a>
                  {!showHeader && (
                    <>
                      <button
                        onClick={handleRefresh}
                        disabled={refreshStep !== "idle" && refreshStep !== "error"}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {REFRESH_LABEL[refreshStep]}
                      </button>
                      <button onClick={startEditing} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Redigera
                      </button>
                    </>
                  )}
                </div>
                {refreshError && <p className="text-xs text-destructive mt-1">{refreshError}</p>}
              </div>

              {/* Status badge — clickable */}
              <button ref={statusBadgeRef} onClick={openStatusMenu} className="shrink-0 mt-0.5">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_BADGE_CLASS[car.status])}>
                  {STATUS_LABEL[car.status]}
                </span>
              </button>
            </div>
          )}

          {/* Status dropdown */}
          {statusMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setStatusMenuOpen(false)} />
              <div
                className="fixed z-50 w-40 rounded-md border border-border bg-background shadow-md py-1 text-sm"
                style={{ top: statusMenuPos.top, left: statusMenuPos.left }}
              >
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { handleStatusChange(s); setStatusMenuOpen(false) }}
                    className={`w-full text-left px-4 py-2 hover:bg-accent transition-colors ${
                      car.status === s ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </>
          )}

          <Separator />

          {/* Main stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {scoreGrade && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Score</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{car.aiScore}/100</span>
                  <GradePill grade={scoreGrade} />
                </div>
              </div>
            )}
            {car.price != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Pris</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{car.price.toLocaleString("sv-SE")} kr</span>
                  {priceGrade && <GradePill grade={priceGrade} />}
                </div>
              </div>
            )}
            {car.mileage != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Miltal</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{car.mileage.toLocaleString("sv-SE")} mil</span>
                  {mileageGrade && <GradePill grade={mileageGrade} />}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Årsmodell</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{car.year}</span>
                {yearGrade && <GradePill grade={yearGrade} />}
              </div>
            </div>
            {car.horsepower != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Motoreffekt</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{car.horsepower} hk</span>
                  {hpGrade && <GradePill grade={hpGrade} />}
                </div>
              </div>
            )}
            {car.location && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Ort</span>
                <span className="text-sm font-medium">{car.location}</span>
              </div>
            )}
            {car.listingDate && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Uppdaterad</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{formatListingDate(car.listingDate)}</span>
                  {listingAgeGrade && <GradePill grade={listingAgeGrade} />}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* TL;DR callout */}
          {car.aiTldr && (
            <div className="bg-muted/50 rounded-lg px-4 py-3 flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TL;DR</span>
              <div className="flex flex-col gap-1.5 text-sm">
                {car.aiTldr.drawback.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0 w-24 text-xs pt-px">Nackdel</span>
                    <ul className="flex flex-col gap-0.5">
                      {car.aiTldr.drawback.map((d, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-muted-foreground shrink-0 mt-px">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 w-24 text-xs pt-px">Risk</span>
                  <span>{car.aiTldr.risk}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 w-24 text-xs pt-px">Sticker ut</span>
                  <span>{car.aiTldr.standout}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 w-24 text-xs pt-px">Rekommendation</span>
                  <span>{car.aiTldr.recommendation}</span>
                </div>
              </div>
            </div>
          )}

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

          {/* Delete — always shown in mobile (no header), shown inline when confirmDelete on desktop */}
          {(confirmDelete || !showHeader) && (
            <>
              <Separator />
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
            </>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  )
}
