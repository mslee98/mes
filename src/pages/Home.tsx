// import EcommerceMetrics from "../components/ecommerce/EcommerceMetrics";
// import MonthlySalesChart from "../components/ecommerce/MonthlySalesChart";
// import StatisticsChart from "../components/ecommerce/StatisticsChart";
// import MonthlyTarget from "../components/ecommerce/MonthlyTarget";
// import RecentOrders from "../components/ecommerce/RecentOrders";
// import DemographicCard from "../components/ecommerce/DemographicCard";
import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../components/common/PageMeta";
import { Dropdown } from "../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../components/ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../icons";
import { formatCurrency } from "../lib/formatCurrency";

const DELIVERY_WIDGET_CHART_HEIGHT = 400;

const MONTH_CATEGORIES = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

const DELIVERY_ITEMS = ["ICC640N", "ICC640 GEN3", "ICE640F", "MARKOS"] as const;
type DeliveryItem = (typeof DELIVERY_ITEMS)[number];
type DeliveryYear = 2025 | 2026;
type DeliveryMetric = "quantity" | "amount";

/** 월별 납품 표(2025·2026 건수·금액) — 품목별 1~12월, 스택 합 = 월별 총계 */
const deliveryByYear: Record<
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

const ANNUAL_DELIVERY_YEAR_LABELS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];

