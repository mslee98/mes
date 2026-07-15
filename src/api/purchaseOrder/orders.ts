import {
  API_BASE,
  authHeaders,
  jsonHeaders,
  fetchAuthorized,
  createApiError,
  type ListSortOrder,
} from "./http";
import {
  mapPartnerFromApi,
  mapPartnerSummaryFromApi,
  type Partner,
  type PartnerSummary,
} from "./partners";
import {
  mapApprovalRequestFromApi,
  type ApprovalRequestDetail,
} from "../approvalRequests";

export interface PurchaseOrderItemPayload {
  /** 대표 제품 id (필수) */
  productId: string;
  /** 활성 렌즈 마스터 id — 미선택 시 null 생략 가능 */
  lensId?: string | null;
  detectorId: number;
  detectorElementCode: string;
  wavelengthCode: string;
  /** @deprecated 응답 매퍼 호환 — 요청에는 `quantity` 사용 */
  qty?: number;
  quantity?: number;
  unitPrice: number;
  /** @deprecated 응답 매퍼 호환 — 요청에는 `quantityUnitCode` 사용 */
  unit?: string | null;
  quantityUnitCode?: string | null;
  currencyCode?: string | null;
  requestDeliveryDate?: string | null;
  requestedDueDate?: string | null;
  remark?: string | null;
  note?: string | null;
}

/** POST/PATCH 발주 제품 라인 요청 본문 (CreateOrderLineDto) */
export interface PurchaseOrderLineRequestPayload {
  productId: string;
  lensId?: string | null;
  detectorId: number;
  detectorElementCode: string;
  wavelengthCode: string;
  quantity: number;
  unitPrice: number;
  quantityUnitCode?: string | null;
  currencyCode?: string | null;
  requestDeliveryDate?: string | null;
  requestedDueDate?: string | null;
  remark?: string | null;
  note?: string | null;
}

export interface PurchaseOrderLensLinePayload {
  /** 수정 시 기존 렌즈 라인 식별 (서버가 허용할 때만) */
  id?: number;
  lensId: string;
  qty: number;
  unitPrice: number;
  unit?: string | null;
  quantityUnitCode?: string | null;
  currencyCode?: string | null;
  requestDeliveryDate?: string | null;
  requestedDueDate?: string | null;
  remark?: string | null;
  note?: string | null;
}

export interface PurchaseOrderLinePatchPayload {
  productId?: string | null;
  lensId?: string | null;
  detectorId?: number;
  detectorElementCode?: string;
  wavelengthCode?: string;
  quantity?: number;
  quantityUnitCode?: string | null;
  unitPrice?: number;
  currencyCode?: string | null;
  requestDeliveryDate?: string | null;
  requestedDueDate?: string | null;
  remark?: string | null;
  note?: string | null;
}

/** `POST /purchase-orders/:id/lenses` 본문 — 서버 필드명 `quantity`, `requestedDueDate` */
export interface PurchaseOrderLensLineCreateBody {
  lensId: string;
  quantity: number;
  quantityUnitCode?: string | null;
  unitPrice: number;
  currencyCode?: string | null;
  requestedDueDate?: string | null;
  note?: string | null;
}

/** `PATCH /purchase-orders/:id/lenses/:lensLineId` — 부분 수정(필드 null로 비우기 가능) */
export interface PurchaseOrderLensLinePatchBody {
  quantity?: number;
  quantityUnitCode?: string | null;
  unitPrice?: number | null;
  currencyCode?: string | null;
  requestedDueDate?: string | null;
  note?: string | null;
}

export interface PurchaseOrderCreatePayload {
  title: string;
  partnerId: string;
  orderDate: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  requestDeliveryDate?: string | null;
  /** 발주 요청 부서(사용자/내부 부서) */
  requesterDepartment?: string | null;
  /** 발주 담당자명 */
  requesterName?: string | null;
  /** 발주 담당자 사번 (`users.employee_no`, `users.id` 아님) */
  requesterEmployeeNo?: string | number | null;
  /** @deprecated 서버 미지원 — `requesterEmployeeNo` 사용 */
  requesterId?: number | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
  /** 예: GENERAL */
  orderType?: string | null;
  memo?: string | null;
  /** 미입력 시 서버 기본값(예: RECEIVED)과 맞출 때 명시 */
  status?: string | null;
  /** 공급가액(부가세 제외) — 프론트 계산·선택 */
  supplyAmount?: number | null;
  /** 공급가액 환산용 환율 (orders.exchange_rate) */
  exchangeRate?: number | string | null;
  /** 환율 기준일 — 보통 발주일과 동일 (orders.exchange_rate_date) */
  exchangeRateDate?: string | null;
  /** 하위호환 key — `lines`와 중복 전송하지 않음 */
  items?: PurchaseOrderItemPayload[];
  /** 발주 제품 라인 */
  lines: PurchaseOrderLineRequestPayload[];
  /** 서버 신규 key: 렌즈 독립 라인 */
  lensLines?: PurchaseOrderLensLinePayload[];
  /** 서버 하위호환 key */
  lensItems?: PurchaseOrderLensLinePayload[];
}

