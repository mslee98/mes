import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { MenuItem } from "../../api/menu";
import MenuTreeItem from "./MenuTreeItem";
import {
  flattenMenuTree,
  getMenuProjection,
  moveMenuTreeItem,
  type FlatMenuItem,
} from "./menuTreeUtils";

const INDENTATION_WIDTH = 28;

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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);

  const flattenedItems = useMemo(() => flattenMenuTree(items), [items]);
  const activeItem =
    activeId != null
      ? flattenedItems.find((item) => item.id === activeId) ?? null
      : null;
  const projected =
    activeId != null && overId != null
      ? getMenuProjection(
          flattenedItems,
          activeId,
          overId,
          offsetLeft,
          INDENTATION_WIDTH
        )
      : null;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(Number(active.id));
    setOverId(Number(active.id));
    setOffsetLeft(0);
  };

  const handleDragMove = ({ delta, over }: DragMoveEvent) => {
    setOffsetLeft(delta.x);
    if (over) {
      setOverId(Number(over.id));
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) {
      resetDragState();
      return;
    }

    const activeMenuId = Number(active.id);
    const overMenuId = Number(over.id);
    const currentItem = flattenedItems.find((item) => item.id === activeMenuId);

    if (!currentItem) {
      resetDragState();
      return;
    }

    const nextDepth = projected?.depth ?? currentItem.depth;
    const nextParentId = projected?.parentId ?? currentItem.parentId;
    const hasPositionChanged =
      activeMenuId !== overMenuId ||
      nextDepth !== currentItem.depth ||
      nextParentId !== currentItem.parentId;

    if (hasPositionChanged) {
      const nextItems = moveMenuTreeItem(
        items,
        activeMenuId,
        overMenuId,
        nextDepth,
        nextParentId
      );
      const movedItem = flattenMenuTree(nextItems).find(
        (item) => item.id === activeMenuId
      );

      onChangeItems(nextItems);
      onSelectMenu(activeMenuId);
      if (movedItem) {
        onMoveMenu?.({
          menuId: activeMenuId,
          previousItems: items,
          nextItems,
        });
      }
    }

    resetDragState();
  };

  const resetDragState = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  };

  if (flattenedItems.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        표시할 메뉴가 없습니다.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={resetDragState}
    >
      <SortableContext
        items={flattenedItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {flattenedItems.map((item) => {
            const depth =
              activeId === item.id && projected ? projected.depth : item.depth;

            return (
              <MenuTreeItem
                key={item.id}
                item={item}
                depth={depth}
                indentationWidth={INDENTATION_WIDTH}
                isSelected={selectedMenuId === item.id}
                disabled={disabled}
                onSelect={onSelectMenu}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <DragOverlayItem item={activeItem} depth={projected?.depth ?? activeItem.depth} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DragOverlayItem({
  item,
  depth,
}: {
  item: FlatMenuItem;
  depth: number;
}) {
  return (
    <div className="w-[420px] rounded-xl border border-brand-300 bg-white shadow-2xl dark:border-brand-500/40 dark:bg-gray-900">
      <div
        className="flex items-center gap-3 px-3 py-3"
        style={{ paddingLeft: depth * INDENTATION_WIDTH + 12 }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
          ::
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-gray-800 dark:text-white/90">
            {item.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <code>{item.code}</code>
            <span>{item.path ?? "경로 없음"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
