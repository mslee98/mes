import type { MenuItem } from "../../api/menu";
import type { MenuFormValues } from "./MenuDetailPanel";
import { findMenuItem } from "./menuTreeUtils";

export const EMPTY_MENU_FORM: MenuFormValues = {
  parentId: null,
  code: "",
  name: "",
  path: "",
  component: "",
  icon: "",
  sortOrder: 0,
  isVisible: true,
  isActive: true,
};

export function isSameMenuForm(left: MenuFormValues, right: MenuFormValues) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildMenuFormValues(
  menu: Partial<MenuItem>,
  parentId: number | null,
  sortOrder: number
): MenuFormValues {
  return {
    parentId,
    code: String(menu.code ?? ""),
    name: String(menu.name ?? ""),
    path: typeof menu.path === "string" ? menu.path : "",
    component: typeof menu.component === "string" ? menu.component : "",
    icon: typeof menu.icon === "string" ? menu.icon : "",
    sortOrder: Number(menu.sortOrder ?? sortOrder),
    isVisible: typeof menu.isVisible === "boolean" ? menu.isVisible : true,
    isActive: typeof menu.isActive === "boolean" ? menu.isActive : true,
  };
}

export function getNextMenuSortOrder(items: MenuItem[], parentId: number | null) {
  if (parentId == null) {
    return items.length;
  }
  const parentMenu = findMenuItem(items, parentId);
  return parentMenu?.children.length ?? 0;
}
