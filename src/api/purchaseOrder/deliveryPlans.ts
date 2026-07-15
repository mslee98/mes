import {
  API_BASE,
  authHeaders,
  jsonHeaders,
  fetchAuthorized,
  createApiError,
  type ListSortOrder,
} from "./http";
import { parsePagedListNumber } from "./orders";
import type {
  Delivery,
  DeliverySerialSnapshotPayload,
} from "./deliveries";

// --- 납품 계획 (delivery_plans) ---

export type DeliveryPlanListTab = "ALL" | "OPEN" | "COMPLETED" | "DELAYED";

export type DeliveryPlanListSortBy =
  | "planNo"
  | "plannedDeliveryDate"
  | "deliveryDate"
  | "createdAt"
  | "unitCount";

/** `GET /api/delivery-plans` 쿼리 */
export interface DeliveryPlanListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  purchaseOrderId?: string;
  partnerId?: string;
  fromMonth?: string;
  toMonth?: string;
  /** DELIVERY_PLAN_STATUS 공통코드 code */
  status?: string;
  tab?: DeliveryPlanListTab;
  sortBy?: DeliveryPlanListSortBy;
  sortOrder?: ListSortOrder;
}

export interface DeliveryPlanListResponse {
  items: DeliveryPlanListItem[];
  total: number;
  page: number;
  pageSize: number;
  sortBy?: DeliveryPlanListSortBy;
  sortOrder?: ListSortOrder;
  serverPaginationApplied?: boolean;
}

/** `GET /api/delivery-plans/tab-counts` — 목록과 동일 필터, tab·페이지·정렬 제외 */
export interface DeliveryPlanTabCountsParams {
  q?: string;
  purchaseOrderId?: string;
  partnerId?: string;
  /** YYYY-MM — fromMonth·toMonth 둘 다 있을 때만 적용 (COALESCE(deliveryDate, plannedDeliveryDate) 연-월) */
  fromMonth?: string;
  toMonth?: string;
}

/** 목록 tab 필드와 1:1 (total === all) */
export interface DeliveryPlanTabCountsResponse {
  all: number;
  open: number;
  completed: number;
  delayed: number;
  total: number;
}

export interface DeliveryPlanListItem {
  id: string;
  planNo?: string | null;
  planSeq?: number | null;
  purchaseOrderId?: string | null;
  title?: string | null;
  plannedDeliveryDate?: string | null;
  deliveryDate?: string | null;
  status?: string | null;
  unitCount?: number;
  createdAt?: string | null;
  summary?: DeliveryPlanSummaryCounts | null;
  order?: {
    orderId?: string | null;
    orderNo?: string | null;
    title?: string | null;
  } | null;
  partner?: {
    id?: string | null;
    name?: string | null;
    countryCode?: string | null;
  } | null;
  deliveryManager?: {
    id?: number | string | null;
    name?: string | null;
  } | null;
}

export interface DeliveryPlanSummaryCounts {
  totalUnitCount?: number;
  readyUnitCount?: number;
  inProgressUnitCount?: number;
  blockedUnitCount?: number;
  deliveredUnitCount?: number;
  undeliveredUnitCount?: number;
}

export interface DeliveryPlanUnitSummary {
  id: string;
  unitNo?: number | null;
  unitCode?: string | null;
  serialNo?: string | null;
  /** 검출기 시리얼 — 납품 계획 상세 API가 내려주면 표시 */
  detectorSerialNo?: string | null;
  detectorElementCode?: string | null;
  wavelengthCode?: string | null;
  detectorId?: number | null;
  serialSnapshot?: DeliverySerialSnapshotPayload | Record<string, unknown> | null;
  productionPlanId?: string | null;
  productionPlanNo?: string | null;
  itemId?: string | null;
  itemName?: string | null;
  purchaseOrderItemId?: number | null;
  currentProcessCode?: string | null;
  currentProcessName?: string | null;
  processStatus?: string | null;
  isDeliveryReady?: boolean;
  isDelivered?: boolean;
  deliveryPlanId?: string | null;
  deliveryPlanNo?: string | null;
}

/** `POST /delivery-plans/:planId/deliver` */
export interface DeliverDeliveryPlanPayload {
  deliveryDate: string;
  remark?: string | null;
}

export interface DeliverPlanSkippedUnit {
  unitId?: string;
  unitCode?: string;
  reason?: string;
}

