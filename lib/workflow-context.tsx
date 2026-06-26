"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
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
      versions: [
        {
          version: 1,
          content: DEFAULT_OUTLINE_PROMPT,
          description: "Default outline prompt",
          createdAt: now,
        },
      ],
    },
    release_prompt: {
      name: "release_prompt",
      activeVersion: 1,
      versions: [
        {
          version: 1,
          content: DEFAULT_RELEASE_PROMPT,
          description: "Default release prompt",
          createdAt: now,
        },
      ],
    },
  }
}

const defaultSettings: LLMSettings = {
  provider: "openai",
  model: "gpt-4o",
  apiKeys: {},
}

interface WorkflowState {
  // project
  projectName: string
  status: ProjectStatus
  currentStep: number
  setProjectName: (name: string) => void
  goToStep: (step: number) => void

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

  // lifecycle
  resetProject: () => void
}

const Ctx = createContext<WorkflowState | null>(null)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [projectName, setProjectName] = useState("Untitled Project")
  const [status, setStatus] = useState<ProjectStatus>("uploading")
  const [currentStep, setCurrentStep] = useState(1)

  const [files, setFiles] = useState<IngestedFile[]>([])

  const [outlineInstructions, setOutlineInstructions] = useState("")
  const [outlineVersions, setOutlineVersions] = useState<OutlineVersion[]>([])
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null)
  const [comments, setComments] = useState<OutlineComment[]>([])

  const [releaseVersions, setReleaseVersions] = useState<PressReleaseVersion[]>([])
  const [activeReleaseId, setActiveReleaseId] = useState<string | null>(null)

  const [settings, setSettings] = useState<LLMSettings>(defaultSettings)
  const [prompts, setPrompts] = useState<Record<PromptName, ManagedPrompt>>(defaultPrompts)

  // hydrate settings + prompts from sessionStorage (session-only, not permanent)
  useEffect(() => {
    try {
      const s = sessionStorage.getItem(SETTINGS_KEY)
      if (s) setSettings({ ...defaultSettings, ...JSON.parse(s) })
      const p = sessionStorage.getItem(PROMPTS_KEY)
      if (p) setPrompts(JSON.parse(p))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }, [settings])

  useEffect(() => {
    try {
      sessionStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts))
    } catch {
      /* ignore */
    }
  }, [prompts])

  const goToStep = useCallback((step: number) => setCurrentStep(step), [])

  const addFiles = useCallback((newFiles: IngestedFile[]) => {
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const updateFile = useCallback((id: string, patch: Partial<IngestedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

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
    setStatus("review")
    return next
  }, [])

  const updateActiveOutline = useCallback(
    (content: string) => {
      if (!activeOutlineId) return
      setOutlineVersions((prev) =>
        prev.map((o) => (o.id === activeOutlineId && o.status === "draft" ? { ...o, content } : o)),
      )
    },
    [activeOutlineId],
  )

  const approveOutline = useCallback(() => {
    if (!activeOutlineId) return
    setOutlineVersions((prev) =>
      prev.map((o) => (o.id === activeOutlineId ? { ...o, status: "approved" } : o)),
    )
    setStatus("approved")
  }, [activeOutlineId])

  const addComment = useCallback((text: string) => {
    setComments((prev) => [...prev, { id: uid("c"), text, createdAt: Date.now() }])
  }, [])

  const removeComment = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id))
  }, [])

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
    setStatus("completed")
    return next
  }, [])

  const updateActiveReleaseHtml = useCallback(
    (html: string, md: string) => {
      if (!activeReleaseId) return
      setReleaseVersions((prev) =>
        prev.map((r) => (r.id === activeReleaseId ? { ...r, htmlContent: html, markdownContent: md } : r)),
      )
    },
    [activeReleaseId],
  )

  const updateSettings = useCallback((patch: Partial<LLMSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const setApiKey = useCallback((provider: LLMSettings["provider"], key: string) => {
    setSettings((prev) => ({ ...prev, apiKeys: { ...prev.apiKeys, [provider]: key } }))
  }, [])

  const activePromptContent = useCallback(
    (name: PromptName) => {
      const p = prompts[name]
      const v = p.versions.find((x) => x.version === p.activeVersion)
      return v?.content ?? ""
    },
    [prompts],
  )

  const savePromptVersion = useCallback((name: PromptName, content: string, description: string) => {
    setPrompts((prev) => {
      const p = prev[name]
      const nextVersion = Math.max(...p.versions.map((v) => v.version)) + 1
      const updated: ManagedPrompt = {
        ...p,
        activeVersion: nextVersion,
        versions: [
          ...p.versions,
          { version: nextVersion, content, description: description || `Version ${nextVersion}`, createdAt: Date.now() },
        ],
      }
      return { ...prev, [name]: updated }
    })
  }, [])

  const rollbackPrompt = useCallback((name: PromptName, version: number) => {
    setPrompts((prev) => {
      const p = prev[name]
      const source = p.versions.find((v) => v.version === version)
      if (!source) return prev
      const nextVersion = Math.max(...p.versions.map((v) => v.version)) + 1
      const updated: ManagedPrompt = {
        ...p,
        activeVersion: nextVersion,
        versions: [
          ...p.versions,
          {
            version: nextVersion,
            content: source.content,
            description: `Rolled back to v${version}`,
            createdAt: Date.now(),
          },
        ],
      }
      return { ...prev, [name]: updated }
    })
  }, [])

  const setActivePromptVersion = useCallback((name: PromptName, version: number) => {
    setPrompts((prev) => ({ ...prev, [name]: { ...prev[name], activeVersion: version } }))
  }, [])

  const resetProject = useCallback(() => {
    setProjectName("Untitled Project")
    setStatus("uploading")
    setCurrentStep(1)
    setFiles([])
    setOutlineInstructions("")
    setOutlineVersions([])
    setActiveOutlineId(null)
    setComments([])
    setReleaseVersions([])
    setActiveReleaseId(null)
  }, [])

  const value: WorkflowState = {
    projectName,
    status,
    currentStep,
    setProjectName,
    goToStep,
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
    resetProject,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorkflow() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider")
  return ctx
}
