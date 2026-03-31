import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"
import type { ProjectRecord } from "@/types/project"
import { toSlug, uniqueSlug } from "./slug-utils"

export async function ensureProjectsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at BIGINT NOT NULL
    )
  `

  // Migration: if projects is empty but cars exist, create a default project
  const { rows: pRows } = await sql`SELECT COUNT(*) as cnt FROM projects`
  if (Number(pRows[0].cnt) === 0) {
    try {
      const { rows: cRows } = await sql`SELECT COUNT(*) as cnt FROM cars`
      if (Number(cRows[0].cnt) > 0) {
        const { rows: inserted } = await sql`
          INSERT INTO projects (name, slug, created_at)
          VALUES ('Bilsökning 2025', 'bilsokning-2025', ${Date.now()})
          ON CONFLICT (slug) DO NOTHING
          RETURNING id
        `
        if (inserted[0]) {
          await sql`UPDATE cars SET project_id = ${inserted[0].id} WHERE project_id IS NULL`
        }
      }
    } catch {
      // cars table doesn't exist yet — will be created by /api/cars
    }
  }
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
