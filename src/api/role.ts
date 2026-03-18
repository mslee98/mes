import { createApiError } from "../lib/apiError";

import { API_BASE } from "./apiBase";

export interface RoleItem {
  id?: number | string;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

function normalizeRoleList(payload: unknown): RoleItem[] {
  if (Array.isArray(payload)) {
    return payload as RoleItem[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    return (payload as { data: RoleItem[] }).data;
  }

  return [];
}

export async function getRoles(accessToken: string): Promise<RoleItem[]> {
  const res = await fetch(`${API_BASE}/auth/roles`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "역할 목록을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return normalizeRoleList(payload);
}
