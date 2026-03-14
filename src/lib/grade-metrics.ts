import type { CarRecord } from "@/types/car"

export type GradeLevel = "great" | "good" | "avg" | "poor" | "bad"

export interface Grade {
  level: GradeLevel
  tooltip: string
}

const LEVEL_ORDER: GradeLevel[] = ["great", "good", "avg", "poor", "bad"]

function worseOf(a: GradeLevel, b: GradeLevel): GradeLevel {
  return LEVEL_ORDER[Math.max(LEVEL_ORDER.indexOf(a), LEVEL_ORDER.indexOf(b))]
}


// Grade word used at start of tooltip
const GRADE_WORD: Record<GradeLevel, string> = {
  great: "Utmärkt",
  good: "Bra",
  avg: "OK",
  poor: "Sämre",
  bad: "Dåligt",
}

export function gradeYear(year: number | null | undefined, allCars: CarRecord[]): Grade | null {
  if (year == null) return null

  const age = new Date().getFullYear() - year
  let level: GradeLevel
  let marketDesc: string

  if (age <= 2) { level = "great"; marketDesc = "Mycket ny bil – minimal slitage och modern teknik." }
  else if (age <= 5) { level = "good"; marketDesc = "Relativt ny och modern." }
  else if (age <= 9) { level = "avg"; marketDesc = "Normal ålder för ett begagnat köp." }
  else if (age <= 14) { level = "poor"; marketDesc = "Äldre bil – tänk på underhållskostnader och rostskydd." }
  else { level = "bad"; marketDesc = "Gammal bil – förvänta dig slitage och renoveringar." }

  return {
    level,
    tooltip: `${GRADE_WORD[level]} – ${age} år gammal. ${marketDesc}`,
  }
}

export function gradeHorsepower(hp: number | null | undefined, allCars: CarRecord[]): Grade | null {
  if (hp == null) return null

  let level: GradeLevel
  let marketDesc: string

  if (hp >= 250) { level = "great"; marketDesc = "Hög effekt – sportig eller premiumklass." }
  else if (hp >= 160) { level = "good"; marketDesc = "Bra motorstyrka för en personbil." }
  else if (hp >= 100) { level = "avg"; marketDesc = "Genomsnittlig effekt för en familjecykeln." }
  else if (hp >= 70) { level = "poor"; marketDesc = "Låg effekt – märks vid motorvägskörning och överkörning." }
  else { level = "bad"; marketDesc = "Mycket låg effekt – passa för stadskörning." }

  return {
    level,
    tooltip: `${GRADE_WORD[level]} – ${marketDesc}`,
  }
}

export function gradeMileage(
  mileage: number | null | undefined,
  year: number | null | undefined,
  allCars: CarRecord[]
): Grade | null {
  if (mileage == null) return null

  const age = year != null ? new Date().getFullYear() - year : null
  const annualMil = age && age > 0 ? Math.round(mileage / age) : null

  // Market grade: absolute mileage thresholds
  let totalLevel: GradeLevel
  if (mileage < 3000) totalLevel = "great"
  else if (mileage < 8000) totalLevel = "good"
  else if (mileage < 15000) totalLevel = "avg"
  else if (mileage < 25000) totalLevel = "poor"
  else totalLevel = "bad"

  // Market grade: annual average (typical Swedish usage = 1 500–2 000 mil/år)
  let annualLevel: GradeLevel | null = null
  if (annualMil != null) {
    if (annualMil < 800) annualLevel = "great"
    else if (annualMil < 1500) annualLevel = "good"
    else if (annualMil < 2200) annualLevel = "avg"
    else if (annualMil < 3000) annualLevel = "poor"
    else annualLevel = "bad"
  }

  // 90% market (take worse of total + annual), 10% list (only in tooltip)
  const marketLevel = annualLevel ? worseOf(totalLevel, annualLevel) : totalLevel

  let marketDesc: string
  if (marketLevel === "great") marketDesc = "Mycket lågt – troligtvis välskött med minimal mekanisk belastning."
  else if (marketLevel === "good") marketDesc = "Lågt för åldern – bra tecken på sparsam körning."
  else if (marketLevel === "avg") marketDesc = "Normalt. Genomsnitt ca 1 500–2 000 mil/år."
  else if (marketLevel === "poor") marketDesc = "Högt – extra viktigt med besiktning och servicehistorik."
  else marketDesc = "Mycket högt – förvänta dig slitage och kommande reparationer."

  const annualStr = annualMil != null ? ` (~${annualMil.toLocaleString("sv-SE")} mil/år)` : ""

  return {
    level: marketLevel,
    tooltip: `${GRADE_WORD[marketLevel]}${annualStr} – ${marketDesc}`,
  }
}