export interface DeliverDeliveryPlanResponse {
  deliveryPlanId: string;
  delivery: Delivery | null;
  deliveredUnitIds?: string[];
  skippedUnits?: DeliverPlanSkippedUnit[];
  planStatus?: string | null;
  summary?: DeliveryPlanSummaryCounts | null;
}

export interface DeliveryPlanGroup {
  productionPlanId?: string | null;
  productionPlanNo?: string | null;
  productionPlanTitle?: string | null;
  productNameSnapshot?: string | null;
  itemId?: string | null;
  itemName?: string | null;
  purchaseOrderItemId?: number | null;
  units?: DeliveryPlanUnitSummary[];
}

export interface DeliveryPlanDetailResponse {
  id: string;
  planNo?: string | null;
  planSeq?: number | null;
  purchaseOrderId?: string | null;
  title?: string | null;
  plannedDeliveryDate?: string | null;
  deliveryDate?: string | null;
  status?: string | null;
  remark?: string | null;
  deliveryManagerId?: number | null;
  deliveryManager?: {
    id?: string | number | null;
    name?: string | null;
  } | null;
  summary?: DeliveryPlanSummaryCounts | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  order?: {
    orderId?: string | null;
    orderNo?: string | null;
    title?: string | null;
    partnerName?: string | null;
  } | null;
  purchaseOrder?: {
    id?: string | null;
    orderNo?: string | null;
    title?: string | null;
    partnerName?: string | null;
  } | null;
  partner?: {
    id?: string | null;
    code?: string | null;
    name?: string | null;
    countryCode?: string | null;
  } | null;
  groups?: DeliveryPlanGroup[];
}

export interface DeliveryPlanCreatePayload {
  unitIds: string[];
  title?: string | null;
  plannedDeliveryDate?: string | null;
  plannedDate?: string | null;
  deliveryDate?: string | null;
  deliveryManagerId?: number | null;
  remark?: string | null;
}

export interface DeliveryPlanPatchPayload {
  title?: string | null;
  plannedDeliveryDate?: string | null;
  plannedDate?: string | null;
  deliveryDate?: string | null;
  deliveryManagerId?: number | null;
  remark?: string | null;
  status?: string | null;
}

export interface DeliveryPlanAddUnitsPayload {
  unitIds: string[];
}


export async function getDeliveryPlansList(
  accessToken: string,
  params?: DeliveryPlanListParams
): Promise<DeliveryPlanListResponse> {
  const sp = new URLSearchParams();
  const p = params ?? {};
  if (p.tab && p.status?.trim()) {
    throw new Error("tab과 status는 동시에 사용할 수 없습니다.");
  }
  if (p.page != null && p.page > 0) sp.set("page", String(p.page));
  if (p.pageSize != null && p.pageSize > 0) sp.set("pageSize", String(p.pageSize));
  if (p.q?.trim()) sp.set("q", p.q.trim());
  if (p.purchaseOrderId != null && String(p.purchaseOrderId).trim() !== "") {
    sp.set("purchaseOrderId", String(p.purchaseOrderId).trim());
  }
  if (p.partnerId != null && String(p.partnerId).trim() !== "") {
    sp.set("partnerId", String(p.partnerId).trim());
  }
  const fromMonth = String(p.fromMonth ?? "").trim();
  const toMonth = String(p.toMonth ?? "").trim();
  if (fromMonth && toMonth) {
    sp.set("fromMonth", fromMonth);
    sp.set("toMonth", toMonth);
  }
  if (p.tab) sp.set("tab", p.tab);
  if (p.status?.trim()) sp.set("status", p.status.trim());
  if (p.sortBy) sp.set("sortBy", p.sortBy);
  if (p.sortOrder) sp.set("sortOrder", p.sortOrder);
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/delivery-plans${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 계획 목록을 불러오지 못했습니다.");
  }
  const raw = await res.json();
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    const o = raw as Record<string, unknown>;
    const meta =
      o.meta && typeof o.meta === "object"
        ? (o.meta as Record<string, unknown>)
        : null;
    const items = (o.items as DeliveryPlanListItem[]) ?? [];
    const page =
      parsePagedListNumber(meta?.page, o.page) || p.page || 1;
    const pageSize =
      parsePagedListNumber(meta?.pageSize, o.pageSize) ||
      p.pageSize ||
      items.length ||
      20;
    const sortByRaw = meta?.sortBy ?? o.sortBy;
    const sortOrderRaw = meta?.sortOrder ?? o.sortOrder;
    return {
      items,
      total:
        parsePagedListNumber(meta?.total, o.total, o.totalCount) ?? items.length,
      page,
      pageSize,
      sortBy:
        typeof sortByRaw === "string"
          ? (sortByRaw as DeliveryPlanListSortBy)
          : undefined,
      sortOrder:
        typeof sortOrderRaw === "string"
          ? (sortOrderRaw as ListSortOrder)
          : undefined,
      serverPaginationApplied: true,
    };
  }
  const arr = Array.isArray(raw) ? raw : [];
  return {
    items: arr as DeliveryPlanListItem[],
    total: arr.length,
    page: 1,
    pageSize: arr.length || 20,
    serverPaginationApplied: false,
  };
}

