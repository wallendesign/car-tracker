"use client"

import { useEffect, useState } from "react"
import { AddCarForm } from "@/components/add-car-form"
import { CarList } from "@/components/car-list"
import { CarPanel } from "@/components/car-panel"
import { getAllCars } from "@/lib/db"
import { refreshCar } from "@/lib/refresh-car"
import type { CarRecord, CarStatus } from "@/types/car"

export function AppShell() {
  const [cars, setCars] = useState<CarRecord[]>([])
  const [selected, setSelected] = useState<CarRecord | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0 })

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
        <div className="ml-auto">
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

      <div className="flex flex-1 overflow-hidden">
        {/* Car table — 2/3 width */}
        <div className="flex w-2/3 shrink-0 flex-col border-r border-border">
          <AddCarForm onAdd={handleAdd} />
          <div className="flex-1 overflow-y-auto">
            <CarList cars={cars} selectedId={selected?.id} onSelect={setSelected} />
          </div>
        </div>

        {/* Detail panel — 1/3 width */}
        <main className="w-1/3 overflow-y-auto p-6">
          <CarPanel
            car={selected}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
            onSummaryGenerated={handleSummaryGenerated}
          />
        </main>
      </div>
    </div>
  )
}
