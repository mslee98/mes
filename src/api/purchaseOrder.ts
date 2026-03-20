import { createApiError } from "../lib/apiError";
import { API_BASE } from "./apiBase";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

function jsonHeaders(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(accessToken),
  };
}

// --- 타입 정의 (API 문서 기준) ---

export interface Partner {
  id: number;
  code: string;
  name: string;
  type?: string;
  contact?: string;
  address?: string;
  isActive?: boolean;
}

export interface PartnerCreatePayload {
  code: string;
  name: string;
  type?: string | null;
  contact?: string | null;
  address?: string | null;
}

export interface Item {
  id: number;
  code: string;
  name: string;
  spec?: string;
  unit?: string;
  type?: string;
  isActive?: boolean;
}

export interface PurchaseOrderItemPayload {
  itemId: number;
  qty: number;
  unitPrice: number;
  /** 공통코드 UNIT (예: EA, BOX) */
  unit?: string | null;
  currencyCode?: string | null;
  requestDeliveryDate?: string | null;
  remark?: string | null;
}

export interface PurchaseOrderLinePatchPayload {
  itemId?: number;
  qty?: number;
  quantity?: number;
  unit?: string | null;
  quantityUnitCode?: string | null;
  unitPrice?: number;
  currencyCode?: string | null;
  requestDeliveryDate?: string | null;
  requestedDueDate?: string | null;
  remark?: string | null;
  note?: string | null;
}

export interface PurchaseOrderCreatePayload {
  title: string;
  partnerId: number;
  orderDate: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  requestDeliveryDate?: string | null;
  /** 발주 요청 부서(사용자/내부 부서) */
  requesterDepartment?: string | null;
  /** 발주 담당자명 */
  requesterName?: string | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
  /** 예: GENERAL */
  orderType?: string | null;
  /** 예: NORMAL */
  priority?: string | null;
  memo?: string | null;
  /** 미입력 시 서버 기본값(예: RECEIVED)과 맞출 때 명시 */
  status?: string | null;
  /** 공급가액(부가세 제외) — 프론트 계산·선택 */
  supplyAmount?: number | null;
  /** 부가세 포함 총액 — 프론트 계산·선택 */
  totalAmountVatIncluded?: number | null;
  items: PurchaseOrderItemPayload[];
}

export interface PurchaseOrderUpdatePayload {
  title?: string;
  partnerId?: number;
  orderDate?: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  requestDeliveryDate?: string | null;
  requesterDepartment?: string | null;
  requesterName?: string | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
  /** 공통코드 `PURCHASE_ORDER_TYPE`의 code */
  orderType?: string | null;
  status?: string | null;
  /** 상태 변경 시 이력 코멘트 */
  statusChangeComment?: string | null;
  supplyAmount?: number | null;
  totalAmountVatIncluded?: number | null;
  /** 수정 시 품목 라인 전체 갱신 */
  items?: PurchaseOrderItemPayload[];
}

export interface PurchaseOrderListItem {
  id: number;
  orderNo: string;
  title: string;
  partnerId: number;
  partner?: Partner;
  orderDate: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  orderStatus?: string;
  approvalStatus?: string;
  progressStatus?: string;
  totalQty?: number;
  totalAmount?: number;
  createdAt?: string;
}

export interface PurchaseOrderItem {
  id: number;
  itemId: number;
  item?: Item;
  itemName?: string;
  spec?: string;
  unit?: string;
  qty: number;
  unitPrice: number;
  amount?: number;
  currencyCode?: string | null;
  deliveredQty?: number;
  requestDeliveryDate?: string | null;
  remark?: string | null;
}

export interface PurchaseOrderStatusHistoryEntry {
  id: number;
  orderId?: number;
  fromStatus?: string | null;
  toStatus?: string | null;
  changedById?: number;
  changedBy?: { id?: number; name?: string; employeeNo?: number; email?: string };
  changedAt?: string;
  comment?: string | null;
}

