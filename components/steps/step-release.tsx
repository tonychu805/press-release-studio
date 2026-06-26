"use client"

import { useMemo, useState } from "react"
import { useWorkflow } from "@/lib/workflow-context"
import { WorkspaceLayout } from "@/components/workspace-layout"
import { Button } from "@/components/ui/button"
import { streamGenerate } from "@/lib/llm-client"
import { buildReleasePrompt } from "@/lib/context-builder"
import { cleanReleaseHtml, htmlToMarkdown, buildStandaloneHtml } from "@/lib/html-md"
import { PROVIDERS } from "@/lib/providers"
import { timeAgo } from "@/lib/utils"
import {
  Sparkles,
  RefreshCw,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Lock,
  FileText,
  Code2,
  Eye,
  Info,
} from "lucide-react"

type ViewMode = "preview" | "html" | "markdown"

export function StepRelease() {
  const {
    files,
    outlineVersions,
    releaseVersions,
    activeReleaseId,
    setActiveRelease,
    addReleaseVersion,
    updateActiveReleaseHtml,
    settings,
    activePromptContent,
    setStatus,
    projectName,
    goToStep,
  } = useWorkflow()

  const [generating, setGenerating] = useState(false)
  const [streamBuf, setStreamBuf] = useState("")
  const [error, setError] = useState("")
  const [view, setView] = useState<ViewMode>("preview")

  const approvedOutline = outlineVersions.find((o) => o.status === "approved")
  const hasKey = Boolean(settings.apiKeys[settings.provider])
  const active = releaseVersions.find((r) => r.id === activeReleaseId)

  const previewDoc = useMemo(
    () => (active ? buildStandaloneHtml(active.htmlContent, projectName) : ""),
    [active, projectName],
  )

  async function generate() {
    setError("")
    if (!approvedOutline) {
      setError("No approved outline found. Return to Step 3 and approve an outline first.")
      return
    }
    if (!hasKey) {
      setError("No API key set for the selected provider. Open Settings to add one.")
      return
    }
    setGenerating(true)
    setStreamBuf("")
    setStatus("generating")
    try {
      const full = await streamGenerate({
        settings,
        system: activePromptContent("release_prompt"),
        prompt: buildReleasePrompt(files, approvedOutline.content),
        onChunk: setStreamBuf,
      })
      const html = cleanReleaseHtml(full)
      const md = htmlToMarkdown(html)
      addReleaseVersion(html, md)
      setStreamBuf("")
      setView("preview")
    } catch (err) {
      setStatus("approved")
      setError(err instanceof Error ? err.message : "Press release generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  // Guard: approval gate not satisfied.
  if (!approvedOutline) {
    return (
      <WorkspaceLayout
        step={4}
        title="Press Release Generation"
        subtitle="LLM Stage 2 — final prose, strictly following the approved outline."
      >
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <p className="font-serif text-lg font-semibold">Approval required</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Final generation is locked until an outline is approved at the editorial gate. This guarantees the press
            release follows reviewed structure.
          </p>
          <Button variant="accent" onClick={() => goToStep(3)}>
            Go to Review & Approval <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </WorkspaceLayout>
    )
  }

  return (
    <WorkspaceLayout
      step={4}
      title="Press Release Generation"
      subtitle="LLM Stage 2 — final prose, strictly following the approved outline."
      actions={
        releaseVersions.length > 0 && (
          <>
            <Button variant="outline" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate
            </Button>
            <Button variant="accent" onClick={() => goToStep(5)} disabled={generating}>
              Export <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )
      }
      aside={<ReleaseAside />}
    >
      {error && (
        <div className="mx-auto mb-4 flex max-w-4xl items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {releaseVersions.length === 0 && !generating ? (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <FileText className="h-6 w-6 text-accent" />
          </div>
          <p className="font-serif text-lg font-semibold">Write the final press release</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Using approved outline v{approvedOutline.version}. The model writes polished, publication-ready HTML
            constrained to your reviewed structure and source facts.
          </p>
          <Button variant="accent" size="lg" onClick={generate} disabled={generating}>
            <Sparkles className="h-4 w-4" /> Generate Press Release
          </Button>
        </div>
      ) : (
        <div className="mx-auto flex h-full max-w-4xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* version selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versions:</span>
              {releaseVersions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRelease(r.id)}
                  className={`rounded-sm px-2 py-1 text-xs font-medium ${
                    r.id === activeReleaseId
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  v{r.version}
                </button>
              ))}
            </div>

            {/* view toggle */}
            {!generating && active && (
              <div className="inline-flex rounded-md border border-border bg-card p-0.5">
                <ViewTab icon={Eye} label="Preview" active={view === "preview"} onClick={() => setView("preview")} />
                <ViewTab icon={Code2} label="HTML" active={view === "html"} onClick={() => setView("html")} />
                <ViewTab
                  icon={FileText}
                  label="Markdown"
                  active={view === "markdown"}
                  onClick={() => setView("markdown")}
                />
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1">
            {generating && streamBuf ? (
              <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Streaming press release…
                </div>
                <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm scroll-thin">
                  {streamBuf}
                </pre>
              </div>
            ) : active ? (
              <>
                {view === "preview" && (
                  <iframe
                    title="Press release preview"
                    srcDoc={previewDoc}
                    className="h-full w-full rounded-md border border-border bg-white"
                  />
                )}
                {view === "html" && (
                  <textarea
                    value={active.htmlContent}
                    onChange={(e) => updateActiveReleaseHtml(e.target.value, htmlToMarkdown(e.target.value))}
                    spellCheck={false}
                    className="h-full w-full resize-none rounded-md border border-border bg-card p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring scroll-thin"
                  />
                )}
                {view === "markdown" && (
                  <pre className="h-full overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 font-mono text-sm leading-relaxed scroll-thin">
                    {active.markdownContent}
                  </pre>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  )
}

function ViewTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Eye
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

function ReleaseAside() {
  const { settings, outlineVersions, releaseVersions, activeReleaseId } = useWorkflow()
  const approved = outlineVersions.find((o) => o.status === "approved")
  const active = releaseVersions.find((r) => r.id === activeReleaseId)
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-serif text-base font-bold">Stage 2 Context</h3>
        <p className="text-xs text-muted-foreground">Constrained final generation.</p>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <Row label="Provider" value={PROVIDERS[settings.provider].label} />
        <Row label="Model" value={settings.model} />
        {approved && <Row label="Source outline" value={`v${approved.version} (approved)`} />}
        <Row label="Versions" value={String(releaseVersions.length)} />
        {active && <Row label="Active" value={`v${active.version} · ${timeAgo(active.createdAt)}`} />}
      </dl>
      <div className="flex items-start gap-2 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>
          Output is generated as semantic HTML for the live preview, with a parallel Markdown view. Edit the HTML
          directly and the Markdown updates automatically.
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
