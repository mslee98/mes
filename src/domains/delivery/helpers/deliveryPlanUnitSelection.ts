import type { ProductionPlanUnitListItem } from "../../../api/purchaseOrder";

export type DeliveryPlanUnitSelectionValidationResult =
  | { ok: true; orderId: string; unitIds: string[] }
  | { ok: false; message: string };

export function isUnitSelectableForDeliveryPlan(
  row: Pick<
    ProductionPlanUnitListItem,
    "isInDeliveryPlan" | "isDelivered"
  >
): boolean {
  if (row.isDelivered === true) return false;
  if (row.isInDeliveryPlan === true) return false;
  return true;
}

export function getUnitOrderId(row: ProductionPlanUnitListItem): string | null {
  const id = String(row.order?.orderId ?? "").trim();
  return id || null;
}

export function canToggleUnitSelection(
  selected: ProductionPlanUnitListItem[],
  candidate: ProductionPlanUnitListItem
): boolean {
  if (!isUnitSelectableForDeliveryPlan(candidate)) return false;
  if (selected.length === 0) return true;
  const anchorOrderId = getSelectionAnchorOrderId(selected);
  const candidateOrderId = getUnitOrderId(candidate);
  if (!anchorOrderId || !candidateOrderId) return false;
  return anchorOrderId === candidateOrderId;
}

export function getSelectionAnchorOrderId(
  selected: ProductionPlanUnitListItem[]
): string | null {
  if (selected.length === 0) return null;
  return getUnitOrderId(selected[0]!);
}

export const DELIVERY_PLAN_ORDER_MISMATCH_HINT =
  "다른 발주건에 대한 품목은 선택이 불가합니다.";

/** 동일 발주 제한으로 체크 불가할 때 행 hover 안내 문구 */
export function getCheckboxOrderMismatchHint(
  row: ProductionPlanUnitListItem,
  selected: ProductionPlanUnitListItem[],
  isRowSelected: boolean
): string | null {
  if (isRowSelected) return null;
  if (!isUnitSelectableForDeliveryPlan(row)) return null;
  if (selected.length === 0) return null;
  if (canToggleUnitSelection(selected, row)) return null;

  const anchorOrderId = getSelectionAnchorOrderId(selected);
  const candidateOrderId = getUnitOrderId(row);
  if (
    anchorOrderId &&
    candidateOrderId &&
    anchorOrderId !== candidateOrderId
  ) {
    return DELIVERY_PLAN_ORDER_MISMATCH_HINT;
  }

  return null;
}

export function validateDeliveryPlanUnitSelection(
  selected: ProductionPlanUnitListItem[]
): DeliveryPlanUnitSelectionValidationResult {
  if (selected.length === 0) {
    return { ok: false, message: "납품 계획에 포함할 품목을 1건 이상 선택해 주세요." };
  }

  const orderId = getSelectionAnchorOrderId(selected);
  if (!orderId) {
    return { ok: false, message: "선택한 품목의 발주 정보를 확인할 수 없습니다." };
  }

  const mismatched = selected.find(
    (row) => getUnitOrderId(row) !== orderId
  );
  if (mismatched) {
    return {
      ok: false,
      message: "동일 발주에 속한 품목만 함께 선택할 수 있습니다.",
    };
  }

  const ineligible = selected.find(
    (row) => !isUnitSelectableForDeliveryPlan(row)
  );
  if (ineligible) {
    return {
      ok: false,
      message: "이미 납품 계획에 포함되었거나 납품 완료된 품목은 선택할 수 없습니다.",
    };
  }

  return {
    ok: true,
    orderId,
    unitIds: selected.map((row) => String(row.unitId).trim()).filter(Boolean),
  };
}
