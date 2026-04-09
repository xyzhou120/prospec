"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatBytes } from "@/lib/utils";

interface PreviewFile {
  path: string;
  name: string;
  type: string;
  size: number;
}

interface PreviewPaneProps {
  file: PreviewFile | null;
  versionId: string;
  onClose: () => void;
  immersive?: boolean;
  showCloseButton?: boolean;
}

function CodePreview({ fileUrl }: { fileUrl: string }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(fileUrl)
      .then((response) => response.text())
      .then((text) => {
        setCode(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <span className="animate-pulse">加载中...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-slate-900 p-4">
      <pre className="text-sm text-slate-100 whitespace-pre-wrap break-all font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function PreviewPane({
  file,
  versionId,
  onClose,
  immersive = false,
  showCloseButton = true,
}: PreviewPaneProps) {
  const previewPaneRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === previewPaneRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!file) {
    return (
      <div
        className={
          immersive
            ? "h-full flex items-center justify-center bg-white"
            : "h-full flex items-center justify-center bg-white rounded-xl border border-slate-200"
        }
      >
        <div className="text-center text-slate-400">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-sm">从左侧选择一个文件进行预览</p>
        </div>
      </div>
    );
  }

  const isImage = file.type === "image";
  const isPdf = file.type === "pdf";
  const isHtml = file.type === "html";
  const isCode = ["css", "javascript", "json", "markdown", "text", "typescript"].includes(file.type);
  const fileUrl = `/api/download/${versionId}/${file.path}`;

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === previewPaneRef.current) {
        await document.exitFullscreen();
        return;
      }

      await previewPaneRef.current?.requestFullscreen();
    } catch (error) {
      console.error("Failed to toggle fullscreen preview:", error);
    }
  };

  return (
    <div
      ref={previewPaneRef}
      className={
        immersive
          ? "h-full flex flex-col bg-white overflow-hidden"
          : "h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden"
      }
    >
      <div
        className={
          immersive
            ? "flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white"
            : "flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50"
        }
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">📄</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{file.name}</h3>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHtml ? (
            <button
              onClick={handleToggleFullscreen}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title={isFullscreen ? "退出全屏预览" : "全屏预览"}
            >
              <span className="text-base leading-none">{isFullscreen ? "⤡" : "⤢"}</span>
              <span>{isFullscreen ? "退出全屏" : "全屏预览"}</span>
            </button>
          ) : null}
          {showCloseButton ? (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              title="关闭预览"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className={immersive ? "flex-1 overflow-auto bg-white" : "flex-1 overflow-auto bg-slate-50"}>
        {isHtml ? (
          <iframe
            src={fileUrl}
            className="w-full h-full bg-white border-0"
            style={{ minHeight: immersive ? "100%" : "600px" }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            title={file.name}
          />
        ) : isCode ? (
          <CodePreview fileUrl={fileUrl} />
        ) : isImage ? (
          <div className="h-full flex items-center justify-center p-4">
            <img
              src={fileUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
            />
          </div>
        ) : isPdf ? (
          <iframe
            src={fileUrl}
            className="w-full h-full bg-white border-0"
            title={file.name}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-sm mb-4">该文件类型暂不支持在线预览</p>
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
