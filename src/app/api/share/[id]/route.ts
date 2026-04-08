import { NextRequest, NextResponse } from "next/server";
import { getVersionById, getFilesByVersion } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const version = getVersionById(id);
  if (!version) {
    return NextResponse.json({ error: "Shared version not found" }, { status: 404 });
  }

  const files = getFilesByVersion(id);

  return NextResponse.json({ version, files });
}
