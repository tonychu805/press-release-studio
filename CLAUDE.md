# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Next.js dev server (port 3000)
npm run build     # production build
npm run lint      # ESLint via next lint
```

No test suite exists yet.

## Architecture

This is a Next.js 16 / React 19 app with Tailwind CSS v4. All state is held client-side in a React context; there is no database or auth.

### 5-Step Workflow

The entire UX is a single-page linear pipeline driven by `currentStep` (1–5) in `WorkflowProvider`:

| Step | Component | Description |
|------|-----------|-------------|
| 1 | `StepUpload` | File upload and client-side parsing |
| 2 | `StepOutline` | LLM outline generation (Stage 1) |
| 3 | `StepReview` | Outline editing + approval gate |
| 4 | `StepRelease` | LLM press release generation (Stage 2) |
| 5 | `StepExport` | HTML / DOCX / Markdown download |

### State Management

`lib/workflow-context.tsx` is the single source of truth. It holds files, outline versions, press release versions, LLM settings, and prompt versions. Settings and prompts are persisted to `sessionStorage` (keys `prs.settings.v1` and `prs.prompts.v1`); all other state is in-memory only and resets on page reload.

### LLM Integration

- **Client side** — `lib/llm-client.ts` calls `POST /api/llm/generate` with `{ provider, model, apiKey, system, prompt }` and streams the response.
- **Server side** — `app/api/llm/generate/route.ts` uses the Vercel AI SDK (`streamText`) and `lib/llm-server.ts` to instantiate the correct provider. API keys are passed per-request and never stored server-side.
- Supported providers: OpenAI, Anthropic, Google Gemini — configured in `lib/providers.ts`.
- Context assembly for both LLM stages is in `lib/context-builder.ts` (capped at 48,000 chars).

### Two-Stage LLM Pipeline

1. **Outline generation** — system prompt from `outline_prompt` managed version, user prompt built by `buildOutlinePrompt()`.
2. **Release generation** — system prompt from `release_prompt` managed version, user prompt built by `buildReleasePrompt()` (includes approved outline + original source context).

Both prompts are versioned via `ManagedPrompt` / `PromptVersion` types and editable in the Settings panel without a code deploy.

### File Parsing

`lib/file-parsers.ts` runs entirely in the browser (no uploads to a server). Supported types: PDF (pdfjs-dist), DOCX (mammoth), PPTX (jszip + XML parsing), TXT, Markdown. Parsed text is chunked into ~1,600-char segments stored on `IngestedFile.chunks`.

### Export

- HTML and Markdown: client-side download from state.
- DOCX: `POST /api/export/docx` — server renders markdown → `docx` library → binary response. Uses `runtime = "nodejs"` (not edge).

### Key Types

`lib/types.ts` defines the full data model: `ProjectStatus`, `IngestedFile`, `OutlineVersion`, `PressReleaseVersion`, `LLMSettings`, `ManagedPrompt`, `PromptVersion`.
