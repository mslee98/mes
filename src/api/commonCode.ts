/**
 * 공통코드 — **표준** REST 경로 (`/common-codes/...`).
 *
 * | 구분 | 용도 |
 * |------|------|
 * | **표준** | `GET /api/common-codes/groups` → 그룹 목록<br>`GET /api/common-codes/groups/{groupCode}/codes` → 해당 그룹 코드 목록 |
 * | **별칭** | `GET /api/code-groups/{groupCode}/codes` → 위 “그룹별 코드”와 **동일 서비스·동일 응답** (`findCodesByGroup` 공유). 그룹 목록 API는 없음. |
 *
 * 별칭은 URL 단축·기존 연동용이며, 리소스 모델상 표준은 `common-codes` → `groups` → `codes` 입니다.
 * 신규 화면·모듈은 이 파일의 `getCommonCodeGroups` / `getCommonCodesByGroup` 사용을 권장합니다.
 *
 * 발주 등 드롭다운용으로 `COMMON_CODE_GROUP_*` 상수를 참고하세요.
 *
 * @see docs/COMMON_CODE.md
 * @see docs/FRONTEND_API.md
 */
import { createApiError } from "../lib/apiError";

import { API_BASE } from "./apiBase";
import { fetchAuthorized } from "./fetchAuthorized";

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
/** 납품 상태 — `GET /api/common-codes/groups/DELIVERY_STATUS/codes` */
export const COMMON_CODE_GROUP_DELIVERY_STATUS = "DELIVERY_STATUS";
/** 제품 분류 — `GET /api/common-codes/groups/PRODUCT_CATEGORY/codes` */
export const COMMON_CODE_GROUP_PRODUCT_CATEGORY = "PRODUCT_CATEGORY";
/**
 * 사용 여부(활성/비활성) — `GET /api/common-codes/groups/USE_STATUS/codes`
 * (별칭: `GET /api/code-groups/USE_STATUS/codes` — 동일 응답)
 */
export const COMMON_CODE_GROUP_USE_STATUS = "USE_STATUS";

/** 백엔드와 맞춘 코드 값(API 미조회·폴백 시 비교·저장용) */
export const USE_STATUS_CODE_ACTIVE = "ACTIVE";
export const USE_STATUS_CODE_INACTIVE = "INACTIVE";

/**
 * 공통코드 조회 실패·빈 응답 시 셀렉트용 폴백.
 * `name`은 서버와 동일하게 유지하는 것이 좋음.
 */
export const USE_STATUS_FALLBACK_SELECT_OPTIONS: {
  value: string;
  label: string;
}[] = [
  { value: USE_STATUS_CODE_ACTIVE, label: "활성" },
  { value: USE_STATUS_CODE_INACTIVE, label: "비활성" },
];
/** 발주 목록 등 승인 상태 필터 — `GET /api/common-codes/groups/APPROVAL_STATUS/codes` */
export const COMMON_CODE_GROUP_APPROVAL_STATUS = "APPROVAL_STATUS";
/** 품목 마스터 유형 — `GET /api/common-codes/groups/ITEM_TYPE/codes` */
export const COMMON_CODE_GROUP_ITEM_TYPE = "ITEM_TYPE";
/** 조직 유형 표시 — `GET /api/common-codes/groups/ORG_TYPE/codes` */
export const COMMON_CODE_GROUP_ORG_TYPE = "ORG_TYPE";
/** 거래처 유형 — `GET /api/common-codes/groups/PARTNER_TYPE/codes` */
export const COMMON_CODE_GROUP_PARTNER_TYPE = "PARTNER_TYPE";
/** 거래처 민수/군수 — `GET /api/common-codes/groups/PARTNER_DEFENSE_MARKET/codes` */
export const COMMON_CODE_GROUP_PARTNER_DEFENSE_MARKET =
  "PARTNER_DEFENSE_MARKET";
/** 국가 — `GET /api/common-codes/groups/COUNTRY/codes` */
export const COMMON_CODE_GROUP_COUNTRY = "COUNTRY";
/**
 * 품목 리비전 상태(선택). 시드에 없으면 API가 빈 배열·404일 수 있음 — 화면에서 폴백 처리 권장.
 * `GET /api/common-codes/groups/ITEM_REVISION_STATUS/codes`
 */
export const COMMON_CODE_GROUP_ITEM_REVISION_STATUS = "ITEM_REVISION_STATUS";

/** 활성 항목만, value=code·label=name (목록은 API에서 sortOrder·id 순 정렬됨) */
export function commonCodesToSelectOptions(
  items: CommonCodeItem[]
): { value: string; label: string }[] {
  return items
    .filter((c) => c.isActive !== false)
    .map((c) => ({ value: c.code, label: c.name || c.code }));
}

/** 표시용: `code`에 대응하는 `name`. 없거나 비활성이면 `code` 그대로 */
export function labelForCommonCode(
  items: CommonCodeItem[],
  code: string | undefined | null
): string {
  const c = String(code ?? "").trim();
  if (!c) return "—";
  const upper = c.toUpperCase();
  const hit = items.find(
    (x) =>
      String(x.code).trim().toUpperCase() === upper && x.isActive !== false
  );
  return (hit?.name ?? "").trim() || c;
}

/**
 * USE_STATUS 그룹용 셀렉트 옵션. API에 항목이 있으면 `name` 표시, 없으면 폴백 옵션.
 * 현재 폼 값이 목록에 없을 때(구 데이터 등) 한 줄 추가.
 */
export function buildUseStatusSelectOptions(
  items: CommonCodeItem[],
  currentCode?: string | null
): { value: string; label: string }[] {
  const fromApi = commonCodesToSelectOptions(items).map((o) => ({
    value: String(o.value).trim().toUpperCase(),
    label: o.label,
  }));
  const base =
    fromApi.length > 0
      ? fromApi
      : [...USE_STATUS_FALLBACK_SELECT_OPTIONS];
  const c = String(currentCode ?? "").trim().toUpperCase();
  if (!c || base.some((o) => o.value === c)) {
    return base;
  }
  const label = labelForCommonCode(items, c);
  return [{ value: c, label: label === "—" ? c : label }, ...base];
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
  const res = await fetchAuthorized(
    `${API_BASE}/common-codes/groups`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );

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
  const res = await fetchAuthorized(
    `${API_BASE}/common-codes/groups/${encodeURIComponent(groupCode)}/codes`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );

  if (!res.ok) {
    throw await createApiError(res, "공통 코드 목록을 불러오지 못했습니다.");
  }

  const payload = await res.json();
  return sortByOrderAndId(normalizePayloadList(payload, normalizeCommonCodeItem));
}
