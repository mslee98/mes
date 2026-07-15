import {
  API_BASE,
  authHeaders,
  jsonHeaders,
  fetchAuthorized,
  createApiError,
} from "./http";
import type { ProductionPlanPurchaseOrderNested } from "./partners";
import type {
  Delivery,
  DeliveryActorUserRef,
  DeliverySerialSnapshotPayload,
} from "./deliveries";

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
    /** 목록·평탄화 응답에 올 수 있는 발주 PK */
    purchaseOrderId?: string | null;
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

/** `POST /production-plans/:planId/issue-lot-units` */
export async function issueProductionPlanLotUnits(
  planId: string,
  payload: IssueLotUnitsPayload,
  accessToken: string
): Promise<ProductionPlan> {
  const res = await fetchAuthorized(
    `${API_BASE}/production-plans/${planId}/issue-lot-units`,
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

/** `POST /production-plans/:planId/assign-product-serials` */
export async function assignProductSerialsToPlan(
  planId: string,
  payload: AssignProductSerialsPayload,
  accessToken: string
): Promise<ProductionPlan> {
  const res = await fetchAuthorized(
    `${API_BASE}/production-plans/${planId}/assign-product-serials`,
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

/** `GET /production-plans/:planId` */
export async function getProductionPlan(
  planId: string,
  accessToken: string
): Promise<ProductionPlan> {
  const res = await fetchAuthorized(
    `${API_BASE}/production-plans/${planId}`,
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

/** `POST /production-plans/:planId/plan-items` — 유닛 없이 품목 행만 추가 (alias `/purchase-orders/production-plans/...`도 유효) */
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
    `${API_BASE}/production-plans/${planId}/plan-items`,
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

/** `PATCH /production-plan-units/:unitId` */
export async function updateProductionPlanUnit(
  unitId: string,
  payload: UpdateProductionPlanUnitPayload,
  accessToken: string
): Promise<ProductionPlanUnitDetail> {
  const uid = String(unitId ?? "").trim();
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/${encodeURIComponent(uid)}`,
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

/** `POST /production-plan-units/:unitId/process/pass` */
export async function processProductionPlanUnitPass(
  unitId: string,
  payload: ProcessUnitPassPayload,
  accessToken: string
): Promise<ProcessUnitMutationResult> {
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/${unitId}/process/pass`,
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

/** `POST /production-plan-units/:unitId/process/fail` */
export async function processProductionPlanUnitFail(
  unitId: string,
  payload: ProcessUnitFailPayload,
  accessToken: string
): Promise<ProcessUnitMutationResult> {
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/${unitId}/process/fail`,
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
 * `POST /production-plan-units/:unitId/process-records/:recordId/files`
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
    `${API_BASE}/production-plan-units/${uid}/process-records/${encodeURIComponent(rid)}/files`,
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

/** `GET /production-plan-units/:unitId/process-records` */
export async function getProductionPlanUnitProcessRecords(
  unitId: string,
  accessToken: string
): Promise<UnitProcessRecord[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/production-plan-units/${unitId}/process-records`,
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

