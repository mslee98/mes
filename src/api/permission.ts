import { createApiError } from "../lib/apiError";

const BASE =
  import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:3000";

export interface PermissionItem {
  id?: number | string;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

function normalizePermissionList(payload: unknown): PermissionItem[] {
  if (Array.isArray(payload)) {
    return payload as PermissionItem[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    return (payload as { data: PermissionItem[] }).data;
  }

  return [];
}

export async function getPermissions(
  accessToken: string
): Promise<PermissionItem[]> {
  const res = await fetch(`${BASE}/auth/permissions`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "권한 목록을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return normalizePermissionList(payload);
}
