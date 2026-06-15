import type { CommonCodeItem } from "../../../api/commonCode";
import {
  UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING,
  UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER,
} from "../../../api/commonCode";
import type {
  ProductionPlanItem,
  ProductionPlanUnit,
  PurchaseOrderItem,
} from "../../../api/purchaseOrder";
import {
  findProcessStepIndex,
  orderedUnitProcessSteps,
} from "./processSequence";

const SHARED_PREFIX_PROCESS_CODES = [
  "WAIT_DETECTOR_INCOMING",
  "DETECTOR_VISUAL_INSPECTION",
  "ELECTRONIC_INCOMING",
  "ELECTRONIC_INCOMING_INSPECTION",
] as const;

const ENGINE_PROCESS_CODES = [
  "ENGINE_ASSEMBLY",
  "ENGINE_BASIC_INSPECTION",
  "ENGINE_PERFORMANCE_MEASUREMENT",
  "ENGINE_THERMAL_CYCLE",
  "ENGINE_FIRST_CONTINUOUS_RUN",
  "ENGINE_ENVIRONMENTAL_TEST",
  "ENGINE_SECOND_CONTINUOUS_RUN",
  "ENGINE_FUNCTIONAL_TEST",
] as const;

const CAMERA_PROCESS_CODES = [
  "LENS_ASSEMBLY",
  "CENTER_ALIGNMENT",
  "LENS_TUNING",
  "OPTICAL_PERFORMANCE_TEST",
  "CALIBRATION_DATA_CAMERA",
  "FINAL_FUNCTION_TEST_CAMERA",
] as const;

const SHARED_SUFFIX_PROCESS_CODES = [
  UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING,
  UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER,
] as const;

function completedProcessStepsForUnit(
  currentProcessCode: string | null | undefined,
  visibleSteps: CommonCodeItem[]
): number {
  const currentIndex = findProcessStepIndex(currentProcessCode, visibleSteps);
  if (currentIndex <= 0) return 0;
  return Math.min(currentIndex, visibleSteps.length);
}

/** 발주 라인 스냅샷 — 일부 정보가 비어 있어도 시리얼 보조 계산은 가능해야 함 */
export type PlanUnitOrderLineSnapshot = {
  productId?: string | null;
  itemName?: string | null;
  productNameSnapshot?: string | null;
  businessNameSnapshot?: string | null;
  definitionNameSnapshot?: string | null;
  versionSnapshot?: string | null;
  businessName?: string | null;
  spec?: string | null;
  detectorElementCode?: string | null;
  wavelengthCode?: string | null;
  detectorId?: number | null;
};

export type FlatPlanUnitRow = {
  unit: ProductionPlanUnit;
  purchaseOrderItemId?: number;
  lineLabel: string;
  businessNameSnapshot?: string | null;
  orderLine: PlanUnitOrderLineSnapshot;
  /** unit 비어 있을 때 `purchaseOrderItem` 스냅샷 (임시) */
  detectorElementCode?: string;
  wavelengthCode?: string;
  detectorId?: number | null;
};

function orderLineFromPlanItem(
  item: ProductionPlanItem,
  poi?: PurchaseOrderItem | null
): PlanUnitOrderLineSnapshot {
  return {
    productId: poi?.productId,
    itemName: poi?.itemName ?? item.productNameSnapshot ?? undefined,
    productNameSnapshot:
      poi?.productNameSnapshot ?? item.productNameSnapshot ?? null,
    businessNameSnapshot:
      poi?.businessNameSnapshot ?? item.businessNameSnapshot ?? null,
    definitionNameSnapshot: poi?.definitionNameSnapshot ?? null,
    versionSnapshot: poi?.versionSnapshot ?? null,
    businessName: poi?.businessName ?? null,
    spec: poi?.spec ?? undefined,
    detectorElementCode: poi?.detectorElementCode ?? null,
    wavelengthCode: poi?.wavelengthCode ?? null,
    detectorId: poi?.detectorId ?? null,
  };
}

