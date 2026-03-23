/**
 * 조직 단위 트리·부서 소속 사용자 목록 API.
 *
 * - 발주 폼: 부서/담당자 선택 (`flattenOrganizationUnitsForSelect` 등)
 * - 발주 상세 상신: `getOrganizationUnitPathSegmentsFromTree` 로 GET /users 의 shallow parent 를 보완해
 *   팀장 매칭용 **전체 경로 세그먼트**를 복원
 *
 * @see docs/FRONTEND_API.md
 */
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

/** `GET /organization-unit/tree` — 선택 시 Bearer(로그인 토큰) 부착 */
export async function getOrganizationTree(
  accessToken?: string | null
): Promise<OrganizationUnitNode[]> {
  const headers: HeadersInit = {};
  if (accessToken) {
    (headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${API_BASE}/organization-unit/tree`, {
    credentials: "include",
    ...(Object.keys(headers as object).length > 0 ? { headers } : {}),
  });

  if (!res.ok) {
    throw await createApiError(res, "조직도를 불러오지 못했습니다.");
  }

  return res.json();
}

/**
 * GET /organization-unit/tree 전체로 id→노드 맵을 만든 뒤 parentId를 따라 올라가며 경로 세그먼트(이름)를 구합니다.
 * GET /users 의 organizationUnit.parent 가 2단계 eager만 될 때 깊은 트리 경로 보완용.
 */
export function getOrganizationUnitPathSegmentsFromTree(
  unitId: number,
  tree: OrganizationUnitNode[]
): string[] {
  const byId = new Map<number, OrganizationUnitNode>();

  const walk = (nodes: OrganizationUnitNode[]) => {
    for (const n of nodes) {
      byId.set(n.id, n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(tree);

  const leaf = byId.get(unitId);
  if (!leaf) return [];

  const names: string[] = [];
  let cur: OrganizationUnitNode | undefined = leaf;
  const seen = new Set<number>();

  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.name);
    if (cur.parentId == null) break;
    cur = byId.get(cur.parentId);
  }

  return names;
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
