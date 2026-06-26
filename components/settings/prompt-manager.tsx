"use client"

import { useRef, useState } from "react"
import { useWorkflow } from "@/lib/workflow-context"
import { Button } from "@/components/ui/button"
import { PROMPT_DESCRIPTIONS } from "@/lib/default-prompts"
import { streamGenerate, validatePrompt } from "@/lib/llm-client"
import type { PromptName } from "@/lib/types"
import { timeAgo, cn } from "@/lib/utils"
import {
  Upload,
  History,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
  Play,
  Loader2,
  X,
} from "lucide-react"

const PROMPT_LABELS: Record<PromptName, string> = {
  outline_prompt: "Outline Prompt — Stage 1",
  release_prompt: "Release Prompt — Stage 2",
}

const SAMPLE_INPUT: Record<PromptName, string> = {
  outline_prompt:
    "SOURCE MATERIAL:\nAcme Corp today announced Series B funding of $40M led by Northstar Ventures to expand its AI logistics platform. The round brings total funding to $65M. CEO Jane Doe said the capital will fund hiring and European expansion. The company serves 200+ enterprise customers.",
  release_prompt:
    "APPROVED OUTLINE:\n## Press Release Type\nFunding Announcement\n## Headline Direction\nAcme raises $40M Series B to scale AI logistics\n## Dateline\nSAN FRANCISCO, CA — [DATE]\n## Lead Structure\n- Acme Corp raised $40M Series B led by Northstar Ventures\n## Quote Placeholders\n- [Jane Doe, CEO]: vision for European expansion\n\nORIGINAL CONTEXT:\nAcme Corp announced $40M Series B led by Northstar Ventures. Total funding $65M. 200+ enterprise customers.",
}

function PromptCard({ name }: { name: PromptName }) {
  const { prompts, settings, savePromptVersion, rollbackPrompt, setActivePromptVersion, activePromptContent } =
    useWorkflow()
  const managed = prompts[name]
  const [draft, setDraft] = useState(activePromptContent(name))
  const [desc, setDesc] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [testOutput, setTestOutput] = useState("")
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const validation = validatePrompt(name, draft)
  const isDirty = draft !== activePromptContent(name)

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDraft(String(reader.result || ""))
    reader.readAsText(file)
    e.target.value = ""
  }

  function save() {
    if (!validation.ok) return
    savePromptVersion(name, draft, desc)
    setDesc("")
  }

  async function runTest() {
    setTesting(true)
    setTestError("")
    setTestOutput("")
    setTestOpen(true)
    try {
      await streamGenerate({
        settings,
        system: draft,
        prompt: SAMPLE_INPUT[name],
        onChunk: setTestOutput,
      })
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Test run failed.")
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h4 className="font-mono text-sm font-semibold">{name}</h4>
          <p className="text-xs text-muted-foreground">{PROMPT_DESCRIPTIONS[name]}</p>
        </div>
        <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          Active v{managed.activeVersion}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={12}
          className="w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed scroll-thin focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Validation feedback */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="flex flex-col gap-1">
            {validation.errors.map((e, i) => (
              <p key={`e${i}`} className="flex items-start gap-1.5 text-xs font-medium text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e}
              </p>
            ))}
            {validation.warnings.map((w, i) => (
              <p key={`w${i}`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}
        {validation.ok && validation.warnings.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-accent">
            <CheckCircle2 className="h-3.5 w-3.5" /> Passes safety validation.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Version note (optional)"
            className="h-8 flex-1 min-w-40 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" variant="accent" onClick={save} disabled={!validation.ok || !isDirty}>
            <Save className="h-3.5 w-3.5" /> Save as new version
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload file
          </Button>
          <input ref={fileRef} type="file" accept=".md,.txt,.text" hidden onChange={onUpload} />
          <Button size="sm" variant="outline" onClick={runTest} disabled={testing}>
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Test run
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowHistory((s) => !s)}>
            <History className="h-3.5 w-3.5" /> History ({managed.versions.length})
          </Button>
        </div>

        {/* Test run output */}
        {testOpen && (
          <div className="rounded-md border border-border bg-secondary/40">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Test Run Output (sandbox — not saved)
              </span>
              <button onClick={() => setTestOpen(false)} aria-label="Close test output">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="max-h-56 overflow-auto p-3 scroll-thin">
              {testError ? (
                <p className="text-xs text-destructive">{testError}</p>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">
                  {testOutput || (testing ? "Generating…" : "")}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Version history */}
        {showHistory && (
          <div className="rounded-md border border-border">
            <ul className="divide-y divide-border">
              {[...managed.versions].reverse().map((v) => (
                <li key={v.version} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-sm px-1.5 py-0.5 text-xs font-semibold",
                        v.version === managed.activeVersion
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      v{v.version}
                    </span>
                    <span className="text-xs text-foreground">{v.description}</span>
                    <span className="text-xs text-muted-foreground">· {timeAgo(v.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActivePromptVersion(name, v.version)
                        setDraft(v.content)
                      }}
                    >
                      Use
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => rollbackPrompt(name, v.version)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Rollback
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export function PromptManager() {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="mb-1 font-serif text-lg font-bold">Prompt Management</h3>
        <p className="text-sm text-muted-foreground">
          System prompts are versioned configuration assets. Edit inline, upload a file, test-run against sample input,
          and roll back at any time. Safety validation protects the outline-first workflow.
        </p>
      </section>
      <PromptCard name="outline_prompt" />
      <PromptCard name="release_prompt" />
    </div>
  )
}
