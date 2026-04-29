export type DeliveryDetailTab = "overview" | "lines" | "progress" | "summary";

export const DELIVERY_DETAIL_TAB_OPTIONS: {
  value: DeliveryDetailTab;
  label: string;
}[] = [
  { value: "overview", label: "개요" },
  { value: "lines", label: "납품 품목" },
  { value: "progress", label: "진행 상태" },
  { value: "summary", label: "요약" },
];
