import { forwardRef, useCallback, useMemo } from "react";
import { SortableTree } from "dnd-kit-sortable-tree";
import type { TreeItems, TreeItemComponentProps } from "dnd-kit-sortable-tree";
import type { MenuItem } from "../../api/menu";
import MenuTreeItemSortable from "./MenuTreeItemSortable";
import { normalizeMenuSortOrder } from "./menuTreeUtils";

type MenuTreeItemData = Omit<MenuItem, "children"> & { children?: MenuItem[] };

interface MenuTreeProps {
  items: MenuItem[];
  selectedMenuId: number | null;
  disabled?: boolean;
  onSelectMenu: (menuId: number) => void;
  onChangeItems: (items: MenuItem[]) => void;
  onMoveMenu?: (payload: {
    menuId: number;
    previousItems: MenuItem[];
    nextItems: MenuItem[];
  }) => void;
}

export default function MenuTree({
  items,
  selectedMenuId,
  disabled = false,
  onSelectMenu,
  onChangeItems,
  onMoveMenu,
}: MenuTreeProps) {
  const treeItems = useMemo(() => items as TreeItems<MenuTreeItemData>, [items]);

  const handleItemsChanged = useCallback(
    (newItems: TreeItems<MenuTreeItemData>, reason: { type: string; draggedItem?: { id: unknown } }) => {
      const normalized = normalizeMenuSortOrder(newItems as MenuItem[]);
      onChangeItems(normalized);

      if (reason.type === "dropped" && reason.draggedItem != null && onMoveMenu) {
        const menuId = Number(reason.draggedItem.id);
        onMoveMenu({
          menuId,
          previousItems: items,
          nextItems: normalized,
        });
      }
    },
    [items, onChangeItems, onMoveMenu]
  );

  const TreeItemComponent = useMemo(() => {
    const C = forwardRef<HTMLDivElement, TreeItemComponentProps<MenuTreeItemData>>(
      (props, ref) => (
        <MenuTreeItemSortable
          {...props}
          ref={ref}
          isSelected={selectedMenuId === Number(props.item.id)}
          onSelect={onSelectMenu}
        />
      )
    );
    C.displayName = "MenuTreeItemWrapper";
    return C;
  }, [selectedMenuId, onSelectMenu]);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        표시할 메뉴가 없습니다.
      </div>
    );
  }

  return (
    <SortableTree
      items={treeItems}
      onItemsChanged={handleItemsChanged}
      TreeItemComponent={TreeItemComponent}
      indentationWidth={28}
      disableSorting={disabled}
      pointerSensorOptions={{ activationConstraint: { distance: 8 } }}
    />
  );
}
