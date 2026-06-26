```markdown
# PRD — AI Press Release Generator (5-Step Editorial Workflow)

## 1. Product Overview

The AI Press Release Generator is a web-based workflow tool that transforms raw, unstructured materials into a polished, publication-ready press release through a structured, human-in-the-loop process.

It is designed for editorial control, ensuring users can guide narrative structure, validate accuracy, and enforce brand consistency before final publication.

The system uses large language models (LLMs) to:
- Extract structured insights from uploaded materials
- Generate a press release outline for approval
- Produce final publication-ready press releases
- Export in multiple formats (HTML, DOCX, Markdown)

The experience follows a strict **5-step workflow** with approval gates between key stages.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Convert multi-format documents into structured press releases
- Provide an editorial approval workflow before final generation
- Support multiple LLM providers and models
- Enable full prompt customization
- Deliver export-ready press releases (web + document formats)

### 2.2 Non-Goals
- No real-time collaboration (MVP)
- No CMS publishing integration (future scope)
- No automated media distribution (future scope)

---

## 3. Target Users

- Marketing teams
- PR teams
- Product managers
- Startup founders
- Internal communications teams

Primary need: produce consistent, high-quality press releases quickly while maintaining editorial control.

---

## 4. Core User Workflow (5 Steps)

### Step 1 — Upload & Ingestion

#### Description
User uploads source materials to initiate a press release project.

#### Supported file types
- PDF
- DOCX
- PPTX
- TXT
- Markdown

#### System behavior
- Extract text from all uploaded files
- Normalize content into structured chunks
- Store processed context in project workspace
- Prepare input for LLM processing

#### Output
- File ingestion confirmation
- Optional extracted summary preview

---

### Step 2 — Outline Generation (LLM Stage 1)

#### Description
System generates a structured press release outline using a configurable system prompt (`outline_prompt`).

#### Inputs
- Processed document content
- User optional instructions
- `outline_prompt` system prompt

#### Output
Markdown outline containing:
- Press release type detection
- Headline direction
- Dateline
- Lead structure
- Section planning
- Quote placeholders
- Open questions / missing info

#### Output format
- Markdown editor view
- Auto-saved file:
```

{project-name}-pr-outline.md

