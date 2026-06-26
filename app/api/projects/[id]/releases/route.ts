import { NextResponse } from "next/server"
import { addReleaseVersion, type ReleaseRow } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await req.json()) as ReleaseRow
  addReleaseVersion({ ...body, project_id: id })
  return NextResponse.json({ ok: true }, { status: 201 })
}
