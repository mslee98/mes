import PageMeta from "../components/common/PageMeta";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import MonthlyTarget from "../components/ecommerce/MonthlyTarget";
import { MoreDotIcon } from "../icons";

const materialKpis = [
  { label: "납품 건수", value: "12건", note: "26년 4월 2주차 기준" },
  { label: "납품 예정 건수", value: "5건", note: "26년 4월 2주차 기준" },
  { label: "RMA 건수", value: "2.3%", note: "26년 4월 2주차 기준" },
] as const;

const materialQuality = [
  { metric: "productDefinitionId 누락 라인", value: "3.2K" },
  { metric: "라인 합계 vs 공급가액 편차", value: "2.6K" },
  { metric: "스냅샷(제품명/버전) 누락", value: "1.9K" },
  { metric: "금액 0 / 수량 0 이상치", value: "1.1K" },
] as const;

const materialDistribution = [
  { title: "EA 단위 품목", value: "4.7K" },
  { title: "KRW 통화 비중", value: "3.4K" },
  { title: "품목 평균 리드타임", value: "2.9K" },
  { title: "납품 지연 위험 품목", value: "1.5K" },
] as const;

const recentDeliveredProducts = [
  {
    deliveryNo: "#DLV-429",
    deliveredAt: "2026-04-07",
    productName: "SUPER MARKOS",
    amount: "₩ 473,850",
    status: "완료",
  },
  {
    deliveryNo: "#DLV-274",
    deliveredAt: "2026-04-06",
    productName: "ICE1280",
    amount: "₩ 293,010",
    status: "완료",
  },
  {
    deliveryNo: "#DLV-600",
    deliveredAt: "2026-04-05",
    productName: "MARKOS",
    amount: "₩ 782,010",
    status: "대기",
  },
  {
    deliveryNo: "#DLV-447",
    deliveredAt: "2026-04-05",
    productName: "MARKOS",
    amount: "₩ 202,870",
    status: "지연",
  },
  {
    deliveryNo: "#DLV-647",
    deliveredAt: "2026-04-04",
    productName: "MARKOS",
    amount: "₩ 490,510",
    status: "완료",
  },
] as const;

