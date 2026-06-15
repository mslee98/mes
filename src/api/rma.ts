import { createApiError } from "../lib/api/apiError";
import { API_BASE } from "./apiBase";
import { fetchAuthorized } from "./fetchAuthorized";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

function jsonHeaders(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(accessToken),
  };
}

export type RmaStatus =
  | "RECEIVED"
  | "INSPECTING"
  | "REPAIRING"
  | "RETESTING"
  | "COMPLETED"
  | "RETURN_WAITING"
  | "RETURNED"
  | "CLOSED"
  | "CANCELED";

export type RmaListUiTab =
  | "ALL"
  | "RECEIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "RETURN"
  | "CLOSED";

export type RmaListSortBy = "receivedAt" | "updatedAt" | "rmaNo";

/** 목록·tab-counts 공통 필터 */
export interface RmaListFilterParams {
  q?: string;
  partnerId?: string;
  rmaNo?: string;
  productSerialNo?: string;
  unitCode?: string;
  receivedFrom?: string;
  receivedTo?: string;
  productionPlanUnitId?: string;
}

export interface RmaListParams extends RmaListFilterParams {
  /** UI 탭 — `status`/`statuses[]`와 동시 사용 금지(서버 400) */
  tab?: RmaListUiTab;
  status?: RmaStatus;
  statuses?: RmaStatus[];
  sortBy?: RmaListSortBy;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface RmaListItem {
  id: number;
  rmaNo: string;
  status: RmaStatus;
  productionPlanUnitId: string;
  unitCode?: string | null;
  partnerName?: string | null;
  productSerialNoSnapshot?: string | null;
  symptomCode?: string | null;
  returnRequiredYn?: boolean | null;
  returnStatus?: string | null;
  assigneeName?: string | null;
  receivedAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}

export interface RmaDetail extends RmaListItem {
  requestContent?: string | null;
  actionRecords?: RmaActionRecord[];
  componentChanges?: RmaComponentChange[];
  statusHistories?: RmaStatusHistory[];
  [key: string]: unknown;
}

export interface RmaListResponse {
  items: RmaListItem[];
  page: number;
  pageSize: number;
  total: number;
  meta?: {
    tab?: RmaListUiTab;
    sortBy?: RmaListSortBy | string;
    sortOrder?: "asc" | "desc" | string;
  };
}

export interface SearchRmaTargetUnitParams {
  unitCode?: string;
  productSerialNo?: string;
  engineSerialNo?: string;
  iddcaSerialNo?: string;
  lotNo?: string;
  partnerId?: string;
  productId?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchRmaTargetUnitItem {
  productionPlanUnitId: string;
  unitCode?: string | null;
  lotNo?: string | null;
  productSerialNo?: string | null;
  engineSerialNo?: string | null;
  detectorSerialNo?: string | null;
  productName?: string | null;
  itemName?: string | null;
  unitStatus?: string | null;
  location?: string | null;
  remark?: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
  isDelivered?: boolean;
  deliveredAt?: string | null;
  rmaCount?: number | null;
  [key: string]: unknown;
}

export interface SearchRmaTargetUnitResponse {
  items: SearchRmaTargetUnitItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateRmaRequestPayload {
  productionPlanUnitId: string;
  requestContent: string;
  receivedAt?: string;
  rmaCategoryCode?: string;
  asTypeCode?: string;
  symptomCode?: string;
  returnRequiredYn?: boolean;
  returnType?: string;
  returnExpectedAt?: string;
}

export interface UpdateRmaStatusPayload {
  status: RmaStatus;
  reason?: string;
}

export interface CreateRmaActionPayload {
  actionTypeCode: string;
  actionContent: string;
  actionAt: string;
  resultStatus?: string;
  beforeValue?: string;
  afterValue?: string;
  workerId?: number;
  inspectorId?: number;
  remark?: string;
}

export interface CreateRmaComponentChangePayload {
  componentTypeCode: string;
  changedAt: string;
  rmaActionRecordId?: number;
  componentName?: string;
  oldSerialNo?: string;
  newSerialNo?: string;
  changeReason?: string;
}

export interface UpdateRmaReturnPayload {
  returnRequiredYn?: boolean;
  returnType?: string;
  returnExpectedAt?: string;
  returnShippedAt?: string;
  returnStatus?: string;
  carrier?: string;
  trackingNo?: string;
  returnRemark?: string;
}

export interface CloseRmaPayload {
  finalActionSummary?: string;
  reason?: string;
}

export interface RmaActionRecord {
  id: number;
  rmaRequestId?: number;
  actionTypeCode?: string | null;
  actionContent?: string | null;
  actionAt?: string | null;
  resultStatus?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  workerId?: number | null;
  inspectorId?: number | null;
  remark?: string | null;
  [key: string]: unknown;
}

export interface RmaComponentChange {
  id: number;
  rmaRequestId?: number;
  componentTypeCode?: string | null;
  changedAt?: string | null;
  rmaActionRecordId?: number | null;
  componentName?: string | null;
  oldSerialNo?: string | null;
  newSerialNo?: string | null;
  changeReason?: string | null;
  [key: string]: unknown;
}

export interface RmaStatusHistory {
  id: number;
  rmaRequestId?: number;
  status?: RmaStatus | null;
  reason?: string | null;
  changedAt?: string | null;
  [key: string]: unknown;
}

export interface RmaMutationResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export type RmaTabCountsParams = RmaListFilterParams;

export interface RmaTabCountsResponse {
  all: number;
  received: number;
  inProgress: number;
  completed: number;
  return: number;
  closed: number;
  total: number;
  byStatus?: Partial<Record<RmaStatus, number>>;
}

function strOpt(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function appendRmaListFilterParams(
  sp: URLSearchParams,
  params: RmaListFilterParams
) {
  const productionPlanUnitId = strOpt(params.productionPlanUnitId);
  const partnerId = strOpt(params.partnerId);
  const q = strOpt(params.q);
  const rmaNo = strOpt(params.rmaNo);
  const productSerialNo = strOpt(params.productSerialNo);
  const unitCode = strOpt(params.unitCode);
  const receivedFrom = strOpt(params.receivedFrom);
  const receivedTo = strOpt(params.receivedTo);
  if (productionPlanUnitId) sp.set("productionPlanUnitId", productionPlanUnitId);
  if (partnerId) sp.set("partnerId", partnerId);
  if (q) sp.set("q", q);
  if (rmaNo) sp.set("rmaNo", rmaNo);
  if (productSerialNo) sp.set("productSerialNo", productSerialNo);
  if (unitCode) sp.set("unitCode", unitCode);
  if (receivedFrom) sp.set("receivedFrom", receivedFrom);
  if (receivedTo) sp.set("receivedTo", receivedTo);
}

function appendRmaListParams(sp: URLSearchParams, params: RmaListParams) {
  appendRmaListFilterParams(sp, params);

  const tab = strOpt(params.tab) as RmaListUiTab | undefined;
  const status = strOpt(params.status);
  const statuses = Array.isArray(params.statuses)
    ? params.statuses
        .map((item) => strOpt(item))
        .filter((item): item is RmaStatus => Boolean(item))
    : [];

  if (tab) {
    sp.set("tab", tab);
  } else {
    if (status) sp.set("status", status);
    for (const statusItem of statuses) {
      sp.append("statuses", statusItem);
    }
  }

  const sortBy = strOpt(params.sortBy);
  const sortOrder = strOpt(params.sortOrder);
  if (sortBy) sp.set("sortBy", sortBy);
  if (sortOrder === "asc" || sortOrder === "desc") sp.set("sortOrder", sortOrder);

  if (params.page != null && params.page > 0) sp.set("page", String(params.page));
  if (params.pageSize != null && params.pageSize > 0) {
    sp.set("pageSize", String(params.pageSize));
  }
}

export async function getRmaRequests(
  accessToken: string,
  params?: RmaListParams
): Promise<RmaListResponse> {
  const p = params ?? {};
  const sp = new URLSearchParams();
  appendRmaListParams(sp, p);

  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 목록을 불러오지 못했습니다.");
  }

  const raw = (await res.json()) as Partial<RmaListResponse> & {
    meta?: RmaListResponse["meta"];
  };
  return {
    items: Array.isArray(raw.items) ? (raw.items as RmaListItem[]) : [],
    page: Number(raw.page) || p.page || 1,
    pageSize: Number(raw.pageSize) || p.pageSize || 20,
    total: Number(raw.total) || 0,
    meta: raw.meta,
  };
}

export async function searchProductionPlanUnitsForRma(
  accessToken: string,
  params?: SearchRmaTargetUnitParams
): Promise<SearchRmaTargetUnitResponse> {
  const p = params ?? {};
  const sp = new URLSearchParams();
  const unitCode = strOpt(p.unitCode);
  const productSerialNo = strOpt(p.productSerialNo);
  const engineSerialNo = strOpt(p.engineSerialNo);
  const iddcaSerialNo = strOpt(p.iddcaSerialNo);
  const lotNo = strOpt(p.lotNo);
  const partnerId = strOpt(p.partnerId);
  const productId = strOpt(p.productId);
  if (unitCode) sp.set("unitCode", unitCode);
  if (productSerialNo) sp.set("productSerialNo", productSerialNo);
  if (engineSerialNo) sp.set("engineSerialNo", engineSerialNo);
  if (iddcaSerialNo) sp.set("iddcaSerialNo", iddcaSerialNo);
  if (lotNo) sp.set("lotNo", lotNo);
  if (partnerId) sp.set("partnerId", partnerId);
  if (productId) sp.set("productId", productId);
  if (p.page != null && p.page > 0) sp.set("page", String(p.page));
  if (p.pageSize != null && p.pageSize > 0) sp.set("pageSize", String(p.pageSize));

  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/search-for-rma${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 접수 대상 유닛을 불러오지 못했습니다.");
  }

  const raw = (await res.json()) as Partial<SearchRmaTargetUnitResponse>;
  return {
    items: Array.isArray(raw.items) ? (raw.items as SearchRmaTargetUnitItem[]) : [],
    page: Number(raw.page) || p.page || 1,
    pageSize: Number(raw.pageSize) || p.pageSize || 20,
    total: Number(raw.total) || 0,
  };
}

export async function getRmaRequestById(
  accessToken: string,
  rmaRequestId: number
): Promise<RmaDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests/${rmaRequestId}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 상세를 불러오지 못했습니다.");
  }
  return (await res.json()) as RmaDetail;
}

export async function createRmaRequest(
  accessToken: string,
  payload: CreateRmaRequestPayload
): Promise<RmaDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 접수를 생성하지 못했습니다.");
  }
  return (await res.json()) as RmaDetail;
}

