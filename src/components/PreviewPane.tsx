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
          isHtml
            ? `
              relative flex items-center justify-between overflow-hidden border-b px-4 py-3
              ${immersive
                ? "border-slate-900/10 bg-[linear-gradient(135deg,rgba(236,254,255,0.98),rgba(238,242,255,0.98),rgba(253,242,248,0.96))]"
                : "border-slate-200/80 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(236,254,255,0.98),rgba(238,242,255,0.96),rgba(253,242,248,0.94))]"
              }
            `
            : immersive
              ? "flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white"
              : "flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50"
        }
      >
        {isHtml ? (
          <>
            <span className="absolute inset-y-0 left-0 w-40 bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.92),transparent_72%)]" />
            <span className="absolute -right-6 top-1/2 h-20 w-28 -translate-y-1/2 rounded-full bg-fuchsia-300/30 blur-3xl" />
            <span className="absolute right-20 top-0 h-14 w-24 rounded-full bg-cyan-200/45 blur-2xl" />
            <span className="absolute inset-x-0 top-0 h-px bg-white/70" />
          </>
        ) : null}
        <div className="relative flex min-w-0 items-center gap-3">
          <span
            className={`
              inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-xl shadow-sm
              ${isHtml
                ? "border-white/70 bg-white/80 text-cyan-700 shadow-[0_16px_34px_-22px_rgba(14,116,144,0.55)]"
                : "border-transparent bg-transparent"
              }
            `}
          >
            📄
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold text-slate-800">{file.name}</h3>
              {isHtml ? (
                <span className="rounded-full border border-white/70 bg-white/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700 shadow-[0_10px_24px_-18px_rgba(14,116,144,0.5)]">
                  HTML
                </span>
              ) : null}
            </div>
            <p className={`text-xs ${isHtml ? "text-slate-600" : "text-slate-500"}`}>
              {formatBytes(file.size)}
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-2">
          {isHtml ? (
            <button
              onClick={handleToggleFullscreen}
              className={`
                group relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-2 py-1.5
                text-sm font-semibold tracking-[0.01em] transition-all duration-300
                ${isFullscreen
                  ? "border-cyan-300/70 bg-[linear-gradient(135deg,rgba(34,211,238,0.26),rgba(99,102,241,0.22),rgba(244,114,182,0.18))] text-slate-900 shadow-[0_20px_50px_-20px_rgba(59,130,246,0.55)]"
                  : "border-cyan-200/60 bg-[linear-gradient(135deg,rgba(236,254,255,0.98),rgba(238,242,255,0.98),rgba(253,242,248,0.96))] text-slate-700 shadow-[0_18px_44px_-24px_rgba(37,99,235,0.38)] hover:-translate-y-0.5 hover:border-cyan-300/80 hover:text-slate-950 hover:shadow-[0_24px_56px_-24px_rgba(79,70,229,0.45)]"
                }
              `}
              title={isFullscreen ? "退出全屏预览" : "全屏预览"}
            >
              <span
                className={`
                  absolute inset-0 rounded-full opacity-100 transition-opacity duration-300
                  ${isFullscreen
                    ? "bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.55),transparent_36%),radial-gradient(circle_at_80%_30%,rgba(125,211,252,0.32),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]"
                    : "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.72),transparent_34%),radial-gradient(circle_at_82%_24%,rgba(34,211,238,0.18),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.18),rgba(255,255,255,0))]"
                  }
                `}
              />
              <span
                className={`
                  absolute -right-2 top-1/2 h-12 w-20 -translate-y-1/2 rounded-full blur-2xl transition-all duration-300
                  ${isFullscreen
                    ? "bg-fuchsia-300/65 opacity-100"
                    : "bg-cyan-300/55 opacity-70 group-hover:opacity-100"
                  }
                `}
              />
              <span
                className={`
                  absolute left-3 top-1/2 h-5 w-10 -translate-y-1/2 rounded-full blur-xl transition-opacity duration-300
                  ${isFullscreen ? "bg-cyan-100/70 opacity-90" : "bg-white/80 opacity-100"}
                `}
              />
              <span
                className={`
                  relative inline-flex h-9 w-9 items-center justify-center rounded-full border text-base leading-none transition-all duration-300
                  ${isFullscreen
                    ? "border-white/60 bg-white/80 text-cyan-700 shadow-[0_10px_24px_-14px_rgba(6,182,212,0.9)]"
                    : "border-white/80 bg-white/90 text-cyan-700 shadow-[0_10px_24px_-14px_rgba(14,116,144,0.55)] group-hover:scale-105"
                  }
                `}
              >
                {isFullscreen ? "⤡" : "⤢"}
              </span>
              <span className="relative pr-3">{isFullscreen ? "退出全屏" : "全屏预览"}</span>
            </button>
          ) : null}
          {showCloseButton ? (
            <button
              onClick={onClose}
              className={`
                rounded-full p-2 transition-all duration-200
                ${isHtml
                  ? "border border-white/65 bg-white/70 text-slate-600 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.45)] hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
                  : "hover:bg-slate-200 rounded-lg"
                }
              `}
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
