import {
  API_BASE,
  authHeaders,
  jsonHeaders,
  fetchAuthorized,
  createApiError,
  type ListSortOrder,
} from "./http";
import type { Partner, PartnerSummary } from "./partners";

export type DeliveryLineType = "PRODUCT" | "LENS";

export interface DeliveryCreateLineSerialPayload {
  serialNo: string;
  detectorElementCode: string;
  wavelengthCode: string;
  detectorId?: number | null;
  serialSnapshot?: Record<string, unknown> | null;
}

/** POST /purchase-orders/:id/deliveries — 제품/렌즈 혼합 입력 */
export interface DeliveryCreateLinePayload {
  lineType?: DeliveryLineType;
  lineId?: number;
  orderItemId?: number;
  orderLensId?: number;
  quantity: number;
  sequenceKey?: string;
  serials?: DeliveryCreateLineSerialPayload[];
}

/** POST /purchase-orders/:id/deliveries */
export interface DeliveryCreatePayload {
  deliveryDate: string;
  /** 필수, 최소 1건. 동일 line(제품/렌즈) 중복 불가 */
  lines: DeliveryCreateLinePayload[];
  title?: string | null;
  plannedDeliveryDate?: string | null;
  remark?: string | null;
  deliveryManagerId?: number | null;
}

export interface DeliverySerialSnapshotPayload {
  phase?: string;
  yearCode?: string;
  year?: number;
}

export interface DeliverySerialTemplatePayload {
  templateCode: string;
  mappingValues?: Record<string, string>;
  manualSlotValues?: Record<number, string>;
}

export interface CreateDeliverySerialLinePayload {
  deliveryItemId: number;
  quantity: number;
  detectorElementCode: string;
  wavelengthCode: string;
  detectorTypeCode?: string;
  serialPrefix?: string;
  sequenceKey?: string;
  detectorId?: number | null;
  lensId?: string | null;
  serialTemplate?: DeliverySerialTemplatePayload;
  serialSnapshot?: DeliverySerialSnapshotPayload | null;
}

export interface CreateDeliverySerialsPayload {
  lines: CreateDeliverySerialLinePayload[];
}

export interface DeliverySerial {
  id: number;
  deliveryId?: number;
  deliveryItemId?: number;
  serialNo: string;
  detectorElementCode: string;
  wavelengthCode: string;
  detectorTypeCode: string;
  serialPrefix: string;
  sequenceNo: number;
  sequenceText: string;
  status: string;
  serialSnapshot?: DeliverySerialSnapshotPayload | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeliverySerialsResponse {
  deliveryId: number;
  createdCount: number;
  items: Array<{
    deliveryItemId: number;
    serials: DeliverySerial[];
  }>;
}

export interface PurchaseOrderSerialMaxSequence {
  sequenceKey: string;
  maxSequence: number;
  nextSequence: number;
  nextSequenceText: string;
}

/** 레거시·다른 엔드포인트 호환용 (신규 POST에는 `DeliveryCreateLinePayload` 사용) */
export interface DeliveryItemPayload {
  purchaseOrderItemId: number;
  itemId: number;
  deliveryQty: number;
  lotNo?: string | null;
  remark?: string | null;
}

export interface DeliveryItem {
  /** 일부 응답에서 발주 품목 행 id 로 내려올 수 있음 */
  orderItemId?: number;
  purchaseOrderItemId?: number;
  itemId?: number;
  itemName?: string;
  quantity?: number;
  deliveryQty?: number;
  lotNo?: string | null;
  remark?: string | null;
}

/** GET 납품 응답의 품목별 행 (`deliveryItems` 등) */
export interface DeliveryRecordLine {
  id?: number;
  /** `POST .../deliveries` 응답 — `deliveryItems[].id`와 동일, linkUnits URL용 */
  deliveryItemId?: number;
  deliveryId?: number;
  lineType?: DeliveryLineType;
  lineId?: number;
  orderItemId?: number;
  orderLensId?: number;
  purchaseOrderItemId?: number;
  /** decimal 문자열일 수 있음 */
  quantity?: number | string;
  deliveryQty?: number | string;
  itemId?: number;
  itemName?: string;
  lineName?: string;
  /** 관계 로드 시 중첩 발주 라인 */
  orderItem?: unknown;
  orderLens?: unknown;
}

/** GET `/deliveries`·관계 로드 시 포함되는 발주 헤더 요약 */
export interface DeliveryOrderRef {
  id?: number;
  orderNo?: string;
  title?: string;
  partner?: Partner;
  partnerSummary?: PartnerSummary | null;
  partnerId?: string;
}

/**
 * 납품 상세 `GET /deliveries/:id` 등에서 `order` 관계 풀 로드 시 함께 올 수 있는 필드.
 * (목록·경량 응답에서는 대부분 비어 있거나 생략될 수 있음.)
 */
export interface DeliveryOrderDetailFields {
  orderType?: string | null;
  requesterName?: string | null;
  requestDepartment?: string | null;
  requesterDepartment?: string | null;
  orderedAt?: string | null;
  dueDate?: string | null;
  requestDeliveryDate?: string | null;
  currencyCode?: string | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
  supplyAmount?: number | null;
  totalAmount?: number | null;
  status?: string | null;
  memo?: string | null;
  /** 발주 전체 품목(납품과 무관하게 전 라인) */
  orderItems?: unknown[];
}

export type DeliveryOrderWithDetail = DeliveryOrderRef & DeliveryOrderDetailFields;

/** 납품 응답에 실리는 사용자 요약 — UI에는 `name` 등만 사용(비밀번호 등 직렬화 시 노출 금지) */
export interface DeliveryActorUserRef {
  id?: number;
  name?: string;
  employeeNo?: string | number;
  email?: string;
  phoneNumber?: string;
}

export interface Delivery {
  id: number;
  deliveryNo?: string;
  title?: string | null;
  partnerId?: string;
  partner?: Partner;
  orderId?: string;
  /** 발주 PK — 응답에 따라 `order.id` 또는 최상위 필드 */
  purchaseOrderId?: string;
  /** 납품 계획 단위 실납품 시 연결 */
  deliveryPlanId?: string | null;
  order?: DeliveryOrderWithDetail;
  deliveryDate: string;
  plannedDeliveryDate?: string | null;
  status?: string;
  remark?: string | null;
  deliveryManagerId?: number | null;
  deliveryManagerDepartment?: string | null;
  deliveryManager?: DeliveryActorUserRef | null;
  createdById?: number | null;
  updatedById?: number | null;
  createdBy?: DeliveryActorUserRef | null;
  updatedBy?: DeliveryActorUserRef | null;
  updateReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** 제품/렌즈 통합 라인 (신규 스펙) */
  lines?: DeliveryRecordLine[];
  deliveryItems?: DeliveryRecordLine[];
  /** 레거시 매핑 */
  items?: DeliveryItem[];
}

export type DeliveryListSortBy =
  | "deliveryNo"
  | "orderNo"
  | "partnerName"
  | "deliveryDate"
  | "status"
  | "createdAt";

export type DeliveryListTab =
  | "ALL"
  | "PENDING"
  | "READY"
  | "COMPLETED"
  | "DELAYED";

/** GET `/api/deliveries` 쿼리 */
export interface DeliveryListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  partnerId?: string;
  orderId?: string;
  tab?: DeliveryListTab;
  /** `DELIVERY_STATUS` 의 code */
  status?: string;
  sortBy?: DeliveryListSortBy;
  sortOrder?: ListSortOrder;
}