export async function updateRmaRequestStatus(
  accessToken: string,
  rmaRequestId: number,
  payload: UpdateRmaStatusPayload
): Promise<RmaMutationResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests/${rmaRequestId}/status`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 상태를 변경하지 못했습니다.");
  }
  return (await res.json()) as RmaMutationResponse;
}

export async function createRmaActionRecord(
  accessToken: string,
  rmaRequestId: number,
  payload: CreateRmaActionPayload
): Promise<RmaActionRecord> {
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests/${rmaRequestId}/actions`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 조치 이력을 등록하지 못했습니다.");
  }
  return (await res.json()) as RmaActionRecord;
}

export async function createRmaComponentChange(
  accessToken: string,
  rmaRequestId: number,
  payload: CreateRmaComponentChangePayload
): Promise<RmaComponentChange> {
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests/${rmaRequestId}/component-changes`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 구성품 교체 이력을 등록하지 못했습니다.");
  }
  return (await res.json()) as RmaComponentChange;
}

export async function updateRmaReturnInfo(
  accessToken: string,
  rmaRequestId: number,
  payload: UpdateRmaReturnPayload
): Promise<RmaMutationResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests/${rmaRequestId}/return`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 반송/재출하 정보를 수정하지 못했습니다.");
  }
  return (await res.json()) as RmaMutationResponse;
}

