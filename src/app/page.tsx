"use client";

import React, { useState, useEffect, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import DirectoryTree from "@/components/DirectoryTree";
import FilePreview from "@/components/FilePreview";
import VersionTimeline from "@/components/VersionTimeline";
import ShareModal from "@/components/ShareModal";
import { buildFileTree, TreeNode } from "@/lib/utils";

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

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/versions");
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    }
  }, []);

  // Fetch files for current version
  const fetchFiles = useCallback(async (versionId: string) => {
    try {
      const res = await fetch(`/api/files?versionId=${versionId}`);
      const data = await res.json();
      setFiles(data.files || []);
      setFileTree(buildFileTree(data.files || []));
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
        await fetchVersions();
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (path: string, type: string) => {
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📐</span>
              <div>
                <h1 className="text-xl font-bold text-slate-800">ProSpec</h1>
                <p className="text-xs text-slate-500">原型与需求分享平台</p>
              </div>
            </div>
            {versions.length > 0 && (
              <div className="text-sm text-slate-500">
                共 {versions.length} 个版本
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column: Upload + Version timeline */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            {/* Upload zone */}
            <UploadZone onUpload={handleUpload} isUploading={isUploading} />

            {/* Version timeline */}
            {versions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <VersionTimeline
                  versions={versions}
                  currentVersionId={currentVersionId}
                  onSelectVersion={setCurrentVersionId}
                  onDeleteVersion={handleDeleteVersion}
                  onShareVersion={setShareVersionId}
                  onDownloadZip={handleDownloadZip}
                  onRenameVersion={handleRenameVersion}
                />
              </div>
            )}
          </div>

          {/* Right column: File browser + Preview */}
          <div className="lg:col-span-8 xl:col-span-9">
            {currentVersionId ? (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 h-[calc(100vh-200px)]">
                {/* Directory tree */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                      <span>📂</span> 文件列表
                    </h2>
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <DirectoryTree
                      tree={fileTree}
                      selectedPath={selectedFile?.path || null}
                      onFileSelect={handleFileSelect}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="xl:col-span-3">
                  <FilePreview
                    file={selectedFile}
                    versionId={currentVersionId}
                    onClose={() => setSelectedFile(null)}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  上传你的第一个原型
                </h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  拖放文件夹或点击上方区域上传，HTML 文件将直接预览，支持完整目录结构
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Share modal */}
      {shareVersionId && (
        <ShareModal
          versionId={shareVersionId}
          onClose={() => setShareVersionId(null)}
        />
      )}
    </div>
  );
}
