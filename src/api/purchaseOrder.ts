/**
 * 발주(Purchase Order) 도메인 HTTP 클라이언트.
 *
 * - **Base**: `API_BASE` (`apiBase.ts`, `VITE_AUTH_BASE_URL` + `/api`)
 * - **인증**: `Authorization: Bearer <accessToken>` + `credentials: "include"`
 * - **JSON**: `Content-Type: application/json` + `JSON.stringify`
 * - **파일**: `FormData` + 필드명 `files` (multipart, Content-Type은 브라우저 설정)
 * - **응답**: 목록은 `T[]` 또는 `{ data: T[] }` 모두 수용. 상세/라인은 snake_case·별칭을 mapper로 정규화
 *
 * 엔드포인트 표: `docs/FRONTEND_API.md` §4
 *
 * @module api/purchaseOrder
 */
import { createApiError } from "../lib/api/apiError";
import {
  mapApprovalRequestFromApi,
  type ApprovalRequestDetail,
} from "./approvalRequests";
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

// --- 타입 정의 (백엔드 계약과 맞춘 요청/응답 모델) ---

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

export interface PurchaseOrderItemPayload {
  /** 대표 제품 id (필수) */
  productId: string;
  /** 활성 렌즈 마스터 id — 미선택 시 null 생략 가능 */
  lensId?: string | null;
  detectorId: number;
  detectorElementCode: string;
  wavelengthCode: string;
  qty: number;
  unitPrice: number;
  /** 공통코드 UNIT (예: EA, BOX) */
  unit?: string | null;
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
  lines: PurchaseOrderItemPayload[];
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
  lines?: PurchaseOrderItemPayload[];
  lensLines?: PurchaseOrderLensLinePayload[];
  lensItems?: PurchaseOrderLensLinePayload[];
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
  /** `GET /purchase-orders/:id` 상세 — 전체 거래처 객체 */
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

// --- 생산 계획 · Unit (production_plans / production_plan_units) ---

/** `production_plan_units` 응답 */
export interface ProductionPlanUnit {
  id: string;
  productionPlanItemId?: string | number;
  unitNo?: number;
  /** LOT 관리 코드 (서버 자동 채번) */
  unitCode?: string;
  lotIssuedDate?: string | null;
  lotPoComposite?: string | null;
  lotSequenceNo?: number | null;
  /** 제품 시리얼 — `assign-product-serials` 확정 후 */
  serialNo?: string | null;
  productSerialAssignedAt?: string | null;
  detectorElementCode?: string | null;
  wavelengthCode?: string | null;
  detectorId?: number | null;
  operatorUserId?: number | null;
  operatorEmployeeNoSnapshot?: string | number | null;
  operatorNameSnapshot?: string | null;
  operatorAssignedAt?: string | null;
  /** 검출기 시리얼 — 단건 응답 또는 스냅샷과 함께 내려올 수 있음 */
  detectorSerialNo?: string | null;
  serialPrefix?: string | null;
  sequenceNo?: number | null;
  sequenceText?: string | null;
  serialSnapshot?: Record<string, unknown> | null;
  /** 검출기 마스터 관계 등 — 백엔드 직렬화에 맞게 확장 */
  detector?: unknown | null;
  currentProcessCode?: string | null;
  processStatus?: string | null;
  qualityStatus?: string | null;
  isDeliveryReady?: boolean;
  isDelivered?: boolean;
  deliveredAt?: string | null;
  isInDeliveryPlan?: boolean;
  deliveryPlanId?: string | null;
  deliveryPlanNo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** `production_plan_items` 응답 (bigint `id`는 JSON에서 문자열일 수 있음) */
export interface ProductionPlanItem {
  id?: string | number;
  productionPlanId?: string;
  purchaseOrderItemId?: number;
  plannedQty?: number;
  completedQty?: number;
  deliveredQty?: number;
  productNameSnapshot?: string | null;
  businessNameSnapshot?: string | null;
  purchaseOrderItem?: unknown;
  units?: ProductionPlanUnit[];
}

/** `production_plans` 상세·목록 응답 */
export interface ProductionPlan {
  id: string;
  planNo?: string;
  purchaseOrderId?: string;
  planSeq?: number;
  title?: string | null;
  /** 제품 인계일 등 — 실납품 헤더와 필드명 정렬 */
  deliveryDate?: string | null;
  plannedDeliveryDate?: string | null;
  detectorHandoverExpectedDate?: string | null;
  /** 레거시 매핑용 별칭 */
  plannedDate?: string | null;
  status?: string;
  remark?: string | null;
  productionManagerId?: number | null;
  productionManagerDepartment?: string | null;
  productionManager?: DeliveryActorUserRef | null;
  isDeleted?: boolean;
  createdById?: number | null;
  updatedById?: number | null;
  createdAt?: string;
  updatedAt?: string;
  purchaseOrder?: ProductionPlanPurchaseOrderNested | null;
  items?: ProductionPlanItem[];
  createdBy?: DeliveryActorUserRef | null;
  updatedBy?: DeliveryActorUserRef | null;
}

/** `GET .../process-records` 행에 붙는 첨부 한 건 */
export interface UnitProcessRecordAttachmentRow {
  id?: string | number;
  fileId?: string | number;
  fileName?: string;
  filePath?: string;
  fileType?: string | null;
  fileSize?: number;
  uploadedById?: number | null;
  createdAt?: string;
  file?: {
    filePath?: string;
    originalName?: string;
    mimeType?: string;
    fileSize?: number;
  } | null;
}

/** `unit_process_records` */
export interface UnitProcessRecord {
  id?: string | number;
  unitId?: string;
  processCode?: string;
  processName?: string | null;
  processSeq?: number;
  result?: string;
  failReason?: string | null;
  actionTaken?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  performedById?: number | null;
  performedBy?: DeliveryActorUserRef | null;
  createdAt?: string;
  /** 동일 배열을 `attachments` / `attachmentList` 등으로 내려줄 수 있음 */
  attachments?: UnitProcessRecordAttachmentRow[];
  attachmentList?: UnitProcessRecordAttachmentRow[];
  files?: UnitProcessRecordAttachmentRow[];
}

/** `delivery_item_units` 연결 행 */
export interface DeliveryItemUnit {
  id?: string | number;
  deliveryItemId?: number;
  unitId?: string;
  createdAt?: string;
  unit?: ProductionPlanUnit;
}

export interface ProductionPlanCreateItemInput {
  purchaseOrderItemId: number;
  plannedQty: number;
}

/** 수량만 — `serials` 없음 */
export interface ProductionPlanCreateLineInput {
  orderItemId?: number;
  lineId?: number;
  quantity: number;
}

/**
 * `POST /purchase-orders/:id/production-plans`
 * `items` 또는 `lines`(수량만). 계획 등록 시 `serials` 금지 — LOT·Unit은 서버 자동.
 */
export interface ProductionPlanCreatePayload {
  deliveryDate: string;
  items?: ProductionPlanCreateItemInput[];
  lines?: ProductionPlanCreateLineInput[];
  title?: string | null;
  plannedDeliveryDate?: string | null;
  remark?: string | null;
  productionManagerId?: number | null;
}

export interface AssignProductSerialUnitInput {
  unitId: string;
  /** 완성 제품 시리얼 — 접두사+끝 4자리 숫자 전체 (예: `YIM_EI0640PA-PC0001`) */
  serialNo: string;
  detectorElementCode: string;
  wavelengthCode: string;
  detectorId?: number | null;
}

export interface AssignProductSerialsPayload {
  units: AssignProductSerialUnitInput[];
  markPlanCompleted?: boolean;
}

/** `GET .../purchase-orders/:orderId/lot/preview` — DB 예약 없음 */
export interface PurchaseOrderLotPreviewEntry {
  lotSequenceNo?: number;
  lotSequenceText?: string;
  unitCode: string;
}

export interface PurchaseOrderLotPreviewResponse {
  previews: PurchaseOrderLotPreviewEntry[];
  quantity?: number;
  issuedDate?: string;
  yearCode?: string;
  partnerCode?: string;
  poComposite?: string;
  sequenceKey?: string;
  maxSequence?: number;
  nextSequence?: number;
}

export interface IssueLotUnitsAssignmentInput {
  offset: number;
  operatorUserId: number;
}

export interface IssueLotUnitsItemInput {
  planItemId: string | number;
  quantity: number;
  unitAssignments?: IssueLotUnitsAssignmentInput[];
}

/** `POST .../production-plans/:planId/issue-lot-units` */
export interface IssueLotUnitsPayload {
  issuedDate?: string;
  items?: IssueLotUnitsItemInput[];
}

/** `PATCH .../production-plan-units/:unitId` — 부분 갱신 */
export interface UpdateProductionPlanUnitPayload {
  unitCode?: string;
  operatorUserId?: number | null;
  detectorSerialNo?: string | null;
  serialNo?: string;
  detectorElementCode?: string;
  wavelengthCode?: string;
  detectorId?: number | null;
}

/** 중복 조회 — `GET /api/production-plan-units/check-*` */
export interface ProductionPlanUnitDuplicateConflict {
  source: string;
  unitId?: string | null;
  unitCode?: string | null;
  productSerialId?: string | number | null;
}

export interface ProductionPlanUnitFieldAvailabilityResult {
  available: boolean;
  conflicts: ProductionPlanUnitDuplicateConflict[];
  serialNo?: string | null;
  detectorSerialNo?: string | null;
  unitCode?: string | null;
}

function parseProductionPlanUnitFieldAvailability(
  raw: unknown
): ProductionPlanUnitFieldAvailabilityResult {
  const body =
    raw && typeof raw === "object" && "data" in raw
      ? (raw as { data: unknown }).data
      : raw;
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const conflictsRaw = Array.isArray(record.conflicts)
    ? record.conflicts
    : [];
  const conflicts: ProductionPlanUnitDuplicateConflict[] = conflictsRaw
    .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
    .map((row) => ({
      source: String(row.source ?? "").trim(),
      unitId: row.unitId != null ? String(row.unitId) : null,
      unitCode: row.unitCode != null ? String(row.unitCode) : null,
      productSerialId:
        row.productSerialId != null ? (row.productSerialId as string | number) : null,
    }));

  return {
    available: record.available === true,
    conflicts,
    serialNo:
      record.serialNo != null ? String(record.serialNo) : undefined,
    detectorSerialNo:
      record.detectorSerialNo != null
        ? String(record.detectorSerialNo)
        : undefined,
    unitCode:
      record.unitCode != null ? String(record.unitCode) : undefined,
  };
}

function appendExcludeUnitId(
  sp: URLSearchParams,
  excludeUnitId?: string | null
): void {
  const id = String(excludeUnitId ?? "").trim();
  if (id) sp.set("excludeUnitId", id);
}

/** `GET /api/production-plan-units/check-product-serial` */
export async function checkProductionPlanUnitProductSerial(
  accessToken: string,
  params: { serialNo: string; excludeUnitId?: string | null }
): Promise<ProductionPlanUnitFieldAvailabilityResult> {
  const serialNo = String(params.serialNo ?? "").trim();
  const sp = new URLSearchParams({ serialNo });
  appendExcludeUnitId(sp, params.excludeUnitId);
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/check-product-serial?${sp.toString()}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "제품 S/N 중복 조회에 실패했습니다.");
  }
  return parseProductionPlanUnitFieldAvailability(await res.json());
}

