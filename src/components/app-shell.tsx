"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { AddCarForm } from "@/components/add-car-form"
import { CarList } from "@/components/car-list"
import { CarPanel } from "@/components/car-panel"
import { getAllCars } from "@/lib/db"
import { refreshCar } from "@/lib/refresh-car"
import type { CarRecord, CarStatus } from "@/types/car"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isMobile
}

export function AppShell() {
  const { resolvedTheme, setTheme } = useTheme()
  const [cars, setCars] = useState<CarRecord[]>([])
  const [selected, setSelected] = useState<CarRecord | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0 })
  const isMobile = useIsMobile()

  useEffect(() => {
    getAllCars().then(setCars)
  }, [])

  function handleAdd(car: CarRecord) {
    setCars((prev) => {
      const exists = prev.some((c) => c.id === car.id)
      return exists ? prev.map((c) => (c.id === car.id ? car : c)) : [car, ...prev]
    })
    setSelected(car)
  }

  function handleStatusChange(id: number, status: CarStatus) {
    setCars((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev))
  }

  function handleRefresh(car: CarRecord) {
    setCars((prev) => prev.map((c) => (c.id === car.id ? car : c)))
    setSelected((prev) => (prev?.id === car.id ? car : prev))
  }

  function handleDelete(id: number) {
    setCars((prev) => prev.filter((c) => c.id !== id))
    setSelected((prev) => (prev?.id === id ? null : prev))
  }

  function handleSummaryGenerated(
    id: number,
    fields: Pick<CarRecord, "aiModelOverview" | "aiCommonIssues" | "aiValueAssessment">
  ) {
    setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)))
    setSelected((prev) => (prev?.id === id ? { ...prev, ...fields } : prev))
  }

  function handleEdit(car: CarRecord) {
    setCars((prev) => prev.map((c) => (c.id === car.id ? car : c)))
    setSelected((prev) => (prev?.id === car.id ? car : prev))
  }

  async function handleRefreshAll() {
    const snapshot = [...cars]
    setRefreshingAll(true)
    setRefreshProgress({ current: 0, total: snapshot.length })

    for (let i = 0; i < snapshot.length; i++) {
      setRefreshProgress({ current: i + 1, total: snapshot.length })
      const result = await refreshCar(snapshot[i])
      setCars((prev) => prev.map((c) => (c.id === result.car.id ? result.car : c)))
      setSelected((prev) => (prev?.id === result.car.id ? result.car : prev))
    }

    setRefreshingAll(false)
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span className="text-sm font-medium tracking-tight">Bilspåraren</span>
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {resolvedTheme === "dark" ? "☀ Ljust" : "☾ Mörkt"}
          </button>
          {refreshingAll ? (
            <span className="text-xs text-muted-foreground">
              Uppdaterar {refreshProgress.current}/{refreshProgress.total}...
            </span>
          ) : (
            <button
              onClick={handleRefreshAll}
              disabled={cars.length === 0}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              Uppdatera alla
            </button>
          )}
        </div>
      </header>

      <div
        className="flex-1 overflow-hidden grid"
        style={
          isMobile
            ? { gridTemplateColumns: "1fr 0fr" }
            : {
                gridTemplateColumns: selected ? "2fr 1fr" : "1fr 0fr",
                transition: "grid-template-columns 300ms ease-in-out",
              }
        }
      >
        {/* Car table — expands to full width when no selection */}
        <div className={`min-w-0 flex flex-col overflow-hidden ${!isMobile && selected ? "border-r border-border" : ""}`}>
          <AddCarForm onAdd={handleAdd} />
          <div className="flex-1 overflow-y-auto">
            <CarList cars={cars} selectedId={selected?.id} onSelect={setSelected} />
          </div>
        </div>

        {/* Detail panel — slides in from the right (desktop only) */}
        <div className="hidden md:block overflow-hidden" style={{ minWidth: 0 }}>
          <main className="relative h-full overflow-y-auto p-6">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-4 text-base text-muted-foreground hover:text-foreground transition-colors leading-none"
              aria-label="Stäng panel"
            >
              ✕
            </button>
            <CarPanel
              car={selected}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
              onSummaryGenerated={handleSummaryGenerated}
              onEdit={handleEdit}
              onClose={() => setSelected(null)}
            />
          </main>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelected(null)}
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
              selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          />
          {/* Sheet */}
          <div
            className={`fixed inset-x-0 bottom-0 z-50 h-[85svh] bg-background border-t border-border rounded-t-xl flex flex-col transition-transform duration-300 ease-in-out ${
              selected ? "translate-y-0" : "translate-y-full"
            }`}
          >
            {/* Header */}
            <div className="relative flex items-center px-4 py-3 shrink-0 border-b border-border">
              <div className="absolute left-1/2 -translate-x-1/2 top-2 w-8 h-1 rounded-full bg-border" />
              <span className="text-sm font-medium truncate pr-8">
                {selected ? `${selected.year} ${selected.make} ${selected.model}` : ""}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="absolute right-4 text-muted-foreground hover:text-foreground transition-colors leading-none"
                aria-label="Stäng"
              >
                ✕
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <CarPanel
                car={selected}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onRefresh={handleRefresh}
                onSummaryGenerated={handleSummaryGenerated}
                onEdit={handleEdit}
                onClose={() => setSelected(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
