"use client";

import React from "react";
import { formatBytes } from "@/lib/utils";

interface FilePreviewProps {
  file: {
    path: string;
    name: string;
    type: string;
    size: number;
  } | null;
  versionId: string;
  onClose: () => void;
}

export default function FilePreview({ file, versionId, onClose }: FilePreviewProps) {
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl">
        <div className="text-center text-slate-400">
          <div className="text-5xl mb-4">👈</div>
          <p className="text-sm">从左侧选择一个文件预览</p>
        </div>
      </div>
    );
  }

  const isImage = file.type === "image";
  const isPdf = file.type === "pdf";
  const isHtml = file.type === "html";

  const fileUrl = `/api/download/${versionId}/${file.path}`;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">📄</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{file.name}</h3>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          title="关闭预览"
        >
          ✕
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-slate-100 p-4">
        {isHtml ? (
          <iframe
            src={fileUrl}
            className="w-full h-full rounded-lg bg-white border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            title={file.name}
          />
        ) : isImage ? (
          <div className="h-full flex items-center justify-center">
            <img
              src={fileUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
            />
          </div>
        ) : isPdf ? (
          <iframe
            src={fileUrl}
            className="w-full h-full rounded-lg bg-white border-0"
            title={file.name}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <div className="text-5xl mb-4">📎</div>
            <p className="text-sm mb-4">此文件类型无法预览</p>
            <a
              href={fileUrl}
              download={file.name}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
            >
              下载文件
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
