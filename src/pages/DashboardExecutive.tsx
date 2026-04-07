import { useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../components/common/PageMeta";
import { MoreDotIcon } from "../icons";

const overviewCards = [
  { label: "총 발주 금액", value: "₩ 20.0억", delta: "+2.5%", positive: true },
  { label: "승인 완료 건수", value: "9,528", delta: "+9.5%", positive: true },
  { label: "평균 승인 리드타임", value: "1.84일", delta: "-1.6%", positive: false },
  { label: "지연 납품 건수", value: "132", delta: "+3.5%", positive: false },
] as const;

const recentApprovals = [
  { no: "#APR-429", date: "2026-04-07", user: "김현우", amount: "₩ 473,850", status: "완료" },
  { no: "#APR-274", date: "2026-04-06", user: "이민지", amount: "₩ 293,010", status: "완료" },
  { no: "#APR-600", date: "2026-04-06", user: "박도윤", amount: "₩ 782,010", status: "대기" },
  { no: "#APR-447", date: "2026-04-05", user: "정하은", amount: "₩ 202,870", status: "반려" },
  { no: "#APR-647", date: "2026-04-05", user: "최서준", amount: "₩ 490,510", status: "완료" },
] as const;

const activities = [
  { user: "한지민", action: "발주 결재 승인", doc: "PO-4491C", time: "방금 전" },
  { user: "김동현", action: "발주 상신 등록", doc: "PO-234G", time: "15분 전" },
  { user: "이유진", action: "납품 지연 알림 확인", doc: "DLV-2891C", time: "1시간 전" },
  { user: "박서연", action: "결재 반려 처리", doc: "APR-125NH", time: "3시간 전" },
] as const;

export default function DashboardExecutive() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("weekly");

  const overviewChartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "Pretendard, sans-serif", height: 330 },
    colors: ["#2A31D8", "#465FFF", "#7592FF", "#C2D6FF"],
    plotOptions: { bar: { columnWidth: "42%", borderRadius: 6 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    grid: { borderColor: "#E5E7EB" },
    legend: { position: "top", horizontalAlign: "left" },
  };
  const overviewChartSeries = [
    { name: "발주 노출", data: [44, 55, 41, 67, 22, 43, 55, 41] },
    { name: "승인 세션", data: [13, 23, 20, 8, 13, 27, 13, 23] },
    { name: "결재 전환", data: [11, 17, 15, 15, 21, 14, 18, 20] },
    { name: "최종 완료", data: [21, 7, 25, 13, 22, 8, 18, 20] },
  ];

  const churnMiniOptions: ApexOptions = {
    chart: { type: "area", sparkline: { enabled: true }, toolbar: { show: false }, height: 60 },
    stroke: { width: 2, curve: "smooth" },
    colors: ["#EF4444"],
    fill: { type: "gradient", gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
    dataLabels: { enabled: false },
  };
  const growthMiniOptions: ApexOptions = {
    chart: { type: "area", sparkline: { enabled: true }, toolbar: { show: false }, height: 60 },
    stroke: { width: 2, curve: "smooth" },
    colors: ["#10B981"],
    fill: { type: "gradient", gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
    dataLabels: { enabled: false },
  };

  const funnelOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "Pretendard, sans-serif", height: 330 },
    colors: ["#2A31D8"],
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["인지", "검토", "상신", "승인", "발주", "납품", "정산"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    grid: { borderColor: "#E5E7EB" },
    legend: { show: false },
  };

  return (
    <>
      <PageMeta title="경영 대시보드" description="임원 관점 경영 지표 요약" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">대시보드 디자인 샘플</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            임원진이 월간 실적, 결재 전환, 운영 리스크를 한눈에 파악하는 화면입니다.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Overview</h3>
            <div className="flex gap-x-3.5">
              <div className="inline-flex w-full items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
                {(["weekly", "monthly", "yearly"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPeriod(item)}
                    className={`text-theme-sm w-full rounded-md px-3 py-2 font-medium ${
                      period === item
                        ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    {item === "weekly" ? "Weekly" : item === "monthly" ? "Monthly" : "Yearly"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="text-theme-sm inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              >
                Filter
              </button>
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

        <div className="gap-5 space-y-5 sm:gap-6 sm:space-y-6 xl:grid xl:grid-cols-12 xl:space-y-0">
          <div className="xl:col-span-7 2xl:col-span-8">
            <div className="space-y-5 sm:space-y-6">
              <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="mb-6 flex justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">반려율</h3>
                      <p className="text-theme-sm mt-1 text-gray-500 dark:text-gray-400">주간 반려율 추이</p>
                    </div>
                    <MoreDotIcon className="size-6 text-gray-400" />
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-title-xs font-semibold text-gray-800 dark:text-white/90">4.26%</h3>
                      <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                        <span className="mr-1 inline-block text-error-500">0.31%</span>전주 대비
                      </p>
                    </div>
                    <Chart
                      options={churnMiniOptions}
                      series={[{ name: "반려율", data: [4.8, 4.2, 5.1, 4.0, 3.9, 4.1, 4.26] }]}
                      type="area"
                      height={60}
                      width={96}
                    />
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="mb-6 flex justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">승인 사용자 증가</h3>
                      <p className="text-theme-sm mt-1 text-gray-500 dark:text-gray-400">웹 + 모바일 승인자</p>
                    </div>
                    <MoreDotIcon className="size-6 text-gray-400" />
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-title-xs font-semibold text-gray-800 dark:text-white/90">3,768</h3>
                      <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                        <span className="mr-1 inline-block text-success-600">+3.85%</span>전주 대비
                      </p>
                    </div>
                    <Chart
                      options={growthMiniOptions}
                      series={[{ name: "승인 사용자", data: [2900, 3020, 3180, 3250, 3410, 3560, 3768] }]}
                      type="area"
                      height={60}
                      width={96}
                    />
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-6 flex justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">전환 퍼널</h3>
                  <MoreDotIcon className="size-6 text-gray-400" />
                </div>
                <div className="custom-scrollbar max-w-full overflow-x-auto">
                  <div className="-ml-5 min-w-[700px] pl-2">
                    <Chart options={overviewChartOptions} series={overviewChartSeries} type="bar" height={330} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">최근 결재 문서</h3>
                </div>
                <div className="custom-scrollbar overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">문서번호</th>
                        <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">종결일</th>
                        <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">기안자</th>
                        <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">금액</th>
                        <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {recentApprovals.map((row) => {
                        const badgeClass =
                          row.status === "완료"
                            ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                            : row.status === "대기"
                              ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500"
                              : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500";
                        return (
                          <tr key={row.no}>
                            <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">{row.no}</td>
                            <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">{row.date}</td>
                            <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">{row.user}</td>
                            <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">{row.amount}</td>
                            <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-700 dark:text-gray-400">
                              <span className={`rounded-full px-2 py-0.5 text-theme-xs font-medium ${badgeClass}`}>{row.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-5 2xl:col-span-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-6 flex justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">단계별 전환 건수</h3>
                <MoreDotIcon className="size-6 text-gray-400" />
              </div>
              <Chart options={funnelOptions} series={[{ name: "건수", data: [120, 100, 86, 72, 58, 44, 32] }]} type="bar" height={330} />
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-6 flex justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">활동 로그</h3>
                <MoreDotIcon className="size-6 text-gray-400" />
              </div>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={`${activity.user}-${activity.doc}`} className="rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{activity.user}</span>
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">{activity.action}</span>
                    </div>
                    <p className="text-theme-sm text-gray-500 dark:text-gray-400">{activity.doc}</p>
                    <p className="text-theme-xs mt-1 text-gray-400">{activity.time}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
