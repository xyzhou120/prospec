"use client";

import React, { useState, useCallback } from "react";
import { TreeNode, getFileIcon } from "@/lib/utils";

interface DirectoryTreeProps {
  tree: TreeNode[];
  selectedPath: string | null;
  onFileSelect: (path: string, type: string) => void;
}

function TreeNodeItem({
  node,
  depth,
  selectedPath,
  onFileSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onFileSelect: (path: string, type: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0);

  const handleClick = () => {
    if (node.type === "folder") {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path, node.fileType || "file");
    }
  };

  const isSelected = selectedPath === node.path;

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
          transition-all duration-150 group
          ${isSelected
            ? "bg-teal-50 text-teal-700"
            : "hover:bg-slate-100 text-slate-700"
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleClick}
      >
        {node.type === "folder" ? (
          <>
            <span className={`text-sm transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
              ▶
            </span>
            <span className="text-lg">📁</span>
          </>
        ) : (
          <>
            <span className="w-4" />
            <span>{getFileIcon(node.fileType || "file")}</span>
          </>
        )}
        <span className="text-sm font-medium truncate">{node.name}</span>

        {/* Hover tooltip */}
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <span className="text-xs text-slate-400">
            {node.type === "folder" ? "双击展开" : "点击预览"}
          </span>
        </div>
      </div>

      {node.type === "folder" && isOpen && node.children && (
        <div className="overflow-hidden transition-all duration-200 ease-out"
          style={{ maxHeight: node.children.length * 50 }}>
          {node.children.map((child, i) => (
            <TreeNodeItem
              key={`${child.path}-${i}`}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectoryTree({
  tree,
  selectedPath,
  onFileSelect,
}: DirectoryTreeProps) {
  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-3">📂</div>
        <p className="text-sm">暂无文件</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {tree.map((node, i) => (
        <TreeNodeItem
          key={`${node.path}-${i}`}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onFileSelect={onFileSelect}
        />
      ))}
    </div>
  );
}
