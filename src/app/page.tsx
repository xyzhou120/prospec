"use client";

import React, { useState, useEffect, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import DirectoryTree from "@/components/DirectoryTree";
import PreviewPane from "@/components/PreviewPane";
import VersionTimeline from "@/components/VersionTimeline";
import ShareModal from "@/components/ShareModal";
import { buildFileTree, getDefaultPreviewFile, TreeNode } from "@/lib/utils";

interface FileRecord {
  id: string;
  version_id: string;
  path: string;
  name: string;
  type: string;
  size: number;
}

interface Version {
  id: string;
  name: string | null;
  created_at: string;
  is_latest: number;
}

export default function HomePage() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shareVersionId, setShareVersionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/versions");
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    }
  }, []);

  const fetchFiles = useCallback(async (versionId: string) => {
    try {
      const res = await fetch(`/api/files?versionId=${versionId}`);
      const data = await res.json();
      const nextFiles: FileRecord[] = data.files || [];
      setFiles(nextFiles);
      setFileTree(buildFileTree(nextFiles));
      setSelectedFile(getDefaultPreviewFile(nextFiles));
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  useEffect(() => {
    if (currentVersionId) {
      fetchFiles(currentVersionId);
    } else {
      setFiles([]);
      setFileTree([]);
      setSelectedFile(null);
    }
  }, [currentVersionId, fetchFiles]);

  const handleUpload = async (uploadedFiles: File[], versionName?: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      uploadedFiles.forEach((file) => {
        formData.append("files", file);
      });
      if (versionName) {
        formData.append("versionName", versionName);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentVersionId(data.versionId);
        setSidebarOpen(false);
        await fetchVersions();
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (path: string) => {
    const file = files.find((f) => f.path === path);
    setSelectedFile(file || null);
  };

  const handleDeleteVersion = async (id: string) => {
    try {
      await fetch(`/api/versions?id=${id}`, { method: "DELETE" });
      if (currentVersionId === id) {
        setCurrentVersionId(null);
        setSelectedFile(null);
      }
      await fetchVersions();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleRenameVersion = async (id: string, name: string) => {
    try {
      await fetch(`/api/versions?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await fetchVersions();
    } catch (error) {
      console.error("Rename failed:", error);
    }
  };

  const handleDownloadZip = async (id: string) => {
    try {
      const res = await fetch("/api/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: id }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prospec-${id.slice(0, 8)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download zip failed:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📐</span>
            <div>
              <h1 className="text-lg font-bold text-slate-800">ProSpec</h1>
            </div>
          </div>
          {versions.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                共 {versions.length} 个版本
              </span>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                title={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
              >
                {sidebarOpen ? "◀" : "▶"}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar (Upload + Versions) */}
        <aside
          className={`
            flex-shrink-0 bg-white border-r border-slate-200 flex flex-col
            transition-all duration-300 ease-in-out overflow-hidden
            ${sidebarOpen ? "w-96" : "w-0"}
          `}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <UploadZone onUpload={handleUpload} isUploading={isUploading} />

            {versions.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3">
                <VersionTimeline
                  versions={versions}
                  currentVersionId={currentVersionId}
                  onSelectVersion={(id) => {
                    setCurrentVersionId(id);
                    setSelectedFile(null);
                  }}
                  onDeleteVersion={handleDeleteVersion}
                  onShareVersion={setShareVersionId}
                  onDownloadZip={handleDownloadZip}
                  onRenameVersion={handleRenameVersion}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Center: Directory tree */}
        {currentVersionId && (
          <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <span>📂</span>
              <span className="font-semibold text-slate-700 text-sm">文件列表</span>
              <span className="ml-auto text-xs text-slate-400">{files.length} 个文件</span>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <DirectoryTree
                tree={fileTree}
                selectedPath={selectedFile?.path || null}
                onFileSelect={handleFileSelect}
              />
            </div>
          </div>
        )}

        {/* Right: Preview */}
        <main className="flex-1 overflow-hidden p-4">
          {currentVersionId ? (
            <PreviewPane
              file={selectedFile}
              versionId={currentVersionId}
              onClose={() => setSelectedFile(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  上传你的第一个原型
                </h2>
                <p className="text-slate-500 max-w-md">
                  拖放文件夹或点击上方区域上传，HTML 文件将直接预览
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {shareVersionId && (
        <ShareModal
          versionId={shareVersionId}
          onClose={() => setShareVersionId(null)}
        />
      )}
    </div>
  );
}
