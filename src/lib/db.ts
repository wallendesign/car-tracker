// src/lib/db.ts
// Server-backed persistence via /api/cars and /api/projects routes (Neon Postgres)

import type { CarRecord } from "@/types/car"
import type { ProjectRecord, ProjectWithStats } from "@/types/project"

// ── Cars ─────────────────────────────────────────────────────────────────────

export async function saveCar(car: Omit<CarRecord, "id">): Promise<number> {
  const res = await fetch("/api/cars", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(car),
  })
  const data = await res.json()
  return data.id as number
}

export async function getAllCars(projectId: number): Promise<CarRecord[]> {
  const res = await fetch(`/api/cars?project_id=${projectId}`)
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
  fields: Pick<CarRecord, "aiModelOverview" | "aiCommonIssues" | "aiValueAssessment" | "aiScore" | "aiTldr">
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

export async function getCarByUrl(url: string, projectId?: number): Promise<CarRecord | undefined> {
  const params = new URLSearchParams({ url })
  if (projectId != null) params.set("project_id", String(projectId))
  const res = await fetch(`/api/cars?${params}`)
  const data = await res.json()
  return data ?? undefined
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getAllProjects(): Promise<ProjectRecord[]> {
  const res = await fetch("/api/projects")
  return res.json()
}

export async function getAllProjectsWithStats(): Promise<ProjectWithStats[]> {
  const res = await fetch("/api/projects?stats=1")
  return res.json()
}

export async function createProject(name: string): Promise<ProjectRecord> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function renameProject(id: number, name: string): Promise<{ slug: string }> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function deleteProject(id: number): Promise<void> {
  await fetch(`/api/projects/${id}`, { method: "DELETE" })
}
