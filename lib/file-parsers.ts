"use client"

// Client-side multi-format file parsing. Nothing is uploaded to a server;
// files are read in the browser and only the extracted text is kept in memory.

export interface ParseResult {
  text: string
  warning?: string
}

const CHUNK_SIZE = 1600

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim()
  if (!clean) return []
  const paragraphs = clean.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ""
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > CHUNK_SIZE && current) {
      chunks.push(current.trim())
      current = p
    } else {
      current = current ? current + "\n\n" + p : p
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export function detectType(file: File): string {
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".docx")) return "docx"
  if (name.endsWith(".pptx")) return "pptx"
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown"
  if (name.endsWith(".txt") || name.endsWith(".text")) return "txt"
  return "unknown"
}

async function parsePdf(file: File): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist")
  // Configure the worker from the bundled module (Turbopack resolves the URL).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString()

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise
  let text = ""
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ")
    text += pageText + "\n\n"
  }
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      text: "",
      warning:
        "No selectable text found in this PDF. It may be scanned/image-based — OCR is not available in this build.",
    }
  }
  return { text: trimmed }
}

async function parseDocx(file: File): Promise<ParseResult> {
  const mammoth = (await import("mammoth")).default ?? (await import("mammoth"))
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return {
    text: result.value.trim(),
    warning: result.messages?.length ? "Some formatting could not be fully extracted." : undefined,
  }
}

async function parsePptx(file: File): Promise<ParseResult> {
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  // Collect slide files in numeric order.
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)?.[1] ?? 0)
      const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] ?? 0)
      return na - nb
    })

  if (slideNames.length === 0) {
    return { text: "", warning: "No slides found in this PPTX file." }
  }

  let text = ""
  let slideNum = 1
  for (const name of slideNames) {
    const xml = await zip.files[name].async("string")
    const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]))
    const slideText = matches.join(" ").replace(/\s+/g, " ").trim()
    if (slideText) {
      text += `## Slide ${slideNum}\n${slideText}\n\n`
    }
    slideNum++
  }
  return { text: text.trim() }
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function parseText(file: File): Promise<ParseResult> {
  const text = await file.text()
  return { text: text.trim() }
}

export async function parseFile(file: File, type: string): Promise<ParseResult> {
  switch (type) {
    case "pdf":
      return parsePdf(file)
    case "docx":
      return parseDocx(file)
    case "pptx":
      return parsePptx(file)
    case "markdown":
    case "txt":
      return parseText(file)
    default:
      throw new Error("Unsupported file type. Use PDF, DOCX, PPTX, TXT, or Markdown.")
  }
}
