"use client";

import React, { useState, useEffect } from "react";

interface ShareModalProps {
  versionId: string;
  onClose: () => void;
}

export default function ShareModal({ versionId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
  const shareUrl = `${baseUrl}/share/${versionId}`;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">分享链接</h2>
            <p className="text-sm text-slate-500 mt-1">
              开发可以通过此链接只读查看
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* URL display */}
        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔗</span>
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-slate-600 outline-none"
            />
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`
            w-full py-3 rounded-xl font-medium transition-all duration-200
            ${copied
              ? "bg-green-500 text-white"
              : "bg-teal-600 text-white hover:bg-teal-700"
            }
          `}
        >
          {copied ? "✓ 已复制到剪贴板" : "复制链接"}
        </button>

        {/* Note */}
        <p className="text-xs text-slate-400 text-center mt-4">
          链接有效期与版本数据一致，删除版本后链接失效
        </p>
      </div>
    </div>
  );
}