export interface PurchaseOrderUpdatePayload {
  title?: string;
  partnerId?: string;
  orderDate?: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  requestDeliveryDate?: string | null;
  requesterDepartment?: string | null;
  requesterName?: string | null;
  requesterEmployeeNo?: string | number | null;
  /** @deprecated 서버 미지원 */
  requesterId?: number | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
  /** 공통코드 `PURCHASE_ORDER_TYPE`의 code */
  orderType?: string | null;
  status?: string | null;
  /** 상태 변경 시 이력 코멘트 */
  statusChangeComment?: string | null;
  supplyAmount?: number | null;
  exchangeRate?: number | string | null;
  exchangeRateDate?: string | null;
  /** 수정 시 품목 라인 전체 갱신 */
  items?: PurchaseOrderItemPayload[];
  lines?: PurchaseOrderLineRequestPayload[];
  lensLines?: PurchaseOrderLensLinePayload[];
  lensItems?: PurchaseOrderLensLinePayload[];
}

/** `POST /purchase-orders/:id/receive` — 발주 접수(PO_CLOSED 종결) */
export interface ReceivePurchaseOrderPayload {
  comment?: string;
}

export interface PurchaseOrderListItem {
  id: string;
  orderNo: string;
  title: string;
  partnerId: string;
  /** `GET /purchase-orders` 목록 — `partner` 대신 요약만 포함 */
  partnerSummary?: PartnerSummary | null;
  orderDate: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  orderStatus?: string;
  approvalStatus?: string;
  progressStatus?: string;
  totalQty?: number;
  /** 조회 전용 합계 등 — API에 없으면 null */
  totalAmount?: number | null;
  createdAt?: string;
  /**
   * `GET /purchase-orders` 각 row — `attachments: []` 또는 파일 링크 객체 배열
   * (id, orderId, fileId, fileName, filePath 등 단건과 동일 형태)로 판별.
   */
  hasAttachments?: boolean;
}