export interface PurchaseOrderDetail extends PurchaseOrderListItem {
  requestDeliveryDate?: string | null;
  requesterDepartment?: string | null;
  requesterName?: string | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
  createdBy?: {
    id?: number;
    name?: string;
    employeeNo?: number;
    email?: string;
  };
  orderType?: string | null;
  priority?: string | null;
  memo?: string | null;
  /** API 원본 status (목록의 orderStatus와 동일 의미로 매핑됨) */
  status?: string | null;
  statusHistories?: PurchaseOrderStatusHistoryEntry[];
  attachments?: unknown[];
  /** GET /purchase-orders/:id 응답의 품목 라인 (item 관계 포함) */
  orderItems?: PurchaseOrderItem[];
  /** 레거시·내부 호환용 — 매퍼에서 orderItems와 동일 배열로 채움 */
  items?: PurchaseOrderItem[];
  /** 제품 공급가액(부가세 제외) */
  supplyAmount?: number | null;
  /** 부가세 포함 합계 */
  totalAmountVatIncluded?: number | null;
}

export interface PurchaseOrderFile {
  id: number;
  purchaseOrderId: number;
  fileName: string;
  filePath: string;
  fileType?: string;
  fileSize?: number;
  uploadedById?: number;
  uploadedAt?: string;
}

export interface DeliveryItemPayload {
  purchaseOrderItemId: number;
  itemId: number;
  deliveryQty: number;
  lotNo?: string | null;
  remark?: string | null;
}

export interface DeliveryCreatePayload {
  deliveryDate: string;
  remark?: string | null;
  items: DeliveryItemPayload[];
}

export interface DeliveryItem {
  purchaseOrderItemId?: number;
  itemId?: number;
  itemName?: string;
  deliveryQty?: number;
  lotNo?: string | null;
  remark?: string | null;
}

export interface Delivery {
  id: number;
  deliveryNo?: string;
  partnerId?: number;
  partner?: Partner;
  deliveryDate: string;
  status?: string;
  remark?: string | null;
  items?: DeliveryItem[];
}

// --- 목록/상세/CRUD ---

export interface PurchaseOrderListParams {
  partnerId?: number;
  orderStatus?: string;
  approvalStatus?: string;
}

type ApiOrderDetailRaw = PurchaseOrderDetail & {
  requester_department?: string | null;
  requester_name?: string | null;
  requestDepartment?: string | null;
  orderedAt?: string | null;
  order_items?: unknown[];
  status?: string | null;
  createdBy?: unknown;
  statusHistories?: unknown[];
  supply_amount?: unknown;
  total_amount_vat_included?: unknown;
};

function parseDecimalLike(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function parseDecimalLikeOptional(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseDecimalLike(v);
  return Number.isFinite(n) ? n : null;
}

/** 중첩 item: itemCode/itemName 등 API 필드 → Item */
function mapApiNestedItemToItem(raw: unknown): Item | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === "number" ? x.id : Number(x.id);
  if (!Number.isFinite(id)) return undefined;
  const code =
    (typeof x.itemCode === "string" && x.itemCode) ||
    (typeof x.code === "string" && x.code) ||
    String(id);
  const name =
    (typeof x.itemName === "string" && x.itemName) ||
    (typeof x.name === "string" && x.name) ||
    "-";
  return {
    id,
    code,
    name,
    spec: typeof x.spec === "string" ? x.spec : undefined,
    unit: typeof x.unit === "string" ? x.unit : undefined,
    type:
      typeof x.itemType === "string"
        ? x.itemType
        : typeof x.type === "string"
          ? x.type
          : undefined,
    isActive: typeof x.isActive === "boolean" ? x.isActive : undefined,
  };
}

function sanitizeOrderUserRef(
  u: unknown
): { id?: number; name?: string; employeeNo?: number; email?: string } | undefined {
  if (!u || typeof u !== "object") return undefined;
  const x = u as Record<string, unknown>;
  return {
    id: typeof x.id === "number" ? x.id : undefined,
    name: typeof x.name === "string" ? x.name : undefined,
    employeeNo: typeof x.employeeNo === "number" ? x.employeeNo : undefined,
    email: typeof x.email === "string" ? x.email : undefined,
  };
}

