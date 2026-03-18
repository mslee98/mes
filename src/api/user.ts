import { createApiError } from "../lib/apiError";

import { API_BASE } from "./apiBase";

/** 사용자 조회 시 포함되는 조직 단위 (parent로 상위 조직 연결) */
export interface OrganizationUnitRef {
  id: number;
  name: string;
  code: string;
  type: string;
  parent?: OrganizationUnitRef | null;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** 직위 (부장, 과장 등) */
export interface PositionRef {
  id: number;
  code: string;
  name: string;
  level?: number;
  isActive?: boolean;
}

/** 직급 (관리직 등) */
export interface JobTitleRef {
  id: number;
  code: string;
  name: string;
  isActive?: boolean;
}

/** 사용자-조직 소속 정보 */
export interface UserOrganization {
  id: number;
  organizationUnit: OrganizationUnitRef;
  position?: PositionRef | null;
  jobTitle?: JobTitleRef | null;
  isPrimary?: boolean;
  startedAt?: string | null;
  endedAt?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserItem {
  id: number;
  employeeNo: number;
  name: string;
  email: string;
  phoneNumber?: string | null;
  signature?: string | null;
  icon?: string | null;
  isActive: boolean;
  userOrganizations?: UserOrganization[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** 조직 단위 체인을 "회사 > 본사 > 부서" 형태 문자열로 반환 */
export function getOrganizationPath(unit: OrganizationUnitRef): string {
  const path: string[] = [];
  let current: OrganizationUnitRef | null | undefined = unit;
  while (current) {
    path.unshift(current.name);
    current = current.parent;
  }
  return path.join(" > ");
}

function normalizeUserList(payload: unknown): UserItem[] {
  if (Array.isArray(payload)) {
    return payload as UserItem[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    return (payload as { data: UserItem[] }).data;
  }

  return [];
}

export async function getUsers(accessToken: string): Promise<UserItem[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "사용자 목록을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return normalizeUserList(payload);
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * 본인 비밀번호 변경
 * PATCH /users/:id/password (본인만 호출 가능, :id는 로그인 사용자 id)
 */
export async function changePassword(
  userId: number,
  body: ChangePasswordRequest,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${userId}/password`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await createApiError(res, "비밀번호 변경에 실패했습니다.");
  }
}
