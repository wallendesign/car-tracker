// src/lib/db.ts
// Server-backed persistence via /api/cars routes (Neon Postgres)
// Previously used Dexie.js (IndexedDB) — swapped to cross-device server storage.
// All function signatures are identical so components need no changes.

import type { CarRecord } from "@/types/car"

export async function saveCar(car: Omit<CarRecord, "id">): Promise<number> {
  const res = await fetch("/api/cars", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(car),
  })
  const data = await res.json()
  return data.id as number
}

export async function getAllCars(): Promise<CarRecord[]> {
  const res = await fetch("/api/cars")
  return res.json()
}

export async function updateCarStatus(
  id: number,
  status: CarRecord["status"]
): Promise<void> {
  await fetch(`/api/cars/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
}

export async function updateCarAISummary(
  id: number,
  fields: Pick<CarRecord, "aiModelOverview" | "aiCommonIssues" | "aiValueAssessment">
): Promise<void> {
  await fetch(`/api/cars/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  })
}

export async function updateCarData(
  id: number,
  data: Omit<CarRecord, "id" | "status" | "createdAt">
): Promise<void> {
  await fetch(`/api/cars/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export async function deleteCar(id: number): Promise<void> {
  await fetch(`/api/cars/${id}`, { method: "DELETE" })
}

export async function getCarByUrl(url: string): Promise<CarRecord | undefined> {
  const res = await fetch(`/api/cars?url=${encodeURIComponent(url)}`)
  const data = await res.json()
  return data ?? undefined
}
