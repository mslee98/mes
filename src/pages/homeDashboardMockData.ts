/** Home 대시보드용 하드코딩 mock 데이터 (API 연동 전). */

export const DELIVERY_WIDGET_CHART_HEIGHT = 400;

export const MONTH_CATEGORIES = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

export const DELIVERY_ITEMS = ["ICC640N", "ICC640 GEN3", "ICE640F", "MARKOS"] as const;
export type DeliveryItem = (typeof DELIVERY_ITEMS)[number];
export type DeliveryYear = 2025 | 2026;
export type DeliveryMetric = "quantity" | "amount";

/** 월별 납품 표(2025·2026 건수·금액) — 품목별 1~12월, 스택 합 = 월별 총계 */
export const deliveryByYear: Record<
  DeliveryYear,
  Record<DeliveryMetric, Record<DeliveryItem, number[]>>
> = {
  2025: {
    quantity: {
      ICC640N: [0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0],
      "ICC640 GEN3": [0, 4, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
      ICE640F: [0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0],
      MARKOS: [0, 0, 4, 2, 0, 3, 0, 0, 0, 2, 0, 0],
    },
    amount: {
      ICC640N: [0, 0, 0, 0, 0, 0, 0, 0, 75240, 0, 0, 0],
      "ICC640 GEN3": [0, 128400, 0, 0, 0, 0, 33540, 0, 25000, 0, 0, 0],
      ICE640F: [0, 0, 0, 83040, 0, 0, 0, 0, 0, 0, 0, 0],
      MARKOS: [0, 0, 216040, 59940, 0, 105290, 0, 0, 0, 113760, 0, 0],
    },
  },
  2026: {
    quantity: {
      ICC640N: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "ICC640 GEN3": [1, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ICE640F: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      MARKOS: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    amount: {
      ICC640N: [0, 34000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "ICC640 GEN3": [32100, 60450, 128400, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ICE640F: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      MARKOS: [0, 60900, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
};

export const ANNUAL_DELIVERY_YEAR_LABELS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];

export const ANNUAL_DELIVERY_ITEMS = [
  "MARKOS",
  "ICE640F",
  "ICE640 GEN3",
  "ICE640 GEN2",
  "ICE640 GEN1",
  "ICE1280PC",
  "ICE1280PA",
  "ICE1280",
  "ICC640N",
  "ICC1280PC",
] as const;
export type AnnualDeliveryItem = (typeof ANNUAL_DELIVERY_ITEMS)[number];

/** 연도별 전체 납품(2019~2026) — 품목 × 연도, 스택 합 = 연도별 총계 */
export const annualDeliveryByMetric: Record<DeliveryMetric, Record<AnnualDeliveryItem, number[]>> = {
  quantity: {
    MARKOS: [0, 0, 0, 0, 2, 9, 11, 1],
    ICE640F: [0, 0, 11, 7, 0, 17, 4, 0],
    "ICE640 GEN3": [0, 0, 0, 0, 0, 0, 6, 8],
    "ICE640 GEN2": [0, 23, 10, 2, 2, 4, 0, 0],
    "ICE640 GEN1": [13, 43, 61, 14, 0, 0, 0, 0],
    ICE1280PC: [0, 0, 0, 1, 0, 3, 0, 0],
    ICE1280PA: [0, 0, 0, 4, 0, 0, 0, 0],
    ICE1280: [0, 1, 0, 0, 0, 0, 0, 0],
    ICC640N: [0, 0, 0, 0, 0, 0, 3, 1],
    ICC1280PC: [0, 0, 0, 0, 0, 16, 0, 0],
  },
  amount: {
    MARKOS: [0, 0, 0, 0, 112000, 350980, 495030, 60900],
    ICE640F: [0, 0, 236290, 183050, 0, 475150, 83040, 0],
    "ICE640 GEN3": [0, 0, 0, 0, 0, 0, 186940, 220650],
    "ICE640 GEN2": [0, 460970, 230100, 66000, 55740, 142900, 0, 0],
    "ICE640 GEN1": [319250, 1034950, 1392950, 327740, 0, 0, 0, 0],
    ICE1280PC: [0, 0, 0, 73200, 0, 160580, 0, 0],
    ICE1280PA: [0, 0, 0, 245280, 0, 0, 0, 0],
    ICE1280: [0, 78440, 0, 0, 0, 0, 0, 0],
    ICC640N: [0, 0, 0, 0, 0, 0, 75240, 34000],
    ICC1280PC: [0, 0, 0, 0, 0, 94400, 0, 0],
  },
};

export const ANNUAL_CHART_COLORS = [
  "#2A31D8",
  "#465FFF",
  "#7592FF",
  "#C2D6FF",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
];

export const recentDeliveredProducts = [
  
  {
    partnerName: "TATA",
    deliveryNo: "#DLV-20260406_TATA",
    deliveredAt: "2026-04-06",
    productName: "MARKOS(Engine)",
    unitPrice: 51000,
    quantity: 1,
    amount: 51000,
    status: "진행",
  },
  {
    partnerName: "LIG",
    deliveryNo: "#DLV-20260213_LIG",
    deliveredAt: "2026-02-13",
    productName: "ICE1280(1280)",
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    status: "진행",
  },
  {
    partnerName: "LIG",
    deliveryNo: "#DLV-20260126_LIG",
    deliveredAt: "2026-01-26",
    productName: "MARKOS(Camera)",
    quantity: 1,
    unitPrice: 56000,
    amount: 56000,
    status: "진행",
  },
  {
    partnerName: "DSO",
    deliveryNo: "#DLV-20260126_DSO",
    deliveredAt: "2026-01-24",
    productName: "MARKOS(Camera)",
    quantity: 3,
    unitPrice: 56667,
    amount: 170001,
    status: "진행",
  },
  {
    partnerName: "COX",
    deliveryNo: "#DLV-20251121_COX",
    deliveredAt: "2025-11-21",
    productName: "ICE640 GEN3(Engine)",
    unitPrice: 32100,
    quantity: 4,
    amount: 128400,
    status: "진행",
  },
  {
    partnerName: "COX",
    deliveryNo: "#DLV-20251104_COX",
    deliveredAt: "2025-11-04",
    productName: "ICE640 GEN3(Engine)",
    unitPrice: 32100,
    quantity: 1,
    amount: 32100,
    status: "진행",
  },
 
] as const;

export const productionStatusRows = [
  { date: "2025-11-04", company: "COX", product: "ICE640 GEN3(ENG)", type: "A", progress: 100 },
  { date: "2025-10-31", company: "Vista", product: "MARKOS(CAM)", type: "B", progress: 100 },
  { date: "2025-09-01", company: "엘트로닉스", product: "ICC640N(ENG)", type: "A", progress: 80 },
  { date: "2025-08-25", company: "BEL", product: "ICE640 GEN3(ENG)", type: "G", progress: 100 },
  { date: "2025-08-25", company: "BEL", product: "ICE640 GEN3(ENG)", type: "G", progress: 100 },
  { date: "2025-08-25", company: "BEL", product: "ICE640 GEN3(ENG)", type: "G", progress: 100 },
  { date: "2025-11-21", company: "콕스", product: "ICE640 GEN3(ENG)", type: "A", progress: 100 },
  // { date: "2025-11-21", company: "콕스", product: "ICE640 GEN3(ENG)", type: "A", progress: 100 },
  // { date: "2025-11-21", company: "콕스", product: "ICE640 GEN3(ENG)", type: "A", progress: 100 },
  // { date: "2025-11-21", company: "콕스", product: "ICE640 GEN3(ENG)", type: "A", progress: 100 },
] as const;

export const AS_TYPE_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;
export type AsTypeYear = "ALL" | (typeof AS_TYPE_YEARS)[number];

export const asTypeDistributionRows = [
  { type: "냉각기 업그레이드", yearly: { 2019: 0, 2020: 3, 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 } },
  { type: "조치 사항 없음", yearly: { 2019: 0, 2020: 4, 2021: 4, 2022: 1, 2023: 5, 2024: 0, 2025: 3, 2026: 1 } },
  { type: "검출기 교체", yearly: { 2019: 1, 2020: 0, 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 } },
  { type: "냉각기 교체", yearly: { 2019: 1, 2020: 1, 2021: 17, 2022: 15, 2023: 20, 2024: 14, 2025: 11, 2026: 4 } },
  { type: "파라미터 수정", yearly: { 2019: 0, 2020: 1, 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 } },
  { type: "냉각기 접촉 불량", yearly: { 2019: 0, 2020: 1, 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 } },
  { type: "기구부 교체", yearly: { 2019: 0, 2020: 4, 2021: 0, 2022: 0, 2023: 0, 2024: 1, 2025: 0, 2026: 0 } },
  { type: "냉각기 수리", yearly: { 2019: 0, 2020: 1, 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 } },
  { type: "DDA 교체", yearly: { 2019: 1, 2020: 0, 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 } },
  { type: "전원 보드 교체", yearly: { 2019: 0, 2020: 0, 2021: 2, 2022: 0, 2023: 0, 2024: 3, 2025: 0, 2026: 0 } },
  { type: "F/W 업데이트 조치", yearly: { 2019: 0, 2020: 0, 2021: 0, 2022: 2, 2023: 0, 2024: 0, 2025: 0, 2026: 0 } },
] as const;

