import { NextResponse } from "next/server"
import { addOutlineVersion, type OutlineRow } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await req.json()) as OutlineRow
  addOutlineVersion({ ...body, project_id: id })
  return NextResponse.json({ ok: true }, { status: 201 })
}
