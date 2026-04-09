"use client";

import React, { useCallback, useState, useRef } from "react";

interface UploadZoneProps {
  onUpload: (files: File[], versionName?: string) => void;
  isUploading: boolean;
}

export default function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [versionName, setVersionName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processEntry = useCallback((entry: FileSystemEntry, path: string = ""): Promise<File[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file((file) => {
          const fileWithPath = new File([file], path + file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });
          resolve([fileWithPath]);
        });
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        const allFiles: File[] = [];
        let completed = false;

        const readBatch = () => {
          dirReader.readEntries(async (entries) => {
            if (entries.length === 0) {
              if (completed) {
                resolve(allFiles);
              }
              completed = true;
              return;
            }

            const promises = entries.map((subEntry) =>
              processEntry(subEntry, path + entry.name + "/")
            );
            const results = await Promise.all(promises);
            for (const files of results) {
              allFiles.push(...files);
            }
            readBatch();
          });
        };

        readBatch();
      } else {
        resolve([]);
      }
    });
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const items = e.dataTransfer.items;
      const allFiles: File[] = [];

      const promises: Promise<File[]>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          promises.push(processEntry(item));
        }
      }

      const results = await Promise.all(promises);
      for (const files of results) {
        allFiles.push(...files);
      }

      if (allFiles.length > 0) {
        onUpload(allFiles, versionName || undefined);
      }
    },
    [onUpload, versionName, processEntry]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(Array.from(files), versionName || undefined);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
        transition-all duration-300 ease-out
        ${isDragging
          ? "border-teal-500 bg-teal-50 scale-[1.02]"
          : "border-slate-300 bg-white hover:border-teal-400 hover:bg-slate-50"
        }
        ${isUploading ? "opacity-50 pointer-events-none" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        {...({ webkitdirectory: "" } as React.HTMLAttributes<HTMLInputElement>)}
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className={`transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}>
        <div className="text-5xl mb-4">📁</div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          {isDragging ? "释放文件以上传" : "拖放文件夹或文件到这里"}
        </h3>
        <p className="text-slate-500 text-sm mb-4">
          支持整个文件夹结构，HTML 文件将直接预览
        </p>
        <button className="px-5 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm">
          选择文件夹
        </button>
      </div>

      <div className="absolute top-3 right-3 text-slate-300 text-xs">
        点击上传
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <input
          type="text"
          placeholder="版本名称（可选，如 v1.0）"
          value={versionName}
          onChange={(e) => setVersionName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xs px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {isDragging && (
        <div className="absolute inset-0 rounded-2xl bg-teal-500/10 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
