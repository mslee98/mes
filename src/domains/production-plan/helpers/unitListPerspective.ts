import type {
  ProductionPlanUnitPerspective,
  ProductionPlanUnitTab,
} from "../../../api/purchaseOrder";

export const PRODUCTION_PLAN_UNIT_TABS: ProductionPlanUnitTab[] = [
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
    WAITING: "생산 대기",
    IN_PROGRESS: "생산 진행",
    COMPLETED: "생산 완료",
    DELAYED: "생산 지연",
  },
  delivery: {
    WAITING: "납품 대기",
    IN_PROGRESS: "계획·공정중",
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

export function unitListPageTitle(
  perspective: ProductionPlanUnitPerspective
): string {
  return perspective === "delivery"
    ? "납품 품목 목록"
    : "생산 품목 목록";
}

export function unitListBreadcrumbTitle(
  perspective: ProductionPlanUnitPerspective
): string {
  return unitListPageTitle(perspective);
}

export function unitListMetaDescription(
  perspective: ProductionPlanUnitPerspective
): string {
  return perspective === "delivery"
    ? "납품 관점 품목 목록"
    : "생산 관점 품목 목록";
}
