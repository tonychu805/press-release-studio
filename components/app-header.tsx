"use client"

import { useWorkflow } from "@/lib/workflow-context"
import { Button } from "@/components/ui/button"
import { Settings, Newspaper, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  uploading: "Uploading",
  outlining: "Outlining",
  review: "In Review",
  approved: "Outline Approved",
  generating: "Generating",
  completed: "Completed",
}

export function AppHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { projectName, setProjectName, status, resetProject } = useWorkflow()

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Newspaper className="h-4.5 w-4.5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold leading-none tracking-tight">Press Release Studio</span>
            <span className="hidden rounded-sm bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-accent-foreground sm:inline">
              Editorial
            </span>
          </div>
          <span className="mt-0.5 hidden text-[0.7rem] text-muted-foreground sm:block">
            AI 5-Step Human-in-the-Loop Workflow
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          aria-label="Project name"
          className="hidden h-9 w-48 rounded-md border border-border bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring md:block"
        />
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground lg:inline-flex",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {STATUS_LABELS[status]}
        </span>
        <Button variant="ghost" size="icon" onClick={resetProject} title="Start new project" aria-label="Start new project">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="md" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>
    </header>
  )
}
