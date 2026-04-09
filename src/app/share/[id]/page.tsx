"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DirectoryTree from "@/components/DirectoryTree";
import FilePreview from "@/components/FilePreview";
import { buildFileTree, TreeNode, formatDate } from "@/lib/utils";

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

export default function SharePage() {
  const params = useParams();
  const versionId = params.id as string;

  const [version, setVersion] = useState<Version | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await fetch(`/api/share/${versionId}`);
        if (!res.ok) {
          setError("版本不存在或链接已失效");
          return;
        }
        const data = await res.json();
        setVersion(data.version);
        setFiles(data.files);
        setFileTree(buildFileTree(data.files));
      } catch (err) {
        setError("加载失败，请检查链接是否正确");
      } finally {
        setLoading(false);
      }
    };

    fetchShared();
  }, [versionId]);

  const handleFileSelect = (path: string, type: string) => {
    const file = files.find((f) => f.path === path);
    setSelectedFile(file || null);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">{error}</h1>
          <p className="text-slate-500">请联系产品经理获取新链接</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📐</span>
            <div>
              <h1 className="text-lg font-bold text-slate-800">ProSpec</h1>
              <p className="text-xs text-slate-500">只读视图 · 来自产品经理的分享</p>
            </div>
          </div>
          {version && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-medium text-slate-800">
                  {version.name || "未命名版本"}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(version.created_at)}
                </div>
              </div>
              {version.is_latest === 1 && (
                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded font-medium">
                  最新
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File tree */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
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

        {/* Right: Preview */}
        <main className="flex-1 overflow-hidden p-4">
          <FilePreview
            file={selectedFile}
            versionId={versionId}
            onClose={() => setSelectedFile(null)}
          />
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-2 flex-shrink-0">
        <div className="px-6 text-center text-xs text-slate-400">
          此为只读视图，如需上传或编辑，请联系产品经理
        </div>
      </footer>
    </div>
  );
}
