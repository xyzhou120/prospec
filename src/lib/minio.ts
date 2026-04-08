import { Client as MinioClient } from "minio";

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

export async function ensureBucket(): Promise<void> {
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
  const client = getMinioClient();
  const objectName = `${versionId}/${filePath}`;
  await client.putObject(BUCKET, objectName, buffer);
  return objectName;
}

export async function getFileUrl(versionId: string, filePath: string): Promise<string> {
  const objectName = `${versionId}/${filePath}`;
  const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
  const port = process.env.MINIO_PORT || "9000";
  const endpoint = process.env.MINIO_ENDPOINT || "localhost:9000";

  return `${protocol}://${endpoint}/${BUCKET}/${objectName}`;
}

export async function getFileBuffer(versionId: string, filePath: string): Promise<Buffer> {
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
  const client = getMinioClient();
  const objects = await listVersionFiles(versionId);
  if (objects.length > 0) {
    await client.removeObjects(BUCKET, objects);
  }
}

export async function listVersionFiles(versionId: string): Promise<string[]> {
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
