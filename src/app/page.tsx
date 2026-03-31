"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAllProjects, createProject } from "@/lib/db"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const projects = await getAllProjects()
      if (projects.length > 0) {
        router.replace(`/p/${projects[0].slug}`)
      } else {
        // No projects yet — create a default one
        const project = await createProject("Min bilsökning")
        router.replace(`/p/${project.slug}`)
      }
    }
    init()
  }, [router])

  return (
    <div className="h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Laddar...
    </div>
  )
}
