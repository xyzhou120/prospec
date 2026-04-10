import { NextRequest, NextResponse } from "next/server";
import { getFileBuffer, listVersionFiles } from "@/lib/minio";
import { getFilesByVersion } from "@/lib/db";

export const runtime = "nodejs";

const mimeTypes: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  cur: "application/octet-stream",
};

function encodeContentDispositionFilename(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function getAsciiFallbackFilename(value: string): string {
  const sanitized = value.replace(/[\r\n"]/g, "").trim();
  const extensionIndex = sanitized.lastIndexOf(".");
  const extension = extensionIndex > 0 ? sanitized.slice(extensionIndex) : "";
  const basename = extensionIndex > 0 ? sanitized.slice(0, extensionIndex) : sanitized;
  const asciiBasename = basename
    .replace(/[^\x20-\x7E]+/g, "_")
    .replace(/[\\/:;]+/g, "_")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .trim()
    .replace(/^_+|_+$/g, "");

  return `${asciiBasename || "download"}${extension}`;
}

function getContentDisposition(filename: string): string {
  const asciiFilename = getAsciiFallbackFilename(filename);
  const encodedFilename = encodeContentDispositionFilename(filename);

  return `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

function repairLatin1ToUtf8(value: string): string {
  return Buffer.from(value, "latin1").toString("utf8");
}

function getAsciiSignature(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "");
}

function decodeUriComponentSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function resolveFileBuffer(versionId: string, rawPath: string) {
  const normalizedPath = rawPath.replace(/\\/g, "/");
  const candidatePaths = new Set<string>([
    rawPath,
    normalizedPath,
    decodeUriComponentSafely(rawPath),
    decodeUriComponentSafely(normalizedPath),
  ]);

  for (const candidate of Array.from(candidatePaths)) {
    try {
      return {
        buffer: await getFileBuffer(versionId, candidate),
        resolvedPath: candidate,
      };
    } catch {
      // Keep trying fallbacks below.
    }

    try {
      candidatePaths.add(repairLatin1ToUtf8(candidate));
    } catch {
      // Ignore decode fallback failure.
    }
  }

  const versionFiles = getFilesByVersion(versionId);
  const storedPaths = await listVersionFiles(versionId);
  const candidateBaseNames = new Set<string>();
  const candidateSignatures = new Set<string>();

  for (const candidate of Array.from(candidatePaths)) {
    const baseName = candidate.split("/").pop();
    if (baseName) {
      candidateBaseNames.add(baseName);
      candidateSignatures.add(getAsciiSignature(baseName));
    }

    try {
      const repairedBaseName = repairLatin1ToUtf8(baseName || "");
      if (repairedBaseName) {
        candidateBaseNames.add(repairedBaseName);
        candidateSignatures.add(getAsciiSignature(repairedBaseName));
      }
    } catch {
      // Ignore decode fallback failure.
    }
  }

  const matchedStoredPath = storedPaths.find((storedPath) => candidatePaths.has(storedPath))
    || storedPaths.find((storedPath) => {
      const baseName = storedPath.split("/").pop() || "";
      return candidateBaseNames.has(baseName);
    })
    || storedPaths.find((storedPath) => {
      const baseName = storedPath.split("/").pop() || "";
      return candidateSignatures.has(getAsciiSignature(baseName));
    });

  if (matchedStoredPath) {
    return {
      buffer: await getFileBuffer(versionId, matchedStoredPath),
      resolvedPath: matchedStoredPath,
    };
  }

  const matchedFile = versionFiles.find((file) => candidatePaths.has(file.path))
    || versionFiles.find((file) => candidateBaseNames.has(file.name))
    || versionFiles.find((file) =>
      Array.from(candidateBaseNames).some((baseName) => file.path.endsWith(`/${baseName}`)),
    )
    || versionFiles.find((file) => candidateSignatures.has(getAsciiSignature(file.name)));

  if (!matchedFile) {
    console.error("download resolve miss", {
      versionId,
      rawPath,
      candidatePaths: Array.from(candidatePaths),
      candidateBaseNames: Array.from(candidateBaseNames),
      candidateSignatures: Array.from(candidateSignatures),
      storedPathSample: storedPaths.slice(0, 10),
    });
    throw new Error("File not found");
  }

  const dbMatchedStoredPath = storedPaths.find((storedPath) => storedPath.endsWith(`/${matchedFile.name}`))
    || storedPaths.find((storedPath) => getAsciiSignature(storedPath) === getAsciiSignature(matchedFile.path))
    || storedPaths.find((storedPath) => getAsciiSignature(storedPath) === getAsciiSignature(matchedFile.name));

  if (dbMatchedStoredPath) {
    return {
      buffer: await getFileBuffer(versionId, dbMatchedStoredPath),
      resolvedPath: dbMatchedStoredPath,
    };
  }

  console.error("download db match miss", {
    versionId,
    rawPath,
    matchedFile,
    storedPathSample: storedPaths.slice(0, 10),
  });

  return {
    buffer: await getFileBuffer(versionId, matchedFile.path),
    resolvedPath: matchedFile.path,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const versionId = path[0];
  const filePath = path.slice(1).join("/");

  if (!versionId || !filePath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const { buffer, resolvedPath } = await resolveFileBuffer(versionId, filePath);
    const ext = resolvedPath.split(".").pop()?.toLowerCase() || "";
    const filename = resolvedPath.split("/").pop() || "download";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Content-Disposition": getContentDisposition(filename),
      },
    });
  } catch (error) {
    console.error("Download error:", { versionId, filePath, error });

    if (error instanceof Error && error.message === "File not found") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
