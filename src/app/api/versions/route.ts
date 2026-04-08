import { NextRequest, NextResponse } from "next/server";
import { getAllVersions, updateVersionName, deleteVersion, getFilesByVersion } from "@/lib/db";
import { deleteVersionFiles } from "@/lib/minio";

export const runtime = "nodejs";

export async function GET() {
  const versions = getAllVersions();
  return NextResponse.json({ versions });
}

export async function POST(request: NextRequest) {
  // This is handled by the upload route
  return NextResponse.json({ error: "Use /api/upload to create versions" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const { name } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Version ID is required" }, { status: 400 });
    }

    updateVersionName(id, name);
    return NextResponse.json({ message: "Version updated" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update version" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Version ID is required" }, { status: 400 });
    }

    await deleteVersionFiles(id);
    deleteVersion(id);

    return NextResponse.json({ message: "Version deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete version" }, { status: 500 });
  }
}