const ANNUAL_DELIVERY_ITEMS = [
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
type AnnualDeliveryItem = (typeof ANNUAL_DELIVERY_ITEMS)[number];

/** 연도별 전체 납품(2019~2026) — 품목 × 연도, 스택 합 = 연도별 총계 */
const annualDeliveryByMetric: Record<DeliveryMetric, Record<AnnualDeliveryItem, number[]>> = {
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

const ANNUAL_CHART_COLORS = [
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

const recentDeliveredProducts = [
  
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

const productionStatusRows = [
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

const AS_TYPE_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;
type AsTypeYear = "ALL" | (typeof AS_TYPE_YEARS)[number];

const asTypeDistributionRows = [
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


export default function Home() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [deliveryMenuOpen, setDeliveryMenuOpen] = useState(false);
  const [deliveryYear, setDeliveryYear] = useState<DeliveryYear>(2025);
  const [deliveryMetric, setDeliveryMetric] = useState<DeliveryMetric>("quantity");
  const [annualMetric, setAnnualMetric] = useState<DeliveryMetric>("quantity");
  const [annualMenuOpen, setAnnualMenuOpen] = useState(false);
  const [asTypeMenuOpen, setAsTypeMenuOpen] = useState(false);
  const [asTypeYear, setAsTypeYear] = useState<AsTypeYear>("ALL");
  const [asTypeHoveredIndex, setAsTypeHoveredIndex] = useState<number | null>(null);

  const parseYmd = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
  };

  const latestDeliveryDate = useMemo(() => {
    const allDates = recentDeliveredProducts.map((row) => parseYmd(row.deliveredAt));
    return allDates.length > 0 ? new Date(Math.max(...allDates.map((date) => date.getTime()))) : new Date();
  }, []);

  const periodRange = useMemo(() => {
    const end = latestDeliveryDate;
    const start = new Date(end);

    if (period === "weekly") {
      const day = end.getDay();
      const diffFromMonday = day === 0 ? 6 : day - 1;
      start.setDate(end.getDate() - diffFromMonday);
      start.setHours(0, 0, 0, 0);
    } else if (period === "monthly") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }

    const endOfRange = new Date(end);
    endOfRange.setHours(23, 59, 59, 999);

    return { start, end: endOfRange };
  }, [latestDeliveryDate, period]);

  const deliveriesInPeriod = useMemo(() => {
    return recentDeliveredProducts.filter((row) => {
      const deliveredDate = parseYmd(row.deliveredAt);
      return deliveredDate >= periodRange.start && deliveredDate <= periodRange.end;
    });
  }, [periodRange]);

  const productionsInPeriod = useMemo(() => {
    return productionStatusRows.filter((row) => {
      const productionDate = parseYmd(row.date);
      return productionDate >= periodRange.start && productionDate <= periodRange.end;
    });
  }, [periodRange]);

  const orderedAmount = useMemo(
    () => deliveriesInPeriod.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    [deliveriesInPeriod],
  );

  const deliveryCount = deliveriesInPeriod.length;

  const completionRate = useMemo(() => {
    if (productionsInPeriod.length === 0) return 0;
    const completedCount = productionsInPeriod.filter((row) => row.progress >= 100).length;
    return (completedCount / productionsInPeriod.length) * 100;
  }, [productionsInPeriod]);

  const rmaCount = useMemo(() => {
    return deliveriesInPeriod.filter((row) => String(row.status).toUpperCase() === "RMA").length;
  }, [deliveriesInPeriod]);

  const periodLabel = period === "weekly" ? "주간" : period === "monthly" ? "월간" : "연간";

  const overviewCards = useMemo(
    () => [
      {
        label: "총 발주 금액",
        value: formatCurrency(orderedAmount, "KRW"),
        delta: `${periodLabel} 기준`,
        positive: true,
      },
      {
        label: "납품 건수",
        value: `${deliveryCount.toLocaleString()}건`,
        delta: `${periodLabel} 기준`,
        positive: true,
      },
      {
        label: "납품 완료율",
        value: `${completionRate.toFixed(1)}%`,
        delta: `${productionsInPeriod.length}건 기준`,
        positive: completionRate >= 95,
      },
      {
        label: "RMA 건수",
        value: `${rmaCount.toLocaleString()}건`,
        delta: `${periodLabel} 기준`,
        positive: rmaCount === 0,
      },
    ],
    [orderedAmount, periodLabel, deliveryCount, completionRate, productionsInPeriod.length, rmaCount],
  );

  const deliveryChartSeries = useMemo(
    () =>
      DELIVERY_ITEMS.map((item) => ({
        name: item,
        data: [...deliveryByYear[deliveryYear][deliveryMetric][item]],
      })),
    [deliveryYear, deliveryMetric],
  );

  const deliveryChartOptions = useMemo((): ApexOptions => {
    const isAmount = deliveryMetric === "amount";
    return {
      chart: {
        type: "bar",
        stacked: true,
        toolbar: { show: false },
        fontFamily: "Pretendard, sans-serif",
        height: DELIVERY_WIDGET_CHART_HEIGHT,
      },
      colors: ["#2A31D8", "#465FFF", "#7592FF", "#C2D6FF"],
      plotOptions: {
        bar: {
          columnWidth: "36%",
          borderRadius: 6,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: MONTH_CATEGORIES,
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (val: number) =>
            isAmount ? formatCurrency(val, "KRW", { withSymbol: false }) : `${Math.round(val)}`,
        },
      },
      grid: { borderColor: "#E5E7EB" },
      legend: { position: "top", horizontalAlign: "left" },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number) => (isAmount ? formatCurrency(val, "KRW") : `${val}건`),
        },
      },
    };
  }, [deliveryMetric]);

  const annualChartSeries = useMemo(
    () =>
      ANNUAL_DELIVERY_ITEMS.map((item) => ({
        name: item,
        data: [...annualDeliveryByMetric[annualMetric][item]],
      })),
    [annualMetric],
  );

  const annualChartOptions = useMemo((): ApexOptions => {
    const isAmount = annualMetric === "amount";
    return {
      chart: {
        type: "bar",
        stacked: true,
        toolbar: { show: false },
        fontFamily: "Pretendard, sans-serif",
        height: DELIVERY_WIDGET_CHART_HEIGHT,
      },
      colors: ANNUAL_CHART_COLORS,
      plotOptions: {
        bar: {
          columnWidth: "55%",
          borderRadius: 6,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ANNUAL_DELIVERY_YEAR_LABELS,
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (val: number) =>
            isAmount ? formatCurrency(val, "KRW", { withSymbol: false }) : `${Math.round(val)}`,
        },
      },
      grid: { borderColor: "#E5E7EB" },
      legend: {
        position: "top",
        horizontalAlign: "left",
        fontSize: "11px",
        itemMargin: { horizontal: 8, vertical: 4 },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number) => (isAmount ? formatCurrency(val, "KRW") : `${val}건`),
        },
      },
    };
  }, [annualMetric]);

  const asTypeBaseColors = useMemo(
    () => [
      "#465FFF",
      "#7592FF",
      "#DDE9FF",
      "#10B981",
      "#F59E0B",
      "#EC4899",
      "#8B5CF6",
      "#06B6D4",
      "#84CC16",
      "#F97316",
      "#14B8A6",
    ],
    [],
  );

  const asTypeColorByType = useMemo(() => {
    return asTypeDistributionRows.reduce<Record<string, string>>((acc, row, index) => {
      acc[row.type] = asTypeBaseColors[index % asTypeBaseColors.length];
      return acc;
    }, {});
  }, [asTypeBaseColors]);

  const asTypeLegendRows = useMemo(
    () =>
      asTypeDistributionRows.map((row) => {
        const quantity =
          asTypeYear === "ALL"
            ? AS_TYPE_YEARS.reduce((sum, year) => sum + row.yearly[year], 0)
            : row.yearly[asTypeYear];

        return {
          type: row.type,
          quantity,
        };
      }),
    [asTypeYear],
  );

  const asTypeTotalQuantity = useMemo(
    () => asTypeLegendRows.reduce((sum, row) => sum + row.quantity, 0),
    [asTypeLegendRows],
  );

  const asTypeLegendRowsWithRatio = useMemo(
    () =>
      asTypeLegendRows.map((row) => ({
        ...row,
        ratioNumber: asTypeTotalQuantity === 0 ? 0 : (row.quantity / asTypeTotalQuantity) * 100,
      })),
    [asTypeLegendRows, asTypeTotalQuantity],
  );

  const asTypeChartRows = useMemo(
    () => asTypeLegendRowsWithRatio.filter((row) => row.quantity > 0),
    [asTypeLegendRowsWithRatio],
  );

  const asTypeChartColors = useMemo(
    () => asTypeChartRows.map((row) => asTypeColorByType[row.type] ?? "#465FFF"),
    [asTypeChartRows, asTypeColorByType],
  );

  const asTypePieSeries = useMemo(
    () => asTypeChartRows.map((row) => row.quantity),
    [asTypeChartRows],
  );

  const asTypeHoveredItem = useMemo(() => {
    if (asTypeHoveredIndex == null) return null;
    return asTypeChartRows[asTypeHoveredIndex] ?? null;
  }, [asTypeHoveredIndex, asTypeChartRows]);

  const asTypePieOptions = useMemo(
    (): ApexOptions => ({
      chart: {
        type: "donut",
        fontFamily: "Pretendard, sans-serif",
        events: {
          dataPointMouseEnter: (_event, _chartContext, config) => {
            setAsTypeHoveredIndex(config.dataPointIndex ?? null);
          },
          dataPointMouseLeave: () => {
            setAsTypeHoveredIndex(null);
          },
          dataPointSelection: (event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            return false;
          },
          mouseLeave: () => {
            setAsTypeHoveredIndex(null);
          },
        },
      },
      labels: asTypeChartRows.map((row) => row.type),
      colors: asTypeChartColors,
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: "65%",
            labels: {
              show: false,
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val}건`,
        },
      },
      stroke: { width: 0 },
      states: {
        hover: { filter: { type: "none" } },
        active: {
          allowMultipleDataPointsSelection: false,
          filter: { type: "none" },
        },
      },
    }),
    [asTypeChartRows, asTypeChartColors],
  );

  return (
    <>
      <PageMeta title="대시보드" description="요약 지표 및 차트" />
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Overview</h3>
            <div className="flex gap-x-3.5">
              <div className="inline-flex w-full items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
                {(["주간", "월간", "연간"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPeriod(item as "weekly" | "monthly" | "yearly")}
                    className={`text-theme-sm w-full rounded-md px-3 py-2 font-medium ${
                      period === item as "weekly" | "monthly" | "yearly"
                        ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    {item === "주간" ? "주간" : item === "월간" ? "월간" : "연간"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid rounded-2xl border border-gray-200 bg-white sm:grid-cols-2 xl:grid-cols-4 dark:border-gray-800 dark:bg-gray-900">
            {overviewCards.map((card, idx) => (
              <div
                key={card.label}
                className={`px-6 py-5 ${idx === 0 ? "border-b sm:border-r xl:border-b-0" : ""} ${
                  idx === 1 ? "border-b xl:border-r xl:border-b-0" : ""
                } ${idx === 2 ? "border-b sm:border-r sm:border-b-0" : ""} border-gray-200 dark:border-gray-800`}
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
                <div className="mt-2 flex items-end gap-3">
                  <h4 className="text-title-xs sm:text-title-sm font-bold text-gray-800 dark:text-white/90">
                    {card.value}
                  </h4>
                  <span
                    className={`flex items-center gap-1 rounded-full py-0.5 pl-2 pr-2.5 text-sm font-medium ${
                      card.positive
                        ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                        : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
                    }`}
                  >
                    {card.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section aria-labelledby="home-monthly-delivery-widget-title">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <span
                      className="mt-1 hidden h-10 w-1 shrink-0 rounded-full bg-brand-500 sm:block"
                      aria-hidden
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          id="home-monthly-delivery-widget-title"
                          className="text-lg font-semibold text-gray-800 dark:text-white/90"
                        >
                          월별 납품 현황
                        </h3>
                        <span className="bg-brand-50 text-theme-xs rounded-full px-2 py-0.5 font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          월간
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        품목별 스택 — {deliveryYear}년 · {deliveryMetric === "quantity" ? "납품 건수" : "납품 금액"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
                      {([2025, 2026] as const).map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setDeliveryYear(y)}
                          className={`text-theme-sm rounded-md px-3 py-2 font-medium ${
                            deliveryYear === y
                              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          }`}
                        >
                          {y}년
                        </button>
                      ))}
                    </div>
                    <div className="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
                      <button
                        type="button"
                        onClick={() => setDeliveryMetric("quantity")}
                        className={`text-theme-sm rounded-md px-3 py-2 font-medium ${
                          deliveryMetric === "quantity"
                            ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        건수
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMetric("amount")}
                        className={`text-theme-sm rounded-md px-3 py-2 font-medium ${
                          deliveryMetric === "amount"
                            ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        금액
                      </button>
                    </div>
                    <div className="relative h-fit">
                      <button
                        type="button"
                        className="dropdown-toggle text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        onClick={() => setDeliveryMenuOpen((open) => !open)}
                        aria-expanded={deliveryMenuOpen}
                        aria-haspopup="menu"
                      >
                        <MoreDotIcon className="size-6" />
                      </button>
                      <Dropdown
                        isOpen={deliveryMenuOpen}
                        onClose={() => setDeliveryMenuOpen(false)}
                        className="w-40 space-y-1 p-2"
                      >
                        <DropdownItem
                          onItemClick={() => setDeliveryMenuOpen(false)}
                          className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                          더 보기
                        </DropdownItem>
                        <DropdownItem
                          onItemClick={() => setDeliveryMenuOpen(false)}
                          className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                          삭제
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>
                </div>
                <div className="custom-scrollbar max-w-full overflow-x-auto">
                  <div className="-ml-5 min-w-0 pl-2" style={{ minHeight: DELIVERY_WIDGET_CHART_HEIGHT }}>
                    <Chart
                      key={`${deliveryYear}-${deliveryMetric}`}
                      options={deliveryChartOptions}
                      series={deliveryChartSeries}
                      type="bar"
                      height={DELIVERY_WIDGET_CHART_HEIGHT}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="home-annual-delivery-widget-title">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <span
                      className="mt-1 hidden h-10 w-1 shrink-0 rounded-full bg-success-500 sm:block"
                      aria-hidden
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          id="home-annual-delivery-widget-title"
                          className="text-lg font-semibold text-gray-800 dark:text-white/90"
                        >
                          연도별 납품 현황
                        </h3>
                        <span className="bg-success-50 text-theme-xs rounded-full px-2 py-0.5 font-medium text-success-600 dark:bg-success-500/15 dark:text-success-400">
                          연간
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        2019~2026 품목별 스택 · {annualMetric === "quantity" ? "납품 건수" : "납품 금액"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
                      <button
                        type="button"
                        onClick={() => setAnnualMetric("quantity")}
                        className={`text-theme-sm rounded-md px-3 py-2 font-medium ${
                          annualMetric === "quantity"
                            ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        건수
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnnualMetric("amount")}
                        className={`text-theme-sm rounded-md px-3 py-2 font-medium ${
                          annualMetric === "amount"
                            ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        금액
                      </button>
                    </div>
                    <div className="relative h-fit">
                      <button
                        type="button"
                        className="dropdown-toggle text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        onClick={() => setAnnualMenuOpen((open) => !open)}
                        aria-expanded={annualMenuOpen}
                        aria-haspopup="menu"
                      >
                        <MoreDotIcon className="size-6" />
                      </button>
                      <Dropdown
                        isOpen={annualMenuOpen}
                        onClose={() => setAnnualMenuOpen(false)}
                        className="w-40 space-y-1 p-2"
                      >
                        <DropdownItem
                          onItemClick={() => setAnnualMenuOpen(false)}
                          className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                          더 보기
                        </DropdownItem>
                        <DropdownItem
                          onItemClick={() => setAnnualMenuOpen(false)}
                          className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                          삭제
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>
                </div>
                <div className="custom-scrollbar max-w-full overflow-x-auto">
                  <div className="-ml-5 min-w-[640px] pl-2" style={{ minHeight: DELIVERY_WIDGET_CHART_HEIGHT }}>
                    <Chart
                      key={`annual-${annualMetric}`}
                      options={annualChartOptions}
                      series={annualChartSeries}
                      type="bar"
                      height={DELIVERY_WIDGET_CHART_HEIGHT}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">생산현황</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                aria-label="생산현황 위젯 메뉴"
              >
                <MoreDotIcon className="size-6" />
              </button>
            </div>

            <div className="my-6">
              <div className="grid grid-cols-[1.1fr_0.9fr_1.3fr_0.5fr_0.6fr] gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
                <span className="text-theme-xs text-gray-400">일자</span>
                <span className="text-theme-xs text-gray-400">업체</span>
                <span className="text-theme-xs text-gray-400">제품</span>
                <span className="text-right text-theme-xs text-gray-400">타입</span>
                <span className="text-right text-theme-xs text-gray-400">진행률</span>
              </div>
              {productionStatusRows.map((item, index) => {
                const isDone = item.progress >= 100;
                const progressBadgeClassName = isDone
                  ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                  : "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500";

                return (
                  <div
                    key={`${item.date}-${item.company}-${item.product}-${index}`}
                    className="grid grid-cols-[1.1fr_0.9fr_1.3fr_0.5fr_0.6fr] items-center gap-2 border-b border-gray-100 py-3 dark:border-gray-800"
                  >
                    <span className="text-theme-sm text-gray-500 dark:text-gray-400">{item.date}</span>
                    <span className="text-theme-sm text-gray-500 dark:text-gray-400">{item.company}</span>
                    <span className="truncate text-theme-sm text-gray-500 dark:text-gray-400">{item.product}</span>
                    <span className="text-right text-theme-sm text-gray-500 dark:text-gray-400">{item.type}</span>
                    <span
                      className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium ${progressBadgeClassName}`}
                    >
                      {item.progress}%
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="flex w-full justify-center gap-2 rounded-lg border border-gray-300 bg-white p-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              자세히 보기
            </button>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">AS유형 분포</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="custom-scrollbar max-w-full overflow-x-auto">
                  <div className="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
                    {(["ALL", ...AS_TYPE_YEARS] as const).map((yearOption) => {
                      const isActive = asTypeYear === yearOption;
                      return (
                        <button
                          key={String(yearOption)}
                          type="button"
                            onClick={() => {
                              setAsTypeYear(yearOption);
                              setAsTypeHoveredIndex(null);
                            }}
                          className={`text-theme-sm rounded-md px-3 py-2 font-medium ${
                            isActive
                              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          }`}
                        >
                          {yearOption === "ALL" ? "전체" : `${yearOption}년`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative h-fit">
                  <button
                    type="button"
                    className="dropdown-toggle text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    onClick={() => setAsTypeMenuOpen((open) => !open)}
                    aria-expanded={asTypeMenuOpen}
                    aria-haspopup="menu"
                  >
                    <MoreDotIcon className="size-6" />
                  </button>
                  <Dropdown
                    isOpen={asTypeMenuOpen}
                    onClose={() => setAsTypeMenuOpen(false)}
                    className="w-40 space-y-1 p-2"
                  >
                    <DropdownItem
                      onItemClick={() => setAsTypeMenuOpen(false)}
                      className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                    >
                      View More
                    </DropdownItem>
                    <DropdownItem
                      onItemClick={() => setAsTypeMenuOpen(false)}
                      className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                    >
                      Delete
                    </DropdownItem>
                  </Dropdown>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-8 xl:flex-row">
                <div className="relative chartDarkStyle min-h-[320px]">
                  <Chart options={asTypePieOptions} series={asTypePieSeries} type="donut" height={320} width={320} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="max-w-[180px] truncate px-3 text-lg font-semibold text-gray-800 dark:text-white/90">
                      {asTypeHoveredItem ? asTypeHoveredItem.type : "Total"}
                    </p>
                    <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                      {asTypeHoveredItem ? asTypeHoveredItem.quantity : asTypeTotalQuantity}건
                    </p>
                  </div>
              </div>

              <div className="custom-scrollbar flex max-h-[340px] w-full flex-col items-start gap-4 overflow-y-auto pr-1">
                {asTypeLegendRowsWithRatio.map((row, index) => (
                  <div key={row.type} className="flex items-start gap-2.5">
                    <div
                      className="mt-1.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: asTypeColorByType[row.type] ?? asTypeBaseColors[index % asTypeBaseColors.length] }}
                    />
                    <div>
                      <h5 className="mb-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {row.type}
                      </h5>
                      <div className="flex items-center gap-2">
                        <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-400">
                          {row.ratioNumber.toFixed(2)}%
                        </p>
                        <div className="h-1 w-1 rounded-full bg-gray-400" />
                        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                          {row.quantity.toLocaleString()}건
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  발주 현황
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {/* <button className="text-theme-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
                  <svg className="stroke-current fill-white dark:fill-gray-800" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.29004 5.90393H17.7067" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M17.7075 14.0961H2.29085" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z" fill="" stroke="" stroke-width="1.5"></path>
                    <path d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z" fill="" stroke="" stroke-width="1.5"></path>
                  </svg>

                  Filter
                </button> */}

                {/* <button className="text-theme-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
                  See all
                </button> */}
              </div>
            </div>

            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <table className="min-w-full">
                <thead className="border-gray-100 border-y dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap first:pl-0">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                          발주회사
                        </p>
                      </div>
                    </th>
                    <th className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                          발주일자
                        </p>
                      </div>
                    </th>
                    <th className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                          제품명
                        </p>
                      </div>
                    </th>
                    <th className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                          단가
                          <span className="text-gray-500 text-theme-xs dark:text-gray-400">(단위: 1000원)</span>
                        </p>
                      </div>
                    </th>
                    <th className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                          발주수량
                        </p>
                      </div>
                    </th>
                    <th className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                          금액(단위: 1000원)
                        </p>
                      </div>
                    </th>
                    <th className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                          상태
                        </p>
                      </div>
                    </th>
                  </tr>
                </thead>


                <tbody className="py-3 divide-y divide-gray-100 dark:divide-gray-800">

                  {recentDeliveredProducts.map((row) => {
                    return (
                      <tr key={row.deliveryNo}>
                        <td className="px-6 py-3 whitespace-nowrap first:pl-0">
                          <div className="flex items-center col-span-4">
                            <div className="flex items-center gap-3">
                              {/* <div className="h-[50px] w-[50px] overflow-hidden rounded-md">
                                <img src="src/images/product/product-02.jpg" alt="Product" />
                              </div> */}
                              <div>
                                <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                  {row.partnerName}
                                </p>
                                <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                                  {row.deliveryNo}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap first:pl-0">
                          <div className="flex items-center col-span-2">
                            <p className="text-gray-500 text-theme-sm dark:text-gray-400">{row.deliveredAt}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap first:pl-0">
                          <div className="flex items-center col-span-2">
                            <p className="text-gray-500 text-theme-sm dark:text-gray-400">{row.productName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap first:pl-0">
                          <div className="flex items-center col-span-2">
                            <p className="text-gray-500 text-theme-sm dark:text-gray-400">
                              {row.unitPrice != null && row.unitPrice !== 0 ? formatCurrency(row.unitPrice, "KRW") : "-"}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap first:pl-0">
                          <div className="flex items-center col-span-2">
                            <p className="text-gray-500 text-theme-sm dark:text-gray-400">{row.quantity}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap first:pl-0">
                          <div className="flex items-center col-span-2">
                            <p className="text-gray-500 text-theme-sm dark:text-gray-400">
                              {row.amount != null && row.amount !== 0 ? formatCurrency(row.amount, "KRW") : "-"}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap first:pl-0">
                          <div className="flex items-center col-span-2">
                            <p className="bg-warning-50 text-theme-xs text-warning-600 dark:bg-warning-500/15 rounded-full px-2 py-0.5 font-medium dark:text-orange-400">
                              {row.status}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        
        

      </div>
    </>
  );
}