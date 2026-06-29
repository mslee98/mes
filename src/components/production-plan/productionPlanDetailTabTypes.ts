export type ProductionPlanDetailTab = "overview" | "lines" | "summary";

export const PRODUCTION_PLAN_DETAIL_TAB_OPTIONS: {
  value: ProductionPlanDetailTab;
  label: string;
}[] = [
  { value: "overview", label: "개요" },
  { value: "lines", label: "생산 계획 품목" },
  { value: "summary", label: "요약" },
];
