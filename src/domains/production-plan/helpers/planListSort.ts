import type { ProductionPlanListParams } from "../../../api/purchaseOrder";

type PlanListSort = Pick<ProductionPlanListParams, "sortBy" | "sortOrder">;

export const ORDER_NEWEST_FIRST_SORT = {
  sortBy: "orderedAt",
  sortOrder: "desc",
} as const satisfies PlanListSort;

/** 생산 계획 목록 — 연결 발주일(orderedAt) 최신순 */
export function resolveProductionPlanListSort(): PlanListSort {
  return ORDER_NEWEST_FIRST_SORT;
}
