/**
 * 사용자 목록·상세 등 사용자 API.
 *
 * 발주 상신 팀장 라우팅:
 * - `GET /users` 응답에 `userOrganizations[]` + 각 행의 `isTeamLeader`/`is_team_leader`, `isActive`, `organizationUnit` 필요
 * - 팀장 선택 알고리즘: `findTeamLeaderUserForDepartment` (요청 부서 문자열 ↔ 조직 경로 매칭)
 *
 * @see docs/FRONTEND_API.md
 */
import { createApiError } from "../lib/apiError";

import { API_BASE } from "./apiBase";
import {
  getOrganizationUnitPathSegmentsFromTree,
  type OrganizationUnitNode,
} from "./organization";

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
  /** 해당 조직 소속 기준 부서 팀장 여부 (발주 상신 시 동일 부서 팀장 라우팅 등) */
  isTeamLeader?: boolean;
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
  /** API가 루트에 내려주는 경우. 없으면 `userOrganizations[].isTeamLeader`로 판별 */
  isTeamLeader?: boolean;
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

function parseOptionalBool(v: unknown): boolean | undefined {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return undefined;
}

function mapUserOrganization(raw: unknown): UserOrganization | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === "number" ? x.id : Number(x.id);
  if (!Number.isFinite(id)) return null;
  const isTeamLeader = parseOptionalBool(x.isTeamLeader ?? x.is_team_leader);
  const isActiveParsed = parseOptionalBool(x.isActive ?? x.is_active);
  /** 명시 false만 비활성; 미전달은 유효 소속으로 간주(일반적인 relation 기본값) */
  const isActive = isActiveParsed === false ? false : true;
  return {
    ...(x as unknown as UserOrganization),
    id,
    isActive,
    ...(isTeamLeader !== undefined ? { isTeamLeader } : {}),
  };
}

function mapUserItem(raw: unknown): UserItem | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === "number" ? x.id : Number(x.id);
  if (!Number.isFinite(id)) return null;
  const orgsRaw = x.userOrganizations ?? x.user_organizations;
  const userOrganizations = Array.isArray(orgsRaw)
    ? orgsRaw
        .map(mapUserOrganization)
        .filter((o): o is UserOrganization => o != null)
    : undefined;
  const rootTeamLeader = parseOptionalBool(
    x.isTeamLeader ?? x.is_team_leader
  );
  return {
    ...(x as unknown as UserItem),
    id,
    ...(userOrganizations ? { userOrganizations } : {}),
    ...(rootTeamLeader !== undefined ? { isTeamLeader: rootTeamLeader } : {}),
  };
}

/** 활성 소속 중 팀장 플래그가 있는지 (또는 API 루트 `isTeamLeader`) */
export function userIsTeamLeaderForActiveOrgs(user: UserItem): boolean {
  if (user.isTeamLeader === true) return true;
  const orgs = user.userOrganizations;
  if (!Array.isArray(orgs)) return false;
  return orgs.some(
    (o) => userOrgIsTeamLeader(o) && o.isActive === true
  );
}

/** 요청 부서·조직명 비교용: trim, 소문자, 연속 공백 1칸 */
function normalizeDeptLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** `isTeamLeader` 또는 스프레드에 남은 `is_team_leader` 만 인정 (true 일 때만 팀장) */
function userOrgIsTeamLeader(uo: UserOrganization): boolean {
  if (uo.isTeamLeader === true) return true;
  const r = uo as unknown as Record<string, unknown>;
  return r.is_team_leader === true;
}

export type FindTeamLeaderOptions = {
  /**
   * `GET /organization-unit/tree` 결과. `GET /users`의 `organizationUnit.parent`가
   * shallow(예: 2단)일 때 깊은 경로 세그먼트를 id 기준으로 보완합니다.
   */
  organizationTree?: OrganizationUnitNode[];
};

/**
 * 발주 **요청 부서**(`requestDepartment` / `requesterDepartment`) 문자열로 1차 결재 팀장 1명을 고릅니다.
 *
 * - 후보: `userOrganizations` 중 **`isActive === true`** 이고 **`isTeamLeader === true`** 인 행만.
 * - `normalize`: trim → 소문자 → 연속 공백 1칸. `needle`이 빈 문자열이면 `null`.
 * - rank: 전체 경로 문자열 일치 4, leaf/요청 경로 마지막 세그먼트 일치 3, 세그먼트 교차 일치 2, `isPrimary`면 +0.5.
 * - 발주 폼은 `parseDeptPathFromSelect`로 **전체 경로 라벨**을 저장하는 경우가 많아, `>` 로 쪼갠 세그먼트와도 매칭합니다.
 * - 사용자별 최고 rank만 남긴 뒤, 전원 중 rank 최대 선택. **동점이면 `userId` 오름차순**(안정 타이브레이크).
 *
 * TODO: `organization_unit_id` FK·`approval_line` / `approval_document` 도입 시 서버·결재선으로 이전 가능.
 */
