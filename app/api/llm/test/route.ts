import { generateText } from "ai"
import { getModel, sanitizeError } from "@/lib/llm-server"
import type { ProviderId } from "@/lib/types"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { provider, model, apiKey } = (await req.json()) as {
      provider: ProviderId
      model: string
      apiKey: string
    }

    if (!apiKey || !apiKey.trim()) {
      return Response.json({ ok: false, error: "No API key provided." }, { status: 400 })
    }

    const { text } = await generateText({
      model: getModel(provider, model, apiKey.trim()),
      prompt: 'Reply with exactly the word "ok".',
      maxOutputTokens: 8,
    })

    return Response.json({ ok: true, sample: text.trim() })
  } catch (err) {
    return Response.json({ ok: false, error: sanitizeError(err) }, { status: 200 })
  }
}
