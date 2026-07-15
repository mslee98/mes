import {
  API_BASE,
  authHeaders,
  jsonHeaders,
  fetchAuthorized,
  createApiError,
} from "./http";

export interface Partner {
  id: string;
  code: string;
  name: string;
  /** 공통코드 PARTNER_TYPE (예: CUSTOMER, SUPPLIER) */
  type?: string;
  /** 공통코드 PARTNER_SUPPLIER_SEGMENT — DB `supplier_segment_code`, `type === SUPPLIER` 일 때 */
  supplierSegment?: string | null;
  /** 백엔드 요청/응답 호환 키 */
  supplierSegmentCode?: string | null;
  /** 공통코드 PARTNER_DEFENSE_MARKET (예: CIVILIAN, MILITARY) */
  defenseMarket?: string;
  /** 공통코드 COUNTRY (예: KR, SG, IN) */
  countryCode?: string;
  /** DB `business_registration_no` */
  businessRegistrationNo?: string | null;
  /** DB `contact_person` */
  contactPerson?: string | null;
  /** DB `contact_phone` */
  contactPhone?: string | null;
  /** DB `contact_email` */
  contactEmail?: string | null;
  /** DB `contact` (레거시 한 줄 연락처) */
  contact?: string | null;
  address?: string | null;
  memo?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** 발주·생산 계획 등 응답에 포함되는 거래처 요약(경량) */
export interface PartnerSummary {
  id?: string;
  code?: string;
  name?: string;
  countryCode?: string | null;
}

/** 생산 계획 `GET` 등에서 중첩되는 발주 최소 필드 */
export interface ProductionPlanPurchaseOrderNested {
  id?: string;
  orderNo?: string;
  /** 발주 납기(최종 납품 기준일로 표시) */
  dueDate?: string | null;
  requestDeliveryDate?: string | null;
  partner?: Partner | null;
  partnerSummary?: PartnerSummary | null;
}

function partnerStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

/** GET/POST/PATCH 응답에서 camelCase·snake_case 모두 수용 */
export function mapPartnerFromApi(raw: Record<string, unknown>): Partner {
  const inactive =
    raw.isActive === false ||
    raw.is_active === false ||
    raw.is_active === 0;

  const supplierSegment =
    partnerStr(raw.supplierSegment) ??
    partnerStr(raw.supplierSegmentCode) ??
    partnerStr(raw.supplier_segment) ??
    partnerStr(raw.supplier_segment_code) ??
    null;

  return {
    id: String(raw.id ?? ""),
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    type: partnerStr(raw.type),
    supplierSegment,
    supplierSegmentCode: supplierSegment,
    defenseMarket:
      partnerStr(raw.defenseMarket) ?? partnerStr(raw.defense_market),
    countryCode:
      partnerStr(raw.countryCode) ?? partnerStr(raw.country_code),
    businessRegistrationNo:
      partnerStr(raw.businessRegistrationNo) ??
      partnerStr(raw.business_registration_no) ??
      null,
    contactPerson:
      partnerStr(raw.contactPerson) ?? partnerStr(raw.contact_person) ?? null,
    contactPhone:
      partnerStr(raw.contactPhone) ?? partnerStr(raw.contact_phone) ?? null,
    contactEmail:
      partnerStr(raw.contactEmail) ?? partnerStr(raw.contact_email) ?? null,
    contact: partnerStr(raw.contact) ?? null,
    address: partnerStr(raw.address) ?? null,
    memo: partnerStr(raw.memo) ?? null,
    isActive: inactive ? false : true,
    createdAt:
      partnerStr(raw.createdAt) ?? partnerStr(raw.created_at),
    updatedAt:
      partnerStr(raw.updatedAt) ?? partnerStr(raw.updated_at),
  };
}

/** GET 목록 등 경량 응답의 `partnerSummary` / `partner_summary` */
export function mapPartnerSummaryFromApi(
  raw: unknown
): PartnerSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const x = raw as Record<string, unknown>;
  return {
    id: String(x.id ?? ""),
    code: String(x.code ?? ""),
    name: String(x.name ?? ""),
    countryCode:
      partnerStr(x.countryCode) ?? partnerStr(x.country_code) ?? null,
  };
}

export interface PartnerCreatePayload {
  code: string;
  name: string;
  defenseMarket: string;
  countryCode: string;
  type?: string | null;
  /** 백엔드 요청 키 */
  supplierSegmentCode?: string | null;
  supplierSegment?: string | null;
  businessRegistrationNo?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contact?: string | null;
  address?: string | null;
  memo?: string | null;
}

