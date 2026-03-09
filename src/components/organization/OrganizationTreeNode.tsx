import { useState } from "react";
import type { OrganizationUnitNode } from "../../api/organization";

const TYPE_LABELS: Record<string, string> = {
  COMPANY: "회사",
  HEADQUARTERS: "본사",
  DEPARTMENT: "부서",
};

function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case "COMPANY":
      return "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400";
    case "HEADQUARTERS":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "DEPARTMENT":
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  }
}

interface OrganizationTreeNodeProps {
  node: OrganizationUnitNode;
  depth?: number;
}

export default function OrganizationTreeNode({
  node,
  depth = 0,
}: OrganizationTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 ${
          depth === 0 ? "bg-white dark:bg-gray-800/50" : "bg-gray-50/50 dark:bg-gray-800/30"
        } ${hasChildren ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""}`}
        onClick={() => hasChildren && setIsOpen((o) => !o)}
      >
        {hasChildren ? (
          <span className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
            {isOpen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            )}
          </span>
        ) : (
          <span className="w-5" aria-hidden />
        )}
        <span className="font-medium text-gray-800 dark:text-white/90 min-w-0 truncate">
          {node.name}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {node.code}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded shrink-0 ${getTypeBadgeClass(node.type)}`}
        >
          {getTypeLabel(node.type)}
        </span>
        {!node.isActive && (
          <span className="text-xs text-red-500 dark:text-red-400 shrink-0">비활성</span>
        )}
      </div>
      {hasChildren && isOpen && (
        <div className="mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 ml-3 pl-1">
          {node.children
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((child) => (
              <OrganizationTreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}
