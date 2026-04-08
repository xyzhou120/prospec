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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">{error}</h1>
          <p className="text-slate-500">请联系产品经理获取新链接</p>
        </div>
      </div>
    );
  }

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
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: File tree */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                  <span>📂</span> 文件列表
                  <span className="text-xs text-slate-400 font-normal ml-auto">
                    {files.length} 个文件
                  </span>
                </h2>
              </div>
              <div className="p-2">
                <DirectoryTree
                  tree={fileTree}
                  selectedPath={selectedFile?.path || null}
                  onFileSelect={handleFileSelect}
                />
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-7 xl:col-span-8">
            <FilePreview
              file={selectedFile}
              versionId={versionId}
              onClose={() => setSelectedFile(null)}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-400">
          此为只读视图，如需上传或编辑，请联系产品经理
        </div>
      </footer>
    </div>
  );
}