export interface PartnerUpdatePayload {
  code?: string;
  name?: string;
  defenseMarket?: string;
  countryCode?: string;
  type?: string | null;
  /** 백엔드 요청 키 */
  supplierSegmentCode?: string | null;
  supplierSegment?: string | null;
  businessRegistrationNo?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contact?: string | null;
  address?: string | null;
  memo?: string | null;
  isActive?: boolean;
}

// --- 거래처·코드그룹 (발주 폼 드롭다운 보조, Bearer 사용) ---

export interface GetPartnersParams {
  /** 파트너 조회 용도 (예: ORDER, LENS) */
  usage?: "ORDER" | "LENS" | string;
  /** 공통코드 PARTNER_SUPPLIER_SEGMENT (예: MECHANICAL, MATERIAL, OTHER) */
  supplierSegmentCode?: string;
  /** 공통코드 PARTNER_TYPE (예: CUSTOMER, SUPPLIER) */
  type?: string;
}

/** `GET /partners` */
export async function getPartners(
  accessToken: string,
  params?: GetPartnersParams
): Promise<Partner[]> {
  const query = new URLSearchParams();
  const usage = String(params?.usage ?? "").trim();
  const supplierSegmentCode = String(params?.supplierSegmentCode ?? "").trim();
  const type = String(params?.type ?? "").trim();
  if (usage) query.set("usage", usage);
  if (supplierSegmentCode) query.set("supplierSegmentCode", supplierSegmentCode);
  if (type) query.set("type", type);
  const qs = query.toString();

  const res = await fetchAuthorized(
    `${API_BASE}/partners${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "거래처 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list: unknown[] = Array.isArray(data) ? data : data?.data ?? [];
  return list.map((item) =>
    mapPartnerFromApi(item as Record<string, unknown>)
  );
}

/** `GET /partners/:id` */
export async function getPartner(
  id: string,
  accessToken: string
): Promise<Partner> {
  const res = await fetchAuthorized(
    `${API_BASE}/partners/${id}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "거래처 정보를 불러오지 못했습니다.");
  }
  const raw = await res.json();
  return mapPartnerFromApi(raw as Record<string, unknown>);
}

/** `POST /partners` — 거래처 빠른 등록 등 */
export async function createPartner(
  payload: PartnerCreatePayload,
  accessToken: string
): Promise<Partner> {
  const body: Record<string, unknown> = {
    ...payload,
    country_code: payload.countryCode,
    defense_market: payload.defenseMarket,
    supplier_segment_code: payload.supplierSegmentCode ?? payload.supplierSegment,
    business_registration_no: payload.businessRegistrationNo,
    contact_person: payload.contactPerson,
    contact_phone: payload.contactPhone,
    contact_email: payload.contactEmail,
  };
  const res = await fetchAuthorized(
    `${API_BASE}/partners`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(body),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "거래처를 등록하지 못했습니다.");
  }
  const raw = await res.json();
  return mapPartnerFromApi(raw as Record<string, unknown>);
}

/** `PATCH /partners/:id` */
export async function updatePartner(
  id: string,
  payload: PartnerUpdatePayload,
  accessToken: string
): Promise<Partner> {
  const res = await fetchAuthorized(
    `${API_BASE}/partners/${id}`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "거래처를 수정하지 못했습니다.");
  }
  const raw = await res.json();
  return mapPartnerFromApi(raw as Record<string, unknown>);
}

/** `DELETE /partners/:id` — 성공 시 204, 본문 없음 */
export async function deletePartner(
  id: string,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/partners/${id}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (res.ok && res.status === 204) return;
  throw await createApiError(res, "거래처를 삭제하지 못했습니다.");
}


export interface CodeItem {
  id: number;
  groupCode: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * `GET /code-groups/:groupCode/codes` — 공통코드 **별칭** 엔드포인트.
 * `commonCode.ts`의 `getCommonCodesByGroup`과 동일한 서비스·응답(그룹별 코드 목록)입니다.
 * 그룹 없음·활성 코드 0건 → `200` + `[]`. 그룹 목록만 필요하면 `getCommonCodeGroups` 등 **표준** `/common-codes/groups` 를 사용하세요.
 * 신규 연동은 표준 경로(`getCommonCodesByGroup`) 권장.
 */
export async function getCodeGroupCodes(
  groupCode: string,
  accessToken: string
): Promise<CodeItem[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/code-groups/${encodeURIComponent(groupCode)}/codes`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "공통코드를 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