export default function DashboardMaterial() {
  const activeUsersChartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 155,
      toolbar: { show: false },
      sparkline: { enabled: true },
      fontFamily: "Pretendard, sans-serif",
    },
    colors: ["#465FFF"],
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    dataLabels: { enabled: false },
    tooltip: { enabled: true },
  };
  const activeUsersChartSeries = [
    { name: "26년 RMA 건수", data: [112, 108, 114, 96, 129, 112, 116, 129, 124, 116, 120, 90] },
  ];

  return (
    <>
      <PageMeta title="자재 대시보드" description="자재팀 운영 지표 요약" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            대시보드 디자인 샘플
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            자재팀이 재고 상태와 입고 계획을 빠르게 확인할 수 있는 화면입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {materialKpis.map((kpi) => (
            <section
              key={kpi.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{kpi.note}</p>
            </section>
          ))}
        </div>

        {/* <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">자재 품질 점수(주간)</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">$12,423</h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              +12%
            </span>
          </div>
          <div className="mt-4">
            <Chart options={multiSeriesOptions} series={multiSeries} type="bar" height={220} />
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:w-44">
                <Select
                  size="sm"
                  options={periodOptions}
                  value={period}
                  onChange={setPeriod}
                  placeholder="기간 선택"
                />
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Progress report
              </button>
            </div>
          </div>
        </section> */}

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="relative space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
              <div className="pointer-events-none absolute inset-0 rounded-2xl dark:bg-black/10" />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">SUPSER MARKOS</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">26년 4월 2주차 Super MARKOS 통계</p>
                </div>
                <MoreDotIcon className="size-6 text-gray-400 hover:text-gray-700 dark:hover:text-white" />
              </div>
              <div className="relative mt-5 flex min-h-[150px] items-start justify-between">
                <div className="space-y-4 pt-1">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-inset ring-success-500">
                      <div className="h-2.5 w-2.5 rounded-full bg-success-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-success-500">납품 수</p>
                      <h3 className="mt-1 text-3xl font-medium leading-none text-gray-800 dark:text-white/90">22</h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-success-600">+17%</span> 지난주 대비
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-inset ring-error-500">
                      <div className="h-2.5 w-2.5 rounded-full bg-error-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-error-500">RMA 수</p>
                      <p className="mt-1 text-lg leading-none font-semibold text-gray-800 dark:text-white/90">0</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-error-600">-30%</span> 지난 대비
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none">
                  <img
                    className="absolute -right-5 -bottom-2 w-60 object-contain dark:brightness-70 dark:contrast-75 dark:saturate-75"
                    style={{
                      maskImage: "linear-gradient(110deg, transparent 8%, rgba(0,0,0,0.88) 46%, rgba(0,0,0,1) 100%)",
                      WebkitMaskImage:
                        "linear-gradient(110deg, transparent 8%, rgba(0,0,0,0.88) 46%, rgba(0,0,0,1) 100%)",
                    }}
                    src="/images/markos_coller.png"
                    alt="cooler equipment"
                  />
                </div>
              </div>
            </section>

            <section className="relative space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
              <div className="pointer-events-none absolute inset-0 rounded-2xl dark:bg-black/10" />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">ICE1280</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">26년 4월 2주차 ICE1280 통계</p>
                </div>
                <MoreDotIcon className="size-6 text-gray-400 hover:text-gray-700 dark:hover:text-white" />
              </div>
              <div className="relative mt-5 flex min-h-[150px] items-start justify-between">
                <div className="space-y-4 pt-1">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-inset ring-success-500">
                      <div className="h-2.5 w-2.5 rounded-full bg-success-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-success-500">납품 수</p>
                      <h3 className="mt-1 text-3xl font-medium leading-none text-gray-800 dark:text-white/90">22</h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-success-600">+17%</span> 지난주 대비
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-inset ring-error-500">
                      <div className="h-2.5 w-2.5 rounded-full bg-error-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-error-500">RMA 수</p>
                      <p className="mt-1 text-lg leading-none font-semibold text-gray-800 dark:text-white/90">0</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-error-600">-30%</span> 지난 대비
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none">
                  <img
                    className="absolute -right-6 -bottom-2 w-64 object-contain dark:brightness-70 dark:contrast-75 dark:saturate-75"
                    style={{
                      maskImage: "linear-gradient(110deg, transparent 8%, rgba(0,0,0,0.88) 46%, rgba(0,0,0,1) 100%)",
                      WebkitMaskImage:
                        "linear-gradient(110deg, transparent 8%, rgba(0,0,0,0.88) 46%, rgba(0,0,0,1) 100%)",
                    }}
                    src="/images/markos_engine.png"
                    alt="delivery vehicle"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    품목/제품정의 품질
                  </h2>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    aria-label="품질 위젯 메뉴"
                  >
                    <MoreDotIcon className="size-6" />
                  </button>
                </div>

                <div className="my-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                    <span className="text-theme-xs text-gray-400">항목</span>
                    <span className="text-right text-theme-xs text-gray-400">건수</span>
                  </div>
                  {materialQuality.map((item) => (
                    <div
                      key={item.metric}
                      className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-gray-800"
                    >
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">
                        {item.metric}
                      </span>
                      <span className="text-right text-theme-sm text-gray-500 dark:text-gray-400">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="flex w-full justify-center gap-2 rounded-lg border border-gray-300 bg-white p-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  Quality Report
                </button>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    원가/분포 지표
                  </h2>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    aria-label="분포 위젯 메뉴"
                  >
                    <MoreDotIcon className="size-6" />
                  </button>
                </div>

                <div className="my-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                    <span className="text-theme-xs text-gray-400">지표</span>
                    <span className="text-right text-theme-xs text-gray-400">값</span>
                  </div>
                  {materialDistribution.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-gray-800"
                    >
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">
                        {item.title}
                      </span>
                      <span className="text-right text-theme-sm text-gray-500 dark:text-gray-400">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white p-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  Distribution Report
                </button>
              </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Active Users
                </h2>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                  aria-label="활성 사용자 위젯 메뉴"
                >
                  <MoreDotIcon className="size-6" />
                </button>
              </div>

              <div className="mt-6 flex items-end gap-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="relative inline-block h-5 w-5">
                    <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500">
                      <span className="absolute -left-1 -top-1 inline-flex h-4 w-4 animate-ping rounded-full bg-red-400 opacity-75" />
                    </span>
                  </span>
                  <span className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
                    112
                  </span>
                </div>
                <span className="mb-1 block text-theme-sm text-gray-500 dark:text-gray-400">
                  26년 RMA 건수
                </span>
              </div>

              <div className="my-5 min-h-[155px] rounded-xl bg-gray-50 dark:bg-gray-900">
                <Chart
                  options={activeUsersChartOptions}
                  series={activeUsersChartSeries}
                  type="area"
                  height={155}
                />
              </div>

              <div className="flex items-center justify-center gap-6">
                <div>
                  <p className="text-center text-lg font-semibold text-gray-800 dark:text-white/90">
                    3.2
                  </p>
                  <p className="mt-0.5 text-center text-theme-xs text-gray-500 dark:text-gray-400">
                    일평균
                  </p>
                </div>

                <div className="h-11 w-px bg-gray-200 dark:bg-gray-800" />

                <div>
                  <p className="text-center text-lg font-semibold text-gray-800 dark:text-white/90">
                    7.1
                  </p>
                  <p className="mt-0.5 text-center text-theme-xs text-gray-500 dark:text-gray-400">
                    주차별 평균
                  </p>
                </div>

                <div className="h-11 w-px bg-gray-200 dark:bg-gray-800" />

                <div>
                  <p className="text-center text-lg font-semibold text-gray-800 dark:text-white/90">
                    6.3
                  </p>
                  <p className="mt-0.5 text-center text-theme-xs text-gray-500 dark:text-gray-400">
                    월 평균
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              최근 납품 제품
            </h3>
          </div>
          <div className="custom-scrollbar overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                    납품번호
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                    납품일
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                    제품명
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                    금액
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {recentDeliveredProducts.map((row) => {
                  const badgeClassName =
                    row.status === "완료"
                      ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                      : row.status === "대기"
                        ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500"
                        : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500";
                  return (
                    <tr key={row.deliveryNo}>
                      <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">
                        {row.deliveryNo}
                      </td>
                      <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">
                        {row.deliveredAt}
                      </td>
                      <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">
                        {row.productName}
                      </td>
                      <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">
                        {row.amount}
                      </td>
                      <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">
                        <span className={`rounded-full px-2 py-0.5 text-theme-xs font-medium ${badgeClassName}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <MonthlyTarget />
      </div>
    </>
  );
}