/** 품목 라인: quantity·quantityUnitCode·note·requestedDueDate 등 API 필드 → PurchaseOrderItem */
function mapApiOrderLineToPurchaseOrderItem(
  raw: unknown
): PurchaseOrderItem | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === "number" ? x.id : Number(x.id);
  const itemId = typeof x.itemId === "number" ? x.itemId : Number(x.itemId);
  if (!Number.isFinite(id) || !Number.isFinite(itemId)) return null;

  const qty = parseDecimalLike(x.quantity ?? x.qty);
  const unitPrice = parseDecimalLike(x.unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return null;

  const unit =
    (typeof x.quantityUnitCode === "string" && x.quantityUnitCode) ||
    (typeof x.unit === "string" && x.unit) ||
    undefined;

  const requestDeliveryDate =
    (typeof x.requestedDueDate === "string" && x.requestedDueDate) ||
    (typeof x.requestDeliveryDate === "string" && x.requestDeliveryDate) ||
    null;

  const remark =
    (typeof x.note === "string" ? x.note : null) ??
    (typeof x.remark === "string" ? x.remark : null);

  const nestedItem = mapApiNestedItemToItem(x.item);
  const itemName = nestedItem?.name ?? (typeof x.itemName === "string" ? x.itemName : undefined);

  const currencyCode =
    typeof x.currencyCode === "string" ? x.currencyCode : null;

  const deliveredRaw = x.deliveredQty;
  const dq =
    deliveredRaw == null || deliveredRaw === ""
      ? undefined
      : parseDecimalLike(deliveredRaw);
  const deliveredQty = dq !== undefined && Number.isFinite(dq) ? dq : undefined;

  const amount =
    typeof x.amount === "number" && Number.isFinite(x.amount)
      ? x.amount
      : Math.round(qty * unitPrice * 10000) / 10000;

  return {
    id,
    itemId,
    item: nestedItem,
    itemName,
    spec: typeof x.spec === "string" ? x.spec : undefined,
    unit,
    qty,
    unitPrice,
    amount,
    currencyCode,
    deliveredQty,
    requestDeliveryDate,
    remark,
  };
}

function mapOrderLinesFromApi(rawLines: unknown): PurchaseOrderItem[] {
  if (!Array.isArray(rawLines)) return [];
  return rawLines
    .map(mapApiOrderLineToPurchaseOrderItem)
    .filter((x): x is PurchaseOrderItem => x != null);
}

