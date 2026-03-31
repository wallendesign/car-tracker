import { sql } from "@vercel/postgres"

export function toSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/å|ä/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "projekt"
  )
}

export async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let i = 2
  while (true) {
    const { rows } = await sql`SELECT id FROM projects WHERE slug = ${slug} LIMIT 1`
    if (rows.length === 0) return slug
    slug = `${base}-${i++}`
  }
}
