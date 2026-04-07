export type DeliveryDetailTab = "overview" | "lines" | "order" | "misc";

export const DELIVERY_DETAIL_TAB_OPTIONS: {
  value: DeliveryDetailTab;
  label: string;
}[] = [
  { value: "overview", label: "개요" },
  { value: "lines", label: "납품 품목" },
  { value: "order", label: "발주 연동" },
  { value: "misc", label: "진행·기타" },
];
