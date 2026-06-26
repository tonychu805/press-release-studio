import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "studio.db")

declare global {
  // eslint-disable-next-line no-var
  var __studioDb: Database.Database | undefined
}

export function getDb(): Database.Database {
  if (global.__studioDb) return global.__studioDb
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  initSchema(db)
  global.__studioDb = db
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL DEFAULT 'Untitled Project',
      status      TEXT    NOT NULL DEFAULT 'uploading',
      current_step INTEGER NOT NULL DEFAULT 1,
      active_outline_id  TEXT,
      active_release_id  TEXT,
      outline_instructions TEXT NOT NULL DEFAULT '',
      comments    TEXT    NOT NULL DEFAULT '[]',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_files (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename      TEXT NOT NULL,
      file_type     TEXT NOT NULL,
      size_bytes    INTEGER NOT NULL,
      extracted_text TEXT NOT NULL DEFAULT '',
      chunks        TEXT NOT NULL DEFAULT '[]',
      status        TEXT NOT NULL DEFAULT 'parsing',
      error         TEXT,
      warning       TEXT,
      enhanced      INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outline_versions (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      content    TEXT NOT NULL DEFAULT '',
      version    INTEGER NOT NULL,
      status     TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS release_versions (
      id                TEXT PRIMARY KEY,
      project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      html_content      TEXT NOT NULL DEFAULT '',
      markdown_content  TEXT NOT NULL DEFAULT '',
      version           INTEGER NOT NULL,
      created_at        INTEGER NOT NULL
    );
  `)
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface ProjectRow {
  id: string
  name: string
  status: string
  current_step: number
  active_outline_id: string | null
  active_release_id: string | null
  outline_instructions: string
  comments: string // JSON
  created_at: number
  updated_at: number
}

export interface ProjectSummary extends ProjectRow {
  file_count: number
  outline_count: number
  release_count: number
}

export function listProjects(): ProjectSummary[] {
  const db = getDb()
  return db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_files  WHERE project_id = p.id) AS file_count,
      (SELECT COUNT(*) FROM outline_versions WHERE project_id = p.id) AS outline_count,
      (SELECT COUNT(*) FROM release_versions  WHERE project_id = p.id) AS release_count
    FROM projects p
    ORDER BY p.updated_at DESC
  `).all() as ProjectSummary[]
}

export function createProject(id: string, name: string): ProjectRow {
  const db = getDb()
  const now = Date.now()
  db.prepare(`
    INSERT INTO projects (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(id, name, now, now)
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow
}

export interface FullProject extends ProjectRow {
  files: FileRow[]
  outlines: OutlineRow[]
  releases: ReleaseRow[]
}

export function getProject(id: string): FullProject | null {
  const db = getDb()
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined
  if (!project) return null
  const files = db.prepare("SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at").all(id) as FileRow[]
  const outlines = db.prepare("SELECT * FROM outline_versions WHERE project_id = ? ORDER BY version").all(id) as OutlineRow[]
  const releases = db.prepare("SELECT * FROM release_versions WHERE project_id = ? ORDER BY version").all(id) as ReleaseRow[]
  return { ...project, files, outlines, releases }
}

export function updateProject(id: string, patch: Partial<Omit<ProjectRow, "id" | "created_at">>): void {
  const db = getDb()
  const fields = { ...patch, updated_at: Date.now() }
  const sets = Object.keys(fields).map((k) => `${k} = ?`).join(", ")
  db.prepare(`UPDATE projects SET ${sets} WHERE id = ?`).run(...Object.values(fields), id)
}

export function deleteProject(id: string): void {
  getDb().prepare("DELETE FROM projects WHERE id = ?").run(id)
}

// ── Files ─────────────────────────────────────────────────────────────────────

export interface FileRow {
  id: string
  project_id: string
  filename: string
  file_type: string
  size_bytes: number
  extracted_text: string
  chunks: string // JSON
  status: string
  error: string | null
  warning: string | null
  enhanced: number
  created_at: number
}

export function addFile(row: FileRow): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO project_files
      (id, project_id, filename, file_type, size_bytes, extracted_text, chunks, status, error, warning, enhanced, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(row.id, row.project_id, row.filename, row.file_type, row.size_bytes,
         row.extracted_text, row.chunks, row.status, row.error ?? null,
         row.warning ?? null, row.enhanced ? 1 : 0, row.created_at)
  touchProject(row.project_id)
}

export function updateFile(id: string, projectId: string, patch: Partial<Omit<FileRow, "id" | "project_id" | "created_at">>): void {
  const db = getDb()
  if (Object.keys(patch).length === 0) return
  const sets = Object.keys(patch).map((k) => `${k} = ?`).join(", ")
  db.prepare(`UPDATE project_files SET ${sets} WHERE id = ?`).run(...Object.values(patch), id)
  touchProject(projectId)
}

export function deleteFile(id: string, projectId: string): void {
  getDb().prepare("DELETE FROM project_files WHERE id = ?").run(id)
  touchProject(projectId)
}

// ── Outlines ──────────────────────────────────────────────────────────────────

export interface OutlineRow {
  id: string
  project_id: string
  content: string
  version: number
  status: string
  created_at: number
}

export function addOutlineVersion(row: OutlineRow): void {
  getDb().prepare(`
    INSERT INTO outline_versions (id, project_id, content, version, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(row.id, row.project_id, row.content, row.version, row.status, row.created_at)
  touchProject(row.project_id)
}

export function updateOutlineVersion(id: string, projectId: string, patch: Partial<Pick<OutlineRow, "content" | "status">>): void {
  const db = getDb()
  if (Object.keys(patch).length === 0) return
  const sets = Object.keys(patch).map((k) => `${k} = ?`).join(", ")
  db.prepare(`UPDATE outline_versions SET ${sets} WHERE id = ?`).run(...Object.values(patch), id)
  touchProject(projectId)
}

// ── Releases ──────────────────────────────────────────────────────────────────

export interface ReleaseRow {
  id: string
  project_id: string
  html_content: string
  markdown_content: string
  version: number
  created_at: number
}

export function addReleaseVersion(row: ReleaseRow): void {
  getDb().prepare(`
    INSERT INTO release_versions (id, project_id, html_content, markdown_content, version, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(row.id, row.project_id, row.html_content, row.markdown_content, row.version, row.created_at)
  touchProject(row.project_id)
}

export function updateReleaseVersion(id: string, projectId: string, patch: Partial<Pick<ReleaseRow, "html_content" | "markdown_content">>): void {
  const db = getDb()
  if (Object.keys(patch).length === 0) return
  const sets = Object.keys(patch).map((k) => `${k} = ?`).join(", ")
  db.prepare(`UPDATE release_versions SET ${sets} WHERE id = ?`).run(...Object.values(patch), id)
  touchProject(projectId)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function touchProject(id: string) {
  getDb().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(Date.now(), id)
}
