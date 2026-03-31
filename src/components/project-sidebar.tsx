"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getAllProjects, createProject, deleteProject, renameProject } from "@/lib/db"
import type { ProjectRecord } from "@/types/project"
import type { CarRecord, CarStatus } from "@/types/car"

const STATUS_LABEL: Record<CarStatus, string> = {
  interested: "Tillagd",
  contacted: "Favorit",
  test_driven: "Provkörd",
  pass: "Ej intressant",
  sold: "Såld",
}

interface ProjectSidebarProps {
  open: boolean
  onClose: () => void
  activeProjectId: number
  cars: CarRecord[]
  onProjectCreated?: (project: ProjectRecord) => void
}

export function ProjectSidebar({
  open,
  onClose,
  activeProjectId,
  cars,
  onProjectCreated,
}: ProjectSidebarProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      getAllProjects().then(setProjects)
    }
  }, [open])

  useEffect(() => {
    if (creating) newInputRef.current?.focus()
  }, [creating])

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus()
  }, [editingId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const project = await createProject(newName.trim())
    setProjects((prev) => [project, ...prev])
    setNewName("")
    setCreating(false)
    onProjectCreated?.(project)
    router.push(`/p/${project.slug}`)
  }

  async function handleRename(id: number) {
    if (!editName.trim()) { setEditingId(null); return }
    const { slug } = await renameProject(id, editName.trim())
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: editName.trim(), slug } : p))
    )
    setEditingId(null)
    if (id === activeProjectId) {
      router.replace(`/p/${slug}`)
    }
  }

  async function handleDelete(id: number) {
    await deleteProject(id)
    const remaining = projects.filter((p) => p.id !== id)
    setProjects(remaining)
    setConfirmDeleteId(null)
    if (id === activeProjectId) {
      if (remaining.length > 0) {
        router.push(`/p/${remaining[0].slug}`)
      } else {
        // Create new default project
        const project = await createProject("Min bilsökning")
        setProjects([project])
        router.push(`/p/${project.slug}`)
      }
    }
  }

  // Stats for active project
  const projectCars = cars // already filtered to activeProjectId in AppShell
  const avgPrice =
    projectCars.filter((c) => c.price != null).length > 0
      ? Math.round(
          projectCars.filter((c) => c.price != null).reduce((s, c) => s + c.price!, 0) /
            projectCars.filter((c) => c.price != null).length
        )
      : null

  const statusCounts = projectCars.reduce(
    (acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }),
    {} as Partial<Record<CarStatus, number>>
  )

  // Photo grid: favorites first, then recently added
  const photoGrid = [
    ...projectCars.filter((c) => c.status === "contacted" && c.photoUrl),
    ...projectCars.filter((c) => c.status !== "contacted" && c.photoUrl),
  ]
    .slice(0, 4)
    .map((c) => c.photoUrl!)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border flex flex-col shadow-xl transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border">
          <span className="text-sm font-medium">Projekt</span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors leading-none"
            aria-label="Stäng"
          >
            ✕
          </button>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-1">
            {projects.map((p) => (
              <div key={p.id} className="group relative">
                {editingId === p.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRename(p.id) }}
                    className="px-3 py-1.5"
                  >
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRename(p.id)}
                      onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                      className="w-full text-sm bg-transparent outline-none border-b border-border pb-0.5"
                    />
                  </form>
                ) : confirmDeleteId === p.id ? (
                  <div className="px-3 py-2 flex items-center gap-2">
                    <span className="text-xs text-destructive flex-1">Ta bort?</span>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Nej
                    </button>
                  </div>
                ) : (
                  <div
                    className={`flex items-center px-3 py-2 cursor-pointer transition-colors ${
                      p.id === activeProjectId
                        ? "bg-accent text-foreground"
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => { onClose(); router.push(`/p/${p.slug}`) }}
                  >
                    <span className="flex-1 text-sm truncate">{p.name}</span>
                    {/* Car count badge — only meaningful for active; others we don't have counts */}
                    {p.id === activeProjectId && (
                      <span className="ml-2 shrink-0 inline-flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-1.5 min-w-[18px] h-[18px] text-[10px] font-medium tabular-nums">
                        {projectCars.length}
                      </span>
                    )}
                    {/* Context menu — appears on hover */}
                    <div
                      className="ml-1 shrink-0 hidden group-hover:flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                        className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-[10px]"
                        aria-label="Byt namn"
                        title="Byt namn"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors text-[10px]"
                        aria-label="Ta bort"
                        title="Ta bort projekt"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create project */}
          <div className="px-3 py-2 border-t border-border">
            {creating ? (
              <form onSubmit={handleCreate} className="flex items-center gap-2">
                <input
                  ref={newInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && (setCreating(false), setNewName(""))}
                  placeholder="Projektnamn..."
                  className="flex-1 text-sm bg-transparent outline-none border-b border-border pb-0.5 placeholder:text-muted-foreground/60"
                />
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  Skapa
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Nytt projekt
              </button>
            )}
          </div>

          {/* Active project stats */}
          {projectCars.length > 0 && (
            <div className="px-3 py-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-2">
                Statistik
              </p>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{projectCars.length} bil{projectCars.length !== 1 ? "ar" : ""}</span>
                {avgPrice != null && (
                  <span>Snittpris {avgPrice.toLocaleString("sv-SE")} kr</span>
                )}
                {(Object.entries(statusCounts) as [CarStatus, number][])
                  .filter(([s]) => s !== "interested")
                  .map(([s, count]) => (
                    <span key={s}>{STATUS_LABEL[s]}: {count}</span>
                  ))}
              </div>

              {/* Photo grid */}
              {photoGrid.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-1">
                  {photoGrid.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={`/api/image-proxy?url=${encodeURIComponent(url)}`}
                      alt=""
                      className="w-full aspect-[4/3] object-cover rounded bg-muted"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
