import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { MoreDotIcon } from "../../icons";
import type { FlatMenuItem } from "./menuTreeUtils";

interface MenuTreeItemProps {
  item: FlatMenuItem;
  depth: number;
  indentationWidth: number;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: (menuId: number) => void;
}

export default function MenuTreeItem({
  item,
  depth,
  indentationWidth,
  isSelected,
  disabled = false,
  onSelect,
}: MenuTreeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`rounded-xl border ${
        isSelected
          ? "border-brand-300 bg-brand-50/70 dark:border-brand-500/40 dark:bg-brand-500/10"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      } ${isDragging ? "opacity-60 shadow-lg" : ""} ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div
        className="flex items-center gap-3 px-3 py-3"
        style={{ paddingLeft: depth * indentationWidth + 12 }}
      >
        <button
          type="button"
          aria-label={`${item.name} 순서 변경`}
          disabled={disabled}
          className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing disabled:cursor-not-allowed dark:hover:bg-gray-800 dark:hover:text-gray-300"
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreDotIcon className="h-5 w-5 rotate-90" />
        </button>

        <button
          type="button"
          onClick={() => onSelect(item.id)}
          disabled={disabled}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-gray-800 dark:text-white/90">
                {item.name}
              </span>
              {!item.isActive && (
                <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
                  비활성
                </span>
              )}
              {item.childrenCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  하위 {item.childrenCount}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <code>{item.code}</code>
              <span>{item.path ?? "경로 없음"}</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