/** `GET /api/production-plan-units/check-detector-serial` */
export async function checkProductionPlanUnitDetectorSerial(
  accessToken: string,
  params: { detectorSerialNo: string; excludeUnitId?: string | null }
): Promise<ProductionPlanUnitFieldAvailabilityResult> {
  const detectorSerialNo = String(params.detectorSerialNo ?? "").trim();
  const sp = new URLSearchParams({ detectorSerialNo });
  appendExcludeUnitId(sp, params.excludeUnitId);
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/check-detector-serial?${sp.toString()}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "검출기 S/N 중복 조회에 실패했습니다.");
  }
  return parseProductionPlanUnitFieldAvailability(await res.json());
}

/** `GET /api/production-plan-units/check-lot` */
export async function checkProductionPlanUnitLot(
  accessToken: string,
  params: { unitCode: string; excludeUnitId?: string | null }
): Promise<ProductionPlanUnitFieldAvailabilityResult> {
  const unitCode = String(params.unitCode ?? "").trim();
  const sp = new URLSearchParams({ unitCode });
  appendExcludeUnitId(sp, params.excludeUnitId);
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/check-lot?${sp.toString()}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "LOT 중복 조회에 실패했습니다.");
  }
  return parseProductionPlanUnitFieldAvailability(await res.json());
}

/** `POST .../production-plan-units/:unitId/process/pass` */
export interface ProcessUnitPassPayload {
  processCode: string;
  processName: string;
  detectorSerialNo?: string | null;
  remark?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
}

/** `POST .../production-plan-units/:unitId/process/fail` */
export interface ProcessUnitFailPayload {
  processCode: string;
  processName: string;
  failReason: string;
  actionTaken?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
}

/** `POST .../delivery-items/:deliveryItemId/units` */
export interface LinkDeliveryItemUnitsPayload {
  unitIds: string[];
}

