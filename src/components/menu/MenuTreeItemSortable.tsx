import { forwardRef } from "react";
import { SimpleTreeItemWrapper } from "dnd-kit-sortable-tree";
import type { TreeItemComponentProps } from "dnd-kit-sortable-tree";
import type { MenuItem } from "../../api/menu";
import { MoreDotIcon } from "../../icons";

type MenuTreeItemData = Omit<MenuItem, "children"> & { children?: MenuItem[] };

export type MenuTreeItemSortableProps = TreeItemComponentProps<MenuTreeItemData> & {
  isSelected: boolean;
  onSelect: (id: number) => void;
};

const MenuTreeItemSortable = forwardRef<HTMLDivElement, MenuTreeItemSortableProps>(
  (props, ref) => {
    const { item, isSelected, onSelect, handleProps, style, depth } = props;
    const menu = item as unknown as MenuItem;
    const childrenCount = Array.isArray(menu.children) ? menu.children.length : 0;
    // 최상위(depth 0)에서는 접기 화살표 숨김 → 같은 뎁스인데 화살표 때문에 하위처럼 보이는 느낌 방지
    const hideCollapseButton = depth === 0;

    return (
      <SimpleTreeItemWrapper {...props} ref={ref} hideCollapseButton={hideCollapseButton}>
        <div
          className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
            isSelected
              ? "border-brand-300 bg-brand-50/70 dark:border-brand-500/40 dark:bg-brand-500/10"
              : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          } ${props.ghost ? "opacity-60" : ""}`}
          style={style}
        >
          <div
            {...handleProps}
            className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing dark:hover:bg-gray-800 dark:hover:text-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreDotIcon className="h-5 w-5 rotate-90" />
          </div>
          <button
            type="button"
            onClick={() => onSelect(Number(menu.id))}
            className="min-w-0 flex-1 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-gray-800 dark:text-white/90">
                  {menu.name}
                </span>
                {menu.isActive === false && (
                  <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    비활성
                  </span>
                )}
                {childrenCount > 0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    하위 {childrenCount}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <code>{menu.code}</code>
                <span>{menu.path ?? "경로 없음"}</span>
              </div>
            </div>
          </button>
        </div>
      </SimpleTreeItemWrapper>
    );
  }
);

MenuTreeItemSortable.displayName = "MenuTreeItemSortable";

export default MenuTreeItemSortable;
