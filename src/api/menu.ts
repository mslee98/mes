import { createApiError } from "../lib/apiError";

const BASE =
  import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:3000";

export interface MenuItem {
  id: number;
  code: string;
  name: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  sortOrder: number;
  isVisible?: boolean;
  isActive?: boolean;
  children: MenuItem[];
  [key: string]: unknown;
}

export interface MenuMutationPayload {
  code: string;
  name: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  sortOrder: number;
  isVisible?: boolean;
  isActive?: boolean;
  parentId?: number | null;
}

export interface MenuRoleAssignmentPayload {
  menuCode: string;
  canView: boolean;
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export function normalizeMenuTree(payload: unknown): MenuItem[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return [...payload]
    .map((item) => normalizeMenuItem(item))
    .filter((item): item is MenuItem => item !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeMenuItem(payload: unknown): MenuItem | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const item = payload as Partial<MenuItem>;

  return {
    id: Number(item.id ?? 0),
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
    path: typeof item.path === "string" ? item.path : null,
    component: typeof item.component === "string" ? item.component : null,
    icon: typeof item.icon === "string" ? item.icon : null,
    sortOrder: Number(item.sortOrder ?? 0),
    isVisible: typeof item.isVisible === "boolean" ? item.isVisible : true,
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    children: normalizeMenuTree(item.children ?? []),
  };
}

function normalizeSingleMenu(payload: unknown): MenuItem | null {
  return normalizeMenuItem(payload);
}

export async function getMyMenus(accessToken: string): Promise<MenuItem[]> {
  const res = await fetch(`${BASE}/menus/my`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "메뉴 정보를 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return normalizeMenuTree(payload);
}

export async function getMenus(accessToken: string): Promise<MenuItem[]> {
  const res = await fetch(`${BASE}/menus`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "메뉴 목록을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return normalizeMenuTree(payload);
}

export async function getMenu(
  menuId: number,
  accessToken: string
): Promise<MenuItem> {
  const res = await fetch(`${BASE}/menus/${menuId}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "메뉴 정보를 불러오지 못했습니다.");
  }

  const payload = await res.json();
  const menu = normalizeSingleMenu(payload);

  if (!menu) {
    throw new Error("메뉴 정보를 불러오지 못했습니다.");
  }

  return menu;
}

export async function createMenu(
  payload: MenuMutationPayload,
  accessToken: string
): Promise<MenuItem | null> {
  const res = await fetch(`${BASE}/menus`, {
    method: "POST",
    headers: authHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await createApiError(res, "메뉴 생성에 실패했습니다.");
  }

  const responsePayload = await res.json().catch(() => null);
  return normalizeSingleMenu(responsePayload);
}

export async function updateMenu(
  menuId: number,
  payload: Partial<MenuMutationPayload>,
  accessToken: string
): Promise<MenuItem | null> {
  const res = await fetch(`${BASE}/menus/${menuId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await createApiError(res, "메뉴 수정에 실패했습니다.");
  }

  const responsePayload = await res.json().catch(() => null);
  return normalizeSingleMenu(responsePayload);
}

export async function deleteMenu(menuId: number, accessToken: string): Promise<void> {
  const res = await fetch(`${BASE}/menus/${menuId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "메뉴 삭제에 실패했습니다.");
  }
}

export async function getMenusByRole(
  roleId: number,
  accessToken: string
): Promise<MenuItem[]> {
  const res = await fetch(`${BASE}/menus/roles/${roleId}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "역할별 메뉴 조회에 실패했습니다.");
  }

  const payload = await res.json();
  return normalizeMenuTree(payload);
}

export async function assignMenuToRole(
  roleId: number,
  payload: MenuRoleAssignmentPayload,
  accessToken: string
) {
  const res = await fetch(`${BASE}/menus/roles/${roleId}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await createApiError(res, "역할에 메뉴 연결에 실패했습니다.");
  }

  return res.json().catch(() => null);
}
