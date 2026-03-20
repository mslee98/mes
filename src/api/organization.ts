import { createApiError } from "../lib/apiError";

import { API_BASE } from "./apiBase";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export type OrganizationUnitType =
  | "COMPANY"
  | "HEADQUARTERS"
  | "DEPARTMENT"
  | string;

export interface OrganizationUnitNode {
  id: number;
  name: string;
  code: string;
  type: OrganizationUnitType;
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
  children: OrganizationUnitNode[];
}

export async function getOrganizationTree(): Promise<OrganizationUnitNode[]> {
  const res = await fetch(`${API_BASE}/organization-unit/tree`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res, "조직도를 불러오지 못했습니다.");
  }

  return res.json();
}

/** 조직도 트리를 검색·선택용 옵션으로 평탄화 (값: 조직 PK 문자열, 라벨: 경로) */
export function flattenOrganizationUnitsForSelect(
  nodes: OrganizationUnitNode[]
): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];

  const walk = (list: OrganizationUnitNode[], path: string[]) => {
    for (const n of list) {
      if (!n.isActive) continue;
      const nextPath = [...path, n.name];
      const pathStr = nextPath.join(" > ");
      if (n.type === "DEPARTMENT") {
        result.push({ value: String(n.id), label: pathStr });
      }
      if (n.children?.length) {
        walk(n.children, nextPath);
      }
    }
  };

  walk(nodes, []);
  return result;
}

/** GET /organization-unit/:id/users 응답 항목 */
export interface OrganizationUnitUserItem {
  id: number;
  employeeNo: number;
  name: string;
}

export async function getOrganizationUnitUsers(
  unitId: number,
  accessToken: string
): Promise<OrganizationUnitUserItem[]> {
  const res = await fetch(`${API_BASE}/organization-unit/${unitId}/users`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(
      res,
      "해당 부서 소속 사용자를 불러오지 못했습니다."
    );
  }

  return res.json();
}
