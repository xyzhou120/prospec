"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";

interface Version {
  id: string;
  name: string | null;
  created_at: string;
  is_latest: number;
}

interface VersionTimelineProps {
  versions: Version[];
  currentVersionId: string | null;
  onSelectVersion: (id: string) => void;
  onDeleteVersion: (id: string) => void;
  onShareVersion: (id: string) => void;
  onDownloadZip: (id: string) => void;
  onRenameVersion: (id: string, name: string) => void;
}

export default function VersionTimeline({
  versions,
  currentVersionId,
  onSelectVersion,
  onDeleteVersion,
  onShareVersion,
  onDownloadZip,
  onRenameVersion,
}: VersionTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleStartEdit = (version: Version, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(version.id);
    setEditName(version.name || "");
  };

  const handleSaveEdit = (id: string) => {
    onRenameVersion(id, editName);
    setEditingId(null);
  };

  if (versions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
        版本历史
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

        {versions.map((version, index) => {
          const isActive = currentVersionId === version.id;
          const isLatest = version.is_latest === 1;

          return (
            <div
              key={version.id}
              className={`
                relative pl-10 mb-2 group
                ${isActive ? "" : ""}
              `}
            >
              {/* Timeline dot */}
              <div
                className={`
                  absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 transition-all duration-200
                  ${isActive
                    ? "bg-teal-500 border-teal-500 scale-125"
                    : isLatest
                      ? "bg-orange-400 border-orange-400"
                      : "bg-white border-slate-300 group-hover:border-teal-400"
                  }
                `}
              />

              {/* Card */}
              <div
                className={`
                  relative p-3 rounded-xl cursor-pointer transition-all duration-200
                  ${isActive
                    ? "bg-teal-50 border-2 border-teal-200 shadow-sm"
                    : "bg-white border border-slate-200 hover:border-teal-300 hover:shadow-sm"
                  }
                `}
                onClick={() => onSelectVersion(version.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {editingId === version.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleSaveEdit(version.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(version.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 text-sm border border-teal-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 truncate">
                          {version.name || `版本 ${versions.length - index}`}
                        </span>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded font-medium flex-shrink-0">
                            最新
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(version.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  {editingId !== version.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartEdit(version, e)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                        title="重命名"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareVersion(version.id);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                        title="分享链接"
                      >
                        🔗
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadZip(version.id);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                        title="下载 ZIP"
                      >
                        📦
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("确定要删除这个版本吗？")) {
                            onDeleteVersion(version.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
