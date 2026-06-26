"use client"

import { useMemo, useState } from "react"
import { useWorkflow } from "@/lib/workflow-context"
import { WorkspaceLayout } from "@/components/workspace-layout"
import { Button } from "@/components/ui/button"
import { buildStandaloneHtml, downloadBlob, slugify } from "@/lib/html-md"
import {
  FileCode2,
  FileText,
  FileType2,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  PartyPopper,
} from "lucide-react"

export function StepExport() {
  const { releaseVersions, activeReleaseId, projectName, goToStep, resetProject } = useWorkflow()
  const active = releaseVersions.find((r) => r.id === activeReleaseId)

  const [docxLoading, setDocxLoading] = useState(false)
  const [copied, setCopied] = useState<string>("")
  const [error, setError] = useState("")

  const slug = useMemo(() => slugify(projectName), [projectName])

  if (!active) {
    return (
      <WorkspaceLayout step={5} title="Export & Publish" subtitle="Download your finished press release.">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <FileText className="h-6 w-6 text-accent" />
          </div>
          <p className="font-serif text-lg font-semibold">Nothing to export yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Generate a press release first, then return here to download it.
          </p>
          <Button variant="accent" onClick={() => goToStep(4)}>
            <ArrowLeft className="h-4 w-4" /> Back to Generation
          </Button>
        </div>
      </WorkspaceLayout>
    )
  }

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(""), 1500)
    })
  }

  function exportHtml() {
    const doc = buildStandaloneHtml(active!.htmlContent, projectName)
    downloadBlob(doc, `${slug}.html`, "text/html;charset=utf-8")
  }

  function exportMarkdown() {
    downloadBlob(active!.markdownContent, `${slug}.md`, "text/markdown;charset=utf-8")
  }

  async function exportDocx() {
    setError("")
    setDocxLoading(true)
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: active!.markdownContent, title: projectName }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "DOCX export failed." }))
        throw new Error(e.error || "DOCX export failed.")
      }
      const blob = await res.blob()
      downloadBlob(
        blob,
        `${slug}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "DOCX export failed.")
    } finally {
      setDocxLoading(false)
    }
  }

  return (
    <WorkspaceLayout
      step={5}
      title="Export & Publish"
      subtitle="Your press release is ready. Download it in the format you need."
      actions={
        <>
          <Button variant="outline" onClick={() => goToStep(4)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="primary" onClick={resetProject}>
            <RotateCcw className="h-4 w-4" /> New Project
          </Button>
        </>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
          <PartyPopper className="h-5 w-5 shrink-0" />
          Press release complete — generated through the full reviewed workflow (v{active.version}).
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <ExportCard
            icon={FileCode2}
            title="HTML"
            description="Styled, standalone web document ready to publish."
            onClick={exportHtml}
            cta="Download .html"
          />
          <ExportCard
            icon={FileText}
            title="Markdown"
            description="Portable plain-text source for CMS and editors."
            onClick={exportMarkdown}
            cta="Download .md"
          />
          <ExportCard
            icon={FileType2}
            title="Word"
            description="Formatted .docx for distribution and review."
            onClick={exportDocx}
            cta={docxLoading ? "Generating…" : "Download .docx"}
            loading={docxLoading}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h3 className="font-serif text-base font-bold">Copy to clipboard</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => copy("html", active.htmlContent)}>
              {copied === "html" ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />} Copy HTML
            </Button>
            <Button variant="outline" size="sm" onClick={() => copy("md", active.markdownContent)}>
              {copied === "md" ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />} Copy Markdown
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Final preview
          </div>
          <iframe
            title="Final press release preview"
            srcDoc={buildStandaloneHtml(active.htmlContent, projectName)}
            className="h-[480px] w-full bg-white"
          />
        </div>
      </div>
    </WorkspaceLayout>
  )
}

function ExportCard({
  icon: Icon,
  title,
  description,
  onClick,
  cta,
  loading,
}: {
  icon: typeof FileText
  title: string
  description: string
  onClick: () => void
  cta: string
  loading?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div className="flex-1">
        <p className="font-serif text-base font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Button variant="accent" size="sm" onClick={onClick} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {cta}
      </Button>
    </div>
  )
}