/** `plan.items[].units[]` 평탄화 — 품목 스냅샷 라벨 부착 */
export function flattenPlanUnits(
  items: ProductionPlanItem[] | undefined
): FlatPlanUnitRow[] {
  const rows: FlatPlanUnitRow[] = [];
  if (!items?.length) return rows;
  for (const item of items) {
    const label =
      item.productNameSnapshot?.trim() ||
      item.businessNameSnapshot?.trim() ||
      `품목 #${item.purchaseOrderItemId ?? "?"}`;
    const pid = item.purchaseOrderItemId;
    const poi = item.purchaseOrderItem as PurchaseOrderItem | null | undefined;
    const orderLine = orderLineFromPlanItem(item, poi);
    for (const u of item.units ?? []) {
      const detectorElementCode =
        String(u.detectorElementCode ?? poi?.detectorElementCode ?? "").trim() ||
        undefined;
      const wavelengthCode =
        String(u.wavelengthCode ?? poi?.wavelengthCode ?? "").trim() || undefined;
      const detectorIdRaw = u.detectorId ?? poi?.detectorId;
      const detectorId =
        detectorIdRaw != null && Number.isFinite(Number(detectorIdRaw))
          ? Number(detectorIdRaw)
          : null;
      rows.push({
        unit: u,
        purchaseOrderItemId: pid,
        lineLabel: label,
        businessNameSnapshot: item.businessNameSnapshot ?? null,
        orderLine,
        detectorElementCode,
        wavelengthCode,
        detectorId,
      });
    }
  }
  return rows;
}

export function isEngineLikePlanUnitRow(row: FlatPlanUnitRow): boolean {
  const productText = [
    row.lineLabel,
    row.businessNameSnapshot,
    row.orderLine.itemName,
    row.orderLine.productNameSnapshot,
    row.orderLine.definitionNameSnapshot,
    row.orderLine.businessNameSnapshot,
    row.orderLine.spec,
    row.unit.serialPrefix,
    row.unit.serialNo,
    row.unit.currentProcessCode,
    row.unit.detectorElementCode,
    row.unit.wavelengthCode,
  ]
    .map((value) => String(value ?? "").trim())
    .join(" ")
    .toUpperCase();
  return productText.includes("ENGINE") || productText.includes("엔진");
}

export function buildProcessStepCodesForPlanUnitRow(
  stepCodes: CommonCodeItem[],
  row: FlatPlanUnitRow | null | undefined
): CommonCodeItem[] {
  const orderedSteps = orderedUnitProcessSteps(stepCodes);
  if (!row) return orderedSteps;

  const byCode = new Map(
    orderedSteps.map((step) => [
      String(step.code ?? "").trim().toUpperCase(),
      step,
    ])
  );
  const processPathCodes = [
    ...SHARED_PREFIX_PROCESS_CODES,
    ...(isEngineLikePlanUnitRow(row)
      ? ENGINE_PROCESS_CODES
      : CAMERA_PROCESS_CODES),
    ...SHARED_SUFFIX_PROCESS_CODES,
  ];
  const pathSteps = processPathCodes
    .map((code) => byCode.get(String(code).trim().toUpperCase()))
    .filter((step): step is CommonCodeItem => step != null);

  if (pathSteps.length > 0) {
    return pathSteps;
  }

  return orderedSteps;
}

export function computeProductionPlanUnitStats(
  rows: FlatPlanUnitRow[],
  stepCodes: CommonCodeItem[]
): {
  total: number;
  deliveredCount: number;
  deliveryReadyCount: number;
  /** 출고 준비 또는 출고 완료 — 진행률 막대 기준 */
  deliveredOrReadyCount: number;
  processStepCount: number;
  engineUnitCount: number;
  completedProcessStepCount: number;
  totalProcessStepCount: number;
  progressPercent: number;
} {
  const orderedSteps = orderedUnitProcessSteps(stepCodes);
  const cameraReferenceSteps = buildProcessStepCodesForPlanUnitRow(stepCodes, {
    unit: { id: "camera" },
    lineLabel: "카메라",
    orderLine: {},
    businessNameSnapshot: "카메라",
  });
  const processStepCount =
    cameraReferenceSteps.length > 0 ? cameraReferenceSteps.length : orderedSteps.length;
  let deliveredCount = 0;
  let deliveryReadyCount = 0;
  let deliveredOrReadyCount = 0;
  let engineUnitCount = 0;
  let completedProcessStepCount = 0;
  for (const row of rows) {
    const { unit } = row;
    if (unit.isDelivered) deliveredCount += 1;
    if (unit.isDeliveryReady) deliveryReadyCount += 1;
    if (unit.isDelivered || unit.isDeliveryReady) deliveredOrReadyCount += 1;
    const visibleSteps = buildProcessStepCodesForPlanUnitRow(stepCodes, row);
    const effectiveStepCount = visibleSteps.length;
    if (effectiveStepCount === 0) continue;
    if (isEngineLikePlanUnitRow(row)) engineUnitCount += 1;
    if (unit.isDelivered || unit.isDeliveryReady) {
      completedProcessStepCount += effectiveStepCount;
      continue;
    }
    completedProcessStepCount += completedProcessStepsForUnit(
      unit.currentProcessCode,
      visibleSteps
    );
  }
  const totalProcessStepCount = rows.reduce((sum, row) => {
    return sum + buildProcessStepCodesForPlanUnitRow(stepCodes, row).length;
  }, 0);
  const progressPercent =
    totalProcessStepCount > 0
      ? Math.round((completedProcessStepCount / totalProcessStepCount) * 100)
      : 0;
  return {
    total: rows.length,
    deliveredCount,
    deliveryReadyCount,
    deliveredOrReadyCount,
    processStepCount,
    engineUnitCount,
    completedProcessStepCount,
    totalProcessStepCount,
    progressPercent,
  };
}
import {
  ORDER_LINE_WAVELENGTH_CODE,
  detectorElementCodeFromBusinessName,
  detectorElementInitial,
} from "../../../domains/order/helpers/orderLineDetectorFields";
import { resolveDetectorElementCodeForSerial } from "../serial/legacyProductSerialNumber";

