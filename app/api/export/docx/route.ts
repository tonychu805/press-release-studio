import { NextResponse } from "next/server"
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx"

export const runtime = "nodejs"

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }

// Very small markdown -> blocks parser sufficient for press releases.
function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith("### ")) blocks.push({ type: "h3", text: line.slice(4) })
    else if (line.startsWith("## ")) blocks.push({ type: "h2", text: line.slice(3) })
    else if (line.startsWith("# ")) blocks.push({ type: "h1", text: line.slice(2) })
    else if (line.startsWith("- ") || line.startsWith("* "))
      blocks.push({ type: "li", text: line.slice(2) })
    else blocks.push({ type: "p", text: line })
  }
  return blocks
}

// Convert inline markdown (**bold**, *italic*) to TextRuns.
function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = []
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun(text.slice(lastIndex, match.index)))
    }
    if (match[2] !== undefined) runs.push(new TextRun({ text: match[2], bold: true }))
    else if (match[3] !== undefined) runs.push(new TextRun({ text: match[3], italics: true }))
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) runs.push(new TextRun(text.slice(lastIndex)))
  return runs.length ? runs : [new TextRun(text)]
}

export async function POST(req: Request) {
  try {
    const { markdown, title } = (await req.json()) as {
      markdown?: string
      title?: string
    }
    if (!markdown) {
      return NextResponse.json({ error: "Missing markdown content." }, { status: 400 })
    }

    const blocks = parseMarkdown(markdown)
    const children: Paragraph[] = blocks.map((b) => {
      switch (b.type) {
        case "h1":
          return new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns(b.text) })
        case "h2":
          return new Paragraph({ heading: HeadingLevel.HEADING_2, children: inlineRuns(b.text) })
        case "h3":
          return new Paragraph({ heading: HeadingLevel.HEADING_3, children: inlineRuns(b.text) })
        case "li":
          return new Paragraph({ bullet: { level: 0 }, children: inlineRuns(b.text) })
        default:
          return new Paragraph({ children: inlineRuns(b.text), spacing: { after: 160 } })
      }
    })

    const doc = new Document({
      title: title || "Press Release",
      sections: [{ properties: {}, children }],
    })

    const buffer = await Packer.toBuffer(doc)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${(title || "press-release")
          .replace(/[^a-z0-9-_]+/gi, "-")
          .toLowerCase()}.docx"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate DOCX."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
