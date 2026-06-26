"use client"

import { useWorkflow } from "@/lib/workflow-context"
import { cn } from "@/lib/utils"
import { Check, Lock, Upload, ListTree, ShieldCheck, FileText, Download } from "lucide-react"

const STEPS = [
  { n: 1, label: "Upload & Ingestion", desc: "Source materials", icon: Upload },
  { n: 2, label: "Outline Generation", desc: "LLM Stage 1", icon: ListTree },
  { n: 3, label: "Review & Approval", desc: "Editorial gate", icon: ShieldCheck },
  { n: 4, label: "Release Generation", desc: "LLM Stage 2", icon: FileText },
  { n: 5, label: "Export & Download", desc: "HTML · DOCX · MD", icon: Download },
]

export function StepNavigator() {
  const { currentStep, goToStep, files, outlineVersions, activeOutlineId, releaseVersions } = useWorkflow()

  const activeOutline = outlineVersions.find((o) => o.id === activeOutlineId)
  const hasFiles = files.some((f) => f.status === "parsed")
  const hasOutline = outlineVersions.length > 0
  const outlineApproved = activeOutline?.status === "approved"
  const hasRelease = releaseVersions.length > 0

  function isUnlocked(n: number) {
    if (n === 1) return true
    if (n === 2) return hasFiles
    if (n === 3) return hasOutline
    if (n === 4) return outlineApproved
    if (n === 5) return hasRelease
    return false
  }

  function isComplete(n: number) {
    if (n === 1) return hasFiles
    if (n === 2) return hasOutline
    if (n === 3) return outlineApproved
    if (n === 4) return hasRelease
    return false
  }

  return (
    <nav aria-label="Workflow steps" className="flex flex-col gap-1">
      <div className="mb-3 px-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Editorial Pipeline
        </p>
      </div>
      <ol className="flex flex-col gap-1">
        {STEPS.map((step) => {
          const unlocked = isUnlocked(step.n)
          const complete = isComplete(step.n)
          const active = currentStep === step.n
          const Icon = step.icon
          return (
            <li key={step.n}>
              <button
                disabled={!unlocked}
                onClick={() => unlocked && goToStep(step.n)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                  active && "bg-card shadow-sm ring-1 ring-border",
                  !active && unlocked && "hover:bg-card/60",
                  !unlocked && "cursor-not-allowed opacity-45",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    active && "border-accent bg-accent text-accent-foreground",
                    !active && complete && "border-primary bg-primary text-primary-foreground",
                    !active && !complete && unlocked && "border-border bg-background text-foreground",
                    !unlocked && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {!unlocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : complete && !active ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    step.n
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={cn("text-sm font-medium leading-tight", active && "text-foreground")}>
                      {step.label}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{step.desc}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
