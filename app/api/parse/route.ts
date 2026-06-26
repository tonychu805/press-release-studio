import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 min — large decks can take a while

const LLAMAPARSE_BASE = "https://api.cloud.llamaindex.ai/api/parsing"
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 4 * 60 * 1000

export async function GET() {
  const configured = Boolean(process.env.LLAMAPARSE_API_KEY)
  return NextResponse.json({ available: configured })
}

export async function POST(req: Request) {
  const apiKey = process.env.LLAMAPARSE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Document parsing not configured." }, { status: 503 })
  }

  let file: File
  try {
    const form = await req.formData()
    const raw = form.get("file")
    if (!raw || typeof raw === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }
    file = raw as File
  } catch {
    return NextResponse.json({ error: "Failed to read upload." }, { status: 400 })
  }

  // Upload to LlamaParse.
  // fast_mode is intentionally omitted — it skips OCR, which breaks image-heavy
  // PDFs and slide decks exported as PDF.
  const uploadForm = new FormData()
  uploadForm.append("file", file)

  const uploadRes = await fetch(`${LLAMAPARSE_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: uploadForm,
  })

  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => "")
    return NextResponse.json(
      { error: `LlamaParse upload failed (${uploadRes.status}): ${body.slice(0, 300)}` },
      { status: 502 },
    )
  }

  const { id } = (await uploadRes.json()) as { id: string }

  // Poll job until SUCCESS or ERROR
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const statusRes = await fetch(`${LLAMAPARSE_BASE}/job/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!statusRes.ok) continue

    const job = (await statusRes.json()) as { status: string; error?: string }

    if (job.status === "ERROR") {
      return NextResponse.json({ error: `LlamaParse error: ${job.error ?? "unknown"}` }, { status: 502 })
    }

    if (job.status === "SUCCESS") {
      const mdRes = await fetch(`${LLAMAPARSE_BASE}/job/${id}/result/markdown`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!mdRes.ok) {
        const errBody = await mdRes.text().catch(() => "")
        return NextResponse.json(
          { error: `Result fetch failed (${mdRes.status}): ${errBody.slice(0, 200)}` },
          { status: 502 },
        )
      }

      // LlamaParse returns either { markdown: "..." } or { pages: [{ page, md }] }
      const body = await mdRes.json() as Record<string, unknown>

      let markdown = ""
      if (typeof body.markdown === "string") {
        markdown = body.markdown
      } else if (Array.isArray(body.pages)) {
        // pages format: [{page: 1, md: "..."}, ...]
        markdown = (body.pages as Array<{ md?: string; markdown?: string }>)
          .map((p) => p.md ?? p.markdown ?? "")
          .join("\n\n---\n\n")
      }

      if (!markdown) {
        return NextResponse.json(
          { error: "LlamaParse returned no content. The file may be entirely image-based with no extractable text." },
          { status: 422 },
        )
      }

      return NextResponse.json({ markdown })
    }
    // PENDING or other transient state — keep polling
  }

  return NextResponse.json({ error: "Parsing timed out (4 min). Try uploading again." }, { status: 408 })
}