export interface PurchaseOrderItem {
  id: number;
  /** 대표 제품 id */
  productId: string;
  /** 품목에 연결된 렌즈(선택) */
  lensId?: string | null;
  lensNameSnapshot?: string | null;
  lens?: {
    id?: string;
    lensName?: string | null;
    fNumber?: string | null;
    focalLength?: string | null;
    isActive?: boolean;
  } | null;
  /** 발주 시점 스냅샷 */
  productNameSnapshot?: string | null;
  businessNameSnapshot?: string | null;
  definitionNameSnapshot?: string | null;
  versionSnapshot?: string | null;
  orderTypeSnapshot?: string | null;
  /** 발주 상세/라인 응답 평면 필드 */
  businessName?: string | null;
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
  detectorId?: number | null;
  detectorElementCode?: string | null;
  wavelengthCode?: string | null;
  detectorTypeSnapshot?: string | null;
  detector?: {
    id?: number;
    detectorType?: string | null;
    detectorSeries?: {
      id?: number;
      seriesCode?: string | null;
      name?: string | null;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  } | null;
}

/** 발주에 종속된 렌즈 독립 라인 (GET 상세 `orderLenses`) */
export interface PurchaseOrderLensLine {
  id: number;
  orderId?: string;
  lensId: string;
  qty: number;
  deliveredQty?: number;
  unitPrice: number;
  amount?: number;
  /** 공통코드 UNIT */
  unit?: string;
  quantityUnitCode?: string;
  currencyCode?: string | null;
  requestDeliveryDate?: string | null;
  remark?: string | null;
  note?: string | null;
  lensNameSnapshot?: string | null;
  lens?: {
    id?: string;
    lensName?: string | null;
    fNumber?: string | null;
    focalLength?: string | null;
    isActive?: boolean;
  } | null;
}

export interface PurchaseOrderStatusHistoryEntry {
  id: number;
  orderId?: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  changedById?: number;
  changedBy?: { id?: number; name?: string; employeeNo?: number; email?: string };
  changedAt?: string;
  comment?: string | null;
}

export interface PurchaseOrderDetail extends PurchaseOrderListItem {
  /**
   * @deprecated BE 제거 예정 — 표시는 `partnerSummary` + `resolvePartnerForDisplay` 사용.
   * 매퍼가 읽기 호환으로만 채울 수 있음.
   */
  partner?: Partner;
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
  memo?: string | null;
  /** API 원본 status (목록의 orderStatus와 동일 의미로 매핑됨) */
  status?: string | null;
  statusHistories?: PurchaseOrderStatusHistoryEntry[];
  attachments?: unknown[];
  /** GET /purchase-orders/:id 응답의 품목 라인 (item 관계 포함) */
  orderItems?: PurchaseOrderItem[];
  /** 렌즈 독립 라인 */
  orderLenses?: PurchaseOrderLensLine[];
  /** 레거시·내부 호환용 — 매퍼에서 orderItems와 동일 배열로 채움 */
  items?: PurchaseOrderItem[];
  /** 제품 공급가액(부가세 제외) */
  supplyAmount?: number | null;
  /** 공급가액 환산용 환율 */
  exchangeRate?: number | null;
  /** 환율 기준일 */
  exchangeRateDate?: string | null;
  /** 조회 전용: 라인 Σ (수량×단가) 등 */
  totalAmount?: number | null;
  /**
   * 해당 발주에 연결된 최신 결재 요청 1건 (헤더의 firstApprover·approvalApprovedAt 등은 제거됨).
   */
  currentApprovalRequest?: ApprovalRequestDetail;
}

export interface PurchaseOrderFile {
  /** 파일 링크 ID(삭제 API 파라미터로 사용) */
  id: number;
  purchaseOrderId?: string;
  orderId?: string;
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


export type PurchaseOrderListSortBy =
  | "orderNo"
  | "partnerName"
  | "orderedAt"
  | "dueDate"
  | "status";

/** 발주 목록 쿼리 파라미터 — 서버 표준: `GET /purchase-orders` */
export interface PurchaseOrderListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  partnerId?: string;
  orderedFrom?: string;
  orderedTo?: string;
  /** 쿼리 키 `status` (PURCHASE_ORDER_STATUS 의 code) */
  status?: string;
  /** @deprecated `status`와 동일. 전송 시 `status`로만 붙음 */
  orderStatus?: string;
  sortBy?: PurchaseOrderListSortBy;
  sortOrder?: ListSortOrder;
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  sortBy?: PurchaseOrderListSortBy;
  sortOrder?: ListSortOrder;
  serverPaginationApplied?: boolean;
}

type ApiOrderDetailRaw = PurchaseOrderDetail & {
  requester_department?: string | null;
  requester_name?: string | null;
  requestDepartment?: string | null;
  orderedAt?: string | null;
  order_items?: unknown[];
  order_lenses?: unknown[];
  status?: string | null;
  createdBy?: unknown;
  statusHistories?: unknown[];
  status_histories?: unknown[];
  supply_amount?: unknown;
  /** 스네이크 케이스 응답 호환 */
  total_amount?: unknown;
  exchange_rate?: unknown;
  exchange_rate_date?: string | null;
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

/** 발주 라인: `product_id` 중심 (대표 제품) */
function mapApiOrderLineToPurchaseOrderItem(
  raw: unknown
): PurchaseOrderItem | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === "number" ? x.id : Number(x.id);
  if (!Number.isFinite(id)) return null;

  const lineProductRaw = x.productId;
  const lineProductId =
    lineProductRaw == null ? "" : String(lineProductRaw).trim();
  if (!lineProductId) {
    return null;
  }

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

  const lensIdRaw = x.lensId ?? x.lens_id;
  const lensIdParsed =
    lensIdRaw == null || lensIdRaw === ""
      ? null
      : String(lensIdRaw).trim() || null;

  const lensNameSnapshot =
    typeof x.lensNameSnapshot === "string"
      ? x.lensNameSnapshot
      : typeof x.lens_name_snapshot === "string"
        ? x.lens_name_snapshot
        : null;

  const lensRaw =
    x.lens && typeof x.lens === "object"
      ? (x.lens as Record<string, unknown>)
      : null;
  const lens = lensRaw
    ? {
        id:
          typeof lensRaw.id === "string"
            ? lensRaw.id
            : lensRaw.id != null
              ? String(lensRaw.id)
              : undefined,
        lensName:
          typeof lensRaw.lensName === "string"
            ? lensRaw.lensName
            : typeof lensRaw.lens_name === "string"
              ? lensRaw.lens_name
              : null,
        fNumber:
          typeof lensRaw.fNumber === "string"
            ? lensRaw.fNumber
            : typeof lensRaw.f_number === "string"
              ? lensRaw.f_number
              : null,
        focalLength:
          typeof lensRaw.focalLength === "string"
            ? lensRaw.focalLength
            : typeof lensRaw.focal_length === "string"
              ? lensRaw.focal_length
              : null,
        isActive:
          typeof lensRaw.isActive === "boolean" ? lensRaw.isActive : undefined,
      }
    : null;

  const productNameSnapshot =
    typeof x.productNameSnapshot === "string" ? x.productNameSnapshot : null;
  const businessNameSnapshot =
    typeof x.businessNameSnapshot === "string" ? x.businessNameSnapshot : null;
  const definitionNameSnapshot =
    typeof x.definitionNameSnapshot === "string"
      ? x.definitionNameSnapshot
      : null;
  const versionSnapshot =
    typeof x.versionSnapshot === "string" ? x.versionSnapshot : null;
  const orderTypeSnapshot =
    typeof x.orderTypeSnapshot === "string" ? x.orderTypeSnapshot : null;

  const itemName =
    (productNameSnapshot?.trim() ? productNameSnapshot : undefined) ??
    (definitionNameSnapshot?.trim() ? definitionNameSnapshot : undefined) ??
    (typeof x.itemName === "string" ? x.itemName : undefined);
  const businessName =
    (typeof x.businessName === "string" && x.businessName) ||
    businessNameSnapshot;

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

  const detectorIdRaw = x.detectorId ?? x.detector_id;
  const detectorIdParsed =
    detectorIdRaw == null || detectorIdRaw === ""
      ? null
      : Number(detectorIdRaw);
  const detectorId =
    detectorIdParsed != null && Number.isFinite(detectorIdParsed)
      ? detectorIdParsed
      : null;

  const detectorElementCode =
    typeof x.detectorElementCode === "string"
      ? x.detectorElementCode
      : typeof x.detector_element_code === "string"
        ? x.detector_element_code
        : null;

  const wavelengthCode =
    typeof x.wavelengthCode === "string"
      ? x.wavelengthCode
      : typeof x.wavelength_code === "string"
        ? x.wavelength_code
        : null;

  const detectorTypeSnapshot =
    typeof x.detectorTypeSnapshot === "string"
      ? x.detectorTypeSnapshot
      : typeof x.detector_type_snapshot === "string"
        ? x.detector_type_snapshot
        : null;

  const detectorRaw =
    x.detector && typeof x.detector === "object"
      ? (x.detector as Record<string, unknown>)
      : null;
  const detectorSeriesRaw =
    detectorRaw?.detectorSeries ?? detectorRaw?.detector_series;
  const detector = detectorRaw
    ? {
        ...(typeof detectorRaw.id === "number"
          ? { id: detectorRaw.id }
          : detectorRaw.id != null && Number.isFinite(Number(detectorRaw.id))
            ? { id: Number(detectorRaw.id) }
            : {}),
        detectorType:
          typeof detectorRaw.detectorType === "string"
            ? detectorRaw.detectorType
            : typeof detectorRaw.detector_type === "string"
              ? detectorRaw.detector_type
              : null,
        ...(detectorSeriesRaw && typeof detectorSeriesRaw === "object"
          ? {
              detectorSeries: detectorSeriesRaw as NonNullable<
                PurchaseOrderItem["detector"]
              >["detectorSeries"],
            }
          : {}),
      }
    : null;

  return {
    id,
    productId: lineProductId,
    ...(lensIdParsed != null ? { lensId: lensIdParsed } : {}),
    ...(lensNameSnapshot != null ? { lensNameSnapshot } : {}),
    ...(lens != null ? { lens } : {}),
    ...(productNameSnapshot != null ? { productNameSnapshot } : {}),
    ...(businessNameSnapshot != null ? { businessNameSnapshot } : {}),
    ...(definitionNameSnapshot != null ? { definitionNameSnapshot } : {}),
    ...(versionSnapshot != null ? { versionSnapshot } : {}),
    ...(orderTypeSnapshot != null ? { orderTypeSnapshot } : {}),
    ...(businessName != null ? { businessName } : {}),
    ...(itemName ? { itemName } : {}),
    spec: typeof x.spec === "string" ? x.spec : undefined,
    unit,
    qty,
    unitPrice,
    amount,
    currencyCode,
    deliveredQty,
    requestDeliveryDate,
    remark,
    ...(detectorId != null ? { detectorId } : { detectorId: null }),
    ...(detectorElementCode != null ? { detectorElementCode } : {}),
    ...(wavelengthCode != null ? { wavelengthCode } : {}),
    ...(detectorTypeSnapshot != null ? { detectorTypeSnapshot } : {}),
    ...(detector != null ? { detector } : {}),
  };
}

function mapOrderLinesFromApi(rawLines: unknown): PurchaseOrderItem[] {
  if (!Array.isArray(rawLines)) return [];
  return rawLines
    .map(mapApiOrderLineToPurchaseOrderItem)
    .filter((x): x is PurchaseOrderItem => x != null);
}

/** 발주 렌즈 라인 (독립 컬렉션) */
function mapApiOrderLensLineToPurchaseOrderLens(
  raw: unknown
): PurchaseOrderLensLine | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === "number" ? x.id : Number(x.id);
  if (!Number.isFinite(id)) return null;

