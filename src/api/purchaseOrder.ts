/**
 * 발주(Purchase Order) 도메인 HTTP 클라이언트.
 *
 * - **Base**: `API_BASE` (`apiBase.ts`, `VITE_AUTH_BASE_URL` + `/api`)
 * - **인증**: `Authorization: Bearer <accessToken>` + `credentials: "include"`
 * - **JSON**: `Content-Type: application/json` + `JSON.stringify`
 * - **파일**: `FormData` + 필드명 `file` (multipart, Content-Type은 브라우저 설정)
 * - **응답**: 목록은 `T[]` 또는 `{ data: T[] }` 모두 수용. 상세/라인은 snake_case·별칭을 mapper로 정규화
 *
 * 엔드포인트 표: `docs/FRONTEND_API.md` §4
 *
 * @module api/purchaseOrder
 */
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

// --- 타입 정의 (백엔드 계약과 맞춘 요청/응답 모델) ---

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
  /** API·DB: requestDepartment — 매퍼에서 requesterDepartment로도 채움 */
  requestDepartment?: string | null;
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
  /** 1차 결재(팀장) 예정/지정 사용자 id — POST .../approval/submit 반영 */
  firstApproverUserId?: number | null;
  firstApprover?: {
    id?: number;
    name?: string;
    employeeNo?: number;
    email?: string;
  } | null;
  /** 결재 상신 시각 */
  approvalSubmittedAt?: string | null;
  /** 승인(종결) 시각 — 납품 POST는 이 값이 있을 때만 허용 */
  approvalApprovedAt?: string | null;
  approvalApprovedById?: number | null;
  approvalApprovedBy?: {
    id?: number;
    name?: string;
    employeeNo?: number;
    email?: string;
  } | null;
}

export interface PurchaseOrderFile {
  /** 파일 링크 ID(삭제 API 파라미터로 사용) */
  id: number;
  purchaseOrderId?: number;
  orderId?: number;
  fileId?: number;
  fileName: string | null;
  filePath: string | null;
  fileType?: string;
  fileSize?: number;
  uploadedById?: number;
  createdBy?: number;
  categoryCode?: string | null;
  uploadedAt?: string;
  createdAt?: string;
}

/** POST /purchase-orders/:id/deliveries — 본문 `lines` 한 줄 (order_items.id = orderItemId) */
export interface DeliveryCreateLinePayload {
  orderItemId: number;
  quantity: number;
}

/** POST /purchase-orders/:id/deliveries */
export interface DeliveryCreatePayload {
  deliveryDate: string;
  /** 필수, 최소 1건. 동일 orderItemId 중복 불가 */
  lines: DeliveryCreateLinePayload[];
  title?: string | null;
  plannedDeliveryDate?: string | null;
  remark?: string | null;
  deliveryManagerId?: number | null;
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
  purchaseOrderItemId?: number;
  itemId?: number;
  itemName?: string;
  deliveryQty?: number;
  lotNo?: string | null;
  remark?: string | null;
}

/** GET 납품 응답의 품목별 행 (`deliveryItems` 등) */
export interface DeliveryRecordLine {
  orderItemId?: number;
  purchaseOrderItemId?: number;
  quantity?: number;
  deliveryQty?: number;
  itemId?: number;
  itemName?: string;
}

/** GET `/deliveries`·관계 로드 시 포함되는 발주 헤더 요약 */
export interface DeliveryOrderRef {
  id?: number;
  orderNo?: string;
  title?: string;
  partner?: Partner;
  partnerId?: number;
}

export interface Delivery {
  id: number;
  deliveryNo?: string;
  title?: string | null;
  partnerId?: number;
  partner?: Partner;
  /** 발주 PK — 응답에 따라 `order.id` 또는 최상위 필드 */
  purchaseOrderId?: number;
  order?: DeliveryOrderRef;
  deliveryDate: string;
  plannedDeliveryDate?: string | null;
  status?: string;
  remark?: string | null;
  deliveryManagerId?: number | null;
  deliveryItems?: DeliveryRecordLine[];
  /** 레거시 매핑 */
  items?: DeliveryItem[];
}

/** GET `/api/deliveries` 쿼리 */
export interface DeliveryListParams {
  page?: number;
  pageSize?: number;
  partnerId?: number;
  orderId?: number;
  /** `DELIVERY_STATUS` 의 code */
  status?: string;
}

