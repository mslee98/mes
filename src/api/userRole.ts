/**
 * 사용자–역할 배정 API.
 *
 * @see docs/FRONTEND_API.md
 */
import { createApiError } from "../lib/apiError";

import { API_BASE } from "./apiBase";

export interface UserRoleAssignment {
  id: number;
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  role: {
    id: number;
    code: string;
    name: string;
    description?: string;
    isActive: boolean;
  };
}

export interface AssignUserRolePayload {
  roleCode: string;
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
}

export interface UpdateUserRolePayload {
  isActive?: boolean;
  endedAt?: string | null;
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function normalizeUserRoleList(payload: unknown): UserRoleAssignment[] {
  if (Array.isArray(payload)) {
    return payload as UserRoleAssignment[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    return (payload as { data: UserRoleAssignment[] }).data;
  }

  return [];
}

export async function getUserRoles(
  userId: number,
  accessToken: string
): Promise<UserRoleAssignment[]> {
  const res = await fetch(`${API_BASE}/auth/users/${userId}/roles`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "사용자 역할 목록을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return normalizeUserRoleList(payload);
}

export async function assignUserRole(
  userId: number,
  payload: AssignUserRolePayload,
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/auth/users/${userId}/roles`, {
    method: "POST",
    headers: authHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await createApiError(res, "사용자 역할 부여에 실패했습니다.");
  }

  return res.json().catch(() => null);
}

export async function updateUserRole(
  userRoleId: number,
  payload: UpdateUserRolePayload,
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/auth/user-roles/${userRoleId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await createApiError(res, "사용자 역할 수정에 실패했습니다.");
  }

  return res.json().catch(() => null);
}

export async function deleteUserRole(userRoleId: number, accessToken: string) {
  const res = await fetch(`${API_BASE}/auth/user-roles/${userRoleId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "사용자 역할 삭제에 실패했습니다.");
  }

  return res.json().catch(() => null);
}
