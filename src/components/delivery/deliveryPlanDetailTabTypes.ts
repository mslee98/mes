export type DeliveryPlanDetailTab = "overview" | "lines" | "summary";

export const DELIVERY_PLAN_DETAIL_TAB_OPTIONS: {
  value: DeliveryPlanDetailTab;
  label: string;
}[] = [
  { value: "overview", label: "개요" },
  { value: "lines", label: "납품 계획 품목" },
  { value: "summary", label: "요약" },
];
