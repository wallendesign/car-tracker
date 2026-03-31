import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"
import type { ProjectRecord } from "@/types/project"
import type { ProjectWithStats } from "@/types/project"
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

export async function GET(req: NextRequest) {
  await ensureProjectsTable()

  const withStats = req.nextUrl.searchParams.get("stats") === "1"

  if (withStats) {
    // Stats per project via JOIN
    const { rows: statRows } = await sql`
      SELECT
        p.id, p.name, p.slug, p.created_at,
        COUNT(c.id)::int AS car_count,
        ROUND(AVG(c.price) FILTER (WHERE c.price IS NOT NULL))::int AS avg_price,
        COUNT(c.id) FILTER (WHERE c.status = 'contacted')::int AS contacted,
        COUNT(c.id) FILTER (WHERE c.status = 'test_driven')::int AS test_driven,
        COUNT(c.id) FILTER (WHERE c.status = 'pass')::int AS pass_count,
        COUNT(c.id) FILTER (WHERE c.status = 'sold')::int AS sold_count
      FROM projects p
      LEFT JOIN cars c ON c.project_id = p.id
      GROUP BY p.id, p.name, p.slug, p.created_at
      ORDER BY p.created_at DESC
    `

    // Top 4 photos per project, favorites (contacted) first
    const { rows: photoRows } = await sql`
      SELECT project_id, photo_url FROM (
        SELECT project_id, photo_url,
          ROW_NUMBER() OVER (
            PARTITION BY project_id
            ORDER BY CASE WHEN status = 'contacted' THEN 0 ELSE 1 END, created_at DESC
          ) AS rn
        FROM cars
        WHERE photo_url IS NOT NULL AND project_id IS NOT NULL
      ) sub
      WHERE rn <= 4
      ORDER BY project_id, rn
    `

    // Group photos by project_id
    const photosByProject: Record<number, string[]> = {}
    for (const row of photoRows) {
      const pid = row.project_id as number
      if (!photosByProject[pid]) photosByProject[pid] = []
      photosByProject[pid].push(row.photo_url as string)
    }

    const result: ProjectWithStats[] = statRows.map((r) => ({
      id: r.id as number,
      name: r.name as string,
      slug: r.slug as string,
      createdAt: Number(r.created_at),
      carCount: (r.car_count as number) ?? 0,
      avgPrice: r.avg_price != null ? Number(r.avg_price) : null,
      statusCounts: {
        contacted: (r.contacted as number) ?? 0,
        test_driven: (r.test_driven as number) ?? 0,
        pass: (r.pass_count as number) ?? 0,
        sold: (r.sold_count as number) ?? 0,
      },
      previewPhotos: photosByProject[r.id as number] ?? [],
    }))

    return NextResponse.json(result)
  }

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
