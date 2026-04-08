import { NextRequest, NextResponse } from "next/server";
import { getFilesByVersion, getVersionById } from "@/lib/db";
import { getFileUrl, getFileBuffer } from "@/lib/minio";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("versionId");
  const filePath = searchParams.get("path");

  if (!versionId) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }

  const version = getVersionById(versionId);
  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const files = getFilesByVersion(versionId);

  if (filePath) {
    // Return file URL for preview
    const file = files.find((f) => f.path === filePath);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const url = await getFileUrl(versionId, filePath);
    return NextResponse.json({ url, file });
  }

  return NextResponse.json({ files, version });
}