export function findTeamLeaderUserForDepartment(
  users: UserItem[],
  departmentLabel: string | null | undefined,
  options?: FindTeamLeaderOptions
): { userId: number; name: string } | null {
  const rawDept = String(departmentLabel ?? "").trim();
  const needle = normalizeDeptLabel(rawDept);
  if (!needle) return null;

  /** 발주 폼이 저장하는 "회사 > 본사 > 팀" 형태를 세그먼트 배열로 분해 */
  const deptParts = rawDept
    .split(/\s*>\s*/)
    .map((p) => normalizeDeptLabel(p))
    .filter(Boolean);
  /** 요청 경로의 마지막 조직명(팀 단위 일치에 사용) */
  const deptLeafFromPath =
    deptParts.length > 0 ? deptParts[deptParts.length - 1] : "";

  type Cand = { userId: number; name: string; rank: number };
  const collected: Cand[] = [];

  for (const user of users) {
    if (user.isActive === false) continue;
    for (const uo of user.userOrganizations ?? []) {
      if (uo.isActive !== true || !userOrgIsTeamLeader(uo)) continue;
      const unit = uo.organizationUnit;
      if (!unit || !Number.isFinite(unit.id)) continue;

      let segs: string[];
      const tree = options?.organizationTree;
      if (tree?.length) {
        const fromTree = getOrganizationUnitPathSegmentsFromTree(
          unit.id,
          tree
        );
        segs =
          fromTree.length > 0
            ? fromTree
                .map((x) => normalizeDeptLabel(x))
                .filter(Boolean)
            : getOrganizationPath(unit)
                .split(/\s*>\s*/)
                .map((x) => normalizeDeptLabel(x))
                .filter(Boolean);
      } else {
        segs = getOrganizationPath(unit)
          .split(/\s*>\s*/)
          .map((x) => normalizeDeptLabel(x))
          .filter(Boolean);
      }

      const leaf = normalizeDeptLabel(unit.name ?? "");
      const pathJoined = normalizeDeptLabel(segs.join(" > "));

      let rank = 0;
      // 4: 요청 문자열 전체(정규화) === 조직 전체 경로
      if (pathJoined && pathJoined === needle) rank = 4;
      // 3: 요청 경로의 마지막 세그먼트 === 소속 unit 이름, 또는 단일 부서명이 leaf 와 일치
      else if (deptLeafFromPath && leaf === deptLeafFromPath) rank = 3;
      else if (leaf === needle) rank = 3;
      // 2: 요청 경로의 어느 세그먼트든 조직 경로 세그먼트와 교차 일치
      else if (
        deptParts.length > 0 &&
        deptParts.some((p) => segs.some((s) => s === p))
      ) {
        rank = 2;
      } else if (segs.some((s) => s === needle)) rank = 2;

      if (rank > 0) {
        if (uo.isPrimary === true) rank += 0.5;
        collected.push({ userId: user.id, name: user.name, rank });
      }
    }
  }

  if (collected.length === 0) return null;

  /** 동일 사용자에 팀장 소속 여러 줄 → 가장 높은 rank 만 유지 */
  const byUser = new Map<number, Cand>();
  for (const c of collected) {
    const prev = byUser.get(c.userId);
    if (!prev || c.rank > prev.rank) byUser.set(c.userId, c);
  }
  /** 전 사용자 중 rank 최대; 동점 시 userId 오름차순(안정 타이브레이크) */
  const sorted = [...byUser.values()].sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return a.userId - b.userId;
  });
  const best = sorted[0];
  return { userId: best.userId, name: best.name };
}

function normalizeUserList(payload: unknown): UserItem[] {
  let list: unknown[] = [];
  if (Array.isArray(payload)) {
    list = payload;
  } else if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    list = (payload as { data: unknown[] }).data;
  }

  return list
    .map(mapUserItem)
    .filter((row): row is UserItem => row != null);
}

/**
 * `GET /users` — 배열 또는 `{ data: [] }`.
 * 팀장 라우팅 시 각 항목에 `userOrganizations`(또는 `user_organizations`) 포함 여부가 중요.
 */
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
