import { NextRequest, NextResponse } from "next/server";
import { createVersion, addFile, getFilesByVersion } from "@/lib/db";
import { uploadFile, ensureBucket } from "@/lib/minio";
import { generateId, getFileType } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureBucket();

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const versionName = formData.get("versionName") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const versionId = generateId();
    createVersion(versionId, versionName || undefined);

    for (const file of files) {
      if (!file.name) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath =
        (file as File & { path?: string; webkitRelativePath?: string }).path
        || (file as File & { webkitRelativePath?: string }).webkitRelativePath
        || file.name;
      const normalizedPath = filePath.replace(/\\/g, "/");
      const fileName = normalizedPath.split("/").pop() || file.name;

      await uploadFile(versionId, normalizedPath, buffer);

      addFile(
        {
          id: generateId(),
          path: normalizedPath,
          name: fileName,
          type: getFileType(fileName),
          size: file.size,
        },
        versionId
      );
    }

    const versionFiles = getFilesByVersion(versionId);

    return NextResponse.json({
      versionId,
      files: versionFiles,
      message: "Upload successful",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
