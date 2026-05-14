import type {
  DeliveryPlanItem,
  DeliveryPlanUnit,
} from "../api/purchaseOrder";

export type FlatPlanUnitRow = {
  unit: DeliveryPlanUnit;
  purchaseOrderItemId?: number;
  lineLabel: string;
};

/** `plan.items[].units[]` 평탄화 — 품목 스냅샷 라벨 부착 */
export function flattenPlanUnits(
  items: DeliveryPlanItem[] | undefined
): FlatPlanUnitRow[] {
  const rows: FlatPlanUnitRow[] = [];
  if (!items?.length) return rows;
  for (const item of items) {
    const label =
      item.productNameSnapshot?.trim() ||
      item.businessNameSnapshot?.trim() ||
      `품목 #${item.purchaseOrderItemId ?? "?"}`;
    const pid = item.purchaseOrderItemId;
    for (const u of item.units ?? []) {
      rows.push({
        unit: u,
        purchaseOrderItemId: pid,
        lineLabel: label,
      });
    }
  }
  return rows;
}

export function computeDeliveryPlanUnitStats(rows: FlatPlanUnitRow[]): {
  total: number;
  deliveredCount: number;
  deliveryReadyCount: number;
  /** 출고 준비 또는 납품 완료 — 진행률 막대(납품 파이프라인) 기준 */
  deliveredOrReadyCount: number;
} {
  let deliveredCount = 0;
  let deliveryReadyCount = 0;
  let deliveredOrReadyCount = 0;
  for (const { unit } of rows) {
    if (unit.isDelivered) deliveredCount += 1;
    if (unit.isDeliveryReady) deliveryReadyCount += 1;
    if (unit.isDelivered || unit.isDeliveryReady) deliveredOrReadyCount += 1;
  }
  return {
    total: rows.length,
    deliveredCount,
    deliveryReadyCount,
    deliveredOrReadyCount,
  };
}
