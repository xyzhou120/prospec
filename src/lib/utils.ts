import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const typeMap: Record<string, string> = {
    html: "html",
    htm: "html",
    css: "css",
    js: "javascript",
    ts: "typescript",
    json: "json",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    svg: "image",
    webp: "image",
    pdf: "pdf",
    md: "markdown",
    txt: "text",
  };
  return typeMap[ext] || "file";
}

export function isPreviewable(type: string): boolean {
  return ["html", "image", "pdf", "markdown", "text", "css", "javascript", "json"].includes(type);
}

export function isImage(type: string): boolean {
  return type === "image";
}

export function getFileIcon(type: string): string {
  const iconMap: Record<string, string> = {
    html: "📄",
    image: "🖼️",
    pdf: "📕",
    markdown: "📝",
    text: "📃",
    css: "🎨",
    javascript: "💻",
    json: "📋",
    file: "📎",
  };
  return iconMap[type] || iconMap.file;
}

export function getDefaultPreviewFile<T extends { path: string; type: string }>(
  files: T[],
): T | null {
  if (files.length === 0) {
    return null;
  }

  const preferredMatchers = [
    (file: T) => file.type === "html" && /(^|\/)index\.html?$/i.test(file.path),
    (file: T) => file.type === "html",
  ];

  for (const matcher of preferredMatchers) {
    const matched = files.find(matcher);
    if (matched) {
      return matched;
    }
  }

  return files[0];
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  fileType?: string;
  children?: TreeNode[];
}

export function buildFileTree(files: { path: string; name: string; type: string }[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (isLast) {
        current.push({
          name: part,
          path: currentPath,
          type: "file",
          fileType: file.type,
        });
      } else {
        let folder = current.find((n) => n.name === part && n.type === "folder");
        if (!folder) {
          folder = {
            name: part,
            path: currentPath,
            type: "folder",
            children: [],
          };
          current.push(folder);
        }
        current = folder.children!;
      }
    }
  }

  return root;
}