  const lensIdRaw = x.lensId ?? x.lens_id;
  const lensId = lensIdRaw == null ? "" : String(lensIdRaw).trim();
  if (!lensId) return null;

  const qty = parseDecimalLike(x.quantity ?? x.qty);
  const unitPrice = parseDecimalLike(x.unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return null;

  const unit =
    (typeof x.quantityUnitCode === "string" && x.quantityUnitCode) ||
    (typeof x.unit === "string" && x.unit) ||
    undefined;
  const quantityUnitCode =
    typeof x.quantityUnitCode === "string" ? x.quantityUnitCode : undefined;

  const requestDeliveryDate =
    (typeof x.requestedDueDate === "string" && x.requestedDueDate) ||
    (typeof x.requestDeliveryDate === "string" && x.requestDeliveryDate) ||
    null;

  const remark =
    (typeof x.note === "string" ? x.note : null) ??
    (typeof x.remark === "string" ? x.remark : null);

  const currencyCode =
    typeof x.currencyCode === "string" ? x.currencyCode : null;

  const amount =
    typeof x.amount === "number" && Number.isFinite(x.amount)
      ? x.amount
      : Math.round(qty * unitPrice * 10000) / 10000;
  const deliveredQty = parseDecimalLike(x.deliveredQty ?? x.delivered_qty);

  const orderIdRaw = x.orderId ?? x.order_id;
  const orderId =
    orderIdRaw == null || orderIdRaw === ""
      ? undefined
      : String(orderIdRaw).trim();

  const lensNameSnapshot =
    typeof x.lensNameSnapshot === "string"
      ? x.lensNameSnapshot
      : typeof x.lens_name_snapshot === "string"
        ? x.lens_name_snapshot
        : null;

  const lensRaw =
    x.lens && typeof x.lens === "object"
      ? (x.lens as Record<string, unknown>)
      : null;
  const lens = lensRaw
    ? {
        id:
          typeof lensRaw.id === "string"
            ? lensRaw.id
            : lensRaw.id != null
              ? String(lensRaw.id)
              : undefined,
        lensName:
          typeof lensRaw.lensName === "string"
            ? lensRaw.lensName
            : typeof lensRaw.lens_name === "string"
              ? lensRaw.lens_name
              : null,
        fNumber:
          typeof lensRaw.fNumber === "string"
            ? lensRaw.fNumber
            : typeof lensRaw.f_number === "string"
              ? lensRaw.f_number
              : null,
        focalLength:
          typeof lensRaw.focalLength === "string"
            ? lensRaw.focalLength
            : typeof lensRaw.focal_length === "string"
              ? lensRaw.focal_length
              : null,
        isActive:
          typeof lensRaw.isActive === "boolean" ? lensRaw.isActive : undefined,
      }
    : null;

  return {
    id,
    ...(orderId ? { orderId } : {}),
    lensId,
    qty,
    ...(Number.isFinite(deliveredQty) ? { deliveredQty } : {}),
    unitPrice,
    amount,
    ...(unit ? { unit } : {}),
    ...(quantityUnitCode ? { quantityUnitCode } : {}),
    currencyCode,
    requestDeliveryDate,
    remark,
    lensNameSnapshot,
    lens,
  };
}

function mapOrderLensesFromApi(rawLines: unknown): PurchaseOrderLensLine[] {
  if (!Array.isArray(rawLines)) return [];
  return rawLines
    .map(mapApiOrderLensLineToPurchaseOrderLens)
    .filter((x): x is PurchaseOrderLensLine => x != null);
}

/**
 * 발주 목록 `attachments` / `order_attachments` 등 — 파일 링크 형태 항목이 1건 이상일 때만 true.
 * 빈 배열 `[]` 또는 의미 없는 객체는 false.
 */
function purchaseOrderListAttachmentsArrayHasFiles(raw: unknown): boolean {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  return raw.some((entry) => {
    if (entry == null || typeof entry !== "object") return false;
    const o = entry as Record<string, unknown>;
    const fileNameRaw = o.fileName ?? o.file_name;
    if (typeof fileNameRaw === "string" && fileNameRaw.trim() !== "") return true;
    const fileId = o.fileId ?? o.file_id;
    if (typeof fileId === "number" && Number.isFinite(fileId) && fileId > 0) {
      return true;
    }
    const id = o.id;
    if (typeof id === "number" && Number.isFinite(id) && id > 0) return true;
    return false;
  });
}

function parseListItemHasAttachments(x: Record<string, unknown>): boolean {
  const direct =
    x.hasAttachments ??
    x.has_attachments ??
    x.attachmentsExist ??
    x.attachments_exist;
  if (typeof direct === "boolean") return direct;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct !== 0;

  const countRaw =
    x.attachmentCount ??
    x.attachment_count ??
    x.fileCount ??
    x.file_count;
  if (typeof countRaw === "number" && Number.isFinite(countRaw)) {
    return countRaw > 0;
  }
  if (typeof countRaw === "string" && countRaw.trim() !== "") {
    const n = Number(countRaw);
    if (Number.isFinite(n)) return n > 0;
  }

  for (const k of [
    "attachments",
    "files",
    "orderAttachments",
    "order_attachments",
  ] as const) {
    const v = x[k];
    if (!Array.isArray(v) || v.length === 0) continue;
    if (
      k === "attachments" ||
      k === "order_attachments" ||
      k === "orderAttachments"
    ) {
      if (purchaseOrderListAttachmentsArrayHasFiles(v)) return true;
      continue;
    }
    return true;
  }
  return false;
}

/** GET /purchase-orders 목록 1건 — 상세와 동일하게 orderedAt·status·snake_case 등 정규화 */
function mapPurchaseOrderListItem(raw: unknown): PurchaseOrderListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id = String(x.id ?? "").trim();
  if (!id) return null;