```

#### Key rule
No final prose is generated at this stage.

---

### Step 3 — Outline Review & Approval Gate

#### Description
User reviews and edits generated outline before proceeding.

#### Actions available
- Edit markdown directly
- Regenerate outline
- Add comments
- Approve outline (required to proceed)

#### System behavior
- Lock approved outline version
- Store version history
- Trigger Step 4 upon approval

---

### Step 4 — Press Release Generation (LLM Stage 2)

#### Description
System generates a final press release using the approved outline and `release_prompt`.

#### Inputs
- Approved outline
- Original extracted content
- `release_prompt` system prompt

#### Output
- Full press release in HTML
- Parallel Markdown version

#### Requirements
- Editorial tone compliance
- Strict adherence to outline structure
- No hallucinated facts
- Proper quote handling rules

#### Output format
- HTML editor (primary view)
- Markdown preview (secondary view)

---

### Step 5 — Export & Download

#### Description
User exports final press release.

#### Supported formats
- HTML (web-ready)
- DOCX (Word-compatible)
- Markdown (.md)

#### Export requirements
- Preserve structure and formatting
- Ensure clean semantic HTML
- Ensure DOCX uses proper heading hierarchy

---

## 5. Settings System

### 5.1 LLM Provider Configuration

User can configure:

#### Supported providers
- OpenAI (GPT-4o, GPT-4.1)
- Anthropic (Claude models)
- Google Gemini models

#### Configuration fields
- Provider selection dropdown
- Model selection dropdown
- API key input (encrypted storage)
- Connection test button

---

### 5.2 Prompt Management System (Critical Feature)

System prompts are fully editable and version-controlled.

#### Managed prompts
- `outline_prompt`
- `release_prompt`

#### Features
- Inline editor (Markdown/structured text)
- Upload prompt file
- Version history
- Rollback support
- Prompt validation
- Test-run execution mode

#### Safety constraints
System must preserve:
- 5-step workflow integrity
- Outline-first requirement
- Approval gate enforcement

---

### 5.3 UI Preferences

- Theme: editorial clean style (default)
- Accent color: single-color system
- Typography: magazine/newspaper-inspired
- Layout density: readable, whitespace-heavy

---

## 6. System Architecture

### 6.1 Frontend

Recommended:
- Next.js (React-based)

Modules:
- File upload interface
- Markdown editor (Step 2)
- HTML editor (Step 4)
- Settings panel
- Step progress navigator

---

### 6.2 Backend

Responsibilities:
- File ingestion & parsing
- LLM orchestration
- Prompt injection system
- Context management
- Export generation

Suggested stack:
- Node.js (Express / FastAPI alternative)

---

### 6.3 LLM Orchestration Layer

Core responsibilities:
- Route requests to selected provider
- Inject system prompt (outline or release)
- Manage context window (multi-file ingestion)
- Handle retries and fallback logic
- Ensure deterministic prompt execution

---

## 7. Data Model

### Project
- id
- name
- status (uploading | outlining | review | approved | generating | completed)

### File
- id
- project_id
- filename
- file_type
- extracted_text
- parsed_chunks

### Outline
- id
- project_id
- content_md
- version
- status (draft | approved)
- created_at

### PressRelease
- id
- project_id
- html_content
- markdown_content
- version
- created_at

### Settings
- llm_provider
- model
- api_key_encrypted
- prompt_outline_version
- prompt_release_version

---

## 8. File Processing Layer

### Responsibilities
- Parse multiple file formats
- Extract structured text
- Normalize content across formats
- Chunk large documents for LLM consumption

### Parsing strategies
- PDF: text extraction + OCR fallback
- DOCX: structured text extraction
- PPTX: slide-by-slide parsing
- TXT/MD: direct ingestion

---

## 9. LLM Workflow Design

### Stage 1 — Outline Generation
Input:
- Extracted content
- outline_prompt

Output:
- Structured markdown outline

### Stage 2 — Press Release Generation
Input:
- Approved outline
- Original context
- release_prompt

Output:
- HTML press release
- Markdown version

---

## 10. Prompt System Design

### Core principle
Prompts are treated as **versioned configuration assets**, not static code.

### Prompt structure
- Metadata (name, version, description)
- Instruction body
- Constraints
- Output rules

### Requirements
- Editable via UI
- Uploadable as file
- Version tracked
- Rollback enabled
- Testable before activation

---

## 11. UI/UX Requirements

### Design direction
- Clean editorial layout
- Newspaper/magazine aesthetic
- Minimal color usage
- Strong typography hierarchy

### Layout structure
- Left: step navigation
- Center: editor workspace
- Right: preview/context panel

### Workflow UI
- Step progress indicator (1–5)
- Locked steps after approval
- Clear CTA per stage

---

## 12. Export System

### HTML Export
- Inline CSS
- Semantic structure
- Newsroom-style formatting

### DOCX Export
- Heading hierarchy preserved
- Clean paragraph formatting
- Word-compatible structure

### Markdown Export
- Clean, unstyled output
- Suitable for CMS or Git workflows

---

## 13. Error Handling

- LLM failure → retry + fallback model
- File parsing failure → partial ingestion warning
- Prompt validation failure → block save
- Export failure → retry queue + logs

---

## 14. Performance Requirements

- File ingestion: < 10s for typical documents
- Outline generation: < 30s
- Press release generation: < 60s target
- Export generation: < 10s

---

## 15. Security Requirements

- API keys encrypted at rest
- No LLM logging of raw API keys
- File data isolated per project
- Prompt changes tracked with audit log

---

## 16. MVP Scope

### Must-have
- 5-step workflow
- File upload + parsing
- Outline generation (LLM)
- Outline editor + approval gate
- Press release generation (LLM)
- HTML + Markdown export
- LLM provider settings
- Editable prompts

### Nice-to-have
- DOCX export
- Version diffing
- Prompt sandbox testing
- OCR support

---

## 17. Future Enhancements

- Multi-user collaboration
- CMS integration (WordPress, Webflow)
- Brand template system
- Media distribution tools
- Automated SEO optimization
- Press release analytics tracking

---

## 18. Key Product Principle

This system is intentionally designed as a **controlled editorial pipeline**, not a single-shot AI generator.

The core value lies in:
- Structured decomposition (outline first)
- Human validation gate
- Deterministic final generation
- Configurable prompting system
```
