import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"
import type { ProjectRecord } from "@/types/project"
import { toSlug, uniqueSlug } from "./slug-utils"

// Only creates the projects table — does NOT touch cars (cars route owns migration)
export async function ensureProjectsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at BIGINT NOT NULL
    )
  `
}

function rowToProject(row: Record<string, unknown>): ProjectRecord {
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    createdAt: Number(row.created_at),
  }
}

export async function GET() {
  await ensureProjectsTable()
  const { rows } = await sql`SELECT * FROM projects ORDER BY created_at DESC`
  return NextResponse.json(rows.map(rowToProject))
}

export async function POST(req: NextRequest) {
  await ensureProjectsTable()
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const base = toSlug(name.trim())
  const slug = await uniqueSlug(base)

  const { rows } = await sql`
    INSERT INTO projects (name, slug, created_at)
    VALUES (${name.trim()}, ${slug}, ${Date.now()})
    RETURNING *
  `
  return NextResponse.json(rowToProject(rows[0]), { status: 201 })
}