export type ListSortOrder = "asc" | "desc";

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

export type ProductionPlanUnitTab =
  | "ALL"
  | "WAITING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED";

/** GET production-plan-units 목록·overview·tab-counts 관점 (기본 production) */
export type ProductionPlanUnitPerspective = "production" | "delivery";

export type ProductionPlanUnitDateBasis = "planned" | "delivery" | "coalesce";

export type DeliveryPlanAssignmentFilter = "unassigned" | "assigned";

export interface ProductionPlanUnitOverviewParams {
  fromMonth?: string;
  toMonth?: string;
  dateBasis?: ProductionPlanUnitDateBasis;
  orderId?: string;
  productionManagerId?: number;
  deliveryPlanAssignment?: DeliveryPlanAssignmentFilter;
  tz?: string;
  perspective?: ProductionPlanUnitPerspective;
}

export interface ProductionPlanUnitCounts {
  all: number;
  waiting: number;
  inProgress: number;
  completed: number;
  delayed: number;
  total: number;
  perspective?: ProductionPlanUnitPerspective;
}

export interface ProductionPlanUnitOverviewMonthlyRow extends ProductionPlanUnitCounts {
  month: string;
}

export interface ProductionPlanUnitOverviewResponse {
  range: {
    fromMonth: string | null;
    toMonth: string | null;
    fromDate?: string | null;
    toDate?: string | null;
    dateBasis: ProductionPlanUnitDateBasis;
    tz?: string;
  };
  summary: ProductionPlanUnitCounts;
  monthly: ProductionPlanUnitOverviewMonthlyRow[];
}

export interface ProductionPlanUnitListParams extends ProductionPlanUnitOverviewParams {
  tab?: ProductionPlanUnitTab;
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: ProductionPlanUnitListSortBy;
  sortOrder?: "asc" | "desc";
}

export type ProductionPlanUnitListSortBy =
  | "dueDate"
  | "deliveredAt"
  | "createdAt"
  | "productionCompletedAt"
  | "orderedAt";

export interface ProductionPlanUnitListResponse {
  meta: {
    tab: ProductionPlanUnitTab;
    page: number;
    pageSize: number;
    total: number;
    dateBasis: ProductionPlanUnitDateBasis;
    fromMonth: string | null;
    toMonth: string | null;
    deliveryPlanAssignment?: DeliveryPlanAssignmentFilter | null;
    perspective?: ProductionPlanUnitPerspective;
  };
  items: Array<{
    unitId: string;
    unitCode?: string | null;
    createdAt?: string | null;
    /** LOT 내 발주·년도·업체·일련 복합 세그먼트 — PP 컬럼 표시 */
    lotPoComposite?: string | null;
    serialNo?: string | null;
    operatorUserId?: number | null;
    operatorEmployeeNoSnapshot?: string | number | null;
    operatorNameSnapshot?: string | null;
    operatorAssignedAt?: string | null;
    /** 검출기 시리얼 — 목록 API가 내려주면 표시 */
    detectorSerialNo?: string | null;
    /** 실납품 payload용 — 목록에 포함 시 Unit 상세 N+1 생략 */
    detectorElementCode?: string | null;
    wavelengthCode?: string | null;
    detectorId?: number | null;
    serialSnapshot?: DeliverySerialSnapshotPayload | Record<string, unknown> | null;
    currentProcessCode?: string | null;
    currentProcessName?: string | null;
    processStatus?: string | null;
    /** 목록 API가 내려주는 공정 상태 표시명(우선 표시) */
    processStatusName?: string | null;
    qualityStatus?: string | null;
    isDeliveryReady?: boolean;
    isDelivered?: boolean;
    dueDate?: string | null;
    deliveredAt?: string | null;
    /** 포장 PASS → isDeliveryReady=true 시각 (perspective=production 완료일) */
    productionCompletedAt?: string | null;
    /** 납품 계획 예정일 (perspective=delivery 예정일 fallback) */
    deliveryPlanPlannedDeliveryDate?: string | null;
    delayDays?: number | null;
    plan?: {
      planId?: string;
      planNo?: string | null;
      planSeq?: number | null;
      plannedDate?: string | null;
      deliveryDate?: string | null;
      status?: string | null;
    } | null;
    order?: {
      orderId?: string;
      orderNo?: string | null;
      orderDate?: string | null;
      orderedAt?: string | null;
      partnerId?: string;
      partnerName?: string | null;
      /** 레거시·평탄화 응답용 — `partner.countryCode` 우선 */
      partnerCountryCode?: string | null;
    } | null;
    /** 발주 거래처 스냅샷 — `countryCode`로 국기·국가명 표시 */
    partner?: {
      id?: string;
      code?: string | null;
      name?: string | null;
      type?: string | null;
      countryCode?: string | null;
      [key: string]: unknown;
    } | null;
    item?: {
      productionPlanItemId?: number | null;
      purchaseOrderItemId?: number | null;
      productNameSnapshot?: string | null;
      businessNameSnapshot?: string | null;
    } | null;
    manager?: {
      productionManagerId?: number | null;
      productionManagerName?: string | null;
      department?: string | null;
    } | null;
    isInDeliveryPlan?: boolean;
    deliveryPlanId?: string | null;
    deliveryPlanNo?: string | null;
  }>;
}

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

/** `POST /purchase-orders/delivery-plans/:planId/deliver` */
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

/** `GET /api/production-plan-units/:id` — 목록 item + 단건 전용 필드 */
export type ProductionPlanUnitListItem =
  ProductionPlanUnitListResponse["items"][number];

/** `GET /api/production-plans` 탭 — 납품 계획 목록과 동형 */
export type ProductionPlanListTab = "ALL" | "OPEN" | "COMPLETED" | "DELAYED";

/** `GET /api/production-plans` — 납품 배정 coverage 필터 (탭과 AND) */
export type ProductionPlanDeliveryCoverageFilter = "none" | "partial" | "full";

export type ProductionPlanDeliveryCoverage = "NONE" | "PARTIAL" | "FULL";

export interface ProductionPlanDeliveryCoverageInfo {
  totalUnitCount: number;
  assignedUnitCount: number;
  unassignedUnitCount: number;
  coverage: ProductionPlanDeliveryCoverage;
  deliveryPlanIds: string[];
}

export type ProductionPlanListSortBy =
  | "plannedDate"
  | "dueDate"
  | "createdAt"
  | "orderedAt"
  | "planNo";

export interface ProductionPlanUnitSummary {
  total?: number;
  waiting?: number;
  inProgress?: number;
  deliveryReady?: number;
  completed?: number;
  delayed?: number;
  /** 납품 계획 배정 유닛 수 (목록 API optional) */
  deliveryAssigned?: number;
  deliveryUnassigned?: number;
  [key: string]: unknown;
}

