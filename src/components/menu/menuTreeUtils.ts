import type { MenuItem } from "../../api/menu";

export interface FlatMenuItem extends MenuItem {
  parentId: number | null;
  depth: number;
  childrenCount: number;
}

export function flattenMenuTree(
  items: MenuItem[],
  parentId: number | null = null,
  depth = 0
): FlatMenuItem[] {
  return items.flatMap((item) => [
    {
      ...item,
      parentId,
      depth,
      childrenCount: item.children.length,
    },
    ...flattenMenuTree(item.children, item.id, depth + 1),
  ]);
}

export function findMenuItem(
  items: MenuItem[],
  targetId: number
): MenuItem | null {
  for (const item of items) {
    if (item.id === targetId) {
      return item;
    }

    const childMatch = findMenuItem(item.children, targetId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

export function getExpandedMenuIds(items: MenuItem[]): number[] {
  return flattenMenuTree(items)
    .filter((item) => item.childrenCount > 0)
    .map((item) => item.id);
}

export function normalizeMenuSortOrder(items: MenuItem[]): MenuItem[] {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index,
    children: normalizeMenuSortOrder(item.children),
  }));
}

/** 선택한 메뉴(와 하위)를 최상위로 올리고 맨 앞에 둠. "최상위로 이동" 버튼용. */
export function moveMenuItemToRoot(items: MenuItem[], menuId: number): MenuItem[] {
  const flat = flattenMenuTree(items);
  const blockIds = new Set([menuId, ...getDescendantIds(flat, menuId)]);
  const movingBlock = flat.filter((item) => blockIds.has(item.id));
  const remainingItems = flat.filter((item) => !blockIds.has(item.id));

  if (movingBlock.length === 0) return items;

  const depthDelta = -movingBlock[0].depth;
  const adjustedBlock = movingBlock.map((item, index) => ({
    ...item,
    parentId: index === 0 ? null : item.parentId,
    depth: item.depth + depthDelta,
  }));

  const nextFlat: FlatMenuItem[] = [...adjustedBlock, ...remainingItems];
  return normalizeMenuSortOrder(buildMenuTree(nextFlat));
}

function getDescendantIds(items: FlatMenuItem[], parentId: number): number[] {
  const parentIndex = items.findIndex((item) => item.id === parentId);
  if (parentIndex === -1) return [];
  const parentDepth = items[parentIndex].depth;
  const descendants: number[] = [];
  for (let i = parentIndex + 1; i < items.length; i++) {
    if (items[i].depth <= parentDepth) break;
    descendants.push(items[i].id);
  }
  return descendants;
}

function buildMenuTree(items: FlatMenuItem[]): MenuItem[] {
  const itemMap = new Map<number, MenuItem>();
  const rootItems: MenuItem[] = [];
  items.forEach((item) => {
    const { parentId: _p, depth: _d, childrenCount: _c, ...rest } = item;
    itemMap.set(item.id, { ...rest, children: [] });
  });
  items.forEach((item) => {
    const node = itemMap.get(item.id);
    if (!node) return;
    if (item.parentId == null) {
      rootItems.push(node);
      return;
    }
    const parent = itemMap.get(item.parentId);
    if (parent) parent.children.push(node);
    else rootItems.push(node);
  });
  return rootItems;
}