  const orderNoRaw = x.orderNo ?? x.order_no;
  const orderNo =
    (typeof orderNoRaw === "string" && orderNoRaw.trim()) || String(id);

  const title =
    (typeof x.title === "string" && x.title.trim()) || "";

  const partnerId = String(x.partnerId ?? x.partner_id ?? "").trim();

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

  const partnerSummary =
    mapPartnerSummaryFromApi(x.partnerSummary ?? x.partner_summary) ??
    (x.partner && typeof x.partner === "object"
      ? mapPartnerSummaryFromApi(x.partner)
      : undefined);

  const progressRaw = x.progressStatus ?? x.progress_status;
  const progressStatus =
    typeof progressRaw === "string" && progressRaw.trim() !== ""
      ? progressRaw.trim()
      : undefined;

  const hasAttachments = parseListItemHasAttachments(x);

  return {
    id,
    orderNo,
    title,
    partnerId,
    partnerSummary,
    orderDate,
    currencyCode,
    dueDate: dueDateRaw || undefined,
    orderStatus,
    approvalStatus,
    progressStatus,
    totalQty: totalQty ?? undefined,
    totalAmount: totalAmount ?? undefined,
    createdAt,
    hasAttachments,
  };
}

/** 백엔드 응답(orderedAt, requestDepartment, 라인 quantity 등) → 프론트 모델 */
function mapPurchaseOrderDetail(raw: unknown): PurchaseOrderDetail {
  const data = raw as ApiOrderDetailRaw;
  const rawLines =
    data.orderItems ?? data.order_items ?? data.items ?? [];
  const lines = mapOrderLinesFromApi(rawLines);
  /** 레거시 `order_lenses`는 제거됨 — 렌즈는 order_items에만 연결 */
  const lensLines: PurchaseOrderLensLine[] = [];

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
  const arRaw =
    rec.currentApprovalRequest ??
    rec.current_approval_request ??
    null;
  const currentApprovalRequest = mapApprovalRequestFromApi(arRaw);

  const partnerRaw = rec.partner;
  const partnerMapped =
    partnerRaw != null &&
    typeof partnerRaw === "object" &&
    !Array.isArray(partnerRaw)
      ? mapPartnerFromApi(partnerRaw as Record<string, unknown>)
      : undefined;

  const partnerSummary =
    mapPartnerSummaryFromApi(rec.partnerSummary ?? rec.partner_summary) ??
    (partnerMapped ? mapPartnerSummaryFromApi(partnerMapped) : undefined);

  return {
    ...data,
    ...(partnerMapped !== undefined ? { partner: partnerMapped } : {}),
    ...(partnerSummary !== undefined ? { partnerSummary } : {}),
    orderDate,
    orderStatus,
    orderItems: lines,
    items: lines,
    orderLenses: lensLines,
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
    totalAmount: parseDecimalLikeOptional(
      data.totalAmount ?? data.total_amount
    ),
    exchangeRate: parseDecimalLikeOptional(
      rec.exchangeRate ?? rec.exchange_rate
    ),
    exchangeRateDate:
      (typeof rec.exchangeRateDate === "string" && rec.exchangeRateDate) ||
      (typeof rec.exchange_rate_date === "string" && rec.exchange_rate_date) ||
      null,
    ...(currentApprovalRequest
      ? { currentApprovalRequest }
      : {}),
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

export function parsePagedListNumber(
  ...values: unknown[]
): number | undefined {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return undefined;
}

function parsePurchaseOrderListResponse(
  raw: unknown,
  params?: PurchaseOrderListParams
): PurchaseOrderListResponse {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const meta =
    obj?.meta && typeof obj.meta === "object"
      ? (obj.meta as Record<string, unknown>)
      : null;
  const listSource = Array.isArray(raw)
    ? raw
    : Array.isArray(obj?.items)
      ? obj.items
      : Array.isArray(obj?.data)
        ? obj.data
        : [];
  const items = listSource
    .map(mapPurchaseOrderListItem)
    .filter((row): row is PurchaseOrderListItem => row != null);
  const page =
    parsePagedListNumber(obj?.page, obj?.currentPage, meta?.page) ||
    params?.page ||
    1;
  const pageSize =
    parsePagedListNumber(obj?.pageSize, obj?.limit, meta?.pageSize, meta?.limit) ||
    params?.pageSize ||
    items.length ||
    20;
  return {
    items,
    total:
      parsePagedListNumber(obj?.total, obj?.totalCount, meta?.total, meta?.count) ??
      items.length,
    page,
    pageSize,
    sortBy:
      typeof obj?.sortBy === "string"
        ? (obj.sortBy as PurchaseOrderListSortBy)
        : undefined,
    sortOrder:
      typeof obj?.sortOrder === "string"
        ? (obj.sortOrder as ListSortOrder)
        : undefined,
    serverPaginationApplied: Array.isArray(obj?.items),
  };
}

/** `GET /purchase-orders` — 쿼리: `page`, `pageSize`, `q`, `partnerId`, `status`, `sortBy`, `sortOrder` */
export async function getPurchaseOrders(
  accessToken: string,
  params?: PurchaseOrderListParams
): Promise<PurchaseOrderListResponse> {
  const q = new URLSearchParams();
  if (params?.page != null && params.page > 0) q.set("page", String(params.page));
  if (params?.pageSize != null && params.pageSize > 0) {
    q.set("pageSize", String(params.pageSize));
  }
  if (params?.q?.trim()) q.set("q", params.q.trim());
  if (params?.partnerId != null) q.set("partnerId", String(params.partnerId));
  if (params?.orderedFrom?.trim()) q.set("orderedFrom", params.orderedFrom.trim());
  if (params?.orderedTo?.trim()) q.set("orderedTo", params.orderedTo.trim());
  const statusParam = params?.status ?? params?.orderStatus;
  if (statusParam) q.set("status", statusParam);
  if (params?.sortBy) q.set("sortBy", params.sortBy);
  if (params?.sortOrder) q.set("sortOrder", params.sortOrder);
  const query = q.toString();
  const url = query ? `${API_BASE}/purchase-orders?${query}` : `${API_BASE}/purchase-orders`;
  const res = await fetchAuthorized(
    url,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "발주 목록을 불러오지 못했습니다.");
  }
  return parsePurchaseOrderListResponse(await res.json(), params);
}

/** `GET /purchase-orders/:id` — 상세·품목·attachments 등 (mapper로 정규화) */
export async function getPurchaseOrder(
  id: string,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${id}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
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
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "발주를 등록하지 못했습니다.");
  }
  return mapPurchaseOrderDetail(await res.json());
}

