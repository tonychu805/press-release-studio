import type { ProviderConfig, ProviderId } from "./types"

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    keyPlaceholder: "sk-...",
    keyHint: "Get a key at platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    ],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    keyPlaceholder: "sk-ant-...",
    keyHint: "Get a key at console.anthropic.com",
    models: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-opus-4-1", label: "Claude Opus 4.1" },
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    ],
  },
  google: {
    id: "google",
    label: "Google Gemini",
    keyPlaceholder: "AIza...",
    keyHint: "Get a key at aistudio.google.com/apikey",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
}

export const PROVIDER_LIST = Object.values(PROVIDERS)