export interface ProductionPlanListItem {
  planId: string;
  planNo?: string | null;
  title?: string | null;
  planSeq?: number | null;
  orderId?: string | null;
  orderNo?: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
  partnerCountryCode?: string | null;
  plannedDate?: string | null;
  plannedDeliveryDate?: string | null;
  deliveryDate?: string | null;
  dueDate?: string | null;
  productionManagerId?: number | null;
  productionManagerName?: string | null;
  status?: string | null;
  statusName?: string | null;
  unitSummary?: ProductionPlanUnitSummary | null;
  deliveryCoverage?: ProductionPlanDeliveryCoverageInfo | null;
  selectableForDelivery?: boolean;
}

/** 목록 tab 필드와 1:1 (total === all) — 진행 상태 (레거시·납품 계획과 동형) */
export interface ProductionPlanTabCounts {
  all: number;
  open: number;
  completed: number;
  delayed: number;
  total: number;
}

/** `GET /api/production-plans/coverage-counts` — 배정 coverage 탭 배지 */
export interface ProductionPlanCoverageCounts {
  all: number;
  none: number;
  partial: number;
  full: number;
  total: number;
}

export interface ProductionPlanListOverviewParams extends ProductionPlanUnitOverviewParams {
  partnerId?: string;
}

export interface ProductionPlanListParams extends ProductionPlanListOverviewParams {
  tab?: ProductionPlanListTab;
  deliveryCoverage?: ProductionPlanDeliveryCoverageFilter;
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: ProductionPlanListSortBy;
  sortOrder?: "asc" | "desc";
}

export interface ProductionPlanListResponse {
  meta: {
    tab: ProductionPlanListTab;
    page: number;
    pageSize: number;
    total: number;
    dateBasis?: ProductionPlanUnitDateBasis;
    fromMonth?: string | null;
    toMonth?: string | null;
  };
  items: ProductionPlanListItem[];
}

export interface ProductionPlanUnitDeliveryNested {
  deliveryId?: number | string | null;
  deliveryNo?: string | null;
  deliveryDate?: string | null;
  [key: string]: unknown;
}

export interface ProductionPlanUnitDetail extends ProductionPlanUnitListItem {
  unitNo?: number | null;
  lotIssuedDate?: string | null;
  lotPoComposite?: string | null;
  lotSequenceNo?: number | null;
  productSerialAssignedAt?: string | null;
  detectorId?: number | null;
  detectorType?: string | null;
  detectorElementCode?: string | null;
  wavelengthCode?: string | null;
  rmaCount?: number | null;
  delivery?: ProductionPlanUnitDeliveryNested | null;
  [key: string]: unknown;
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

  return {
    ...data,
    ...(partnerMapped !== undefined ? { partner: partnerMapped } : {}),
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

function parsePagedListNumber(
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
  payload: PurchaseOrderItemPayload,
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

function appendProductionPlanUnitOverviewParams(
  sp: URLSearchParams,
  params: ProductionPlanUnitOverviewParams
) {
  const fromMonth = String(params.fromMonth ?? "").trim();
  const toMonth = String(params.toMonth ?? "").trim();
  if (fromMonth && toMonth) {
    sp.set("fromMonth", fromMonth);
    sp.set("toMonth", toMonth);
  }
  if (params.dateBasis) sp.set("dateBasis", params.dateBasis);
  if (params.orderId && String(params.orderId).trim() !== "") {
    sp.set("orderId", String(params.orderId).trim());
  }
  if (
    params.productionManagerId != null &&
    Number.isFinite(Number(params.productionManagerId))
  ) {
    sp.set("productionManagerId", String(params.productionManagerId));
  }
  if (params.tz && String(params.tz).trim() !== "") {
    sp.set("tz", String(params.tz).trim());
  }
  if (params.deliveryPlanAssignment) {
    sp.set("deliveryPlanAssignment", params.deliveryPlanAssignment);
  }
  const perspective = params.perspective ?? "production";
  sp.set("perspective", perspective);
}

/** `GET /api/production-plan-units/overview` */
export async function getProductionPlanUnitOverview(
  accessToken: string,
  params: ProductionPlanUnitOverviewParams
): Promise<ProductionPlanUnitOverviewResponse> {
  const sp = new URLSearchParams();
  appendProductionPlanUnitOverviewParams(sp, params);
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/overview${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(
      res,
      "생산 유닛 오버뷰를 불러오지 못했습니다."
    );
  }
  return res.json();
}

/** `GET /api/production-plan-units/tab-counts` */
export async function getProductionPlanUnitTabCounts(
  accessToken: string,
  params: ProductionPlanUnitOverviewParams
): Promise<ProductionPlanUnitCounts> {
  const sp = new URLSearchParams();
  appendProductionPlanUnitOverviewParams(sp, params);
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/tab-counts${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(
      res,
      "생산 유닛 탭 건수를 불러오지 못했습니다."
    );
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const perspectiveRaw = String(raw.perspective ?? "").trim();
  const perspective: ProductionPlanUnitPerspective =
    perspectiveRaw === "delivery" ? "delivery" : "production";
  return {
    all: Number(raw.all) || 0,
    waiting: Number(raw.waiting) || 0,
    inProgress: Number(raw.inProgress) || 0,
    completed: Number(raw.completed) || 0,
    delayed: Number(raw.delayed) || 0,
    total: Number(raw.total) || Number(raw.all) || 0,
    perspective,
  };
}

/** `GET /api/production-plan-units` */
export async function getProductionPlanUnits(
  accessToken: string,
  params: ProductionPlanUnitListParams
): Promise<ProductionPlanUnitListResponse> {
  const sp = new URLSearchParams();
  appendProductionPlanUnitOverviewParams(sp, params);
  sp.set("tab", params.tab ?? "ALL");
  if (params.page != null && params.page > 0) sp.set("page", String(params.page));
  if (params.pageSize != null && params.pageSize > 0) {
    sp.set("pageSize", String(params.pageSize));
  }
  if (params.q && String(params.q).trim() !== "") sp.set("q", String(params.q).trim());
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.sortOrder) sp.set("sortOrder", params.sortOrder);
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(
      res,
      "생산 유닛 목록을 불러오지 못했습니다."
    );
  }
  return res.json();
}

function appendProductionPlanListOverviewParams(
  sp: URLSearchParams,
  params: ProductionPlanListOverviewParams
) {
  appendProductionPlanUnitOverviewParams(sp, params);
  if (params.partnerId && String(params.partnerId).trim() !== "") {
    sp.set("partnerId", String(params.partnerId).trim());
  }
}

function normalizeProductionPlanUnitSummary(
  raw: unknown
): ProductionPlanUnitSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const totalRaw = Number(o.total);
  const total = Number.isFinite(totalRaw) ? totalRaw : undefined;
  const deliveryAssignedRaw =
    o.deliveryAssigned ??
    o.delivery_assigned ??
    o.inDeliveryPlan ??
    o.in_delivery_plan ??
    o.assigned;
  const deliveryUnassignedRaw =
    o.deliveryUnassigned ??
    o.delivery_unassigned ??
    o.unassigned;
  const deliveryAssigned =
    deliveryAssignedRaw != null && Number.isFinite(Number(deliveryAssignedRaw))
      ? Number(deliveryAssignedRaw)
      : undefined;
  const deliveryUnassigned =
    deliveryUnassignedRaw != null &&
    Number.isFinite(Number(deliveryUnassignedRaw))
      ? Number(deliveryUnassignedRaw)
      : deliveryAssigned != null && total != null
        ? Math.max(0, total - deliveryAssigned)
        : undefined;

  return {
    ...(o as ProductionPlanUnitSummary),
    total,
    deliveryAssigned,
    deliveryUnassigned,
  };
}

function normalizeProductionPlanDeliveryCoverage(
  raw: unknown
): ProductionPlanDeliveryCoverageInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const coverageRaw = String(o.coverage ?? "").trim().toUpperCase();
  const coverage: ProductionPlanDeliveryCoverage =
    coverageRaw === "PARTIAL"
      ? "PARTIAL"
      : coverageRaw === "FULL"
        ? "FULL"
        : "NONE";
  const idsRaw = o.deliveryPlanIds ?? o.delivery_plan_ids;
  const deliveryPlanIds = Array.isArray(idsRaw)
    ? idsRaw.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];
  return {
    totalUnitCount: Number(o.totalUnitCount ?? o.total_unit_count) || 0,
    assignedUnitCount: Number(o.assignedUnitCount ?? o.assigned_unit_count) || 0,
    unassignedUnitCount:
      Number(o.unassignedUnitCount ?? o.unassigned_unit_count) || 0,
    coverage,
    deliveryPlanIds,
  };
}

function nestedRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object"
    ? (raw as Record<string, unknown>)
    : null;
}

function nestedString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
}

/** `GET /api/production-plans` — 중첩 `purchaseOrder`·`productionManager` 평탄화 */
function normalizeProductionPlanListItem(
  raw: Record<string, unknown>
): ProductionPlanListItem {
  const planId = String(raw.planId ?? raw.id ?? "").trim();
  const unitSummaryRaw = raw.unitSummary ?? raw.unit_summary;
  const unitSummary = normalizeProductionPlanUnitSummary(unitSummaryRaw);
  const deliveryCoverageRaw = raw.deliveryCoverage ?? raw.delivery_coverage;
  const deliveryCoverage = normalizeProductionPlanDeliveryCoverage(
    deliveryCoverageRaw
  );

  const orderNested = nestedRecord(raw.order);
  const purchaseOrder =
    nestedRecord(raw.purchaseOrder) ?? nestedRecord(raw.purchase_order);
  const partner =
    nestedRecord(raw.partner) ??
    nestedRecord(purchaseOrder?.partner) ??
    nestedRecord(purchaseOrder?.partnerSummary) ??
    nestedRecord(purchaseOrder?.partner_summary);
  const productionManager =
    nestedRecord(raw.productionManager) ??
    nestedRecord(raw.production_manager);

  const orderId = nestedString(
    raw.orderId,
    raw.order_id,
    raw.purchaseOrderId,
    raw.purchase_order_id,
    orderNested?.orderId,
    orderNested?.order_id,
    orderNested?.id,
    purchaseOrder?.id
  );
  const orderNo = nestedString(
    raw.orderNo,
    raw.order_no,
    orderNested?.orderNo,
    orderNested?.order_no,
    purchaseOrder?.orderNo,
    purchaseOrder?.order_no
  );
  const partnerId = nestedString(raw.partnerId, raw.partner_id, partner?.id);
  const partnerName = nestedString(
    raw.partnerName,
    raw.partner_name,
    partner?.name
  );
  const partnerCountryCode = nestedString(
    raw.partnerCountryCode,
    raw.partner_country_code,
    raw.countryCode,
    raw.country_code,
    orderNested?.partnerCountryCode,
    orderNested?.partner_country_code,
    purchaseOrder?.partnerCountryCode,
    purchaseOrder?.partner_country_code,
    purchaseOrder?.countryCode,
    purchaseOrder?.country_code,
    partner?.countryCode,
    partner?.country_code,
    partner?.country,
    partner?.nationCode,
    partner?.nation_code
  );
  const dueDate = nestedString(
    raw.dueDate,
    raw.due_date,
    orderNested?.dueDate,
    orderNested?.due_date,
    orderNested?.requestDeliveryDate,
    orderNested?.request_delivery_date,
    purchaseOrder?.dueDate,
    purchaseOrder?.due_date,
    purchaseOrder?.requestDeliveryDate,
    purchaseOrder?.request_delivery_date
  );
  const productionManagerName = nestedString(
    raw.productionManagerName,
    raw.production_manager_name,
    productionManager?.name
  );
  const productionManagerIdRaw =
    raw.productionManagerId ??
    raw.production_manager_id ??
    productionManager?.id;

  return {
    planId,
    planNo: (raw.planNo as string | null | undefined) ?? null,
    title: (raw.title as string | null | undefined) ?? null,
    planSeq:
      raw.planSeq != null && Number.isFinite(Number(raw.planSeq))
        ? Number(raw.planSeq)
        : null,
    orderId,
    orderNo,
    partnerId,
    partnerName,
    partnerCountryCode,
    plannedDate:
      (raw.plannedDate as string | null | undefined) ??
      (raw.plannedDeliveryDate as string | null | undefined) ??
      null,
    plannedDeliveryDate:
      (raw.plannedDeliveryDate as string | null | undefined) ?? null,
    deliveryDate: (raw.deliveryDate as string | null | undefined) ?? null,
    dueDate,
    productionManagerId:
      productionManagerIdRaw != null &&
      Number.isFinite(Number(productionManagerIdRaw))
        ? Number(productionManagerIdRaw)
        : null,
    productionManagerName,
    status: (raw.status as string | null | undefined) ?? null,
    statusName: (raw.statusName as string | null | undefined) ?? null,
    unitSummary,
    deliveryCoverage,
    selectableForDelivery:
      raw.selectableForDelivery === true ||
      raw.selectable_for_delivery === true,
  };
}

