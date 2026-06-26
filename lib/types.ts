export type ProjectStatus =
  | "uploading"
  | "outlining"
  | "review"
  | "approved"
  | "generating"
  | "completed"

export type ProviderId = "openai" | "anthropic" | "google"

export interface ModelOption {
  id: string
  label: string
}

export interface ProviderConfig {
  id: ProviderId
  label: string
  models: ModelOption[]
  keyPlaceholder: string
  keyHint: string
}

export interface IngestedFile {
  id: string
  filename: string
  fileType: string
  sizeBytes: number
  extractedText: string
  chunks: string[]
  status: "parsing" | "parsed" | "error"
  error?: string
  warning?: string
}

export type PromptName = "outline_prompt" | "release_prompt"

export interface PromptVersion {
  version: number
  content: string
  description: string
  createdAt: number
}

export interface ManagedPrompt {
  name: PromptName
  activeVersion: number
  versions: PromptVersion[]
}

export interface OutlineVersion {
  id: string
  content: string
  version: number
  status: "draft" | "approved"
  createdAt: number
}

export interface PressReleaseVersion {
  id: string
  htmlContent: string
  markdownContent: string
  version: number
  createdAt: number
}

export interface LLMSettings {
  provider: ProviderId
  model: string
  apiKeys: Partial<Record<ProviderId, string>>
}

export interface OutlineComment {
  id: string
  text: string
  createdAt: number
}
