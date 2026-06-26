import { NextResponse } from "next/server"
import { listProjects, createProject } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json(listProjects())
}

export async function POST(req: Request) {
  const { id, name } = (await req.json()) as { id: string; name: string }
  if (!id || !name) return NextResponse.json({ error: "Missing id or name." }, { status: 400 })
  const project = createProject(id, name)
  return NextResponse.json(project, { status: 201 })
}
