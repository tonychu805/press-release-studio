import { NextResponse } from "next/server"
import { updateOutlineVersion } from "@/lib/db"

export const runtime = "nodejs"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; outlineId: string }> }) {
  const { id, outlineId } = await params
  const patch = await req.json()
  updateOutlineVersion(outlineId, id, patch)
  return NextResponse.json({ ok: true })
}