function parseProductionPlanListResponse(
  raw: unknown,
  fallbackTab: ProductionPlanListTab
): ProductionPlanListResponse {
  if (Array.isArray(raw)) {
    const items = raw.map((row) =>
      normalizeProductionPlanListItem(
        (row ?? {}) as Record<string, unknown>
      )
    );
    return {
      meta: {
        tab: fallbackTab,
        page: 1,
        pageSize: items.length || 20,
        total: items.length,
      },
      items,
    };
  }

  const o = (raw ?? {}) as Record<string, unknown>;
  const metaRaw = (o.meta ?? {}) as Record<string, unknown>;
  const itemsRaw = o.items ?? o.data ?? [];
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) =>
        normalizeProductionPlanListItem(
          (row ?? {}) as Record<string, unknown>
        )
      )
    : [];

  return {
    meta: {
      tab: (metaRaw.tab as ProductionPlanListTab) ?? fallbackTab,
      page: Number(metaRaw.page) || 1,
      pageSize: Number(metaRaw.pageSize) || items.length || 20,
      total: Number(metaRaw.total) ?? items.length,
      dateBasis: metaRaw.dateBasis as ProductionPlanUnitDateBasis | undefined,
      fromMonth: (metaRaw.fromMonth as string | null) ?? null,
      toMonth: (metaRaw.toMonth as string | null) ?? null,
    },
    items,
  };
}

/** `GET /api/production-plans/tab-counts` */
export async function getProductionPlanTabCounts(
  accessToken: string,
  params?: ProductionPlanListOverviewParams
): Promise<ProductionPlanTabCounts> {
  const sp = new URLSearchParams();
  if (params) appendProductionPlanListOverviewParams(sp, params);
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plans/tab-counts${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(
      res,
      "생산 계획 탭 건수를 불러오지 못했습니다."
    );
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

function parseProductionPlanCoverageCounts(
  raw: Record<string, unknown>
): ProductionPlanCoverageCounts {
  const all = Number(raw.all) || Number(raw.total) || 0;
  return {
    all,
    none: Number(raw.none) || 0,
    partial: Number(raw.partial) || 0,
    full: Number(raw.full) || 0,
    total: Number(raw.total) || all,
  };
}

/** `GET /api/production-plans/coverage-counts` — 목록과 동일 필터, coverage·페이지 제외 */
export async function getProductionPlanCoverageCounts(
  accessToken: string,
  params?: ProductionPlanListOverviewParams
): Promise<ProductionPlanCoverageCounts> {
  const sp = new URLSearchParams();
  if (params) appendProductionPlanListOverviewParams(sp, params);
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plans/coverage-counts${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (res.ok) {
    const raw = (await res.json()) as Record<string, unknown>;
    return parseProductionPlanCoverageCounts(raw);
  }
  const fallback = await getProductionPlanTabCounts(accessToken, params);
  return {
    all: fallback.all,
    none: 0,
    partial: 0,
    full: 0,
    total: fallback.total || fallback.all,
  };
}

/** `GET /api/production-plans` */
export async function getProductionPlans(
  accessToken: string,
  params: ProductionPlanListParams
): Promise<ProductionPlanListResponse> {
  const sp = new URLSearchParams();
  appendProductionPlanListOverviewParams(sp, params);
  const tab = params.tab ?? "ALL";
  sp.set("tab", tab);
  if (params.deliveryCoverage) {
    sp.set("deliveryCoverage", params.deliveryCoverage);
  }
  if (params.page != null && params.page > 0) sp.set("page", String(params.page));
  if (params.pageSize != null && params.pageSize > 0) {
    sp.set("pageSize", String(params.pageSize));
  }
  if (params.q && String(params.q).trim() !== "") sp.set("q", String(params.q).trim());
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.sortOrder) sp.set("sortOrder", params.sortOrder);
  const qs = sp.toString();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plans${qs ? `?${qs}` : ""}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "생산 계획 목록을 불러오지 못했습니다.");
  }
  const raw = await res.json();
  return parseProductionPlanListResponse(raw, tab);
}

/** `GET /api/production-plan-units/:id` (`delivery.read`) */
export async function getProductionPlanUnitById(
  accessToken: string,
  unitId: string
): Promise<ProductionPlanUnitDetail> {
  const uid = String(unitId ?? "").trim();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/${encodeURIComponent(uid)}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "Unit 정보를 불러오지 못했습니다.");
  }
  return res.json();
}

/** `GET /api/deliveries/:deliveryId` — 납품 단건 (`delivery.read`) */
export async function getDeliveryById(
  deliveryId: number,
  accessToken: string
): Promise<Delivery> {
  const res = await fetchAuthorized(
    `${API_BASE}/deliveries/${deliveryId}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 정보를 불러오지 못했습니다.");
  }
  return res.json();
}

/** `GET /purchase-orders/:id/deliveries` */
export async function getDeliveries(
  purchaseOrderId: string,
  accessToken: string
): Promise<Delivery[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/deliveries`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

/** `POST /purchase-orders/:purchaseOrderId/production-plans` */
export async function createProductionPlan(
  purchaseOrderId: string,
  payload: ProductionPlanCreatePayload,
  accessToken: string
): Promise<ProductionPlan> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/production-plans`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "생산 계획을 등록하지 못했습니다.");
  }
  return res.json();
}

/** `GET /purchase-orders/:purchaseOrderId/lot/preview` */
export async function getPurchaseOrderLotPreview(
  purchaseOrderId: string,
  params: { quantity: number; issuedDate: string },
  accessToken: string
): Promise<PurchaseOrderLotPreviewResponse> {
  const q = new URLSearchParams();
  q.set("quantity", String(Math.max(1, Math.trunc(params.quantity))));
  q.set("issuedDate", String(params.issuedDate ?? "").trim());
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/lot/preview?${q.toString()}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "LOT 미리보기를 불러오지 못했습니다.");
  }
  const data = await res.json();
  const previews = Array.isArray(data?.previews)
    ? data.previews
    : Array.isArray(data?.data?.previews)
      ? data.data.previews
      : [];
  return {
    previews: previews.map(
      (p: {
        lotSequenceNo?: number;
        lotSequenceText?: string;
        unitCode?: string;
      }) => ({
        lotSequenceNo:
          typeof p?.lotSequenceNo === "number" && Number.isFinite(p.lotSequenceNo)
            ? p.lotSequenceNo
            : undefined,
        lotSequenceText: String(p?.lotSequenceText ?? "").trim() || undefined,
      unitCode: String(p?.unitCode ?? "").trim(),
      })
    ),
    quantity: data?.quantity ?? data?.data?.quantity,
    issuedDate: data?.issuedDate ?? data?.data?.issuedDate,
    yearCode: data?.yearCode ?? data?.data?.yearCode,
    partnerCode: data?.partnerCode ?? data?.data?.partnerCode,
    poComposite: data?.poComposite ?? data?.data?.poComposite,
    sequenceKey: data?.sequenceKey ?? data?.data?.sequenceKey,
    maxSequence: data?.maxSequence ?? data?.data?.maxSequence,
    nextSequence: data?.nextSequence ?? data?.data?.nextSequence,
  };
}

/** `POST /purchase-orders/production-plans/:planId/issue-lot-units` */
export async function issueProductionPlanLotUnits(
  planId: string,
  payload: IssueLotUnitsPayload,
  accessToken: string
): Promise<ProductionPlan> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plans/${planId}/issue-lot-units`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload ?? {}),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "LOT를 발급하지 못했습니다.");
  }
  return res.json();
}