/** GET /purchase-orders 목록 1건 — 상세와 동일하게 orderedAt·status·snake_case 등 정규화 */
function mapPurchaseOrderListItem(raw: unknown): PurchaseOrderListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === "number" ? x.id : Number(x.id);
  if (!Number.isFinite(id)) return null;

  const orderNoRaw = x.orderNo ?? x.order_no;
  const orderNo =
    (typeof orderNoRaw === "string" && orderNoRaw.trim()) || String(id);

  const title =
    (typeof x.title === "string" && x.title.trim()) || "";

  const pid = x.partnerId ?? x.partner_id;
  const partnerIdNum =
    typeof pid === "number" ? pid : Number(pid);
  const partnerId = Number.isFinite(partnerIdNum) ? partnerIdNum : 0;

  const orderDate =
    (typeof x.orderDate === "string" && x.orderDate) ||
    (typeof x.orderedAt === "string" && x.orderedAt) ||
    (typeof x.order_date === "string" && x.order_date) ||
    "";

  const dueDateRaw =
    (typeof x.dueDate === "string" && x.dueDate) ||
    (typeof x.due_date === "string" && x.due_date) ||
    (typeof x.requestDeliveryDate === "string" && x.requestDeliveryDate) ||
    (typeof x.request_delivery_date === "string" &&
      x.request_delivery_date) ||
    null;

  const orderStatusRaw = x.orderStatus ?? x.status;
  const orderStatus =
    typeof orderStatusRaw === "string" && orderStatusRaw.trim() !== ""
      ? orderStatusRaw.trim()
      : undefined;

  const approvalRaw = x.approvalStatus ?? x.approval_status;
  const approvalStatus =
    typeof approvalRaw === "string" && approvalRaw.trim() !== ""
      ? approvalRaw.trim()
      : undefined;

  const currencyRaw = x.currencyCode ?? x.currency_code;
  const currencyCode =
    typeof currencyRaw === "string" && currencyRaw.trim() !== ""
      ? currencyRaw.trim()
      : null;

  const totalAmount = parseDecimalLikeOptional(
    x.totalAmount ?? x.total_amount
  );
  const totalQty = parseDecimalLikeOptional(x.totalQty ?? x.total_qty);

  const createdAtRaw = x.createdAt ?? x.created_at;
  const createdAt =
    typeof createdAtRaw === "string" && createdAtRaw ? createdAtRaw : undefined;

  const partner =
    x.partner && typeof x.partner === "object"
      ? (x.partner as Partner)
      : undefined;

  const progressRaw = x.progressStatus ?? x.progress_status;
  const progressStatus =
    typeof progressRaw === "string" && progressRaw.trim() !== ""
      ? progressRaw.trim()
      : undefined;

  return {
    id,
    orderNo,
    title,
    partnerId,
    partner,
    orderDate,
    currencyCode,
    dueDate: dueDateRaw || undefined,
    orderStatus,
    approvalStatus,
    progressStatus,
    totalQty: totalQty ?? undefined,
    totalAmount: totalAmount ?? undefined,
    createdAt,
  };
}

/** 백엔드 응답(orderedAt, requestDepartment, 라인 quantity 등) → 프론트 모델 */
function mapPurchaseOrderDetail(raw: unknown): PurchaseOrderDetail {
  const data = raw as ApiOrderDetailRaw;
  const rawLines =
    data.orderItems ?? data.order_items ?? data.items ?? [];
  const lines = mapOrderLinesFromApi(rawLines);

  const orderDate =
    (typeof data.orderDate === "string" && data.orderDate) ||
    (typeof data.orderedAt === "string" && data.orderedAt) ||
    "";

  const requesterDepartment =
    data.requesterDepartment ??
    data.requester_department ??
    data.requestDepartment ??
    null;

  const requesterName =
    data.requesterName ?? data.requester_name ?? null;

  const orderStatus =
    data.orderStatus ??
    (typeof data.status === "string" ? data.status : undefined);

  const statusHistories: PurchaseOrderStatusHistoryEntry[] | undefined =
    Array.isArray(data.statusHistories)
      ? data.statusHistories.map((h) => {
          if (!h || typeof h !== "object") {
            return h as PurchaseOrderStatusHistoryEntry;
          }
          const e = h as unknown as Record<string, unknown>;
          return {
            ...e,
            changedBy: sanitizeOrderUserRef(e.changedBy),
          } as PurchaseOrderStatusHistoryEntry;
        })
      : undefined;

  return {
    ...data,
    orderDate,
    orderStatus,
    orderItems: lines,
    items: lines,
    requesterDepartment,
    requesterName,
    createdBy: sanitizeOrderUserRef(data.createdBy) ?? data.createdBy,
    statusHistories,
    supplyAmount: parseDecimalLikeOptional(
      data.supplyAmount ?? data.supply_amount
    ),
    totalAmountVatIncluded: parseDecimalLikeOptional(
      data.totalAmountVatIncluded ?? data.total_amount_vat_included
    ),
  };
}

