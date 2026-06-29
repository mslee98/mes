import type { ProductionPlanListParams } from "../../../api/purchaseOrder";

type PlanListSort = Pick<ProductionPlanListParams, "sortBy" | "sortOrder">;

export const ORDER_NEWEST_FIRST_SORT = {
  sortBy: "orderedAt",
  sortOrder: "desc",
} as const satisfies PlanListSort;

/** 생산 계획 목록 — 계획 생성일(createdAt) 최신순 */
export const PLAN_CREATED_NEWEST_FIRST_SORT = {
  sortBy: "createdAt",
  sortOrder: "desc",
} as const satisfies PlanListSort;

/** 생산 계획 목록 기본 정렬 */
export function resolveProductionPlanListSort(): PlanListSort {
  return PLAN_CREATED_NEWEST_FIRST_SORT;
}