/** `POST /purchase-orders/production-plans/:planId/assign-product-serials` */
export async function assignProductSerialsToPlan(
  planId: string,
  payload: AssignProductSerialsPayload,
  accessToken: string
): Promise<ProductionPlan> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plans/${planId}/assign-product-serials`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "제품 시리얼을 확정하지 못했습니다.");
  }
  return res.json();
}

/** `POST /purchase-orders/production-plan-items/:planItemId/units` — LOT 자동, 본문 `{}` */
export async function createProductionPlanItemUnit(
  planItemId: string,
  accessToken: string
): Promise<ProductionPlanUnit> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plan-items/${planItemId}/units`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify({}),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "생산 유닛을 추가하지 못했습니다.");
  }
  return res.json();
}

/** `GET /purchase-orders/:purchaseOrderId/production-plans` — 발주별 목록 (planSeq 오름차순·관계 로드) */
export async function getPurchaseOrderProductionPlans(
  purchaseOrderId: string,
  accessToken: string
): Promise<ProductionPlan[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/production-plans`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "생산 계획 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

/** `GET /purchase-orders/production-plans/:planId` */
export async function getProductionPlan(
  planId: string,
  accessToken: string
): Promise<ProductionPlan> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plans/${planId}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "생산 계획을 불러오지 못했습니다.");
  }
  return res.json();
}

/** `GET /api/delivery-plans` — 납품 계획 전역 목록 (`delivery.read`) */
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

/** `GET /purchase-orders/delivery-plans/:planId` */
export async function getDeliveryPlan(
  planId: string,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/delivery-plans/${encodeURIComponent(planId)}`,
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

/** `PATCH /purchase-orders/delivery-plans/:planId` */
export async function patchDeliveryPlan(
  planId: string,
  payload: DeliveryPlanPatchPayload,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/delivery-plans/${encodeURIComponent(planId)}`,
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

/** `POST /purchase-orders/delivery-plans/:planId/units` */
export async function addUnitsToDeliveryPlan(
  planId: string,
  payload: DeliveryPlanAddUnitsPayload,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/delivery-plans/${encodeURIComponent(planId)}/units`,
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

/** `DELETE /purchase-orders/delivery-plans/:planId/units/:unitId` */
export async function removeUnitFromDeliveryPlan(
  planId: string,
  unitId: string,
  accessToken: string
): Promise<DeliveryPlanDetailResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/delivery-plans/${encodeURIComponent(planId)}/units/${encodeURIComponent(unitId)}`,
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
 * `POST /purchase-orders/delivery-plans/:planId/deliver`
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
    `${API_BASE}/purchase-orders/delivery-plans/${encodeURIComponent(planId)}/deliver`,
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

/** `POST /purchase-orders/:orderId/production-plans/split` — 새 계획 + 품목 행 + 유닛 이동(한 트랜잭션) */
export interface SplitProductionPlanPayload {
  unitIds: string[];
  deliveryDate?: string | null;
  plannedDeliveryDate?: string | null;
  detectorHandoverExpectedDate?: string | null;
  productionManagerId?: number | null;
  title?: string | null;
  remark?: string | null;
}

export interface SplitProductionPlanResponse {
  plan: ProductionPlan;
  newPlanItemId?: number;
  movedUnits?: ProductionPlanUnit[];
}

export async function splitProductionPlan(
  orderId: string,
  payload: SplitProductionPlanPayload,
  accessToken: string
): Promise<SplitProductionPlanResponse> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/${orderId}/production-plans/split`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "생산 계획 분할에 실패했습니다.");
  }
  return res.json();
}

/** `POST /purchase-orders/production-plans/:planId/plan-items` — 유닛 없이 품목 행만 추가 */
export interface AddProductionPlanItemPayload {
  purchaseOrderItemId: number;
  /** 생략·null이면 서버에서 0 */
  plannedQty?: number | null;
}

