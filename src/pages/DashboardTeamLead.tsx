import PageMeta from "../components/common/PageMeta";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { MoreDotIcon } from "../icons";

const activityRows = [
  {
    id: "#PO-324112",
    category: "자재",
    company: "한빛정밀",
    arrival: "2026-04-10 14:15",
    route: "생산1팀",
    price: "₩ 1,250,000",
    status: "승인 완료",
    statusClass:
      "bg-success-50 dark:bg-success-500/15 text-success-700 dark:text-success-500 text-theme-xs rounded-full px-2 py-0.5 font-medium",
  },
  {
    id: "#PO-326789",
    category: "부품",
    company: "테크노바",
    arrival: "2026-04-11 11:45",
    route: "구매2팀",
    price: "₩ 849,900",
    status: "검토 중",
    statusClass:
      "bg-warning-50 dark:bg-warning-500/15 text-warning-600 dark:text-warning-400 text-theme-xs rounded-full px-2 py-0.5 font-medium",
  },
  {
    id: "#PO-328556",
    category: "완제품",
    company: "에이원테크",
    arrival: "2026-04-12 10:30",
    route: "품질보증팀",
    price: "₩ 2,150,890",
    status: "보완 요청",
    statusClass:
      "bg-error-50 dark:bg-error-500/15 text-error-600 dark:text-error-500 text-theme-xs rounded-full px-2 py-0.5 font-medium",
  },
] as const;

export default function DashboardTeamLead() {
  const deliveryStatsOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Pretendard, sans-serif",
      height: 260,
    },
    colors: ["#C2D6FF", "#465FFF"],
    plotOptions: { bar: { columnWidth: "38%", borderRadius: 6 } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#F2F4F7" },
    xaxis: {
      categories: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => `${v}%` } },
    legend: { show: false },
  };

  const deliveryStatsSeries = [
    { name: "Shipment", data: [80, 60, 70, 40, 65, 45, 48, 55, 58, 50, 67, 75] },
    { name: "Delivery", data: [90, 50, 65, 25, 78, 68, 75, 90, 30, 70, 90, 95] },
  ];

  const smallSparkOptions: ApexOptions = {
    chart: { type: "area", sparkline: { enabled: true }, toolbar: { show: false }, height: 70 },
    stroke: { curve: "smooth", width: 1.5 },
    colors: ["#12B76A"],
    fill: { type: "gradient", gradient: { opacityFrom: 0.55, opacityTo: 0 } },
    dataLabels: { enabled: false },
  };

  return (
    <>
      <PageMeta title="팀장 대시보드" description="발주/실적 운영 중심 팀장 대시보드" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">대시보드 디자인 샘플</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            발주 현황, 승인 상태, 팀별 실적을 빠르게 확인하는 관리 화면입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M3 7.5h18M6 16.5h12M7.5 7.5v9m9-9v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white/90">12,384</h3>
              <p className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                총 발주 건수
                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-sm font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                  +20%
                </span>
              </p>
            </div>
          </article>

          <article className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M3 13h18M7 13l2-4h6l2 4M7 13v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white/90">728</h3>
              <p className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                진행 중 안건
                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-sm font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                  +12%
                </span>
              </p>
            </div>
          </article>

          <article className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M4 8h16l-2 10H6L4 8Zm4-3h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white/90">93.6%</h3>
              <p className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                목표 달성률
                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-sm font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                  +3.5%
                </span>
              </p>
            </div>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">월간 실적 추이</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">요청 대비 완료 비율 70.5%</p>
                </div>
                <button className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                  <MoreDotIcon className="size-6" />
                </button>
              </div>
              <div className="pt-5">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-200" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">요청</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">완료</p>
                  </div>
                </div>
                <Chart options={deliveryStatsOptions} series={deliveryStatsSeries} type="bar" height={260} />
              </div>
            </section>

            <div className="grid gap-6 sm:grid-cols-2">
              <section className="flex flex-col justify-between space-y-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">이번달 누적 매출</p>
                    <h3 className="text-3xl font-medium text-gray-800 dark:text-white/90">₩ 23,445,700</h3>
                  </div>
                  <MoreDotIcon className="size-6 text-gray-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">완료 안건</p>
                    <h3 className="text-3xl font-medium text-gray-800 dark:text-white/90">9,258</h3>
                  </div>
                  <Chart
                    options={smallSparkOptions}
                    series={[{ name: "완료 안건", data: [22, 18, 26, 12, 19, 18, 14, 15, 16, 13, 20, 10] }]}
                    type="area"
                    height={70}
                    width={150}
                  />
                </div>
              </section>

              <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Delivery Vehicles</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vehicles operating on the road</p>
                  </div>
                  <MoreDotIcon className="size-6 text-gray-400 hover:text-gray-700 dark:hover:text-white" />
                </div>
                <div className="relative mt-5 flex min-h-[150px] justify-between">
                  <div>
                    <h3 className="mb-1 text-3xl font-medium text-gray-800 dark:text-white/90">29</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-success-600">+3.85%</span> than last Week
                    </p>
                    <div className="mt-5 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-inset ring-success-500">
                        <div className="h-2.5 w-2.5 rounded-full bg-success-500" />
                      </div>
                      <span className="text-sm font-medium text-success-500">On-route</span>
                    </div>
                  </div>
                  <div className="pointer-events-none">
                    <img
                      className="absolute -right-6 -bottom-2 w-64 object-contain"
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
          </div>

          <div className="lg:col-span-1">
            <div className="space-y-2 rounded-xl border bg-gray-100 p-2 dark:border-gray-800 dark:bg-white/[0.03]">
              <section className="rounded-xl bg-white p-4 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">최근 결재 흐름</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">최근 조회된 안건 이력</p>
                  </div>
                  <MoreDotIcon className="size-6 text-gray-400" />
                </div>
                <div className="mt-4 h-[180px] rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800" />
              </section>

              <section className="rounded-xl bg-white p-4 dark:bg-gray-900">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">안건 ID</p>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">#APR-28745-72809</h3>
                  </div>
                  <span className="inline-flex items-center justify-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-sm font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                    승인 진행중
                  </span>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">2026-04-12</p>
                    <h4 className="font-medium text-gray-800 dark:text-white/90">요청 등록</h4>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">2026-04-13</p>
                    <h4 className="font-medium text-gray-800 dark:text-white/90">검토 진행</h4>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">2026-04-14</p>
                    <h4 className="font-medium text-gray-800 dark:text-white/90">최종 승인 예정</h4>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
            <div className="flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">팀 운영 활동</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">최근 발주/승인 활동 이력</p>
            </div>
          </div>
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">발주 번호</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">분류</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">협력사</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">요청 일시</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">담당 팀</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">금액</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {activityRows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="p-4 text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-400">{row.id}</td>
                    <td className="p-4 text-sm whitespace-nowrap text-gray-800 dark:text-white/90">{row.category}</td>
                    <td className="p-4 text-sm whitespace-nowrap text-gray-700 dark:text-white/90">{row.company}</td>
                    <td className="p-4 text-sm whitespace-nowrap text-gray-700 dark:text-white/90">{row.arrival}</td>
                    <td className="p-4 text-sm whitespace-nowrap text-gray-700 dark:text-white/90">{row.route}</td>
                    <td className="p-4 text-sm whitespace-nowrap text-gray-700 dark:text-white/90">{row.price}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={row.statusClass}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
