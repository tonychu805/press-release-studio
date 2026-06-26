"use client"

import { useState } from "react"
import { useWorkflow } from "@/lib/workflow-context"
import { WorkspaceLayout } from "@/components/workspace-layout"
import { MarkdownEditor } from "@/components/markdown-editor"
import { Button } from "@/components/ui/button"
import { streamGenerate } from "@/lib/llm-client"
import { buildOutlinePrompt } from "@/lib/context-builder"
import { PROVIDERS } from "@/lib/providers"
import { timeAgo } from "@/lib/utils"
import { Sparkles, RefreshCw, Loader2, ArrowRight, AlertTriangle, ListTree, Info } from "lucide-react"

export function StepOutline() {
  const {
    files,
    outlineInstructions,
    setOutlineInstructions,
    outlineVersions,
    activeOutlineId,
    setActiveOutline,
    addOutlineVersion,
    updateActiveOutline,
    settings,
    activePromptContent,
    setStatus,
    goToStep,
  } = useWorkflow()

  const [generating, setGenerating] = useState(false)
  const [streamBuf, setStreamBuf] = useState("")
  const [error, setError] = useState("")

  const activeOutline = outlineVersions.find((o) => o.id === activeOutlineId)
  const hasKey = Boolean(settings.apiKeys[settings.provider])
  const isApproved = activeOutline?.status === "approved"

  async function generate() {
    setError("")
    if (!hasKey) {
      setError("No API key set for the selected provider. Open Settings to add one.")
      return
    }
    setGenerating(true)
    setStreamBuf("")
    setStatus("outlining")
    try {
      const full = await streamGenerate({
        settings,
        system: activePromptContent("outline_prompt"),
        prompt: buildOutlinePrompt(files, outlineInstructions),
        onChunk: setStreamBuf,
      })
      addOutlineVersion(full)
      setStreamBuf("")
    } catch (err) {
      setStatus("uploading")
      setError(err instanceof Error ? err.message : "Outline generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <WorkspaceLayout
      step={2}
      title="Outline Generation"
      subtitle="LLM Stage 1 — produce a structured Markdown outline. No final prose is written yet."
      actions={
        outlineVersions.length > 0 && (
          <>
            <Button variant="outline" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate
            </Button>
            <Button variant="accent" onClick={() => goToStep(3)} disabled={generating}>
              Review & Approve <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )
      }
      aside={<OutlineAside />}
    >
      {error && (
        <div className="mx-auto mb-4 flex max-w-4xl items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mx-auto flex h-full max-w-4xl flex-col gap-3">
        {/* Instructions — always visible so regeneration can use updated instructions */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="instructions" className="text-sm font-medium">
            Optional instructions
          </label>
          <textarea
            id="instructions"
            value={outlineInstructions}
            onChange={(e) => setOutlineInstructions(e.target.value)}
            disabled={isApproved}
            rows={2}
            placeholder="e.g. Emphasize the funding angle, target a tech-press audience, keep it under 600 words…"
            className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {outlineVersions.length === 0 && !generating ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <ListTree className="h-6 w-6 text-accent" />
            </div>
            <p className="font-serif text-lg font-semibold">Generate the editorial outline</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {files.filter((f) => f.status === "parsed").length} source file(s) ready. The model will detect the
              release type and plan structure, quotes, and open questions.
            </p>
            <Button variant="accent" size="lg" onClick={generate} disabled={generating}>
              <Sparkles className="h-4 w-4" /> Generate Outline
            </Button>
          </div>
        ) : (
          <>
            {/* Version selector */}
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
              {generating && streamBuf ? (
                <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Streaming outline…
                  </div>
                  <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm scroll-thin">
                    {streamBuf}
                  </pre>
                </div>
              ) : (
                <MarkdownEditor
                  value={activeOutline?.content ?? ""}
                  onChange={updateActiveOutline}
                  readOnly={isApproved}
                />
              )}
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  )
}

function OutlineAside() {
  const { settings, outlineVersions, activeOutlineId } = useWorkflow()
  const active = outlineVersions.find((o) => o.id === activeOutlineId)
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-serif text-base font-bold">Stage 1 Context</h3>
        <p className="text-xs text-muted-foreground">Outline-first, controlled generation.</p>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <Row label="Provider" value={PROVIDERS[settings.provider].label} />
        <Row label="Model" value={settings.model} />
        <Row label="Versions" value={String(outlineVersions.length)} />
        {active && <Row label="Active" value={`v${active.version} · ${timeAgo(active.createdAt)}`} />}
      </dl>
      <div className="flex items-start gap-2 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>
          The outline includes release type, headline direction, dateline, lead structure, section plan, quote
          placeholders, and open questions. You can edit it freely before approval.
        </span>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-right text-sm font-medium">{value}</dd>
    </div>
  )
}
