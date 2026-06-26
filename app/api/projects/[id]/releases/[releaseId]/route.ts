import { NextResponse } from "next/server"
import { updateReleaseVersion } from "@/lib/db"

export const runtime = "nodejs"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; releaseId: string }> }) {
  const { id, releaseId } = await params
  const patch = await req.json()
  updateReleaseVersion(releaseId, id, patch)
  return NextResponse.json({ ok: true })
}