export interface DeliveryListResponse {
  items: Delivery[];
  total: number;
  page: number;
  pageSize: number;
  sortBy?: DeliveryListSortBy;
  sortOrder?: ListSortOrder;
  serverPaginationApplied?: boolean;
}

export interface DeliveryTabCountsParams {
  q?: string;
  partnerId?: string;
  orderId?: string;
}

export interface DeliveryTabCountsResponse {
  all: number;
  pending: number;
  ready: number;
  completed: number;
  delayed: number;
  total: number;
}

/**
 * 기등록 납품 목록에서 품목(order_items.id)별 누적 납품 수량 합산.
 * `deliveryItems`·`items` 모두 지원 (quantity / deliveryQty).
 */
export function aggregateDeliveredQtyByOrderItemId(
  deliveries: Delivery[]
): Map<number, number> {
  const m = new Map<number, number>();
  for (const d of deliveries) {
    const raw = d.lines ?? d.deliveryItems ?? d.items ?? [];
    for (const row of raw) {
      const rec = row as DeliveryRecordLine & DeliveryItem;
      const lineType = String(rec.lineType ?? "").trim().toUpperCase();
      if (lineType === "LENS") continue;
      const oidRaw =
        rec.orderItemId ?? rec.purchaseOrderItemId ?? undefined;
      const oid =
        typeof oidRaw === "number"
          ? oidRaw
          : oidRaw != null
            ? Number(oidRaw)
            : NaN;
      const qRaw = rec.quantity ?? rec.deliveryQty;
      const q =
        typeof qRaw === "number"
          ? qRaw
          : qRaw != null
            ? Number(qRaw)
            : NaN;
      if (!Number.isFinite(oid) || !Number.isFinite(q)) continue;
      m.set(oid, (m.get(oid) ?? 0) + q);
    }
  }
  return m;
}

// --- 납품 ---