/** `PUT /purchase-orders/:id` — 헤더(및 타입상 선택 필드) JSON 수정 */
export async function updatePurchaseOrder(
  id: string,
  payload: PurchaseOrderUpdatePayload,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${id}`,
    {
      method: "PUT",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "발주를 수정하지 못했습니다.");
  }
  return mapPurchaseOrderDetail(await res.json());
}

/** `POST /purchase-orders/:id/receive` — 발주 접수(PO_CLOSED + statusHistory, 트랜잭션) */
export async function receivePurchaseOrder(
  id: string,
  payload: ReceivePurchaseOrderPayload | undefined,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${id}/receive`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload ?? {}),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "발주 접수에 실패했습니다.");
  }
  return mapPurchaseOrderDetail(await res.json());
}

// --- 발주 라인(제품) ---

/** `GET /purchase-orders/:id/lines` — 상세에 라인이 비었을 때 보조 조회 */
export async function getPurchaseOrderItems(
  id: string,
  accessToken: string
): Promise<PurchaseOrderItem[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${id}/lines`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "발주 라인을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.data ?? data?.orderItems ?? data?.order_items ?? [];
  return mapOrderLinesFromApi(Array.isArray(list) ? list : []);
}

/** `PATCH /purchase-orders/:orderId/lines/:lineId` — 품목 라인 부분 수정 JSON */
export async function updatePurchaseOrderLine(
  orderId: string,
  lineId: number,
  payload: PurchaseOrderLinePatchPayload,
  accessToken: string
): Promise<PurchaseOrderItem> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/lines/${lineId}`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "발주 라인을 수정하지 못했습니다.");
  }
  return mapApiOrderLineToPurchaseOrderItem(await res.json()) as PurchaseOrderItem;
}

