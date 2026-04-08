import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || "./data/prospec.db";
const dbDir = path.dirname(DB_PATH);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_latest INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    version_id TEXT,
    path TEXT,
    name TEXT,
    type TEXT,
    size INTEGER,
    FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
  );
`);

export interface Version {
  id: string;
  name: string | null;
  created_at: string;
  is_latest: number;
}

export interface FileRecord {
  id: string;
  version_id: string;
  path: string;
  name: string;
  type: string;
  size: number;
}

export function getAllVersions(): Version[] {
  return db
    .prepare("SELECT * FROM versions ORDER BY created_at DESC")
    .all() as Version[];
}

export function getVersionById(id: string): Version | undefined {
  return db
    .prepare("SELECT * FROM versions WHERE id = ?")
    .get(id) as Version | undefined;
}

export function getLatestVersion(): Version | undefined {
  return db
    .prepare("SELECT * FROM versions WHERE is_latest = 1 ORDER BY created_at DESC LIMIT 1")
    .get() as Version | undefined;
}

export function createVersion(id: string, name?: string): Version {
  // Unmark all previous latest versions
  db.prepare("UPDATE versions SET is_latest = 0").run();

  db.prepare("INSERT INTO versions (id, name, is_latest) VALUES (?, ?, 1)").run(id, name || null);

  return getVersionById(id)!;
}

export function updateVersionName(id: string, name: string): void {
  db.prepare("UPDATE versions SET name = ? WHERE id = ?").run(name, id);
}

export function getFilesByVersion(versionId: string): FileRecord[] {
  return db
    .prepare("SELECT * FROM files WHERE version_id = ? ORDER BY path")
    .all(versionId) as FileRecord[];
}

export function addFile(file: Omit<FileRecord, "version_id"> & { version_id?: string }, versionId: string): void {
  db.prepare(
    "INSERT INTO files (id, version_id, path, name, type, size) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(file.id, versionId, file.path, file.name, file.type, file.size);
}

export function deleteVersion(versionId: string): void {
  db.prepare("DELETE FROM files WHERE version_id = ?").run(versionId);
  db.prepare("DELETE FROM versions WHERE id = ?").run(versionId);
}

export { db };
