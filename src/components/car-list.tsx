"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Tooltip } from "radix-ui"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  gradeYear,
  gradeHorsepower,
  gradeMileage,
  gradePrice,
  type Grade,
  type GradeLevel,
} from "@/lib/grade-metrics"

import type { CarRecord, CarStatus } from "@/types/car"

const STATUS_VARIANT: Record<CarStatus, "default" | "secondary" | "outline"> = {
  interested: "default",
  contacted: "secondary",
  pass: "outline",
  sold: "outline",
}

const STATUS_LABEL: Record<CarStatus, string> = {
  interested: "Intresserad",
  contacted: "Kontaktad",
  pass: "Passar ej",
  sold: "Såld",
}

const GRADE_CLASS: Record<GradeLevel, string> = {
  great: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  good: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  avg: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  poor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  bad: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
}

function GradePill({ grade, value }: { grade: Grade; value: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          className={cn(
            "rounded-full px-2 text-[11px] font-medium leading-5 cursor-default shrink-0 tabular-nums",
            GRADE_CLASS[grade.level]
          )}
        >
          {value}
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

type SortCol = "model" | "year" | "hp" | "mileage" | "price"
type SortDir = "asc" | "desc"

interface CarListProps {
  cars: CarRecord[]
  selectedId?: number | null
  onSelect: (car: CarRecord) => void
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 opacity-30">↕</span>
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>
}

const rangeInputClass =
  "w-20 bg-transparent border border-border rounded px-2 py-0.5 text-xs outline-none focus:border-foreground/40 placeholder:text-muted-foreground/50 tabular-nums"

export function CarList({ cars, selectedId, onSelect }: CarListProps) {
  const [sortCol, setSortCol] = useState<SortCol | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [statusFilter, setStatusFilter] = useState<CarStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [yearMin, setYearMin] = useState<number | "">("")
  const [yearMax, setYearMax] = useState<number | "">("")
  const [priceMin, setPriceMin] = useState<number | "">("")
  const [priceMax, setPriceMax] = useState<number | "">("")
  const [hpMin, setHpMin] = useState<number | "">("")
  const [hpMax, setHpMax] = useState<number | "">("")
  const [mileageMin, setMileageMin] = useState<number | "">("")
  const [mileageMax, setMileageMax] = useState<number | "">("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterPos, setFilterPos] = useState({ top: 0, right: 0 })
  const searchRef = useRef<HTMLInputElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  function openFilters() {
    const btn = filterBtnRef.current
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setFilterPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setFiltersOpen(true)
  }

  function handleSortClick(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
  }

  const displayed = useMemo(() => {
    let result = statusFilter === "all" ? cars : cars.filter((c) => c.status === statusFilter)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          `${c.make} ${c.model}`.toLowerCase().includes(q)
      )
    }

    if (yearMin !== "") result = result.filter((c) => c.year >= (yearMin as number))
    if (yearMax !== "") result = result.filter((c) => c.year <= (yearMax as number))
    if (priceMin !== "") result = result.filter((c) => c.price != null && c.price >= (priceMin as number))
    if (priceMax !== "") result = result.filter((c) => c.price != null && c.price <= (priceMax as number))
    if (hpMin !== "") result = result.filter((c) => c.horsepower != null && c.horsepower >= (hpMin as number))
    if (hpMax !== "") result = result.filter((c) => c.horsepower != null && c.horsepower <= (hpMax as number))
    if (mileageMin !== "") result = result.filter((c) => c.mileage != null && c.mileage >= (mileageMin as number))
    if (mileageMax !== "") result = result.filter((c) => c.mileage != null && c.mileage <= (mileageMax as number))

    if (sortCol) {
      result = [...result].sort((a, b) => {
        let av: number | string | null = null
        let bv: number | string | null = null

        if (sortCol === "model") { av = `${a.make} ${a.model}`; bv = `${b.make} ${b.model}` }
        if (sortCol === "year") { av = a.year ?? null; bv = b.year ?? null }
        if (sortCol === "hp") { av = a.horsepower ?? null; bv = b.horsepower ?? null }
        if (sortCol === "mileage") { av = a.mileage ?? null; bv = b.mileage ?? null }
        if (sortCol === "price") { av = a.price ?? null; bv = b.price ?? null }

        if (av === null && bv === null) return 0
        if (av === null) return 1
        if (bv === null) return -1

        const cmp = typeof av === "string"
          ? av.localeCompare(bv as string, "sv")
          : (av as number) - (bv as number)
        return sortDir === "asc" ? cmp : -cmp
      })
    }

    return result
  }, [cars, sortCol, sortDir, statusFilter, search, yearMin, yearMax, priceMin, priceMax, hpMin, hpMax, mileageMin, mileageMax])

  function thProps(col: SortCol, align: "left" | "right" = "right") {
    return {
      onClick: () => handleSortClick(col),
      className: `py-2 px-3 font-normal cursor-pointer select-none hover:text-foreground transition-colors text-${align}`,
    }
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="flex flex-col">
        {/* Toolbar: count · status pills · search · filtrera */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border overflow-x-auto">
          {/* Count */}
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {displayed.length} bil{displayed.length !== 1 ? "ar" : ""}
          </span>

          {/* Status pills */}
          {(["all", "interested", "contacted", "pass", "sold"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {s === "all" ? "Alla" : STATUS_LABEL[s]}
            </button>
          ))}

          {/* Search */}
          <div className="ml-auto shrink-0 flex items-center">
            {searchOpen ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Sök märke eller modell..."
                  className="w-40 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
                />
                <button
                  onClick={() => { setSearch(""); setSearchOpen(false) }}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs leading-none"
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-xs px-2.5 py-0.5 rounded-full hover:bg-accent"
                aria-label="Sök"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Sök
              </button>
            )}
          </div>

          {/* Filtrera dropdown */}
          <div className="shrink-0">
            <button
              ref={filterBtnRef}
              onClick={() => filtersOpen ? setFiltersOpen(false) : openFilters()}
              className={`text-xs px-2.5 py-0.5 rounded-full transition-colors ${
                filtersOpen || yearMin !== "" || yearMax !== "" || priceMin !== "" || priceMax !== "" || hpMin !== "" || hpMax !== "" || mileageMin !== "" || mileageMax !== ""
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              Filtrera
            </button>
            {filtersOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)} />
                <div className="fixed z-50 w-64 rounded-md border border-border bg-background shadow-md p-3 flex flex-col gap-3" style={{ top: filterPos.top, right: filterPos.right }}>
                  {/* År */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-12 shrink-0">År</span>
                    <input type="number" value={yearMin} onChange={(e) => setYearMin(e.target.value ? Number(e.target.value) : "")} placeholder="från" className={rangeInputClass} />
                    <span>–</span>
                    <input type="number" value={yearMax} onChange={(e) => setYearMax(e.target.value ? Number(e.target.value) : "")} placeholder="till" className={rangeInputClass} />
                  </div>
                  {/* Pris */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-12 shrink-0">Pris</span>
                    <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : "")} placeholder="från" className={rangeInputClass} />
                    <span>–</span>
                    <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : "")} placeholder="till" className={rangeInputClass} />
                  </div>
                  {/* Hästkrafter */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-12 shrink-0">HK</span>
                    <input type="number" value={hpMin} onChange={(e) => setHpMin(e.target.value ? Number(e.target.value) : "")} placeholder="från" className={rangeInputClass} />
                    <span>–</span>
                    <input type="number" value={hpMax} onChange={(e) => setHpMax(e.target.value ? Number(e.target.value) : "")} placeholder="till" className={rangeInputClass} />
                  </div>
                  {/* Miltal */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-12 shrink-0">Miltal</span>
                    <input type="number" value={mileageMin} onChange={(e) => setMileageMin(e.target.value ? Number(e.target.value) : "")} placeholder="från" className={rangeInputClass} />
                    <span>–</span>
                    <input type="number" value={mileageMax} onChange={(e) => setMileageMax(e.target.value ? Number(e.target.value) : "")} placeholder="till" className={rangeInputClass} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {displayed.length === 0 ? (
          <div className="px-4 py-6 text-xs text-muted-foreground">
            {cars.length === 0
              ? "Inga bilar ännu. Klistra in en länk ovan."
              : "Inga bilar matchar filtret."}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="w-12 py-2 px-3 font-normal text-left" />
                <th {...thProps("model", "left")}>
                  Modell <SortIndicator active={sortCol === "model"} dir={sortDir} />
                </th>
                <th onClick={() => handleSortClick("year")} className="hidden md:table-cell py-2 px-3 font-normal cursor-pointer select-none hover:text-foreground transition-colors text-right">
                  År <SortIndicator active={sortCol === "year"} dir={sortDir} />
                </th>
                <th onClick={() => handleSortClick("hp")} className="hidden md:table-cell py-2 px-3 font-normal cursor-pointer select-none hover:text-foreground transition-colors text-right">
                  HK <SortIndicator active={sortCol === "hp"} dir={sortDir} />
                </th>
                <th onClick={() => handleSortClick("mileage")} className="hidden md:table-cell py-2 px-3 font-normal cursor-pointer select-none hover:text-foreground transition-colors text-right">
                  Miltal <SortIndicator active={sortCol === "mileage"} dir={sortDir} />
                </th>
                <th {...thProps("price")}>
                  Pris <SortIndicator active={sortCol === "price"} dir={sortDir} />
                </th>
                <th className="hidden md:table-cell py-2 px-3 font-normal text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((car) => {
                const yearGrade = gradeYear(car.year, cars)
                const hpGrade = gradeHorsepower(car.horsepower, cars)
                const mileageGrade = gradeMileage(car.mileage, car.year, cars)
                const priceGrade = gradePrice(car.price, car.year, cars)

                return (
                  <tr
                    key={car.id}
                    onClick={() => onSelect(car)}
                    className={`border-b border-border cursor-pointer transition-colors ${
                      car.id === selectedId ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                  >
                    {/* Thumbnail */}
                    <td className="py-2 px-3">
                      <div className="w-10 h-7 rounded bg-muted overflow-hidden shrink-0">
                        {car.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/image-proxy?url=${encodeURIComponent(car.photoUrl)}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </td>

                    {/* Make + Model */}
                    <td className="py-2 px-3 font-medium">
                      <div className="whitespace-nowrap">{car.make} {car.model}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 md:hidden">
                        {yearGrade
                          ? <GradePill grade={yearGrade} value={String(car.year)} />
                          : <span className="text-muted-foreground text-[11px] tabular-nums">{car.year ?? "—"}</span>}
                        {hpGrade
                          ? <GradePill grade={hpGrade} value={`${car.horsepower} hk`} />
                          : <span className="text-muted-foreground text-[11px]">—</span>}
                        {mileageGrade
                          ? <GradePill grade={mileageGrade} value={`${car.mileage!.toLocaleString("sv-SE")} mil`} />
                          : car.mileage != null ? <span className="text-muted-foreground text-[11px] tabular-nums">{car.mileage.toLocaleString("sv-SE")} mil</span> : null}
                      </div>
                    </td>

                    {/* Year */}
                    <td className="hidden md:table-cell py-2 px-3 text-right">
                      {yearGrade
                        ? <GradePill grade={yearGrade} value={String(car.year)} />
                        : <span className="text-muted-foreground tabular-nums">{car.year ?? "—"}</span>}
                    </td>

                    {/* Horsepower */}
                    <td className="hidden md:table-cell py-2 px-3 text-right">
                      {hpGrade
                        ? <GradePill grade={hpGrade} value={`${car.horsepower} hk`} />
                        : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Mileage */}
                    <td className="hidden md:table-cell py-2 px-3 text-right whitespace-nowrap">
                      {mileageGrade
                        ? <GradePill grade={mileageGrade} value={`${car.mileage!.toLocaleString("sv-SE")} mil`} />
                        : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Price */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {priceGrade
                        ? <GradePill grade={priceGrade} value={`${car.price!.toLocaleString("sv-SE")} kr`} />
                        : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Status */}
                    <td className="hidden md:table-cell py-2 px-3">
                      {car.status !== "interested" && (
                        <Badge
                          variant={STATUS_VARIANT[car.status]}
                          className={`text-xs${car.status === "sold" ? " opacity-50" : ""}`}
                        >
                          {STATUS_LABEL[car.status]}
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Tooltip.Provider>
  )
}
