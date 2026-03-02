// src/lib/db.ts
// Dexie.js v4 — IndexedDB persistence layer for CarRecord
// IMPORTANT: Only import this in Client Components or hooks (IndexedDB is browser-only)
// See RESEARCH.md Pitfall 1: "window is not defined" if imported in Server Components

import Dexie, { type EntityTable } from "dexie"
import type { CarRecord } from "@/types/car"

const db = new Dexie("CarTrackerDB") as Dexie & {
  cars: EntityTable<CarRecord, "id">
}

db.version(1).stores({
  // Indexed fields: id (PK, auto-increment), make, model, year, status, createdAt
  // Only index fields you query/sort by — photoUrl and AI text fields are NOT indexed
  cars: "++id, make, model, year, status, createdAt",
})

export { db }

// Typed helper functions — import these in client components instead of using db directly
// This gives Phase 3 a clean API surface

export async function saveCar(car: Omit<CarRecord, "id">): Promise<number> {
  // Dexie auto-increment always returns the generated key; cast is safe here
  return db.cars.add(car) as Promise<number>
}

export async function getAllCars(): Promise<CarRecord[]> {
  return db.cars.orderBy("createdAt").reverse().toArray()
}

export async function updateCarStatus(
  id: number,
  status: CarRecord["status"]
): Promise<void> {
  await db.cars.update(id, { status })
}

export async function updateCarAISummary(
  id: number,
  fields: Pick<CarRecord, "aiModelOverview" | "aiCommonIssues" | "aiValueAssessment">
): Promise<void> {
  await db.cars.update(id, fields)
}

export async function deleteCar(id: number): Promise<void> {
  await db.cars.delete(id)
}