/** `GET /api/delivery-plans/tab-counts` */
export async function getDeliveryPlansTabCounts(
  accessToken: string,
  params?: DeliveryPlanTabCountsParams
): Promise<DeliveryPlanTabCountsResponse> {
  const sp = new URLSearchParams();
  const p = params ?? {};
  if (p.q?.trim()) sp.set("q", p.q.trim());
  if (p.purchaseOrderId != null && String(p.purchaseOrderId).trim() !== "") {
    sp.set("purchaseOrderId", String(p.purchaseOrderId).trim());
  }
  if (p.partnerId != null && String(p.partnerId).trim() !== "") {
    sp.set("partnerId", String(p.partnerId).trim());
  }
  const fromMonth = String(p.fromMonth ?? "").trim();
  const toMonth = String(p.toMonth ?? "").trim();
  if (fromMonth && toMonth) {
    sp.set("fromMonth", fromMonth);
    sp.set("toMonth", toMonth);
  }
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/delivery-plans/tab-counts${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 계획 탭 건수를 불러오지 못했습니다.");
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    all: Number(raw.all) || 0,
    open: Number(raw.open) || 0,
    completed: Number(raw.completed) || 0,
    delayed: Number(raw.delayed) || 0,
    total: Number(raw.total) || Number(raw.all) || 0,
  };
}

/** `GET /purchase-orders/:id/delivery-plans` */
export async function getPurchaseOrderDeliveryPlans(
  purchaseOrderId: string,
  accessToken: string
): Promise<DeliveryPlanListItem[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${encodeURIComponent(purchaseOrderId)}/delivery-plans`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 계획 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

/** `POST /purchase-orders/:id/delivery-plans` */
export async function createDeliveryPlan(
  purchaseOrderId: string,
  payload: DeliveryPlanCreatePayload,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${encodeURIComponent(purchaseOrderId)}/delivery-plans`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 계획 등록에 실패했습니다.");
  }
  return res.json();
}

/** `GET /delivery-plans/:planId` */
export async function getDeliveryPlan(
  planId: string,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/delivery-plans/${encodeURIComponent(planId)}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 계획을 불러오지 못했습니다.");
  }
  return res.json();
}

/** `PATCH /delivery-plans/:planId` */
export async function patchDeliveryPlan(
  planId: string,
  payload: DeliveryPlanPatchPayload,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/delivery-plans/${encodeURIComponent(planId)}`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 계획 수정에 실패했습니다.");
  }
  return res.json();
}

/** `POST /delivery-plans/:planId/units` */
export async function addUnitsToDeliveryPlan(
  planId: string,
  payload: DeliveryPlanAddUnitsPayload,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/delivery-plans/${encodeURIComponent(planId)}/units`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 계획에 Unit을 추가하지 못했습니다.");
  }
  return res.json();
}

/** `DELETE /delivery-plans/:planId/units/:unitId` */
export async function removeUnitFromDeliveryPlan(
  planId: string,
  unitId: string,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/delivery-plans/${encodeURIComponent(planId)}/units/${encodeURIComponent(unitId)}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 계획에서 Unit을 제거하지 못했습니다.");
  }
  return res.json();
}

/**
 * `POST /delivery-plans/:planId/deliver`
 * 납품 대기(isDeliveryReady) Unit만 실납품, 나머지 skip 후 plan COMPLETED.
 */
export async function deliverDeliveryPlan(
  planId: string,
  payload: DeliverDeliveryPlanPayload,
  accessToken: string
): Promise<DeliverDeliveryPlanResponse> {
  const body: DeliverDeliveryPlanPayload = {
    deliveryDate: payload.deliveryDate.trim(),
    ...(payload.remark?.trim() ? { remark: payload.remark.trim() } : {}),
  };
  const res = await fetchAuthorized(
    `${API_BASE}/delivery-plans/${encodeURIComponent(planId)}/deliver`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(body),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 등록에 실패했습니다.");
  }
  return res.json();
}

