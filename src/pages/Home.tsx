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

const DELIVERY_CHART_HEIGHT = 360;

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

const overviewCards = [
  { label: "총 발주 금액", value: "₩ 20.0억", delta: "+2.5%", positive: true },
  { label: "납품 건수", value: "9,528", delta: "+9.5%", positive: true },
  { label: "지연 납품 건수", value: "132", delta: "+3.5%", positive: false },
  { label: "RMA 건수", value: "14건", delta: "+1.7%", positive: false },
] as const;

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


export default function Home() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [deliveryMenuOpen, setDeliveryMenuOpen] = useState(false);
  const [deliveryYear, setDeliveryYear] = useState<DeliveryYear>(2025);
  const [deliveryMetric, setDeliveryMetric] = useState<DeliveryMetric>("quantity");

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
        height: DELIVERY_CHART_HEIGHT,
      },
      colors: ["#2A31D8", "#465FFF", "#7592FF", "#C2D6FF"],
      plotOptions: {
        bar: {
          columnWidth: "42%",
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
        
        <section>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">월별 납품 현황</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  품목별 스택 — {deliveryYear}년 · {deliveryMetric === "quantity" ? "납품 건수" : "납품 금액"}
                </p>
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
              <div className="-ml-5 min-w-[920px] pl-2" style={{ minHeight: DELIVERY_CHART_HEIGHT }}>
                <Chart
                  key={`${deliveryYear}-${deliveryMetric}`}
                  options={deliveryChartOptions}
                  series={deliveryChartSeries}
                  type="bar"
                  height={DELIVERY_CHART_HEIGHT}
                />
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}