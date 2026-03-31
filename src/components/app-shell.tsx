"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { AddCarForm } from "@/components/add-car-form"
import { CarList } from "@/components/car-list"
import { CarPanel } from "@/components/car-panel"
import { ProjectSidebar } from "@/components/project-sidebar"
import { getAllCars, updateCarStatus } from "@/lib/db"
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

interface AppShellProps {
  projectId: number
  projectName: string
  projectSlug: string
}

export function AppShell({ projectId, projectName, projectSlug: _projectSlug }: AppShellProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [cars, setCars] = useState<CarRecord[]>([])
  const [selected, setSelected] = useState<CarRecord | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0 })
  const [addCarOpen, setAddCarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ carId: number; action: "refresh" | "edit" } | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0 })
  const [pendingRows, setPendingRows] = useState<{ tempId: string; url: string }[]>([])
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    getAllCars(projectId).then(setCars)
  }, [projectId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (sidebarOpen) { setSidebarOpen(false); return }
      if (addCarOpen) { setAddCarOpen(false); return }
      if (menuOpen) { setMenuOpen(false); return }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [addCarOpen, menuOpen, sidebarOpen])

  function handleAdd(car: CarRecord) {
    setCars((prev) => {
      const exists = prev.some((c) => c.id === car.id)
      return exists ? prev.map((c) => (c.id === car.id ? car : c)) : [car, ...prev]
    })
    setSelected(car)
    setPendingRows(prev => prev.filter(r => r.url !== car.listingUrl))
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
    fields: Pick<CarRecord, "aiModelOverview" | "aiCommonIssues" | "aiValueAssessment" | "aiScore" | "aiTldr">
  ) {
    setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)))
    setSelected((prev) => (prev?.id === id ? { ...prev, ...fields } : prev))
  }

  function handleEdit(car: CarRecord) {
    setCars((prev) => prev.map((c) => (c.id === car.id ? car : c)))
    setSelected((prev) => (prev?.id === car.id ? car : prev))
  }

  function handleRowRefresh(car: CarRecord) {
    setSelected(car)
    setPendingAction({ carId: car.id!, action: "refresh" })
  }

  function handleRowEdit(car: CarRecord) {
    setSelected(car)
    setPendingAction({ carId: car.id!, action: "edit" })
  }

  function handleRowDelete(car: CarRecord) {
    handleDelete(car.id!)
  }

  function handleProcessing(url: string, tempId: string) {
    setPendingRows(prev => [...prev, { tempId, url }])
    setAddCarOpen(false)
  }

  function handleBulkProcessingStart(items: { url: string; tempId: string }[]) {
    setPendingRows(prev => [...prev, ...items])
    setAddCarOpen(false)
  }

  function handleProcessingError(tempId: string) {
    setPendingRows(prev => prev.filter(r => r.tempId !== tempId))
  }

  async function handleCheckSoldStatus() {
    const nonSold = cars.filter(c => c.status !== "sold")
    if (nonSold.length === 0) return
    setMenuOpen(false)
    setCheckingStatus(true)
    setCheckProgress({ current: 0, total: nonSold.length })
    for (let i = 0; i < nonSold.length; i++) {
      setCheckProgress({ current: i + 1, total: nonSold.length })
      const car = nonSold[i]
      try {
        const res = await fetch("/api/fetch-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: car.listingUrl }),
        })
        const data = await res.json()
        if (res.ok && data.isSold) {
          await updateCarStatus(car.id!, "sold")
          setCars(prev => prev.map(c => c.id === car.id ? { ...c, status: "sold" as const } : c))
          setSelected(prev => (prev !== null && prev.id === car.id) ? { ...prev, status: "sold" as const } : prev)
        }
      } catch { /* skip */ }
    }
    setCheckingStatus(false)
  }

  async function handleRefreshAll() {
    const snapshot = [...cars]
    setRefreshingAll(true)
    setRefreshProgress({ current: 0, total: snapshot.length })

    for (let i = 0; i < snapshot.length; i++) {
      setRefreshProgress({ current: i + 1, total: snapshot.length })
      setRefreshingId(snapshot[i].id ?? null)
      const otherCars = snapshot.filter((_, j) => j !== i)
      const result = await refreshCar(snapshot[i], undefined, otherCars)
      setCars((prev) => prev.map((c) => (c.id === result.car.id ? result.car : c)))
      setSelected((prev) => (prev?.id === result.car.id ? result.car : prev))
    }

    setRefreshingId(null)
    setRefreshingAll(false)
  }

  return (
    <div
      className="h-screen overflow-hidden grid bg-background text-foreground"
      style={
        isMobile
          ? { gridTemplateColumns: "1fr 0fr" }
          : {
              gridTemplateColumns: selected ? "2fr 1fr" : "1fr 0fr",
              transition: "grid-template-columns 300ms ease-in-out",
            }
      }
    >
      {/* Project sidebar */}
      <ProjectSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeProjectId={projectId}
      />

      {/* Left column: header + list */}
      <div className={`min-w-0 flex flex-col overflow-hidden ${!isMobile && selected ? "border-r border-border" : ""}`}>
        <header className="flex h-10 shrink-0 items-center border-b border-border px-4 gap-2">
          {/* Burger menu */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors flex flex-col gap-[3px] justify-center items-center w-5 h-5 shrink-0"
            aria-label="Projektmeny"
          >
            <span className="block w-[14px] h-[1.5px] bg-current rounded-full" />
            <span className="block w-[14px] h-[1.5px] bg-current rounded-full" />
            <span className="block w-[14px] h-[1.5px] bg-current rounded-full" />
          </button>

          <span className="text-sm font-medium tracking-tight truncate">{projectName}</span>

          <div className="ml-auto flex items-center gap-2">
            {(refreshingAll || checkingStatus) && (
              <span className="text-xs text-muted-foreground">
                {refreshingAll
                  ? `Uppdaterar ${refreshProgress.current}/${refreshProgress.total}...`
                  : `Kollar ${checkProgress.current}/${checkProgress.total}...`}
              </span>
            )}

            <button
              onClick={() => setAddCarOpen(true)}
              className="text-xs px-3 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity font-medium"
            >
              Lägg till
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors px-1 text-lg leading-none"
                aria-label="Meny"
              >
                ···
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-md border border-border bg-background shadow-md py-1 text-sm">
                    <button
                      onClick={() => { setMenuOpen(false); handleRefreshAll() }}
                      disabled={cars.length === 0 || refreshingAll || checkingStatus}
                      className="w-full text-left px-4 py-2 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Uppdatera alla
                    </button>
                    <button
                      onClick={handleCheckSoldStatus}
                      disabled={cars.length === 0 || refreshingAll || checkingStatus}
                      className="w-full text-left px-4 py-2 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Uppdatera status
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => { setMenuOpen(false); setTheme(resolvedTheme === "dark" ? "light" : "dark") }}
                      className="w-full text-left px-4 py-2 hover:bg-accent transition-colors text-muted-foreground"
                    >
                      {resolvedTheme === "dark" ? "☀ Ljust läge" : "☾ Mörkt läge"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <CarList
              cars={cars}
              selectedId={selected?.id}
              onSelect={setSelected}
              onRowRefresh={handleRowRefresh}
              onRowEdit={handleRowEdit}
              onRowDelete={handleRowDelete}
              pendingRows={pendingRows}
              refreshingId={refreshingId}
            />
        </div>
      </div>

      {/* Right column: panel — full screen height */}
      <div className="hidden md:block overflow-hidden" style={{ minWidth: 0 }}>
        <div className="h-full overflow-y-auto">
          <CarPanel
            car={selected}
            allCars={cars}
            showHeader={true}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
            onSummaryGenerated={handleSummaryGenerated}
            onEdit={handleEdit}
            onClose={() => setSelected(null)}
            pendingAction={pendingAction}
            onPendingActionConsumed={() => setPendingAction(null)}
            onRefreshStart={(id) => setRefreshingId(id)}
            onRefreshEnd={() => setRefreshingId(null)}
          />
        </div>
      </div>

      {/* Lägg till modal */}
      {addCarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setAddCarOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 rounded-xl border border-border bg-background shadow-lg" style={{ width: "min(calc(100vw - 2rem), 28rem)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Lägg till bil</span>
              <button
                onClick={() => setAddCarOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors leading-none"
                aria-label="Stäng"
              >✕</button>
            </div>
            <div className="p-4">
              <AddCarForm
                projectId={projectId}
                onAdd={handleAdd}
                onClose={() => setAddCarOpen(false)}
                onProcessing={handleProcessing}
                onProcessingError={handleProcessingError}
                onBulkProcessingStart={handleBulkProcessingStart}
              />
            </div>
          </div>
        </>
      )}

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
                allCars={cars}
                showHeader={false}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onRefresh={handleRefresh}
                onSummaryGenerated={handleSummaryGenerated}
                onEdit={handleEdit}
                onClose={() => setSelected(null)}
                pendingAction={pendingAction}
                onPendingActionConsumed={() => setPendingAction(null)}
                onRefreshStart={(id) => setRefreshingId(id)}
                onRefreshEnd={() => setRefreshingId(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
