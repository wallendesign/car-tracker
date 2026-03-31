"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getAllProjectsWithStats, createProject, deleteProject, renameProject } from "@/lib/db"
import type { ProjectWithStats } from "@/types/project"
import type { ProjectRecord } from "@/types/project"

interface ProjectSidebarProps {
  open: boolean
  onClose: () => void
  activeProjectId: number
  onProjectCreated?: (project: ProjectRecord) => void
}

export function ProjectSidebar({
  open,
  onClose,
  activeProjectId,
  onProjectCreated,
}: ProjectSidebarProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      getAllProjectsWithStats().then(setProjects)
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
    setNewName("")
    setCreating(false)
    onProjectCreated?.(project)
    router.push(`/p/${project.slug}`)
    onClose()
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
        onClose()
      } else {
        const project = await createProject("Min bilsökning")
        router.push(`/p/${project.slug}`)
        onClose()
      }
    }
  }

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
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border flex flex-col shadow-xl transition-transform duration-200 ease-in-out ${
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
          <div className="py-2 flex flex-col gap-0">
            {projects.map((p) => (
              <div key={p.id} className="group relative">
                {editingId === p.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRename(p.id) }}
                    className="px-4 py-2"
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
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
                    <span className="text-xs text-destructive flex-1">Ta bort projektet och alla bilar?</span>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-destructive hover:underline shrink-0">Ja</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-muted-foreground hover:text-foreground shrink-0">Nej</button>
                  </div>
                ) : (
                  <div
                    className={`px-4 pt-3 pb-3 cursor-pointer transition-colors border-b border-border ${
                      p.id === activeProjectId
                        ? "bg-accent"
                        : "hover:bg-accent/40"
                    }`}
                    onClick={() => { onClose(); router.push(`/p/${p.slug}`) }}
                  >
                    {/* Name row */}
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`flex-1 text-sm font-medium truncate ${p.id === activeProjectId ? "text-foreground" : "text-foreground/80"}`}>
                        {p.name}
                      </span>
                      {/* Car count */}
                      <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-1.5 min-w-[18px] h-[18px] text-[10px] font-medium tabular-nums">
                        {p.carCount}
                      </span>
                      {/* Hover actions */}
                      <div
                        className="shrink-0 hidden group-hover:flex items-center gap-0.5 ml-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors text-[10px]"
                          title="Byt namn"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-background/60 transition-colors text-[11px]"
                          title="Ta bort projekt"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Stats row */}
                    {p.carCount > 0 && (
                      <p className="text-[11px] text-muted-foreground mb-2 tabular-nums">
                        {p.avgPrice != null
                          ? `Snittpris ${p.avgPrice.toLocaleString("sv-SE")} kr`
                          : `${p.carCount} bil${p.carCount !== 1 ? "ar" : ""}`}
                        {p.statusCounts.contacted > 0 && ` · ${p.statusCounts.contacted} favorit${p.statusCounts.contacted !== 1 ? "er" : ""}`}
                        {p.statusCounts.sold > 0 && ` · ${p.statusCounts.sold} såld${p.statusCounts.sold !== 1 ? "a" : ""}`}
                      </p>
                    )}

                    {/* Photo grid */}
                    {p.previewPhotos.length > 0 && (
                      <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${Math.min(p.previewPhotos.length, 4)}, 1fr)` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.previewPhotos.slice(0, 4).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={`/api/image-proxy?url=${encodeURIComponent(url)}`}
                            alt=""
                            className="w-full aspect-[4/3] object-cover rounded bg-muted"
                            onClick={() => { onClose(); router.push(`/p/${p.slug}`) }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create project */}
          <div className="px-4 py-3">
            {creating ? (
              <form onSubmit={handleCreate} className="flex items-center gap-2">
                <input
                  ref={newInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setCreating(false); setNewName("") } }}
                  placeholder="Projektnamn..."
                  className="flex-1 text-sm bg-transparent outline-none border-b border-border pb-0.5 placeholder:text-muted-foreground/60"
                />
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors shrink-0"
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
        </div>
      </div>
    </>
  )
}
