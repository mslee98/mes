import type {
  ProductionPlanUnitPerspective,
  ProductionPlanUnitTab,
} from "../../../api/purchaseOrder";

export const PRODUCTION_PLAN_UNIT_TABS: ProductionPlanUnitTab[] = [
  "ALL",
  "WAITING",
  "IN_PROGRESS",
  "COMPLETED",
  "DELAYED",
];

const TAB_LABELS: Record<
  ProductionPlanUnitPerspective,
  Record<ProductionPlanUnitTab, string>
> = {
  production: {
    ALL: "전체",
    WAITING: "생산 대기",
    IN_PROGRESS: "생산 진행",
    COMPLETED: "생산 완료",
    DELAYED: "생산 지연",
  },
  delivery: {
    ALL: "전체",
    WAITING: "납품 대기",
    IN_PROGRESS: "납품 진행",
    COMPLETED: "납품 완료",
    DELAYED: "지연",
  },
};

export function tabLabel(
  perspective: ProductionPlanUnitPerspective,
  tab: ProductionPlanUnitTab
): string {
  return TAB_LABELS[perspective][tab];
}

export function completedTabLabel(
  perspective: ProductionPlanUnitPerspective
): string {
  return tabLabel(perspective, "COMPLETED");
}

export type UnitListMode = "overview-units" | "delivery";

export function unitListModeFromPerspective(
  perspective: ProductionPlanUnitPerspective
): UnitListMode {
  return perspective === "delivery" ? "delivery" : "overview-units";
}

export function perspectiveForUnitListMode(
  mode: UnitListMode
): ProductionPlanUnitPerspective {
  return mode === "delivery" ? "delivery" : "production";
}

export function unitListPageTitle(
  perspectiveOrMode: ProductionPlanUnitPerspective | UnitListMode
): string {
  if (perspectiveOrMode === "overview-units") return "생산 품목 현황";
  if (perspectiveOrMode === "delivery") return "납품 품목 목록";
  return "생산 품목 목록";
}

export function unitListBreadcrumbTitle(
  perspectiveOrMode: ProductionPlanUnitPerspective | UnitListMode
): string {
  return unitListPageTitle(perspectiveOrMode);
}

export function unitListMetaDescription(
  perspectiveOrMode: ProductionPlanUnitPerspective | UnitListMode
): string {
  if (perspectiveOrMode === "overview-units") {
    return "생산 진행과 납품 등록 상태를 확인하고, 유닛을 선택해 납품 계획을 등록합니다.";
  }
  if (perspectiveOrMode === "delivery") {
    return "납품 관점 품목 목록";
  }
  return "생산 관점 품목 목록";
}
