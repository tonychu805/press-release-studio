import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { LanguageModel } from "ai"
import type { ProviderId } from "./types"

/**
 * Builds a language model instance for the selected provider using a
 * user-supplied API key. Keys are passed per-request and never persisted
 * server-side or logged.
 */
export function getModel(provider: ProviderId, model: string, apiKey: string): LanguageModel {
  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey })
      return openai(model)
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey })
      return anthropic(model)
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey })
      return google(model)
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

export function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  // Strip anything that looks like an API key from error text.
  const cleaned = raw.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]")
  if (/api key|apikey|unauthorized|401|authentication/i.test(cleaned)) {
    return "Authentication failed. Check that your API key is correct and active for this provider."
  }
  if (/quota|rate limit|429/i.test(cleaned)) {
    return "Rate limit or quota exceeded for this provider. Try again shortly or check your plan."
  }
  if (/model|not found|404/i.test(cleaned)) {
    return "The selected model is unavailable for this key. Pick a different model in Settings."
  }
  return cleaned.slice(0, 300)
}
