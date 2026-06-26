"use client"

import { useRef, useState } from "react"
import { useWorkflow } from "@/lib/workflow-context"
import { WorkspaceLayout } from "@/components/workspace-layout"
import { Button } from "@/components/ui/button"
import { parseFile, detectType, chunkText } from "@/lib/file-parsers"
import { uid, formatBytes, cn } from "@/lib/utils"
import type { IngestedFile } from "@/lib/types"
import {
  UploadCloud,
  FileText,
  File as FileIcon,
  Presentation,
  FileType,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowRight,
} from "lucide-react"

const ACCEPT = ".pdf,.docx,.pptx,.txt,.md,.markdown"

function iconFor(type: string) {
  switch (type) {
    case "pdf":
      return FileType
    case "docx":
      return FileText
    case "pptx":
      return Presentation
    default:
      return FileIcon
  }
}

export function StepUpload() {
  const { files, addFiles, updateFile, removeFile, goToStep } = useWorkflow()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
    for (const file of incoming) {
      const type = detectType(file)
      const id = uid("file")
      const record: IngestedFile = {
        id,
        filename: file.name,
        fileType: type,
        sizeBytes: file.size,
        extractedText: "",
        chunks: [],
        status: "parsing",
      }
      addFiles([record])

      if (type === "unknown") {
        updateFile(id, { status: "error", error: "Unsupported file type." })
        continue
      }
      try {
        const { text, warning } = await parseFile(file, type)
        if (!text) {
          updateFile(id, {
            status: "error",
            error: warning || "No text could be extracted.",
          })
        } else {
          updateFile(id, {
            status: "parsed",
            extractedText: text,
            chunks: chunkText(text),
            warning,
          })
        }
      } catch (err) {
        updateFile(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed to parse file.",
        })
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const parsedFiles = files.filter((f) => f.status === "parsed")
  const totalChars = parsedFiles.reduce((sum, f) => sum + f.extractedText.length, 0)
  const totalChunks = parsedFiles.reduce((sum, f) => sum + f.chunks.length, 0)
  const canContinue = parsedFiles.length > 0

  return (
    <WorkspaceLayout
      step={1}
      title="Upload & Ingestion"
      subtitle="Add source materials to begin. Files are parsed entirely in your browser — nothing is uploaded or stored."
      actions={
        <Button variant="accent" disabled={!canContinue} onClick={() => goToStep(2)}>
          Continue to Outline <ArrowRight className="h-4 w-4" />
        </Button>
      }
      aside={<IngestionAside fileCount={parsedFiles.length} totalChars={totalChars} totalChunks={totalChunks} />}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
            dragging ? "border-accent bg-accent/5" : "border-border bg-card",
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <UploadCloud className="h-7 w-7 text-accent" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold">Drop files here</p>
            <p className="text-sm text-muted-foreground">PDF · DOCX · PPTX · TXT · Markdown</p>
          </div>
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ingested Files ({files.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {files.map((f) => {
                const Icon = iconFor(f.fileType)
                return (
                  <li key={f.id} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                      <Icon className="h-4.5 w-4.5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{f.filename}</span>
                        <span className="shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-muted-foreground">
                          {f.fileType}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{formatBytes(f.sizeBytes)}</span>
                        {f.status === "parsing" && (
                          <span className="flex items-center gap-1 text-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Parsing…
                          </span>
                        )}
                        {f.status === "parsed" && (
                          <>
                            <span className="flex items-center gap-1 text-accent">
                              <CheckCircle2 className="h-3 w-3" /> Parsed
                            </span>
                            <span>{f.chunks.length} chunks</span>
                            <span>{f.extractedText.length.toLocaleString()} chars</span>
                          </>
                        )}
                        {f.status === "error" && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3 w-3" /> {f.error}
                          </span>
                        )}
                      </div>
                      {f.warning && f.status === "parsed" && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {f.warning}
                        </p>
                      )}
                      {f.status === "parsed" && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-accent hover:underline">
                            Preview extracted text
                          </summary>
                          <p className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-secondary/60 p-2 text-xs text-foreground scroll-thin">
                            {f.extractedText.slice(0, 1500)}
                            {f.extractedText.length > 1500 ? "…" : ""}
                          </p>
                        </details>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      aria-label={`Remove ${f.filename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  )
}

function IngestionAside({
  fileCount,
  totalChars,
  totalChunks,
}: {
  fileCount: number
  totalChars: number
  totalChunks: number
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-serif text-base font-bold">Ingestion Summary</h3>
        <p className="text-xs text-muted-foreground">Normalized context prepared for the LLM.</p>
      </div>
      <dl className="flex flex-col gap-2">
        <Stat label="Files parsed" value={String(fileCount)} />
        <Stat label="Context chunks" value={String(totalChunks)} />
        <Stat label="Characters" value={totalChars.toLocaleString()} />
        <Stat label="Est. tokens" value={`~${Math.round(totalChars / 4).toLocaleString()}`} />
      </dl>
      <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">How ingestion works</p>
        Text is extracted from each file, normalized, and split into chunks sized for the model context window. Only
        extracted text is retained — original files never leave your device.
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-serif text-lg font-bold tabular-nums">{value}</dd>
    </div>
  )
}
