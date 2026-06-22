import type {
  ProductionPlanListItem,
  ProductionPlanUnitListItem,
} from "../../../api/purchaseOrder";

/** 생산 계획 목록 — D-day·지연 표시를 끌 조건 (생산 완료 기준, 레거시) */
export function isProductionPlanListItemFinished(
  item: Pick<ProductionPlanListItem, "status" | "unitSummary">
): boolean {
  if (String(item.status ?? "").trim().toUpperCase() === "COMPLETED") {
    return true;
  }
  const total = Number(item.unitSummary?.total) || 0;
  const completed = Number(item.unitSummary?.completed) || 0;
  return total > 0 && completed >= total;
}

/** 생산 계획 — 전 Unit 납품 완료 (목록 COMPLETED 탭·D-day 숨김) */
export function isProductionPlanDeliveryComplete(
  item: Pick<ProductionPlanListItem, "deliveryCoverage" | "unitSummary">
): boolean {
  const coverage = item.deliveryCoverage;
  if (coverage) {
    return (
      coverage.totalUnitCount > 0 && coverage.unassignedUnitCount <= 0
    );
  }
  const total = Number(item.unitSummary?.total) || 0;
  const unassigned = Number(item.unitSummary?.deliveryUnassigned);
  if (Number.isFinite(unassigned) && total > 0) {
    return unassigned <= 0;
  }
  return false;
}

/** 유닛 — 납품·생산 완료 후 D-day·지연 표시를 끌 조건 */
export function isUnitDeliveryOrProductionFinished(
  row: Pick<
    ProductionPlanUnitListItem,
    "isDelivered" | "productionCompletedAt" | "deliveredAt"
  >
): boolean {
  if (row.isDelivered === true) return true;
  if (String(row.productionCompletedAt ?? "").trim()) return true;
  if (String(row.deliveredAt ?? "").trim()) return true;
  return false;
}
