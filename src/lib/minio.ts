import { Client as MinioClient } from "minio";
import fs from "fs";
import path from "path";

const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE !== "false";
const DATABASE_PATH = process.env.DATABASE_PATH || "./data/prospec.db";
const LOCAL_STORAGE_PATH =
  process.env.LOCAL_STORAGE_PATH || path.join(path.dirname(DATABASE_PATH), "files");

let minioClient: MinioClient | null = null;

function getMinioClient(): MinioClient {
  if (!minioClient) {
    minioClient = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    });
  }
  return minioClient;
}

const BUCKET = process.env.MINIO_BUCKET || "prospec";

// Ensure local storage directory exists
function ensureLocalDir(versionId: string): string {
  const dir = path.join(LOCAL_STORAGE_PATH, versionId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function ensureBucket(): Promise<void> {
  if (USE_LOCAL_STORAGE) return;
  try {
    const client = getMinioClient();
    const exists = await client.bucketExists(BUCKET);
    if (!exists) {
      await client.makeBucket(BUCKET);
    }
  } catch (error) {
    console.error("Error ensuring bucket:", error);
  }
}

export async function uploadFile(
  versionId: string,
  filePath: string,
  buffer: Buffer
): Promise<string> {
  if (USE_LOCAL_STORAGE) {
    const dir = ensureLocalDir(versionId);
    const localPath = path.join(dir, filePath);
    const parentDir = path.dirname(localPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(localPath, buffer);
    return localPath;
  }

  const client = getMinioClient();
  const objectName = `${versionId}/${filePath}`;
  await client.putObject(BUCKET, objectName, buffer);
  return objectName;
}

export async function getFileUrl(versionId: string, filePath: string): Promise<string> {
  if (USE_LOCAL_STORAGE) {
    return `/api/download/${versionId}/${filePath}`;
  }

  const objectName = `${versionId}/${filePath}`;
  const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
  const port = process.env.MINIO_PORT || "9000";
  const endpoint = process.env.MINIO_ENDPOINT || "localhost:9000";

  return `${protocol}://${endpoint}/${BUCKET}/${objectName}`;
}

export async function getFileBuffer(versionId: string, filePath: string): Promise<Buffer> {
  if (USE_LOCAL_STORAGE) {
    const localPath = path.join(LOCAL_STORAGE_PATH, versionId, filePath);
    return fs.promises.readFile(localPath);
  }

  const client = getMinioClient();
  const objectName = `${versionId}/${filePath}`;
  const stream = await client.getObject(BUCKET, objectName);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function deleteVersionFiles(versionId: string): Promise<void> {
  if (USE_LOCAL_STORAGE) {
    const dir = path.join(LOCAL_STORAGE_PATH, versionId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
    return;
  }

  const client = getMinioClient();
  const objects = await listVersionFiles(versionId);
  if (objects.length > 0) {
    await client.removeObjects(BUCKET, objects);
  }
}

export async function listVersionFiles(versionId: string): Promise<string[]> {
  if (USE_LOCAL_STORAGE) {
    const dir = path.join(LOCAL_STORAGE_PATH, versionId);
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const walk = (d: string, prefix: string = "") => {
      const items = fs.readdirSync(d);
      for (const item of items) {
        const fullPath = path.join(d, item);
        const relativePath = prefix ? `${prefix}/${item}` : item;
        if (fs.statSync(fullPath).isDirectory()) {
          walk(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };
    walk(dir);
    return files;
  }

  const client = getMinioClient();
  const objects: string[] = [];
  const prefix = `${versionId}/`;
  const stream = await client.listObjects(BUCKET, prefix, true);

  return new Promise((resolve, reject) => {
    stream.on("data", (obj: { name?: string }) => {
      if (obj.name) objects.push(obj.name);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(objects));
  });
}

export { BUCKET };
