import type {
  ProductionPlan,
  ProductionPlanUnitListResponse,
} from "../api/purchaseOrder";

/** 생산 계획 품목 행의 `plannedQty`·`units` 기준 누적 수량 */
export function aggregateProductionPlanQtyByOrderItemId(
  plans: ProductionPlan[]
): Map<number, number> {
  const m = new Map<number, number>();
  for (const plan of plans) {
    for (const item of plan.items ?? []) {
      const oidRaw = item.purchaseOrderItemId;
      const oid =
        typeof oidRaw === "number"
          ? oidRaw
          : oidRaw != null
            ? Number(oidRaw)
            : NaN;
      if (!Number.isFinite(oid)) continue;
      const planned = Number(item.plannedQty ?? 0);
      const unitCount = item.units?.length ?? 0;
      const q = Math.max(planned, unitCount);
      if (q <= 0) continue;
      m.set(oid, (m.get(oid) ?? 0) + q);
    }
  }
  return m;
}

/** 발급된 생산 유닛(LOT) 1건 = 1 — 목록 API `item.purchaseOrderItemId` 기준 */
export function aggregateProductionUnitQtyByOrderItemId(
  unitRows: ProductionPlanUnitListResponse["items"]
): Map<number, number> {
  const m = new Map<number, number>();
  for (const row of unitRows) {
    const oidRaw = row.item?.purchaseOrderItemId;
    const oid =
      typeof oidRaw === "number"
        ? oidRaw
        : oidRaw != null
          ? Number(oidRaw)
          : NaN;
    if (!Number.isFinite(oid)) continue;
    m.set(oid, (m.get(oid) ?? 0) + 1);
  }
  return m;
}

/**
 * 라인별 이미 등록된 생산 수량.
 * 계획 품목 합계와 유닛 건수 중 큰 값을 취해, 목록에 `items`가 없어도 유닛만으로 집계됩니다.
 */
export function mergeProductionRegisteredQtyByOrderItemId(
  fromPlans: Map<number, number>,
  fromUnits: Map<number, number>
): Map<number, number> {
  const ids = new Set([...fromPlans.keys(), ...fromUnits.keys()]);
  const m = new Map<number, number>();
  for (const id of ids) {
    m.set(id, Math.max(fromPlans.get(id) ?? 0, fromUnits.get(id) ?? 0));
  }
  return m;
}