export async function addProductionPlanPlanItem(
  planId: string,
  payload: AddProductionPlanItemPayload,
  accessToken: string
): Promise<ProductionPlanItem> {
  const body: Record<string, unknown> = {
    purchaseOrderItemId: payload.purchaseOrderItemId,
  };
  if (payload.plannedQty != null) {
    body.plannedQty = payload.plannedQty;
  }
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plans/${planId}/plan-items`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(body),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "생산 계획 품목을 추가하지 못했습니다.");
  }
  return res.json();
}

/** `POST /purchase-orders/production-plan-items/:planItemId/move-units` */
export interface MoveProductionPlanUnitsPayload {
  unitIds: string[];
}

export async function moveProductionPlanItemUnits(
  planItemId: string | number,
  payload: MoveProductionPlanUnitsPayload,
  accessToken: string
): Promise<ProductionPlanUnit[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plan-items/${planItemId}/move-units`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "생산 계획 제품을 옮기지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

/** `POST .../process/pass` · `.../process/fail` 응답 — `{ unit, processRecord }` 또는 구형 단일 `ProductionPlanUnit` */
export type ProcessUnitMutationResult = {
  unit: ProductionPlanUnit;
  processRecord: UnitProcessRecord | null;
};

function asObjectRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

/** 응답 본문에서 공정 이력 객체 후보를 꺼냄(camelCase / snake_case / 별칭) */
function pickProcessRecordFromEnvelope(
  o: Record<string, unknown>
): UnitProcessRecord | null {
  const candidates = [
    o.processRecord,
    o.process_record,
    o.record,
    o.unitProcessRecord,
    o.unit_process_record,
    o.latestProcessRecord,
    o.latest_process_record,
  ];
  for (const c of candidates) {
    if (c && typeof c === "object") return c as UnitProcessRecord;
  }
  return null;
}

function parseProcessUnitMutationResponse(
  data: unknown
): ProcessUnitMutationResult {
  let o = asObjectRecord(data);
  if (!o) {
    return { unit: data as ProductionPlanUnit, processRecord: null };
  }

  // `{ data: { unit, processRecord } }` 등
  const wrapped = asObjectRecord(o.data);
  if (wrapped && (wrapped.unit != null || wrapped.productionPlanUnit != null)) {
    o = wrapped;
  }

  const unitRaw =
    o.unit ?? o.productionPlanUnit ?? o.production_plan_unit ?? null;
  if (unitRaw && typeof unitRaw === "object") {
    return {
      unit: unitRaw as ProductionPlanUnit,
      processRecord: pickProcessRecordFromEnvelope(o),
    };
  }

  // 본문이 곧 이력 한 건이고 unitId만 있는 경우(유닛 객체 없음)
  const recordUnitId =
    typeof o.unitId === "string" ? o.unitId.trim() : "";
  const looksLikeProcessRecord =
    (o.result === "PASS" || o.result === "FAIL") && recordUnitId !== "";
  if (looksLikeProcessRecord) {
    return {
      unit: { id: recordUnitId } as ProductionPlanUnit,
      processRecord: o as unknown as UnitProcessRecord,
    };
  }

  // 본문이 곧 Unit JSON( id는 문자열인 경우가 많음 ) + 형제 필드에 이력
  if (typeof o.id === "string" && o.id.trim() !== "") {
    const nested = pickProcessRecordFromEnvelope(o);
    return {
      unit: o as unknown as ProductionPlanUnit,
      processRecord: nested,
    };
  }

  return {
    unit: data as ProductionPlanUnit,
    processRecord: null,
  };
}

/** `PATCH /purchase-orders/production-plan-units/:unitId` */
export async function updateProductionPlanUnit(
  unitId: string,
  payload: UpdateProductionPlanUnitPayload,
  accessToken: string
): Promise<ProductionPlanUnitDetail> {
  const uid = String(unitId ?? "").trim();
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plan-units/${encodeURIComponent(uid)}`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "Unit 정보를 수정하지 못했습니다.");
  }
  const raw: unknown = await res.json();
  if (raw && typeof raw === "object" && "data" in raw) {
    return (raw as { data: ProductionPlanUnitDetail }).data;
  }
  return raw as ProductionPlanUnitDetail;
}

/** `POST /purchase-orders/production-plan-units/:unitId/process/pass` */
export async function processProductionPlanUnitPass(
  unitId: string,
  payload: ProcessUnitPassPayload,
  accessToken: string
): Promise<ProcessUnitMutationResult> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plan-units/${unitId}/process/pass`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "공정 PASS 처리에 실패했습니다.");
  }
  const data: unknown = await res.json();
  return parseProcessUnitMutationResponse(data);
}

/** `POST /purchase-orders/production-plan-units/:unitId/process/fail` */
export async function processProductionPlanUnitFail(
  unitId: string,
  payload: ProcessUnitFailPayload,
  accessToken: string
): Promise<ProcessUnitMutationResult> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plan-units/${unitId}/process/fail`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "공정 FAIL 처리에 실패했습니다.");
  }
  const data: unknown = await res.json();
  return parseProcessUnitMutationResponse(data);
}

/**
 * `POST /purchase-orders/production-plan-units/:unitId/process-records/:recordId/files`
 * multipart, 필드명 `files` (`POST /purchase-orders/:id/files`와 동일).
 */
export async function uploadProductionPlanUnitProcessRecordFiles(
  unitId: string,
  recordId: string,
  files: File[],
  accessToken: string
): Promise<void> {
  if (!accessToken?.trim()) {
    throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  }
  const uid = unitId.trim();
  const rid = String(recordId ?? "").trim();
  if (!uid || !rid) {
    throw new Error("유닛 또는 이력 정보가 올바르지 않습니다.");
  }
  if (files.length === 0) {
    throw new Error("파일을 1개 이상 선택해 주세요.");
  }
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plan-units/${uid}/process-records/${encodeURIComponent(rid)}/files`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: form,
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "공정 이력 첨부를 업로드하지 못했습니다.");
  }
}

/** `GET /purchase-orders/production-plan-units/:unitId/process-records` */
export async function getProductionPlanUnitProcessRecords(
  unitId: string,
  accessToken: string
): Promise<UnitProcessRecord[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/production-plan-units/${unitId}/process-records`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "공정 이력을 불러오지 못했습니다.");
  }
  const data: unknown = await res.json();
  if (Array.isArray(data)) {
    return data as UnitProcessRecord[];
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.records)) {
      return o.records as UnitProcessRecord[];
    }
    if (Array.isArray(o.data)) {
      return o.data as UnitProcessRecord[];
    }
  }
  return [];
}

/**
 * 첨부 업로드에 쓸 `unit_process_records.id`를 확보합니다.
 * 1) pass/fail 응답의 `processRecord` 등
 * 2) 없으면 `GET .../process-records`로 재조회 후, 동일 공정 코드 우선·그다음 최신 순으로 선택
 */
export async function resolveProcessRecordIdForUpload(
  parsed: ProcessUnitMutationResult,
  unitId: string,
  processCode: string,
  accessToken: string
): Promise<string | null> {
  const fromResponse = parsed.processRecord?.id;
  if (fromResponse != null && String(fromResponse).trim() !== "") {
    return String(fromResponse);
  }

  const list = await getProductionPlanUnitProcessRecords(unitId, accessToken);
  const code = processCode.trim();
  const sorted = [...list].sort((a, b) => {
    const sb = Number(b.processSeq ?? 0);
    const sa = Number(a.processSeq ?? 0);
    if (sb !== sa) return sb - sa;
    const tb = Date.parse(String(b.createdAt ?? b.endedAt ?? ""));
    const ta = Date.parse(String(a.createdAt ?? a.endedAt ?? ""));
    if (!Number.isNaN(tb) && !Number.isNaN(ta) && tb !== ta) return tb - ta;
    return String(b.id ?? "").localeCompare(String(a.id ?? ""));
  });
  const byCode = sorted.find(
    (r) => String(r.processCode ?? "").trim() === code
  );
  const chosen = byCode ?? sorted[0];
  const id = chosen?.id;
  return id != null && String(id).trim() !== "" ? String(id) : null;
}

/** `POST /purchase-orders/delivery-items/:deliveryItemId/units` */
export async function linkUnitsToDeliveryItem(
  deliveryItemId: number,
  payload: LinkDeliveryItemUnitsPayload,
  accessToken: string
): Promise<DeliveryItemUnit[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/purchase-orders/delivery-items/${deliveryItemId}/units`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 라인에 Unit을 연결하지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
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
                stepNo: stepOrder,
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
 * 그룹 목록만 필요하면 `getCommonCodeGroups` 등 **표준** `/common-codes/groups` 를 사용하세요.
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
