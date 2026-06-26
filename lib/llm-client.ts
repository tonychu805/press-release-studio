import type { LLMSettings, PromptName } from "./types"

export interface GenerateArgs {
  settings: LLMSettings
  system: string
  prompt: string
  onChunk?: (full: string) => void
  signal?: AbortSignal
}

/**
 * Streams a generation from the server route, invoking onChunk with the
 * accumulated text as it arrives. Resolves with the full text.
 */
export async function streamGenerate({ settings, system, prompt, onChunk, signal }: GenerateArgs): Promise<string> {
  const apiKey = settings.apiKeys[settings.provider]
  if (!apiKey) {
    throw new Error("No API key set for the selected provider. Open Settings to add one.")
  }

  const res = await fetch("/api/llm/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: settings.provider, model: settings.model, apiKey, system, prompt }),
    signal,
  })

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "Generation failed.")
    throw new Error(errText || "Generation failed.")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    full += decoder.decode(value, { stream: true })
    onChunk?.(full)
  }
  return full
}

export interface PromptValidation {
  ok: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Lightweight prompt validation that enforces the PRD safety constraints:
 * workflow integrity, outline-first requirement, and approval-gate awareness.
 */
export function validatePrompt(name: PromptName, content: string): PromptValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const text = content.toLowerCase()

  if (!content.trim()) {
    errors.push("Prompt cannot be empty.")
    return { ok: false, errors, warnings }
  }
  if (content.trim().length < 40) {
    errors.push("Prompt is too short to be reliable (minimum 40 characters).")
  }

  if (name === "outline_prompt") {
    if (!text.includes("outline")) {
      errors.push('Outline prompt must reference an "outline" to preserve the outline-first workflow.')
    }
    if (!/(do not|don't|never).*(prose|paragraph|final|press release)/s.test(text) && !text.includes("outline only")) {
      warnings.push("Consider explicitly instructing the model not to write final prose at this stage.")
    }
  }

  if (name === "release_prompt") {
    if (!text.includes("outline")) {
      warnings.push("Release prompt usually references the approved outline it must follow.")
    }
    if (!text.includes("html")) {
      warnings.push("Release prompt should specify HTML output for the primary editor view.")
    }
    if (!/(no|never|not).*(hallucinat|fabricat|invent)/s.test(text)) {
      warnings.push("Consider adding an explicit no-hallucination constraint.")
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}
