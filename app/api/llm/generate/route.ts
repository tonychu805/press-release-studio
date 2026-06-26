import { streamText } from "ai"
import { getModel, sanitizeError } from "@/lib/llm-server"
import type { ProviderId } from "@/lib/types"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { provider, model, apiKey, system, prompt } = (await req.json()) as {
      provider: ProviderId
      model: string
      apiKey: string
      system: string
      prompt: string
    }

    if (!apiKey?.trim()) {
      return new Response("Missing API key. Add it in Settings.", { status: 400 })
    }

    const result = streamText({
      model: getModel(provider, model, apiKey.trim()),
      system,
      prompt,
      maxOutputTokens: 4000,
      temperature: 0.4,
    })

    return result.toTextStreamResponse()
  } catch (err) {
    return new Response(sanitizeError(err), { status: 500 })
  }
}
