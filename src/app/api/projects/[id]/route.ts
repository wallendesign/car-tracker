import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"
import { toSlug, uniqueSlug } from "../slug-utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  // Get current slug to avoid dedup conflict with itself
  const { rows: current } = await sql`SELECT slug FROM projects WHERE id = ${id}`
  if (!current[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const base = toSlug(name.trim())
  // If name maps to same slug as current, just rename without slug change
  let slug = base
  if (base !== current[0].slug) {
    slug = await uniqueSlug(base)
  }

  await sql`UPDATE projects SET name = ${name.trim()}, slug = ${slug} WHERE id = ${id}`
  return NextResponse.json({ slug })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  // Delete all cars in this project first
  await sql`DELETE FROM cars WHERE project_id = ${id}`
  await sql`DELETE FROM projects WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