export interface DeliveryListResponse {
  items: Delivery[];
  total: number;
  page: number;
  pageSize: number;
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
    const raw = d.deliveryItems ?? d.items ?? [];
    for (const row of raw) {
      const rec = row as DeliveryRecordLine & DeliveryItem;
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

/** 발주 목록 쿼리 파라미터 — 서버 표준: `GET /purchase-orders?partnerId&status` */
export interface PurchaseOrderListParams {
  partnerId?: number;
  /** 쿼리 키 `status` (PURCHASE_ORDER_STATUS 의 code) */
  status?: string;
  /** @deprecated `status`와 동일. 전송 시 `status`로만 붙음 */
  orderStatus?: string;
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
  status_histories?: unknown[];
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

function parseUserRefId(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim());
  return undefined;
}

function sanitizeOrderUserRef(
  u: unknown
): { id?: number; name?: string; employeeNo?: number; email?: string } | undefined {
  if (!u || typeof u !== "object") return undefined;
  const x = u as Record<string, unknown>;
  const id = parseUserRefId(x.id);
  const empRaw = x.employeeNo ?? x.employee_no;
  let employeeNo: number | undefined;
  if (typeof empRaw === "number" && Number.isFinite(empRaw)) employeeNo = empRaw;
  else if (typeof empRaw === "string" && /^\d+$/.test(empRaw.trim())) {
    employeeNo = Number(empRaw.trim());
  }
  return {
    ...(id !== undefined ? { id } : {}),
    name: typeof x.name === "string" ? x.name : undefined,
    ...(employeeNo !== undefined ? { employeeNo } : {}),
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

  const histSource =
    (Array.isArray(data.statusHistories) ? data.statusHistories : null) ??
    (Array.isArray(data.status_histories) ? data.status_histories : null);

  const statusHistories: PurchaseOrderStatusHistoryEntry[] | undefined =
    histSource != null
      ? histSource.map((h) => {
          if (!h || typeof h !== "object") {
            return h as PurchaseOrderStatusHistoryEntry;
          }
          const e = h as Record<string, unknown>;
          return {
            ...e,
            fromStatus:
              (typeof e.fromStatus === "string" && e.fromStatus) ||
              (typeof e.from_status === "string" && e.from_status) ||
              undefined,
            toStatus:
              (typeof e.toStatus === "string" && e.toStatus) ||
              (typeof e.to_status === "string" && e.to_status) ||
              undefined,
            changedAt:
              (typeof e.changedAt === "string" && e.changedAt) ||
              (typeof e.changed_at === "string" && e.changed_at) ||
              undefined,
            comment:
              typeof e.comment === "string"
                ? e.comment
                : e.comment === null
                  ? null
                  : undefined,
            changedBy: sanitizeOrderUserRef(e.changedBy ?? e.changed_by),
          } as PurchaseOrderStatusHistoryEntry;
        })
      : undefined;

  const rec = data as unknown as Record<string, unknown>;
  const faUid = rec.firstApproverUserId ?? rec.first_approver_user_id;
  const firstApproverUserIdParsed =
    typeof faUid === "number" && Number.isFinite(faUid)
      ? faUid
      : typeof faUid === "string" && /^\d+$/.test(faUid.trim())
        ? Number(faUid.trim())
        : faUid === null
          ? null
          : undefined;

  const approvalSubmittedAtRaw =
    rec.approvalSubmittedAt ?? rec.approval_submitted_at;
  const approvalSubmittedAt =
    typeof approvalSubmittedAtRaw === "string" && approvalSubmittedAtRaw.trim()
      ? approvalSubmittedAtRaw.trim()
      : null;

  const approvalApprovedAtRaw =
    rec.approvalApprovedAt ?? rec.approval_approved_at;
  const approvalApprovedAt =
    typeof approvalApprovedAtRaw === "string" && approvalApprovedAtRaw.trim()
      ? approvalApprovedAtRaw.trim()
      : null;

  const apById = rec.approvalApprovedById ?? rec.approval_approved_by_id;
  const approvalApprovedById =
    typeof apById === "number" && Number.isFinite(apById)
      ? apById
      : typeof apById === "string" && /^\d+$/.test(apById.trim())
        ? Number(apById.trim())
        : undefined;

  const firstApprover = sanitizeOrderUserRef(
    rec.firstApprover ?? rec.first_approver
  );
  const approvalApprovedBy = sanitizeOrderUserRef(
    rec.approvalApprovedBy ?? rec.approval_approved_by
  );

  return {
    ...data,
    orderDate,
    orderStatus,
    orderItems: lines,
    items: lines,
    requesterDepartment,
    requesterName,
    requestDepartment:
      typeof rec.requestDepartment === "string"
        ? rec.requestDepartment
        : typeof rec.request_department === "string"
          ? rec.request_department
          : (data.requestDepartment ?? null),
    createdBy: sanitizeOrderUserRef(data.createdBy) ?? data.createdBy,
    statusHistories,
    supplyAmount: parseDecimalLikeOptional(
      data.supplyAmount ?? data.supply_amount
    ),
    totalAmountVatIncluded: parseDecimalLikeOptional(
      data.totalAmountVatIncluded ?? data.total_amount_vat_included
    ),
    ...(firstApproverUserIdParsed !== undefined
      ? { firstApproverUserId: firstApproverUserIdParsed }
      : {}),
    ...(firstApprover ? { firstApprover } : {}),
    ...(approvalSubmittedAt !== null
      ? { approvalSubmittedAt }
      : { approvalSubmittedAt: null }),
    ...(approvalApprovedAt !== null
      ? { approvalApprovedAt }
      : { approvalApprovedAt: null }),
    ...(approvalApprovedById !== undefined ? { approvalApprovedById } : {}),
    ...(approvalApprovedBy ? { approvalApprovedBy } : {}),
  };
}

/**
 * 발주 **요청 부서** 표시·팀장 매칭 입력값.
 * - 백엔드가 `requestDepartment` 만 주거나 `requesterDepartment` 만 줄 수 있어 병합
 * - 발주 폼 저장값은 보통 조직 셀렉트의 **전체 경로 라벨**(예: `회사 > 본사 > OO팀`) — `OrderForm` 의 `parseDeptPathFromSelect` 참고
 * - 빈 문자열이면 `findTeamLeaderUserForDepartment` 는 팀장 없음(`null`)
 */
export function getPurchaseOrderRequestDepartmentLabel(
  po: Pick<PurchaseOrderDetail, "requesterDepartment" | "requestDepartment">
): string {
  const raw = po.requesterDepartment ?? po.requestDepartment;
  return String(raw ?? "").trim();
}

/** `GET /purchase-orders` — 쿼리: `partnerId`, `status` (문서 표준). `orderStatus`는 `status`로 전송 */
export async function getPurchaseOrders(
  accessToken: string,
  params?: PurchaseOrderListParams
): Promise<PurchaseOrderListItem[]> {
  const q = new URLSearchParams();
  if (params?.partnerId != null) q.set("partnerId", String(params.partnerId));
  const statusParam = params?.status ?? params?.orderStatus;
  if (statusParam) q.set("status", statusParam);
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

/** `GET /purchase-orders/:id` — 상세·품목·attachments 등 (mapper로 정규화) */
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

/** `POST /purchase-orders` — 헤더 + `items[]` JSON 한 번에 생성 */
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

/** `PUT /purchase-orders/:id` — 헤더(및 타입상 선택 필드) JSON 수정 */
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

/** `GET /purchase-orders/:id/lines` — 상세에 라인이 비었을 때 보조 조회 */
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

/** `PATCH /purchase-orders/:orderId/lines/:lineId` — 품목 라인 부분 수정 JSON */
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

/** `POST /purchase-orders/:orderId/lines` — 품목 1줄 추가 JSON */
export async function createPurchaseOrderLine(
  orderId: number,
  payload: PurchaseOrderItemPayload,
  accessToken: string
): Promise<PurchaseOrderItem> {
  const res = await fetch(`${API_BASE}/purchase-orders/${orderId}/lines`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 제품을 추가하지 못했습니다.");
  }
  return mapApiOrderLineToPurchaseOrderItem(await res.json()) as PurchaseOrderItem;
}

/** `DELETE /purchase-orders/:orderId/lines/:lineId` */
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

/** `POST /purchase-orders/:id/files` — multipart, 필드명 `file` */
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

/** `GET /purchase-orders/:id/files` — 첨부(파일 링크) 목록 */
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

/** `DELETE /purchase-orders/:orderId/files/:fileLinkId` — file_links.id 기준 */
export async function deletePurchaseOrderFile(
  orderId: number,
  fileLinkId: number,
  accessToken: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/purchase-orders/${orderId}/files/${fileLinkId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "첨부파일을 삭제하지 못했습니다.");
  }
}

// --- 납품 ---

/** `POST /purchase-orders/:id/deliveries` — 납품 등록 JSON */
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

/** `GET /api/deliveries` — 납품 전역 목록 (`delivery.read`) */
export async function getDeliveriesList(
  accessToken: string,
  params?: DeliveryListParams
): Promise<DeliveryListResponse> {
  const sp = new URLSearchParams();
  const p = params ?? {};
  if (p.page != null && p.page > 0) sp.set("page", String(p.page));
  if (p.pageSize != null && p.pageSize > 0) sp.set("pageSize", String(p.pageSize));
  if (p.partnerId != null && Number.isFinite(p.partnerId)) {
    sp.set("partnerId", String(p.partnerId));
  }
  if (p.orderId != null && Number.isFinite(p.orderId)) {
    sp.set("orderId", String(p.orderId));
  }
  if (p.status?.trim()) sp.set("status", p.status.trim());
  const qs = sp.toString();
  const res = await fetch(`${API_BASE}/deliveries${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
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
    };
  }
  const arr = Array.isArray(raw) ? raw : [];
  return {
    items: arr as Delivery[],
    total: arr.length,
    page: 1,
    pageSize: arr.length || 20,
  };
}

/** `GET /api/deliveries/:deliveryId` — 납품 단건 (`delivery.read`) */
export async function getDeliveryById(
  deliveryId: number,
  accessToken: string
): Promise<Delivery> {
  const res = await fetch(`${API_BASE}/deliveries/${deliveryId}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "납품 정보를 불러오지 못했습니다.");
  }
  return res.json();
}

/** `GET /purchase-orders/:id/deliveries` */
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

// --- 결재(상신·승인) ---
// POST `/purchase-orders/:id/approval/submit` — 상신. PO_CLOSED면 400. `firstApproverUserId`는 참고용 저장.
// POST `.../approval/approve` — 승인과 동시에 발주 종결(PO_CLOSED)·approvalApprovedAt 기록. 권한은 서버(열람·수정 등) 기준.
// 프론트(`OrderDetail`)는 submit 시 팀장 매칭으로 `firstApproverUserId`를 넣어 참고용으로 전달.

/** 상신·승인 Body 형태 (반려 API는 현재 스펙에 없음) */
export interface PurchaseOrderApprovalActionPayload {
  /** 의견·메모(선택). 백엔드가 `remark` 등 다른 키로 매핑할 수 있음 */
  comment?: string | null;
  /**
   * **submit 단계에서만** 실어 보냄(참고용). `OrderDetail` → `findTeamLeaderUserForDepartment` 로 구한 사용자 `id`.
   */
  firstApproverUserId?: number | null;
}

async function postPurchaseOrderApprovalSegment(
  id: number,
  segment: "submit" | "approve" | "reject", // reject: 레거시 서버 호환만
  payload: PurchaseOrderApprovalActionPayload,
  accessToken: string
): Promise<void> {
  /** submit: 선택 comment + 참고용 firstApproverUserId. approve: 선택 comment */
  let body: Record<string, unknown>;
  if (segment === "submit") {
    body = {};
    const uid = payload.firstApproverUserId;
    if (uid != null && Number.isFinite(Number(uid))) {
      body.firstApproverUserId = Number(uid);
    }
    const c =
      typeof payload.comment === "string" && payload.comment.trim() !== ""
        ? payload.comment.trim()
        : null;
    if (c) body.comment = c;
  } else {
    body = {
      comment:
        typeof payload.comment === "string" && payload.comment.trim() !== ""
          ? payload.comment.trim()
          : null,
    };
  }
  const res = await fetch(
    `${API_BASE}/purchase-orders/${id}/approval/${segment}`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(body),
      credentials: "include",
    }
  );
  if (!res.ok) {
    const fallback =
      segment === "submit"
        ? "결재 상신을 처리하지 못했습니다."
        : segment === "approve"
          ? "결재 승인을 처리하지 못했습니다."
          : "결재 반려를 처리하지 못했습니다.";
    throw await createApiError(res, fallback);
  }
}

/** `POST /purchase-orders/:id/approval/submit` — 결재 상신(요청) */
export async function submitPurchaseOrderApproval(
  id: number,
  payload: PurchaseOrderApprovalActionPayload,
  accessToken: string
): Promise<void> {
  return postPurchaseOrderApprovalSegment(id, "submit", payload, accessToken);
}

/** `POST /purchase-orders/:id/approval/approve` — 결재 승인 */
export async function approvePurchaseOrderApproval(
  id: number,
  payload: PurchaseOrderApprovalActionPayload,
  accessToken: string
): Promise<void> {
  return postPurchaseOrderApprovalSegment(id, "approve", payload, accessToken);
}

/**
 * `POST /purchase-orders/:id/approval/reject` — 구버전 서버용.
 * @deprecated 현행 백엔드 스펙에는 반려 엔드포인트 없음.
 */
export async function rejectPurchaseOrderApproval(
  id: number,
  payload: PurchaseOrderApprovalActionPayload,
  accessToken: string
): Promise<void> {
  return postPurchaseOrderApprovalSegment(id, "reject", payload, accessToken);
}

// --- 거래처·코드그룹 (발주 폼 드롭다운 보조, Bearer 사용) ---

/** `GET /partners` */
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

/** `POST /partners` — 거래처 빠른 등록 등 */
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

/** `GET /code-groups/:groupCode/codes` — (레거시) 코드 그룹별 코드 목록 */
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
