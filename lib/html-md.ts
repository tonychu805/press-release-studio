// Conversion helpers shared between the release editor and the export system.

/** Strips code fences or stray wrapper tags the model may emit around the HTML body. */
export function cleanReleaseHtml(raw: string): string {
  let html = raw.trim()
  html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "")
  // Remove document-level wrappers if a model added them.
  html = html.replace(/<\/?(?:html|head|body)[^>]*>/gi, "")
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "")
  return html.trim()
}

/** Lightweight HTML -> Markdown for the parallel Markdown view/export. */
export function htmlToMarkdown(html: string): string {
  let md = cleanReleaseHtml(html)

  md = md
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => `# ${strip(c)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => `## ${strip(c)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => `### ${strip(c)}\n\n`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) => `> ${strip(c)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${strip(c)}\n`)
    .replace(/<\/(?:ul|ol)>/gi, "\n")
    .replace(/<(?:ul|ol)[^>]*>/gi, "")
    .replace(/<hr\s*\/?>/gi, "\n---\n\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `${strip(c)}\n\n`)
    .replace(/<br\s*\/?>/gi, "\n")

  // Inline elements
  md = md
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "_$1_")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "_$1_")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")

  md = md.replace(/<[^>]+>/g, "") // drop any remaining tags
  md = decodeEntities(md)
  return md.replace(/\n{3,}/g, "\n\n").trim()
}

function strip(s: string): string {
  return decodeEntities(
    s
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "_$1_")
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  )
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
}

/** Wraps the release body in a standalone, newsroom-styled HTML document with inline CSS. */
export function buildStandaloneHtml(bodyHtml: string, title: string): string {
  const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px;
    color: #1a1a1a;
    line-height: 1.65;
    background: #ffffff;
  }
  h1 { font-size: 2rem; line-height: 1.15; margin: 0 0 .5rem; letter-spacing: -.01em; }
  h2 { font-size: 1.25rem; font-weight: 600; color: #444; margin: 0 0 1.5rem; }
  h3 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: .8rem; text-transform: uppercase; letter-spacing: .08em;
    color: #8a1a1a; margin: 2rem 0 .5rem;
  }
  p { margin: 0 0 1rem; }
  blockquote {
    border-left: 3px solid #8a1a1a; margin: 1.25rem 0; padding-left: 1rem;
    font-style: italic; color: #333;
  }
  hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
  a { color: #8a1a1a; }
  .end { text-align: center; font-weight: bold; letter-spacing: .2em; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "press-release"
  )
}