export function gradePrice(
  price: number | null | undefined,
  year: number | null | undefined,
  allCars: CarRecord[]
): Grade | null {
  if (price == null) return null

  // Market grade (90%): price per remaining useful year
  // Assumes a car's useful life ≈ 30 years from manufacture
  let marketLevel: GradeLevel = "avg"
  let marketDesc = ""

  if (year != null) {
    const age = new Date().getFullYear() - year
    const remainingYears = Math.max(30 - age, 1)
    const costPerYear = Math.round(price / remainingYears)

    if (costPerYear < 5000) { marketLevel = "great"; marketDesc = `${costPerYear.toLocaleString("sv-SE")} kr/återstående år – mycket bra värde för pengarna.` }
    else if (costPerYear < 12000) { marketLevel = "good"; marketDesc = `${costPerYear.toLocaleString("sv-SE")} kr/återstående år – bra värde.` }
    else if (costPerYear < 18000) { marketLevel = "avg"; marketDesc = `${costPerYear.toLocaleString("sv-SE")} kr/återstående år – normalt för marknaden.` }
    else if (costPerYear < 25000) { marketLevel = "poor"; marketDesc = `${costPerYear.toLocaleString("sv-SE")} kr/återstående år – dyrare relativt bilens återstående livslängd.` }
    else { marketLevel = "bad"; marketDesc = `${costPerYear.toLocaleString("sv-SE")} kr/återstående år – högt pris för bilens ålder.` }
  }

  // List grade (10%): percentile rank in current list
  const validPrices = allCars.map((c) => c.price).filter((p): p is number => p != null)
  let listLevel: GradeLevel = "avg"
  let listDesc = ""

  if (validPrices.length >= 2) {
    const sorted = [...validPrices].sort((a, b) => a - b)
    const rank = sorted.indexOf(price) + 1
    const total = sorted.length
    const avgPrice = Math.round(validPrices.reduce((s, p) => s + p, 0) / validPrices.length)
    const diffPct = Math.round(((price - avgPrice) / avgPrice) * 100)

    const pct = rank / total
    if (pct <= 0.25) listLevel = "great"
    else if (pct <= 0.45) listLevel = "good"
    else if (pct <= 0.6) listLevel = "avg"
    else if (pct <= 0.8) listLevel = "poor"
    else listLevel = "bad"

    const diffStr =
      diffPct < 0 ? `${Math.abs(diffPct)}% under` : diffPct > 0 ? `${diffPct}% över` : "exakt på"
    listDesc = ` ${diffStr} medelpriset i listan (${avgPrice.toLocaleString("sv-SE")} kr).`
  } else if (marketDesc === "") {
    listDesc = " Lägg till fler bilar för prisjämförelse."
  }

  // Weighted 90% market + 10% list
  const marketIdx = LEVEL_ORDER.indexOf(marketLevel)
  const listIdx = LEVEL_ORDER.indexOf(listLevel)
  const weightedIdx = Math.min(4, Math.round(marketIdx * 0.9 + listIdx * 0.1))
  const level = LEVEL_ORDER[weightedIdx]

  const tooltip = marketDesc
    ? `${GRADE_WORD[level]} – ${marketDesc}${listDesc}`
    : `${GRADE_WORD[level]} –${listDesc}`

  return { level, tooltip }
}