/** `POST /purchase-orders/:orderId/lines` — 품목 1줄 추가 JSON */
export async function createPurchaseOrderLine(
  orderId: string,
  payload: PurchaseOrderLineRequestPayload,
  accessToken: string
): Promise<PurchaseOrderItem> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/lines`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "발주 라인을 추가하지 못했습니다.");
  }
  return mapApiOrderLineToPurchaseOrderItem(await res.json()) as PurchaseOrderItem;
}

/** `DELETE /purchase-orders/:orderId/lines/:lineId` */
export async function deletePurchaseOrderLine(
  orderId: string,
  lineId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/lines/${lineId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "발주 라인을 삭제하지 못했습니다.");
  }
}

// --- 발주 라인(렌즈) ---

/** `GET /purchase-orders/:id/lenses` */
export async function getPurchaseOrderLenses(
  orderId: string,
  accessToken: string
): Promise<PurchaseOrderLensLine[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/lenses`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "렌즈 라인을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = Array.isArray(data)
    ? data
    : data?.data ?? data?.orderLenses ?? data?.order_lenses ?? [];
  return mapOrderLensesFromApi(Array.isArray(list) ? list : []);
}

/** `POST /purchase-orders/:orderId/lenses` */
export async function createPurchaseOrderLensLine(
  orderId: string,
  payload: PurchaseOrderLensLineCreateBody,
  accessToken: string
): Promise<PurchaseOrderLensLine> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/lenses`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "렌즈 라인을 추가하지 못했습니다.");
  }
  const raw = await res.json();
  const row =
    raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data
      ? (raw as { data: unknown }).data
      : raw;
  const mapped = mapApiOrderLensLineToPurchaseOrderLens(row);
  if (!mapped) {
    throw new Error("렌즈 라인 응답을 해석하지 못했습니다.");
  }
  return mapped;
}

/** `PATCH /purchase-orders/:orderId/lenses/:lensLineId` */
export async function updatePurchaseOrderLensLine(
  orderId: string,
  lensLineId: number,
  payload: PurchaseOrderLensLinePatchBody,
  accessToken: string
): Promise<PurchaseOrderLensLine> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/lenses/${lensLineId}`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "렌즈 라인을 수정하지 못했습니다.");
  }
  const raw = await res.json();
  const row =
    raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data
      ? (raw as { data: unknown }).data
      : raw;
  const mapped = mapApiOrderLensLineToPurchaseOrderLens(row);
  if (!mapped) {
    throw new Error("렌즈 라인 응답을 해석하지 못했습니다.");
  }
  return mapped;
}

/** `DELETE /purchase-orders/:orderId/lenses/:lensLineId` */
export async function deletePurchaseOrderLensLine(
  orderId: string,
  lensLineId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/lenses/${lensLineId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "렌즈 라인을 삭제하지 못했습니다.");
  }
}

// --- 첨부파일 ---

/** `POST /purchase-orders/:id/files` — multipart, 필드명 `file` */
export async function uploadPurchaseOrderFile(
  id: string,
  files: File[],
  accessToken: string
): Promise<PurchaseOrderFile[]> {
  if (!accessToken?.trim()) {
    throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  }
  if (files.length === 0) {
    throw new Error("파일을 1개 이상 선택해 주세요.");
  }
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${id}/files`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: form,
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "파일을 업로드하지 못했습니다.");
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((raw) => {
      const item = raw as Record<string, unknown>;
      const file = item.file as Record<string, unknown> | undefined;
      return {
        id: Number(item.id ?? 0),
        orderId: String(item.targetId ?? ""),
        fileId: Number(item.fileId ?? 0),
        fileName: String(file?.originalName ?? ""),
        filePath: String(file?.filePath ?? ""),
        fileType: String(file?.mimeType ?? ""),
        fileSize: Number(file?.fileSize ?? 0),
        uploadedById: Number(item.createdById ?? 0),
        createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
      };
    });
  }
  return [];
}

/** `GET /purchase-orders/:id/files` — 첨부(파일 링크) 목록 */
export async function getPurchaseOrderFiles(
  id: string,
  accessToken: string
): Promise<PurchaseOrderFile[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${id}/files`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "첨부파일 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

/** `DELETE /purchase-orders/:orderId/files/:fileLinkId` — file_links.id 기준 */
export async function deletePurchaseOrderFile(
  orderId: string,
  fileLinkId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/files/${fileLinkId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "첨부파일을 삭제하지 못했습니다.");
  }
}


