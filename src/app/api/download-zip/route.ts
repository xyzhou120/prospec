import { NextRequest, NextResponse } from "next/server";
import { getVersionById, getFilesByVersion } from "@/lib/db";
import { getFileBuffer } from "@/lib/minio";
import JSZip from "jszip";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { versionId } = await request.json();

    if (!versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    const version = getVersionById(versionId);
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const files = getFilesByVersion(versionId);
    const zip = new JSZip();

    for (const file of files) {
      try {
        const buffer = await getFileBuffer(versionId, file.path);
        zip.file(file.path, buffer);
      } catch (e) {
        console.error(`Failed to add file ${file.path} to zip:`, e);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="prospec-${versionId.slice(0, 8)}.zip"`,
      },
    });
  } catch (error) {
    console.error("Zip error:", error);
    return NextResponse.json({ error: "Failed to create zip" }, { status: 500 });
  }
}
