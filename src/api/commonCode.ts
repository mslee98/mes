import { createApiError } from "../lib/apiError";

import { API_BASE } from "./apiBase";

export interface CommonCodeGroup {
  id: number;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  [key: string]: unknown;
}

export interface CommonCodeItem {
  id: number;
  groupCode: string;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  [key: string]: unknown;
}

/** 발주 유형·상태 — `GET /api/common-codes/groups/{groupCode}/codes` */
export const COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE = "PURCHASE_ORDER_TYPE";
export const COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS = "PURCHASE_ORDER_STATUS";

/** 활성 항목만, value=code·label=name (목록은 API에서 sortOrder·id 순 정렬됨) */
export function commonCodesToSelectOptions(
  items: CommonCodeItem[]
): { value: string; label: string }[] {
  return items
    .filter((c) => c.isActive !== false)
    .map((c) => ({ value: c.code, label: c.name || c.code }));
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function sortByOrderAndId<T extends { sortOrder: number; id: number }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.id - right.id;
  });
}

function normalizePayloadList<T>(
  payload: unknown,
  normalizeItem: (item: unknown) => T | null
): T[] {
  const list = Array.isArray(payload)
    ? payload
    : payload &&
      typeof payload === "object" &&
      Array.isArray((payload as { data?: unknown[] }).data)
    ? (payload as { data: unknown[] }).data
    : [];

  return list
    .map((item) => normalizeItem(item))
    .filter((item): item is T => item !== null);
}

function normalizeCommonCodeGroup(payload: unknown): CommonCodeGroup | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const item = payload as Record<string, unknown>;

  return {
    id: Number(item.id ?? 0),
    code: typeof item.code === "string" ? item.code : "",
    name: typeof item.name === "string" ? item.name : "",
    description:
      typeof item.description === "string" ? item.description : "",
    sortOrder: Number(item.sortOrder ?? item.sort_order ?? 0),
    isActive:
      typeof item.isActive === "boolean"
        ? item.isActive
        : typeof item.is_active === "boolean"
        ? item.is_active
        : true,
  };
}

function normalizeCommonCodeItem(payload: unknown): CommonCodeItem | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const item = payload as Record<string, unknown>;

  return {
    id: Number(item.id ?? 0),
    groupCode:
      typeof item.groupCode === "string"
        ? item.groupCode
        : typeof item.group_code === "string"
        ? item.group_code
        : "",
    code: typeof item.code === "string" ? item.code : "",
    name: typeof item.name === "string" ? item.name : "",
    description:
      typeof item.description === "string" ? item.description : "",
    sortOrder: Number(item.sortOrder ?? item.sort_order ?? 0),
    isActive:
      typeof item.isActive === "boolean"
        ? item.isActive
        : typeof item.is_active === "boolean"
        ? item.is_active
        : true,
  };
}

export async function getCommonCodeGroups(
  accessToken: string
): Promise<CommonCodeGroup[]> {
  const res = await fetch(`${API_BASE}/common-codes/groups`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "공통 코드 그룹을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return sortByOrderAndId(
    normalizePayloadList(payload, normalizeCommonCodeGroup)
  );
}

export async function getCommonCodesByGroup(
  groupCode: string,
  accessToken: string
): Promise<CommonCodeItem[]> {
  const res = await fetch(
    `${API_BASE}/common-codes/groups/${encodeURIComponent(groupCode)}/codes`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw await createApiError(res, "공통 코드 목록을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return sortByOrderAndId(normalizePayloadList(payload, normalizeCommonCodeItem));
}