export type ResolvePlanUnitDetectorInput = {
  unit: ProductionPlanUnit;
  orderLine: PlanUnitOrderLineSnapshot | PurchaseOrderItem;
  rowOverrides?: Partial<
    Pick<FlatPlanUnitRow, "detectorElementCode" | "wavelengthCode" | "detectorId">
  >;
};

/** 생산·Unit 공정 — 발주와 동일 취지로 소자·파장 보정 */
export function resolvePlanUnitDetectorFields(
  input: ResolvePlanUnitDetectorInput
): {
  detectorElementCode: string;
  wavelengthCode: string;
  detectorId: number | null;
} {
  const { unit, orderLine, rowOverrides } = input;
  const ol = orderLine as PlanUnitOrderLineSnapshot;

  let detectorElementCode =
    String(unit.detectorElementCode ?? rowOverrides?.detectorElementCode ?? ol.detectorElementCode ?? "").trim();

  if (!detectorElementCode) {
    const lineCode =
      ol.businessNameSnapshot ??
      ol.businessName ??
      ol.productNameSnapshot ??
      ol.itemName ??
      "";
    detectorElementCode = resolveDetectorElementCodeForSerial(
      ol.detectorElementCode ?? unit.detectorElementCode,
      String(lineCode)
    );
  }

  if (!detectorElementCode) {
    const businessName =
      ol.businessNameSnapshot ?? ol.businessName ?? ol.productNameSnapshot ?? "";
    const token = detectorElementCodeFromBusinessName(String(businessName));
    if (token) detectorElementCode = detectorElementInitial(token);
  }

  const wavelengthCode =
    String(
      unit.wavelengthCode ??
        rowOverrides?.wavelengthCode ??
        ol.wavelengthCode ??
        ""
    ).trim() || ORDER_LINE_WAVELENGTH_CODE;

  const detectorIdRaw =
    unit.detectorId ?? rowOverrides?.detectorId ?? ol.detectorId;
  const detectorId =
    detectorIdRaw != null && Number.isFinite(Number(detectorIdRaw))
      ? Number(detectorIdRaw)
      : null;

  return { detectorElementCode, wavelengthCode, detectorId };
}

export function orderLineSnapshotFromPurchaseOrderItem(
  poi: PurchaseOrderItem
): PlanUnitOrderLineSnapshot {
  return {
    productId: poi.productId,
    itemName: poi.itemName,
    productNameSnapshot: poi.productNameSnapshot ?? null,
    businessNameSnapshot: poi.businessNameSnapshot ?? null,
    definitionNameSnapshot: poi.definitionNameSnapshot ?? null,
    versionSnapshot: poi.versionSnapshot ?? null,
    businessName: poi.businessName ?? null,
    spec: poi.spec ?? undefined,
    detectorElementCode: poi.detectorElementCode ?? null,
    wavelengthCode: poi.wavelengthCode ?? null,
    detectorId: poi.detectorId ?? null,
  };
}
