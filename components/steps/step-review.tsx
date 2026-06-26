"use client"

import { useState } from "react"
import { useWorkflow } from "@/lib/workflow-context"
import { WorkspaceLayout } from "@/components/workspace-layout"
import { MarkdownEditor } from "@/components/markdown-editor"
import { Button } from "@/components/ui/button"
import { timeAgo } from "@/lib/utils"
import {
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Lock,
  MessageSquarePlus,
  Trash2,
  CheckCircle2,
  Info,
} from "lucide-react"

export function StepReview() {
  const {
    outlineVersions,
    activeOutlineId,
    setActiveOutline,
    updateActiveOutline,
    approveOutline,
    comments,
    addComment,
    removeComment,
    goToStep,
  } = useWorkflow()

  const active = outlineVersions.find((o) => o.id === activeOutlineId)
  const isApproved = active?.status === "approved"

  function handleApprove() {
    approveOutline()
    goToStep(4)
  }

  return (
    <WorkspaceLayout
      step={3}
      title="Outline Review & Approval"
      subtitle="The editorial gate. Edit, comment, and approve. Approval locks the outline and unlocks final generation."
      actions={
        <>
          <Button variant="outline" onClick={() => goToStep(2)} disabled={isApproved}>
            <RefreshCw className="h-4 w-4" /> Back to Generate
          </Button>
          {isApproved ? (
            <Button variant="accent" onClick={() => goToStep(4)}>
              Continue to Generation <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="accent" onClick={handleApprove} disabled={!active?.content?.trim()}>
              <ShieldCheck className="h-4 w-4" /> Approve Outline
            </Button>
          )}
        </>
      }
      aside={
        <ReviewAside
          comments={comments}
          onAdd={addComment}
          onRemove={removeComment}
          isApproved={isApproved}
          approvedVersion={active?.version}
        />
      }
    >
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-3">
        {isApproved && (
          <div className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm font-medium text-accent">
            <Lock className="h-4 w-4" /> This outline (v{active?.version}) is approved and locked.
          </div>
        )}

        {outlineVersions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versions:</span>
            {outlineVersions.map((o) => (
              <button
                key={o.id}
                onClick={() => setActiveOutline(o.id)}
                className={`rounded-sm px-2 py-1 text-xs font-medium ${
                  o.id === activeOutlineId
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                v{o.version}
                {o.status === "approved" ? " ✓" : ""}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1">
          <MarkdownEditor value={active?.content ?? ""} onChange={updateActiveOutline} readOnly={isApproved} />
        </div>
      </div>
    </WorkspaceLayout>
  )
}

function ReviewAside({
  comments,
  onAdd,
  onRemove,
  isApproved,
  approvedVersion,
}: {
  comments: { id: string; text: string; createdAt: number }[]
  onAdd: (t: string) => void
  onRemove: (id: string) => void
  isApproved: boolean
  approvedVersion?: number
}) {
  const [text, setText] = useState("")

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-serif text-base font-bold">Editorial Notes</h3>
        <p className="text-xs text-muted-foreground">Comments for reviewers — kept with this session.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                onAdd(text.trim())
                setText("")
              }
            }}
            placeholder="Add a comment…"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="icon"
            variant="primary"
            onClick={() => {
              if (text.trim()) {
                onAdd(text.trim())
                setText("")
              }
            }}
            aria-label="Add comment"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>

        {comments.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No comments yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((c) => (
              <li key={c.id} className="group flex items-start justify-between gap-2 rounded-md border border-border bg-card p-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{c.text}</p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{timeAgo(c.createdAt)}</p>
                </div>
                <button
                  onClick={() => onRemove(c.id)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
          isApproved
            ? "border-accent/40 bg-accent/5 text-accent"
            : "border-border bg-card text-muted-foreground"
        }`}
      >
        {isApproved ? (
          <>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Outline v{approvedVersion} approved. Stage 2 generation is unlocked.</span>
          </>
        ) : (
          <>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>Approval is required to proceed. Once approved, the outline is locked to ensure deterministic final generation.</span>
          </>
        )}
      </div>
    </div>
  )
}
