/**
 * 메뉴 트리·CRUD·역할별 메뉴 권한 API.
 *
 * @see docs/FRONTEND_API.md
 */
import { createApiError } from "../lib/apiError";
import { API_BASE } from "./apiBase";

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
  const res = await fetch(`${API_BASE}/menus/my`, {
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
  const res = await fetch(`${API_BASE}/menus`, {
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
  const res = await fetch(`${API_BASE}/menus/${menuId}`, {
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
  const res = await fetch(`${API_BASE}/menus`, {
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
  const res = await fetch(`${API_BASE}/menus/${menuId}`, {
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
  const res = await fetch(`${API_BASE}/menus/${menuId}`, {
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
  const res = await fetch(`${API_BASE}/menus/roles/${roleId}`, {
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
  const res = await fetch(`${API_BASE}/menus/roles/${roleId}`, {
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

/** 역할-메뉴 연결 한 건 (목록 조회 시) */
export interface RoleMenuAssignment {
  id: number;
  roleId: number;
  menuId: number;
  canView: boolean;
  menu?: MenuItem;
  [key: string]: unknown;
}

/** 백엔드 응답 한 건: id, canView, role: { id, code, name }, menu: { id, code, name, ... } */
function normalizeRoleMenuAssignment(raw: {
  id: number;
  canView?: boolean;
  role?: { id: number; code?: string; name?: string };
  menu?: { id: number; code?: string; name?: string; [key: string]: unknown };
}): RoleMenuAssignment {
  return {
    id: raw.id,
    roleId: raw.role?.id ?? 0,
    menuId: raw.menu?.id ?? 0,
    canView: raw.canView ?? true,
    menu: raw.menu as MenuItem | undefined,
  };
}

/** 역할별 역할-메뉴 연결 목록 (GET /menus/roles/:roleId) */
export async function getRoleMenus(
  roleId: number,
  accessToken: string
): Promise<RoleMenuAssignment[]> {
  const res = await fetch(`${API_BASE}/menus/roles/${roleId}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "역할별 메뉴 연결 목록을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  if (!Array.isArray(payload)) return [];
  return payload.map((item: unknown) =>
    normalizeRoleMenuAssignment(item as Parameters<typeof normalizeRoleMenuAssignment>[0])
  );
}

export interface UpdateRoleMenuPayload {
  canView: boolean;
}

/** 역할-메뉴 연결 수정 (canView 등) */
export async function updateRoleMenu(
  roleMenuId: number,
  payload: UpdateRoleMenuPayload,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/menus/role-menus/${roleMenuId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await createApiError(res, "역할-메뉴 연결 수정에 실패했습니다.");
  }
}

/** 역할-메뉴 연결 삭제 */
export async function deleteRoleMenu(
  roleMenuId: number,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/menus/role-menus/${roleMenuId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "역할-메뉴 연결 삭제에 실패했습니다.");
  }
}
