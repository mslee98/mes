import { createApiError } from "../lib/apiError";

const BASE =
  import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:3000";

export interface UserItem {
  id: number;
  employeeNo: number;
  name: string;
  email: string;
  phoneNumber?: string | null;
  signature?: string | null;
  icon?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
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
  const res = await fetch(`${BASE}/users`, {
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
