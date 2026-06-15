import type {
  ProductionPlanUnit,
  ProductionPlanUnitDetail,
  PurchaseOrderDetail,
  PurchaseOrderItem,
} from "../../../api/purchaseOrder";
import {
  detectorElementCodeForApi,
  lineCodeFromOrderLine,
} from "../serial/legacyProductSerialNumber";
import {
  orderLineSnapshotFromPurchaseOrderItem,
  resolvePlanUnitDetectorFields,
  type FlatPlanUnitRow,
} from "../helpers/detailHelpers";

/** Unit 상세 API 응답 → 목록용 `ProductionPlanUnit` */
export function productionPlanUnitFromDetail(
  detail: ProductionPlanUnitDetail
): ProductionPlanUnit {
  const unitId = String(detail.unitId ?? "").trim();
  return {
    id: unitId,
    unitCode: detail.unitCode ?? undefined,
    serialNo: detail.serialNo ?? undefined,
    detectorSerialNo: detail.detectorSerialNo ?? undefined,
    detectorId: detail.detectorId ?? null,
    detectorElementCode: detail.detectorElementCode ?? null,
    wavelengthCode: detail.wavelengthCode ?? null,
    currentProcessCode: detail.currentProcessCode ?? null,
    processStatus: detail.processStatus ?? null,
    qualityStatus: detail.qualityStatus ?? null,
    isDeliveryReady: detail.isDeliveryReady === true,
    isDelivered: detail.isDelivered === true,
    deliveredAt: detail.deliveredAt ?? null,
    productSerialAssignedAt: detail.productSerialAssignedAt ?? null,
    unitNo: detail.unitNo ?? undefined,
    lotIssuedDate: detail.lotIssuedDate ?? null,
    lotPoComposite: detail.lotPoComposite ?? null,
    lotSequenceNo: detail.lotSequenceNo ?? null,
  };
}

export function unitDisplaySerial(detail: ProductionPlanUnitDetail): string {
  const sn = String(detail.serialNo ?? "").trim();
  if (sn) return sn;
  return "미등록";
}

export function unitDisplayLot(detail: ProductionPlanUnitDetail): string {
  const lot = String(detail.unitCode ?? "").trim();
  if (lot) return lot;
  return String(detail.unitId ?? "").trim() || "-";
}

export function findPurchaseOrderItemForUnit(
  order: PurchaseOrderDetail | undefined,
  purchaseOrderItemId: number | string | null | undefined
): PurchaseOrderItem | undefined {
  const id = Number(purchaseOrderItemId);
  if (!order || !Number.isFinite(id) || id <= 0) return undefined;
  const lines = order.orderItems ?? order.items ?? [];
  return lines.find((line) => Number(line.id) === id);
}

/** 납품·Unit 고객 코드 표시용 */
export function customerCodeForUnitDetail(
  detail: ProductionPlanUnitDetail,
  purchaseOrder?: PurchaseOrderDetail | null
): string {
  return (
    String(detail.partner?.code ?? "").trim() ||
    String(purchaseOrder?.partner?.code ?? "").trim() ||
    ""
  );
}

function orderLineForUnitDetail(
  detail: ProductionPlanUnitDetail,
  purchaseOrderItem?: PurchaseOrderItem | null
) {
  if (purchaseOrderItem) {
    return orderLineSnapshotFromPurchaseOrderItem(purchaseOrderItem);
  }
  return {
    productNameSnapshot: detail.item?.productNameSnapshot ?? null,
    businessNameSnapshot: detail.item?.businessNameSnapshot ?? null,
    detectorElementCode: detail.detectorElementCode ?? null,
    wavelengthCode: detail.wavelengthCode ?? null,
    detectorId: detail.detectorId ?? null,
  };
}

/** 발주 품목 없이도 사용 가능 (공정 진행률 `FlatPlanUnitRow` 용) */
export function flatRowFromUnitDetail(
  detail: ProductionPlanUnitDetail,
  purchaseOrderItem?: PurchaseOrderItem | null
): FlatPlanUnitRow {
  const unit = productionPlanUnitFromDetail(detail);
  const lineLabel =
    String(detail.item?.productNameSnapshot ?? "").trim() ||
    String(detail.item?.businessNameSnapshot ?? "").trim() ||
    String(purchaseOrderItem?.productNameSnapshot ?? "").trim() ||
    String(purchaseOrderItem?.businessNameSnapshot ?? "").trim() ||
    "품목 미지정";

  const orderLine = orderLineForUnitDetail(detail, purchaseOrderItem);
  const resolved = resolvePlanUnitDetectorFields({ unit, orderLine });

  return {
    unit,
    purchaseOrderItemId:
      detail.item?.purchaseOrderItemId != null
        ? Number(detail.item.purchaseOrderItemId)
        : purchaseOrderItem?.id,
    lineLabel,
    businessNameSnapshot:
      detail.item?.businessNameSnapshot ??
      purchaseOrderItem?.businessNameSnapshot ??
      null,
    orderLine,
    detectorElementCode: resolved.detectorElementCode,
    wavelengthCode: resolved.wavelengthCode,
    detectorId: resolved.detectorId,
  };
}

/** 납품 등록 API·Unit 편집 API 간, flatRow 보정 */
export function planUnitForDeliveryPayload(
  unit: ProductionPlanUnit,
  flatRow: FlatPlanUnitRow | null | undefined
): ProductionPlanUnit {
  if (!flatRow) return unit;

  const rawElement =
    String(unit.detectorElementCode ?? "").trim() ||
    String(flatRow.detectorElementCode ?? "").trim();
  const detectorElementCode = rawElement
    ? detectorElementCodeForApi(rawElement, lineCodeFromOrderLine(flatRow.orderLine)) ||
      rawElement
    : "";

  const wavelengthCode =
    String(unit.wavelengthCode ?? "").trim() ||
    String(flatRow.wavelengthCode ?? "").trim();

  const serialNo =
    String(unit.serialNo ?? "").trim() ||
    String(flatRow.unit.serialNo ?? "").trim();

  const detectorIdRaw = unit.detectorId ?? flatRow.detectorId;
  const detectorId =
    detectorIdRaw != null &&
    Number.isFinite(Number(detectorIdRaw)) &&
    Number(detectorIdRaw) > 0
      ? Number(detectorIdRaw)
      : null;

  return {
    ...unit,
    ...(serialNo ? { serialNo } : {}),
    detectorElementCode,
    wavelengthCode,
    detectorId,
  };
}