export async function getPurchaseOrders(
  accessToken: string,
  params?: PurchaseOrderListParams
): Promise<PurchaseOrderListItem[]> {
  const q = new URLSearchParams();
  if (params?.partnerId != null) q.set("partnerId", String(params.partnerId));
  if (params?.orderStatus) q.set("orderStatus", params.orderStatus);
  if (params?.approvalStatus) q.set("approvalStatus", params.approvalStatus);
  const query = q.toString();
  const url = query ? `${API_BASE}/purchase-orders?${query}` : `${API_BASE}/purchase-orders`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.data ?? [];
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map(mapPurchaseOrderListItem)
    .filter((row): row is PurchaseOrderListItem => row != null);
}

export async function getPurchaseOrder(
  id: number,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 상세를 불러오지 못했습니다.");
  }
  return mapPurchaseOrderDetail(await res.json());
}

export async function createPurchaseOrder(
  payload: PurchaseOrderCreatePayload,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetch(`${API_BASE}/purchase-orders`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주를 등록하지 못했습니다.");
  }
  return mapPurchaseOrderDetail(await res.json());
}

export async function updatePurchaseOrder(
  id: number,
  payload: PurchaseOrderUpdatePayload,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
    method: "PUT",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주를 수정하지 못했습니다.");
  }
  return mapPurchaseOrderDetail(await res.json());
}

// --- 발주 라인(제품) ---

/** 품목 라인만 재조회 (상세에 라인이 없을 때). GET /purchase-orders/:id/lines */
export async function getPurchaseOrderItems(
  id: number,
  accessToken: string
): Promise<PurchaseOrderItem[]> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/lines`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 제품을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.data ?? data?.orderItems ?? data?.order_items ?? [];
  return mapOrderLinesFromApi(Array.isArray(list) ? list : []);
}

export async function updatePurchaseOrderLine(
  orderId: number,
  lineId: number,
  payload: PurchaseOrderLinePatchPayload,
  accessToken: string
): Promise<PurchaseOrderItem> {
  const res = await fetch(`${API_BASE}/purchase-orders/${orderId}/lines/${lineId}`, {
    method: "PATCH",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 제품을 수정하지 못했습니다.");
  }
  return mapApiOrderLineToPurchaseOrderItem(await res.json()) as PurchaseOrderItem;
}

export async function deletePurchaseOrderLine(
  orderId: number,
  lineId: number,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/purchase-orders/${orderId}/lines/${lineId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 제품을 삭제하지 못했습니다.");
  }
}

// --- 첨부파일 ---

export async function uploadPurchaseOrderFile(
  id: number,
  file: File,
  accessToken: string
): Promise<PurchaseOrderFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/files`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "파일을 업로드하지 못했습니다.");
  }
  return res.json();
}

export async function getPurchaseOrderFiles(
  id: number,
  accessToken: string
): Promise<PurchaseOrderFile[]> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/files`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "첨부파일 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

// --- 납품 ---

export async function createDelivery(
  purchaseOrderId: number,
  payload: DeliveryCreatePayload,
  accessToken: string
): Promise<Delivery> {
  const res = await fetch(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/deliveries`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "납품을 등록하지 못했습니다.");
  }
  return res.json();
}

export async function getDeliveries(
  purchaseOrderId: number,
  accessToken: string
): Promise<Delivery[]> {
  const res = await fetch(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/deliveries`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

// --- 거래처·제품·공통코드 (드롭다운용, 문서상 인증 없음 가능성 있음) ---

export async function getPartners(accessToken: string): Promise<Partner[]> {
  const res = await fetch(`${API_BASE}/partners`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "거래처 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function createPartner(
  payload: PartnerCreatePayload,
  accessToken: string
): Promise<Partner> {
  const res = await fetch(`${API_BASE}/partners`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "거래처를 등록하지 못했습니다.");
  }
  return res.json();
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

export async function getCodeGroupCodes(
  groupCode: string,
  accessToken: string
): Promise<CodeItem[]> {
  const res = await fetch(
    `${API_BASE}/code-groups/${encodeURIComponent(groupCode)}/codes`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "공통코드를 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}
