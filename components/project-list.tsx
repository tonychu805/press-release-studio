"use client"

import { useEffect, useState } from "react"
import { Plus, Folder, Trash2, Clock } from "lucide-react"
import { useWorkflow } from "@/lib/workflow-context"
import { Button } from "@/components/ui/button"
import type { ProjectStatus } from "@/lib/types"

interface ProjectSummary {
  id: string
  name: string
  status: ProjectStatus
  current_step: number
  file_count: number
  outline_count: number
  release_count: number
  created_at: number
  updated_at: number
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  uploading: "Uploading",
  outlining: "Outlining",
  review: "Review",
  approved: "Approved",
  generating: "Generating",
  completed: "Completed",
}

const STEP_LABELS = ["Upload", "Outline", "Review", "Generate", "Export"]

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface ProjectListProps {
  onOpen: (id: string) => void
}

export function ProjectList({ onOpen }: ProjectListProps) {
  const { createProject, openProject } = useWorkflow()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleNew() {
    setCreating(true)
    await createProject()
    setCreating(false)
    onOpen("new")
  }

  async function handleOpen(id: string) {
    await openProject(id)
    onOpen(id)
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm("Delete this project? This cannot be undone.")) return
    setDeletingId(id)
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading projects…
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground tracking-tight">Projects</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {projects.length === 0 ? "No projects yet" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={handleNew} disabled={creating} size="md">
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "New Project"}
          </Button>
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-border rounded-md">
            <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
              <Folder className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create your first project to get started.</p>
            </div>
            <Button onClick={handleNew} disabled={creating} size="md">
              <Plus className="h-4 w-4" />
              {creating ? "Creating…" : "New Project"}
            </Button>
          </div>
        )}

        {/* Project grid */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleOpen(project.id)}
                className="group relative bg-card border border-border rounded-md p-4 cursor-pointer hover:border-foreground/30 hover:shadow-sm transition-all"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  disabled={deletingId === project.id}
                  className="absolute top-3 right-3 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Icon + name */}
                <div className="flex items-start gap-2.5 mb-3.5">
                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate pr-5">{project.name}</h3>
                    <span className="mt-0.5 inline-block text-[0.65rem] font-medium px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent">
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                </div>

                {/* Step progress bar */}
                <div className="flex gap-0.5 mb-3">
                  {STEP_LABELS.map((label, i) => (
                    <div
                      key={label}
                      title={label}
                      className={`h-1 flex-1 rounded-full ${
                        i < project.current_step ? "bg-primary" : "bg-secondary"
                      }`}
                    />
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                  <span>{project.file_count} {project.file_count === 1 ? "file" : "files"}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(project.updated_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
