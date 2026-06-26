import { NextResponse } from "next/server"
import { addFile, type FileRow } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await req.json()) as FileRow
  addFile({ ...body, project_id: id })
  return NextResponse.json({ ok: true }, { status: 201 })
}
