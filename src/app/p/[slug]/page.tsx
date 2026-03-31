import { sql } from "@vercel/postgres"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let project: { id: number; name: string } | null = null
  try {
    const { rows } = await sql`SELECT id, name FROM projects WHERE slug = ${slug} LIMIT 1`
    if (rows[0]) project = { id: rows[0].id as number, name: rows[0].name as string }
  } catch {
    // projects table doesn't exist yet
  }

  if (!project) redirect("/")

  return (
    <AppShell
      projectId={project.id}
      projectName={project.name}
      projectSlug={slug}
    />
  )
}
