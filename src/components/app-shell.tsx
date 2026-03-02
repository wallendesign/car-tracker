"use client"

import { useEffect, useState } from "react"
import { AddCarForm } from "@/components/add-car-form"
import { CarList } from "@/components/car-list"
import { CarPanel } from "@/components/car-panel"
import { getAllCars } from "@/lib/db"
import type { CarRecord, CarStatus } from "@/types/car"

export function AppShell() {
  const [cars, setCars] = useState<CarRecord[]>([])
  const [selected, setSelected] = useState<CarRecord | null>(null)

  useEffect(() => {
    getAllCars().then(setCars)
  }, [])

  function handleAdd(car: CarRecord) {
    setCars((prev) => [car, ...prev])
    setSelected(car)
  }

  function handleStatusChange(id: number, status: CarStatus) {
    setCars((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev))
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

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span className="text-sm font-medium tracking-tight">Car Tracker</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-border flex flex-col">
          <AddCarForm onAdd={handleAdd} />
          <CarList cars={cars} selectedId={selected?.id} onSelect={setSelected} />
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <CarPanel
            car={selected}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onSummaryGenerated={handleSummaryGenerated}
          />
        </main>
      </div>
    </div>
  )
}
