import { NextResponse } from "next/server"
import { updateFile, deleteFile } from "@/lib/db"

export const runtime = "nodejs"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params
  const patch = await req.json()
  updateFile(fileId, id, patch)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params
  deleteFile(fileId, id)
  return NextResponse.json({ ok: true })
}
