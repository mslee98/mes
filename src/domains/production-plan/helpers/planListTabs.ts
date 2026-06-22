import type { ProductionPlanCoverageCounts } from "../../../api/purchaseOrder";

/** 생산 계획 목록 — 납품 배정 coverage 탭 (메인) */
export type ProductionPlanCoverageTabValue = "" | "none" | "partial" | "full";

export const PRODUCTION_PLAN_COVERAGE_TABS: Array<{
  value: ProductionPlanCoverageTabValue;
  label: string;
}> = [
  { value: "", label: "전체" },
  { value: "none", label: "미배정" },
  { value: "partial", label: "부분배정" },
  { value: "full", label: "전량배정" },
];

export function productionPlanCoverageTabCount(
  tab: ProductionPlanCoverageTabValue,
  counts?: ProductionPlanCoverageCounts
): number {
  if (!counts) return 0;
  if (tab === "") return Number(counts.all) || Number(counts.total) || 0;
  if (tab === "none") return Number(counts.none) || 0;
  if (tab === "partial") return Number(counts.partial) || 0;
  return Number(counts.full) || 0;
}

export type ProductionPlanCoverageTabBadgeColor =
  | "dark"
  | "light"
  | "warning"
  | "success";

export function productionPlanCoverageTabBadgeColor(
  tab: ProductionPlanCoverageTabValue
): ProductionPlanCoverageTabBadgeColor {
  if (tab === "") return "dark";
  if (tab === "none") return "light";
  if (tab === "partial") return "warning";
  return "success";
}

export function productionPlanCoverageTabBadgeSolid(
  tab: ProductionPlanCoverageTabValue
): boolean {
  return tab === "";
}