/** `POST /purchase-orders/:id/deliveries` — 납품 등록 JSON */
export async function createDelivery(
  purchaseOrderId: string,
  payload: DeliveryCreatePayload,
  accessToken: string
): Promise<Delivery> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/deliveries`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품을 등록하지 못했습니다.");
  }
  return res.json();
}

/** `GET /api/deliveries` — 납품 전역 목록 (`delivery.read`) */
export async function getDeliveriesList(
  accessToken: string,
  params?: DeliveryListParams
): Promise<DeliveryListResponse> {
  const sp = new URLSearchParams();
  const p = params ?? {};
  if (p.tab && p.status?.trim()) {
    throw new Error("tab과 status는 동시에 사용할 수 없습니다.");
  }
  if (p.page != null && p.page > 0) sp.set("page", String(p.page));
  if (p.pageSize != null && p.pageSize > 0) sp.set("pageSize", String(p.pageSize));
  if (p.q?.trim()) sp.set("q", p.q.trim());
  if (p.partnerId != null && String(p.partnerId).trim() !== "") {
    sp.set("partnerId", String(p.partnerId).trim());
  }
  if (p.orderId != null && String(p.orderId).trim() !== "") {
    sp.set("orderId", String(p.orderId).trim());
  }
  if (p.tab) sp.set("tab", p.tab);
  if (p.status?.trim()) sp.set("status", p.status.trim());
  if (p.sortBy) sp.set("sortBy", p.sortBy);
  if (p.sortOrder) sp.set("sortOrder", p.sortOrder);
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/deliveries${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 목록을 불러오지 못했습니다.");
  }
  const raw = await res.json();
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    const o = raw as Record<string, unknown>;
    return {
      items: (o.items as Delivery[]) ?? [],
      total: Number(o.total) || 0,
      page: Number(o.page) || p.page || 1,
      pageSize: Number(o.pageSize) || p.pageSize || 20,
      sortBy:
        typeof o.sortBy === "string"
          ? (o.sortBy as DeliveryListSortBy)
          : undefined,
      sortOrder:
        typeof o.sortOrder === "string"
          ? (o.sortOrder as ListSortOrder)
          : undefined,
      serverPaginationApplied: true,
    };
  }
  const arr = Array.isArray(raw) ? raw : [];
  return {
    items: arr as Delivery[],
    total: arr.length,
    page: 1,
    pageSize: arr.length || 20,
    serverPaginationApplied: false,
  };
}

/** `GET /api/deliveries/tab-counts` */
export async function getDeliveriesTabCounts(
  accessToken: string,
  params?: DeliveryTabCountsParams
): Promise<DeliveryTabCountsResponse> {
  const sp = new URLSearchParams();
  const p = params ?? {};
  if (p.q?.trim()) sp.set("q", p.q.trim());
  if (p.partnerId != null && String(p.partnerId).trim() !== "") {
    sp.set("partnerId", String(p.partnerId).trim());
  }
  if (p.orderId != null && String(p.orderId).trim() !== "") {
    sp.set("orderId", String(p.orderId).trim());
  }
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/deliveries/tab-counts${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 탭 건수를 불러오지 못했습니다.");
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    all: Number(raw.all) || 0,
    pending: Number(raw.pending) || 0,
    ready: Number(raw.ready) || 0,
    completed: Number(raw.completed) || 0,
    delayed: Number(raw.delayed) || 0,
    total: Number(raw.total) || Number(raw.all) || 0,
  };
}

/** `POST /purchase-orders/:id/deliveries/:deliveryId/serials` */
export async function createDeliverySerials(
  purchaseOrderId: string,
  deliveryId: number,
  payload: CreateDeliverySerialsPayload,
  accessToken: string
): Promise<CreateDeliverySerialsResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/deliveries/${deliveryId}/serials`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 시리얼을 등록하지 못했습니다.");
  }
  return res.json();
}

/** `GET /purchase-orders/:id/deliveries/:deliveryId/serials` */
export async function getDeliverySerials(
  purchaseOrderId: string,
  deliveryId: number,
  accessToken: string
): Promise<DeliverySerial[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/deliveries/${deliveryId}/serials`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 시리얼 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? data?.product_serials ?? [];
}

/** `GET /purchase-orders/:id/serials/max-sequence?sequenceKey=...` */
export async function getPurchaseOrderSerialMaxSequence(
  purchaseOrderId: string,
  sequenceKey: string,
  accessToken: string
): Promise<PurchaseOrderSerialMaxSequence> {
  const key = String(sequenceKey ?? "").trim();
  if (!key) {
    return {
      sequenceKey: "",
      maxSequence: 0,
      nextSequence: 1,
      nextSequenceText: "0001",
    };
  }
  const q = new URLSearchParams();
  q.set("sequenceKey", key);
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/serials/max-sequence?${q.toString()}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "시리얼 최대 시퀀스를 조회하지 못했습니다.");
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const maxSequenceRaw = Number(raw.maxSequence);
  const nextSequenceRaw = Number(raw.nextSequence);
  const maxSequence =
    Number.isFinite(maxSequenceRaw) && maxSequenceRaw >= 0 ? maxSequenceRaw : 0;
  const nextSequence =
    Number.isFinite(nextSequenceRaw) && nextSequenceRaw > 0
      ? nextSequenceRaw
      : maxSequence + 1;
  const nextSequenceTextRaw =
    typeof raw.nextSequenceText === "string" ? raw.nextSequenceText.trim() : "";
  return {
    sequenceKey:
      typeof raw.sequenceKey === "string" && raw.sequenceKey.trim() !== ""
        ? raw.sequenceKey.trim()
        : key,
    maxSequence,
    nextSequence,
    nextSequenceText: nextSequenceTextRaw || String(nextSequence).padStart(4, "0"),
  };
}
