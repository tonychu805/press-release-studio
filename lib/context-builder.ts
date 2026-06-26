import type { IngestedFile } from "./types"

const MAX_CONTEXT_CHARS = 48000

/** Assembles normalized source context from parsed files for LLM consumption. */
export function buildSourceContext(files: IngestedFile[]): string {
  const parsed = files.filter((f) => f.status === "parsed" && f.extractedText)
  if (parsed.length === 0) return ""

  let out = ""
  for (const f of parsed) {
    const header = `\n===== SOURCE FILE: ${f.filename} (${f.fileType}) =====\n`
    out += header + f.extractedText + "\n"
    if (out.length > MAX_CONTEXT_CHARS) {
      out = out.slice(0, MAX_CONTEXT_CHARS) + "\n\n[context truncated to fit model window]"
      break
    }
  }
  return out.trim()
}

/** Builds the user prompt for Stage 1 outline generation. */
export function buildOutlinePrompt(files: IngestedFile[], instructions: string): string {
  const context = buildSourceContext(files)
  let prompt = `Generate a structured press release OUTLINE from the following source material.\n\n${context}`
  if (instructions.trim()) {
    prompt += `\n\n===== ADDITIONAL USER INSTRUCTIONS =====\n${instructions.trim()}`
  }
  return prompt
}

/** Builds the user prompt for Stage 2 release generation. */
export function buildReleasePrompt(files: IngestedFile[], approvedOutline: string): string {
  const context = buildSourceContext(files)
  return `Write the final press release as semantic HTML, strictly following the APPROVED OUTLINE below. Use only facts supported by the original source context.\n\n===== APPROVED OUTLINE =====\n${approvedOutline}\n\n===== ORIGINAL SOURCE CONTEXT =====\n${context}`
}
