import type { MenuItem } from "../../api/menu";

export interface FlatMenuItem extends MenuItem {
  parentId: number | null;
  depth: number;
  childrenCount: number;
}

export interface MenuProjection {
  depth: number;
  maxDepth: number;
  minDepth: number;
  parentId: number | null;
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

export function buildMenuTree(items: FlatMenuItem[]): MenuItem[] {
  const itemMap = new Map<number, MenuItem>();
  const rootItems: MenuItem[] = [];

  items.forEach((item) => {
    const { parentId: _parentId, depth: _depth, childrenCount: _childrenCount, ...rest } =
      item;
    itemMap.set(item.id, {
      ...rest,
      children: [],
    });
  });

  items.forEach((item) => {
    const node = itemMap.get(item.id);
    if (!node) return;

    if (item.parentId == null) {
      rootItems.push(node);
      return;
    }

    const parent = itemMap.get(item.parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      rootItems.push(node);
    }
  });

  return rootItems;
}

export function getMenuProjection(
  items: FlatMenuItem[],
  activeId: number,
  overId: number,
  dragOffset: number,
  indentationWidth: number
): MenuProjection | null {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);

  if (activeIndex === -1 || overIndex === -1) {
    return null;
  }

  const activeItem = items[activeIndex];
  const descendantIds = getDescendantIds(items, activeId);

  if (descendantIds.includes(overId)) {
    return null;
  }

  const blockIds = new Set([activeId, ...descendantIds]);
  const remainingItems = items.filter((item) => !blockIds.has(item.id));
  const targetIndex = remainingItems.findIndex((item) => item.id === overId);
  const insertIndex =
    targetIndex === -1
      ? remainingItems.length
      : overIndex > activeIndex
      ? targetIndex + 1
      : targetIndex;

  const previousItem = remainingItems[insertIndex - 1];
  const nextItem = remainingItems[insertIndex];

  const dragDepth = Math.round(dragOffset / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;

  let depth = projectedDepth;
  if (depth > maxDepth) depth = maxDepth;
  if (depth < minDepth) depth = minDepth;

  let parentId: number | null = null;

  if (depth === 0 || !previousItem) {
    parentId = null;
  } else if (depth === previousItem.depth) {
    parentId = previousItem.parentId;
  } else if (depth > previousItem.depth) {
    parentId = previousItem.id;
  } else {
    const parentMatch = [...remainingItems.slice(0, insertIndex)]
      .reverse()
      .find((item) => item.depth === depth);
    parentId = parentMatch ? parentMatch.parentId : null;
  }

  return {
    depth,
    maxDepth,
    minDepth,
    parentId,
  };
}

export function moveMenuTreeItem(
  items: MenuItem[],
  activeId: number,
  overId: number,
  depth: number,
  parentId: number | null
): MenuItem[] {
  const flattenedItems = flattenMenuTree(items);
  const activeIndex = flattenedItems.findIndex((item) => item.id === activeId);
  const overIndex = flattenedItems.findIndex((item) => item.id === overId);

  if (activeIndex === -1 || overIndex === -1) {
    return items;
  }

  const descendantIds = getDescendantIds(flattenedItems, activeId);
  if (descendantIds.includes(overId)) {
    return items;
  }

  const blockIds = new Set([activeId, ...descendantIds]);
  const movingBlock = flattenedItems.filter((item) => blockIds.has(item.id));
  const remainingItems = flattenedItems.filter((item) => !blockIds.has(item.id));
  const targetIndex = remainingItems.findIndex((item) => item.id === overId);
  const insertIndex =
    targetIndex === -1
      ? remainingItems.length
      : overIndex > activeIndex
      ? targetIndex + 1
      : targetIndex;

  const depthDelta = depth - movingBlock[0].depth;
  const adjustedBlock = movingBlock.map((item, index) => ({
    ...item,
    parentId: index === 0 ? parentId : item.parentId,
    depth: item.depth + depthDelta,
  }));

  const nextItems = [
    ...remainingItems.slice(0, insertIndex),
    ...adjustedBlock,
    ...remainingItems.slice(insertIndex),
  ];

  return normalizeMenuSortOrder(buildMenuTree(nextItems));
}

function getDescendantIds(items: FlatMenuItem[], parentId: number): number[] {
  const parentIndex = items.findIndex((item) => item.id === parentId);

  if (parentIndex === -1) {
    return [];
  }

  const parentDepth = items[parentIndex].depth;
  const descendants: number[] = [];

  for (let index = parentIndex + 1; index < items.length; index += 1) {
    const currentItem = items[index];
    if (currentItem.depth <= parentDepth) {
      break;
    }
    descendants.push(currentItem.id);
  }

  return descendants;
}
