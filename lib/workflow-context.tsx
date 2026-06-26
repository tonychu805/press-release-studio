"use client"

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import type {
  IngestedFile,
  LLMSettings,
  ManagedPrompt,
  OutlineVersion,
  PressReleaseVersion,
  ProjectStatus,
  PromptName,
  OutlineComment,
} from "./types"
import { DEFAULT_OUTLINE_PROMPT, DEFAULT_RELEASE_PROMPT } from "./default-prompts"
import { uid } from "./utils"

const SETTINGS_KEY = "prs.settings.v1"
const PROMPTS_KEY = "prs.prompts.v1"

function defaultPrompts(): Record<PromptName, ManagedPrompt> {
  const now = Date.now()
  return {
    outline_prompt: {
      name: "outline_prompt",
      activeVersion: 1,
      versions: [{ version: 1, content: DEFAULT_OUTLINE_PROMPT, description: "Default outline prompt", createdAt: now }],
    },
    release_prompt: {
      name: "release_prompt",
      activeVersion: 1,
      versions: [{ version: 1, content: DEFAULT_RELEASE_PROMPT, description: "Default release prompt", createdAt: now }],
    },
  }
}

const defaultSettings: LLMSettings = { provider: "openai", model: "gpt-4o", apiKeys: {} }

// ── Fire-and-forget DB sync ────────────────────────────────────────────────────

function sync(url: string, method: string, body?: unknown) {
  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  }).catch((err) => console.warn("[DB sync]", method, url, err))
}

// ── Context interface ─────────────────────────────────────────────────────────

interface WorkflowState {
  // project lifecycle
  projectId: string | null
  projectName: string
  status: ProjectStatus
  currentStep: number
  setProjectName: (name: string) => void
  setStatus: (status: ProjectStatus) => void
  goToStep: (step: number) => void
  createProject: () => Promise<void>
  openProject: (id: string) => Promise<void>
  closeProject: () => void
  resetProject: () => void

  // files
  files: IngestedFile[]
  addFiles: (files: IngestedFile[]) => void
  updateFile: (id: string, patch: Partial<IngestedFile>) => void
  removeFile: (id: string) => void

  // outline
  outlineInstructions: string
  setOutlineInstructions: (v: string) => void
  outlineVersions: OutlineVersion[]
  activeOutlineId: string | null
  setActiveOutline: (id: string) => void
  addOutlineVersion: (content: string) => OutlineVersion
  updateActiveOutline: (content: string) => void
  approveOutline: () => void
  comments: OutlineComment[]
  addComment: (text: string) => void
  removeComment: (id: string) => void

  // press release
  releaseVersions: PressReleaseVersion[]
  activeReleaseId: string | null
  setActiveRelease: (id: string) => void
  addReleaseVersion: (html: string, md: string) => PressReleaseVersion
  updateActiveReleaseHtml: (html: string, md: string) => void

  // settings
  settings: LLMSettings
  updateSettings: (patch: Partial<LLMSettings>) => void
  setApiKey: (provider: LLMSettings["provider"], key: string) => void

  // prompts
  prompts: Record<PromptName, ManagedPrompt>
  activePromptContent: (name: PromptName) => string
  savePromptVersion: (name: PromptName, content: string, description: string) => void
  rollbackPrompt: (name: PromptName, version: number) => void
  setActivePromptVersion: (name: PromptName, version: number) => void
}