// --- 결재(상신·승인) ---
// POST `/purchase-orders/:id/approval/submit` — 상신. PO_CLOSED면 400.
// - `lines[]`: `stepOrder`(권장)·`stepNo`(호환), `approverUserId`, 선택 `status`
// POST `.../approval/approve` — 승인. 백엔드: JWT 사용자 ≠ 현재 PENDING 라인 결재자면 403(또는 400);
//   ADMIN·SYSTEM_MANAGER는 우회. 성공 시 200 + 발주 본문을 줄 수 있음(클라이언트는 void 처리·invalidate로 갱신).

/** 상신 시 결재선 한 단계 */
export interface PurchaseOrderApprovalLineInput {
  /** 권장 키 (서버: stepOrder) */
  stepOrder: number;
  approverUserId: number;
  /** 결재선 단계 상태(서버 스펙에 맞게 선택) */
  status?: string | null;
  /** @deprecated stepOrder와 동일 — 직렬화 시 stepOrder 우선 */
  stepNo?: number;
}

/** 상신·승인 Body 형태 (반려 API는 현재 스펙에 없음) */
export interface PurchaseOrderApprovalActionPayload {
  /** 의견·메모(선택). 기존 서버는 `comment`만 쓸 수 있음 */
  comment?: string | null;
  /**
   * **submit 단계에서만** 실어 보냄(참고용). `lines` 없을 때 하위 호환용.
   */
  firstApproverUserId?: number | null;
  /** 결재 문서 제목(선택). submit 전용 */
  title?: string | null;
  /** 상신 메모(선택). submit 전용 — `comment`와 함께내면 서버가 선택·병합 */
  remark?: string | null;
  /**
   * 확정 결재선. 있으면 우선 적용.
   * 없으면 `firstApproverUserId`만 전송(레거시).
   */
  lines?: PurchaseOrderApprovalLineInput[] | null;
}

async function postPurchaseOrderApprovalSegment(
  id: string,
  segment: "submit" | "approve" | "reject", // reject: 레거시 서버 호환만
  payload: PurchaseOrderApprovalActionPayload,
  accessToken: string
): Promise<void> {
  /** submit: comment/remark/title/lines + 하위 호환 firstApproverUserId. approve: 선택 comment */
  let body: Record<string, unknown>;
  if (segment === "submit") {
    body = {};
    const rawLines = payload.lines;
    const normalizedLines =
      Array.isArray(rawLines) && rawLines.length > 0
        ? rawLines
            .filter(
              (l) =>
                l &&
                Number.isFinite(
                  Number(l.stepOrder ?? l.stepNo)
                ) &&
                Number.isFinite(Number(l.approverUserId))
            )
            .map((l) => {
              const stepOrder = Number(l.stepOrder ?? l.stepNo);
              const lineObj: Record<string, unknown> = {
                stepOrder,
                approverUserId: Number(l.approverUserId),
              };
              if (
                typeof l.status === "string" &&
                l.status.trim() !== ""
              ) {
                lineObj.status = l.status.trim();
              }
              return lineObj;
            })
        : [];
    if (normalizedLines.length > 0) {
      body.lines = normalizedLines;
      body.firstApproverUserId = Number(
        (normalizedLines[0] as Record<string, unknown>).approverUserId
      );
    } else {
      const uid = payload.firstApproverUserId;
      if (uid != null && Number.isFinite(Number(uid))) {
        body.firstApproverUserId = Number(uid);
      }
    }
    const c =
      typeof payload.comment === "string" && payload.comment.trim() !== ""
        ? payload.comment.trim()
        : null;
    if (c) body.comment = c;
    const r =
      typeof payload.remark === "string" && payload.remark.trim() !== ""
        ? payload.remark.trim()
        : null;
    if (r) body.remark = r;
    const t =
      typeof payload.title === "string" && payload.title.trim() !== ""
        ? payload.title.trim()
        : null;
    if (t) body.title = t;
  } else {
    body = {
      comment:
        typeof payload.comment === "string" && payload.comment.trim() !== ""
          ? payload.comment.trim()
          : null,
    };
  }
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${id}/approval/${segment}`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(body),
      credentials: "include",
    },
    accessToken
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
  id: string,
  payload: PurchaseOrderApprovalActionPayload,
  accessToken: string
): Promise<void> {
  return postPurchaseOrderApprovalSegment(id, "submit", payload, accessToken);
}

/**
 * `POST /purchase-orders/:id/approval/approve` — 결재 승인.
 * 응답 본문(발주 상세)은 선택적; 성공 시 쿼리 무효화로 상세를 다시 받는 패턴을 쓴다.
 */
export async function approvePurchaseOrderApproval(
  id: string,
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
  id: string,
  payload: PurchaseOrderApprovalActionPayload,
  accessToken: string
): Promise<void> {
  return postPurchaseOrderApprovalSegment(id, "reject", payload, accessToken);
}