export async function closeRmaRequest(
  accessToken: string,
  rmaRequestId: number,
  payload?: CloseRmaPayload
): Promise<RmaMutationResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests/${rmaRequestId}/close`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload ?? {}),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 종료 처리를 하지 못했습니다.");
  }
  return (await res.json()) as RmaMutationResponse;
}

export async function getRmaTabCounts(
  accessToken: string,
  params?: RmaTabCountsParams
): Promise<RmaTabCountsResponse> {
  const sp = new URLSearchParams();
  appendRmaListFilterParams(sp, params ?? {});

  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/rma-requests/tab-counts${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "RMA 탭 건수를 불러오지 못했습니다.");
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const byStatusRaw = raw.byStatus;
  const byStatus =
    byStatusRaw && typeof byStatusRaw === "object" && !Array.isArray(byStatusRaw)
      ? (byStatusRaw as Partial<Record<RmaStatus, number>>)
      : undefined;

  return {
    all: Number(raw.all) || 0,
    received: Number(raw.received) || 0,
    inProgress: Number(raw.inProgress) || 0,
    completed: Number(raw.completed) || 0,
    return: Number(raw.return) || 0,
    closed: Number(raw.closed) || 0,
    total: Number(raw.total) || Number(raw.all) || 0,
    byStatus,
  };
}