const Ctx = createContext<WorkflowState | null>(null)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectName, setProjectNameState] = useState("Untitled Project")
  const [status, setStatusState] = useState<ProjectStatus>("uploading")
  const [currentStep, setCurrentStep] = useState(1)

  const [files, setFiles] = useState<IngestedFile[]>([])

  const [outlineInstructions, setOutlineInstructionsState] = useState("")
  const [outlineVersions, setOutlineVersions] = useState<OutlineVersion[]>([])
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null)
  const [comments, setComments] = useState<OutlineComment[]>([])

  const [releaseVersions, setReleaseVersions] = useState<PressReleaseVersion[]>([])
  const [activeReleaseId, setActiveReleaseId] = useState<string | null>(null)

  const [settings, setSettings] = useState<LLMSettings>(defaultSettings)
  const [prompts, setPrompts] = useState<Record<PromptName, ManagedPrompt>>(defaultPrompts)

  // Keep a ref to projectId so callbacks always see the current value without
  // needing it as a dependency (avoids stale-closure issues in fire-and-forget).
  const pidRef = useRef<string | null>(null)
  pidRef.current = projectId

  // Debounce timers for high-frequency text edits
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  function debounce(key: string, fn: () => void, ms = 1500) {
    clearTimeout(debounceTimers.current[key])
    debounceTimers.current[key] = setTimeout(fn, ms)
  }

  // ── Session storage: settings + prompts ─────────────────────────────────────

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(SETTINGS_KEY)
      if (s) setSettings({ ...defaultSettings, ...JSON.parse(s) })
      // Prompts live in localStorage so they persist across sessions.
      const p = localStorage.getItem(PROMPTS_KEY)
      if (p) setPrompts(JSON.parse(p))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try { sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* ignore */ }
  }, [settings])

  useEffect(() => {
    try { localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts)) } catch { /* ignore */ }
  }, [prompts])

  // ── Project meta helpers ─────────────────────────────────────────────────────

  function patchProject(patch: Record<string, unknown>) {
    const pid = pidRef.current
    if (!pid) return
    sync(`/api/projects/${pid}`, "PATCH", patch)
  }

  // ── Project lifecycle ────────────────────────────────────────────────────────

  const clearState = useCallback(() => {
    setProjectNameState("Untitled Project")
    setStatusState("uploading")
    setCurrentStep(1)
    setFiles([])
    setOutlineInstructionsState("")
    setOutlineVersions([])
    setActiveOutlineId(null)
    setComments([])
    setReleaseVersions([])
    setActiveReleaseId(null)
  }, [])

  const createProject = useCallback(async () => {
    const id = uid("proj")
    const name = "Untitled Project"
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    })
    clearState()
    setProjectId(id)
  }, [clearState])

  const openProject = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) return
    const data = await res.json()

    clearState()

    setProjectId(id)
    setProjectNameState(data.name)
    setStatusState(data.status as ProjectStatus)
    setCurrentStep(data.current_step)
    setOutlineInstructionsState(data.outline_instructions ?? "")
    setComments(JSON.parse(data.comments ?? "[]"))

    const ingestedFiles: IngestedFile[] = (data.files ?? []).map((f: {
      id: string; filename: string; file_type: string; size_bytes: number;
      extracted_text: string; chunks: string; status: string;
      error?: string; warning?: string; enhanced: number;
    }) => ({
      id: f.id,
      filename: f.filename,
      fileType: f.file_type,
      sizeBytes: f.size_bytes,
      extractedText: f.extracted_text,
      chunks: JSON.parse(f.chunks ?? "[]"),
      status: f.status as IngestedFile["status"],
      error: f.error ?? undefined,
      warning: f.warning ?? undefined,
      enhanced: Boolean(f.enhanced),
    }))
    setFiles(ingestedFiles)

    const outlines: OutlineVersion[] = (data.outlines ?? []).map((o: {
      id: string; content: string; version: number; status: string; created_at: number;
    }) => ({
      id: o.id,
      content: o.content,
      version: o.version,
      status: o.status as OutlineVersion["status"],
      createdAt: o.created_at,
    }))
    setOutlineVersions(outlines)
    setActiveOutlineId(data.active_outline_id ?? (outlines.at(-1)?.id ?? null))

    const releases: PressReleaseVersion[] = (data.releases ?? []).map((r: {
      id: string; html_content: string; markdown_content: string; version: number; created_at: number;
    }) => ({
      id: r.id,
      htmlContent: r.html_content,
      markdownContent: r.markdown_content,
      version: r.version,
      createdAt: r.created_at,
    }))
    setReleaseVersions(releases)
    setActiveReleaseId(data.active_release_id ?? (releases.at(-1)?.id ?? null))
  }, [clearState])

  const closeProject = useCallback(() => {
    clearState()
    setProjectId(null)
  }, [clearState])

  const resetProject = useCallback(() => {
    // Capture file ids before clearing state, then delete each from DB.
    setFiles((currentFiles) => {
      const pid = pidRef.current
      if (pid) {
        for (const f of currentFiles) sync(`/api/projects/${pid}/files/${f.id}`, "DELETE")
        patchProject({ status: "uploading", current_step: 1, active_outline_id: null, active_release_id: null, outline_instructions: "", comments: "[]" })
      }
      return []
    })
    clearState()
  }, [clearState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step + status ────────────────────────────────────────────────────────────

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
    patchProject({ current_step: step })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = useCallback((s: ProjectStatus) => {
    setStatusState(s)
    patchProject({ status: s })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setProjectName = useCallback((name: string) => {
    setProjectNameState(name)
    debounce("name", () => patchProject({ name }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Files ────────────────────────────────────────────────────────────────────

  const addFiles = useCallback((newFiles: IngestedFile[]) => {
    setFiles((prev) => [...prev, ...newFiles])
    const pid = pidRef.current
    if (!pid) return
    for (const f of newFiles) {
      sync(`/api/projects/${pid}/files`, "POST", {
        id: f.id, filename: f.filename, file_type: f.fileType,
        size_bytes: f.sizeBytes, extracted_text: f.extractedText,
        chunks: JSON.stringify(f.chunks), status: f.status,
        error: f.error ?? null, warning: f.warning ?? null,
        enhanced: f.enhanced ? 1 : 0, created_at: Date.now(),
      })
    }
  }, [])

  const updateFile = useCallback((id: string, patch: Partial<IngestedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    const pid = pidRef.current
    if (!pid) return
    const dbPatch: Record<string, unknown> = {}
    if (patch.filename !== undefined) dbPatch.filename = patch.filename
    if (patch.fileType !== undefined) dbPatch.file_type = patch.fileType
    if (patch.sizeBytes !== undefined) dbPatch.size_bytes = patch.sizeBytes
    if (patch.extractedText !== undefined) dbPatch.extracted_text = patch.extractedText
    if (patch.chunks !== undefined) dbPatch.chunks = JSON.stringify(patch.chunks)
    if (patch.status !== undefined) dbPatch.status = patch.status
    if (patch.error !== undefined) dbPatch.error = patch.error ?? null
    if (patch.warning !== undefined) dbPatch.warning = patch.warning ?? null
    if (patch.enhanced !== undefined) dbPatch.enhanced = patch.enhanced ? 1 : 0
    if (Object.keys(dbPatch).length) sync(`/api/projects/${pid}/files/${id}`, "PATCH", dbPatch)
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    const pid = pidRef.current
    if (pid) sync(`/api/projects/${pid}/files/${id}`, "DELETE")
  }, [])

  // ── Outlines ─────────────────────────────────────────────────────────────────

  const setOutlineInstructions = useCallback((v: string) => {
    setOutlineInstructionsState(v)
    debounce("outlineInstr", () => patchProject({ outline_instructions: v }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addOutlineVersion = useCallback((content: string) => {
    const next: OutlineVersion = {
      id: uid("outline"),
      content,
      version: 0,
      status: "draft",
      createdAt: Date.now(),
    }
    setOutlineVersions((prev) => {
      next.version = prev.length + 1
      return [...prev, next]
    })
    setActiveOutlineId(next.id)
    setStatusState("review")
    const pid = pidRef.current
    if (pid) {
      sync(`/api/projects/${pid}/outlines`, "POST", {
        id: next.id, content: next.content, version: next.version,
        status: next.status, created_at: next.createdAt,
      })
      sync(`/api/projects/${pid}`, "PATCH", { status: "review", active_outline_id: next.id })
    }
    return next
  }, [])

  const updateActiveOutline = useCallback((content: string) => {
    setActiveOutlineId((aid) => {
      if (!aid) return aid
      setOutlineVersions((prev) =>
        prev.map((o) => (o.id === aid && o.status === "draft" ? { ...o, content } : o)),
      )
      const pid = pidRef.current
      if (pid) debounce(`outline-${aid}`, () => sync(`/api/projects/${pid}/outlines/${aid}`, "PATCH", { content }))
      return aid
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const approveOutline = useCallback(() => {
    setActiveOutlineId((aid) => {
      if (!aid) return aid
      setOutlineVersions((prev) =>
        prev.map((o) => (o.id === aid ? { ...o, status: "approved" } : o)),
      )
      setStatusState("approved")
      const pid = pidRef.current
      if (pid) {
        sync(`/api/projects/${pid}/outlines/${aid}`, "PATCH", { status: "approved" })
        sync(`/api/projects/${pid}`, "PATCH", { status: "approved" })
      }
      return aid
    })
  }, [])

  const addComment = useCallback((text: string) => {
    setComments((prev) => {
      const next = [...prev, { id: uid("c"), text, createdAt: Date.now() }]
      patchProject({ comments: JSON.stringify(next) })
      return next
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const removeComment = useCallback((id: string) => {
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== id)
      patchProject({ comments: JSON.stringify(next) })
      return next
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Releases ─────────────────────────────────────────────────────────────────

  const addReleaseVersion = useCallback((html: string, md: string) => {
    const next: PressReleaseVersion = {
      id: uid("release"),
      htmlContent: html,
      markdownContent: md,
      version: 0,
      createdAt: Date.now(),
    }
    setReleaseVersions((prev) => {
      next.version = prev.length + 1
      return [...prev, next]
    })
    setActiveReleaseId(next.id)
    setStatusState("completed")
    const pid = pidRef.current
    if (pid) {
      sync(`/api/projects/${pid}/releases`, "POST", {
        id: next.id, html_content: next.htmlContent, markdown_content: next.markdownContent,
        version: next.version, created_at: next.createdAt,
      })
      sync(`/api/projects/${pid}`, "PATCH", { status: "completed", active_release_id: next.id })
    }
    return next
  }, [])

  const updateActiveReleaseHtml = useCallback((html: string, md: string) => {
    setActiveReleaseId((arid) => {
      if (!arid) return arid
      setReleaseVersions((prev) =>
        prev.map((r) => (r.id === arid ? { ...r, htmlContent: html, markdownContent: md } : r)),
      )
      const pid = pidRef.current
      if (pid) debounce(`release-${arid}`, () =>
        sync(`/api/projects/${pid}/releases/${arid}`, "PATCH", { html_content: html, markdown_content: md }),
      )
      return arid
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Settings ─────────────────────────────────────────────────────────────────

  const updateSettings = useCallback((patch: Partial<LLMSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const setApiKey = useCallback((provider: LLMSettings["provider"], key: string) => {
    setSettings((prev) => ({ ...prev, apiKeys: { ...prev.apiKeys, [provider]: key } }))
  }, [])

  // ── Prompts ───────────────────────────────────────────────────────────────────

  const activePromptContent = useCallback(
    (name: PromptName) => {
      const p = prompts[name]
      return p.versions.find((x) => x.version === p.activeVersion)?.content ?? ""
    },
    [prompts],
  )

  const savePromptVersion = useCallback((name: PromptName, content: string, description: string) => {
    setPrompts((prev) => {
      const p = prev[name]
      const nextVersion = Math.max(...p.versions.map((v) => v.version)) + 1
      return {
        ...prev,
        [name]: {
          ...p,
          activeVersion: nextVersion,
          versions: [...p.versions, { version: nextVersion, content, description: description || `Version ${nextVersion}`, createdAt: Date.now() }],
        },
      }
    })
  }, [])

  const rollbackPrompt = useCallback((name: PromptName, version: number) => {
    setPrompts((prev) => {
      const p = prev[name]
      const source = p.versions.find((v) => v.version === version)
      if (!source) return prev
      const nextVersion = Math.max(...p.versions.map((v) => v.version)) + 1
      return {
        ...prev,
        [name]: {
          ...p,
          activeVersion: nextVersion,
          versions: [...p.versions, { version: nextVersion, content: source.content, description: `Rolled back to v${version}`, createdAt: Date.now() }],
        },
      }
    })
  }, [])

  const setActivePromptVersion = useCallback((name: PromptName, version: number) => {
    setPrompts((prev) => ({ ...prev, [name]: { ...prev[name], activeVersion: version } }))
  }, [])

  // ── Context value ─────────────────────────────────────────────────────────────

  const value: WorkflowState = {
    projectId,
    projectName,
    status,
    currentStep,
    setProjectName,
    setStatus,
    goToStep,
    createProject,
    openProject,
    closeProject,
    resetProject,
    files,
    addFiles,
    updateFile,
    removeFile,
    outlineInstructions,
    setOutlineInstructions,
    outlineVersions,
    activeOutlineId,
    setActiveOutline: setActiveOutlineId,
    addOutlineVersion,
    updateActiveOutline,
    approveOutline,
    comments,
    addComment,
    removeComment,
    releaseVersions,
    activeReleaseId,
    setActiveRelease: setActiveReleaseId,
    addReleaseVersion,
    updateActiveReleaseHtml,
    settings,
    updateSettings,
    setApiKey,
    prompts,
    activePromptContent,
    savePromptVersion,
    rollbackPrompt,
    setActivePromptVersion,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorkflow() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider")
  return ctx
}
