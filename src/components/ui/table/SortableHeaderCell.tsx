import type { ReactNode } from "react";

export type TableSortOrder = "asc" | "desc";

const ALIGN_CLASS_NAME = {
  start: "justify-start text-start",
  center: "justify-center text-center",
  end: "justify-end text-end",
} as const;

export interface SortableHeaderCellProps {
  label: ReactNode;
  sortKey: string;
  activeSortBy?: string;
  activeSortOrder?: TableSortOrder;
  onToggleSort: (sortKey: string) => void;
  className?: string;
  align?: keyof typeof ALIGN_CLASS_NAME;
}

function SortIndicator({
  active,
  order,
}: {
  active: boolean;
  order?: TableSortOrder;
}) {
  const activeClassName = "text-brand-700 dark:text-brand-400";
  const inactiveClassName = "text-gray-400 dark:text-gray-500";

  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 4l3 3H7l3-3z"
        className={
          active && order === "asc" ? activeClassName : inactiveClassName
        }
        fill="currentColor"
      />
      <path
        d="M10 16l-3-3h6l-3 3z"
        className={
          active && order === "desc" ? activeClassName : inactiveClassName
        }
        fill="currentColor"
      />
    </svg>
  );
}

export function SortableHeaderCell({
  label,
  sortKey,
  activeSortBy,
  activeSortOrder,
  onToggleSort,
  className,
  align = "start",
}: SortableHeaderCellProps) {
  const isActive = activeSortBy === sortKey;
  const ariaSort = isActive
    ? activeSortOrder === "desc"
      ? "descending"
      : "ascending"
    : "none";
  const nextOrderLabel =
    !isActive || activeSortOrder === "desc" ? "오름차순" : "내림차순";

  return (
    <th scope="col" aria-sort={ariaSort} className={className}>
      <button
        type="button"
        onClick={() => onToggleSort(sortKey)}
        className={`inline-flex w-full items-center gap-1.5 ${ALIGN_CLASS_NAME[align]} rounded outline-none transition hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-brand-400 dark:hover:text-gray-200`}
        aria-label={`${String(label)} ${nextOrderLabel} 정렬`}
      >
        <span>{label}</span>
        <SortIndicator active={isActive} order={activeSortOrder} />
      </button>
    </th>
  );
}
