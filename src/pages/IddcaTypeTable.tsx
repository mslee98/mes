import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Badge from "../components/ui/badge/Badge";
import { useAuth } from "../hooks/useAuth";
import { getDetectors, type DetectorListItem } from "../api/detectors";
import { getDetectorSeriesList } from "../api/detectorSeries";
import {
  COMMON_CODE_GROUP_COUNTRY,
  labelForCommonCode,
} from "../api/commonCode";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";

function textOrDash(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "-";
}

function resolutionLabel(item: DetectorListItem): string {
  const w = item.arrayWidth;
  const h = item.arrayHeight;
  if (typeof w === "number" && typeof h === "number") return `${w}*${h}`;
  return "-";
}

function pitchLabel(item: DetectorListItem): string {
  const pitch = String(item.pitch ?? "").trim();
  if (!pitch) return "-";
  if (/um$/i.test(pitch)) return pitch;
  return `${pitch}um`;
}

export default function IddcaTypeTablePage() {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: seriesList = [] } = useQuery({
    queryKey: ["detectorSeries", "iddca-type-table", true],
    queryFn: () =>
      getDetectorSeriesList(accessToken as string, { includeInactive: true }),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: detectorList = [], isLoading: isDetectorLoading } = useQuery({
    queryKey: ["detectors", "iddca-type-table", "all"],
    queryFn: () => getDetectors(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });

  const sections = useMemo(() => {
    const bySeriesId = new Map<number, DetectorListItem[]>();
    for (const detector of detectorList) {
      const key = Number(detector.detectorSeriesId);
      const list = bySeriesId.get(key) ?? [];
      list.push(detector);
      bySeriesId.set(key, list);
    }

    return seriesList.map((series) => {
      const rows = (bySeriesId.get(series.id) ?? []).sort((a, b) =>
        textOrDash(a.detectorType).localeCompare(textOrDash(b.detectorType))
      );
      return { series, rows };
    });
  }, [detectorList, seriesList]);

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <div className="w-full px-3 py-4 sm:px-4 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">제조사업부 일반품 검출기 양산 현황</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              검출기 시리즈별 전체 데이터를 한 화면에서 확인합니다.
            </p>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            총 시리즈 {seriesList.length}개 · 총 검출기 {detectorList.length}개
          </div>
        </div>

        <div className="mt-5 space-y-8">
          {isDetectorLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              불러오는 중...
            </div>
          ) : sections.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              표시할 검출기 데이터가 없습니다.
            </div>
          ) : (
            sections.map(({ series, rows }) => (
              <section key={series.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">
                      {series.name} ({series.code})
                    </h2>
                    <Badge size="sm" color={series.isActive === false ? "error" : "success"}>
                      {series.isActive === false ? "비활성" : "활성"}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {rows.length}건
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur dark:bg-gray-900/95">
                        <tr>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            ID
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Detector Type
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            고객사
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            국가
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Array (W*H)
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Pitch
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            F-number
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            ROIC
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            납품 유형
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            양산
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            비고
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                            상태
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                            상세
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={13}
                              className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                            >
                              이 시리즈에 등록된 검출기가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, idx) => {
                            const isInactive = row.isActive === false;
                            const isExpanded = Boolean(expandedRows[row.id]);
                            const country =
                              row.countryCode?.trim()
                                ? labelForCommonCode(countryCodes, row.countryCode)
                                : "-";
                            const deliveryTypeText = Array.isArray(row.deliveryType)
                              ? row.deliveryType.join(", ")
                              : textOrDash(row.deliveryType);

                            return (
                              <Fragment key={row.id}>
                                <tr
                                  className={
                                    idx % 2 === 0
                                      ? "bg-white dark:bg-gray-900"
                                      : "bg-gray-50/60 dark:bg-gray-950/40"
                                  }
                                >
                                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                                    {row.id}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {textOrDash(row.detectorType)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    {textOrDash(row.customerName)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    {country}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    {resolutionLabel(row)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    {pitchLabel(row)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    {textOrDash(row.fNumber)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    {textOrDash(row.roicType)}
                                  </td>
                                  <td className="max-w-[240px] px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    <div className="truncate" title={deliveryTypeText}>
                                      {deliveryTypeText}
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    {row.isMassProduction ? "Y" : "N"}
                                  </td>
                                  <td className="max-w-[180px] px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                                    <div className="truncate" title={textOrDash(row.remark)}>
                                      {textOrDash(row.remark)}
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                                    <Badge
                                      size="sm"
                                      color={isInactive ? "error" : "success"}
                                    >
                                      {isInactive ? "비활성" : "활성"}
                                    </Badge>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                                    <button
                                      type="button"
                                      onClick={() => toggleRow(row.id)}
                                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                    >
                                      {isExpanded ? "접기" : "상세"}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded ? (
                                  <tr
                                    key={`detail-${row.id}`}
                                    className="bg-white dark:bg-gray-900"
                                  >
                                    <td colSpan={13} className="px-3 pb-4 pt-1">
                                      <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/40">
                                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                                          상세 정보
                                        </div>
                                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
                                          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Cooler</div>
                                            <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                                              {textOrDash(row.cooler)}
                                            </div>
                                          </div>
                                          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">프로젝트명</div>
                                            <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                                              {textOrDash(row.projectName)}
                                            </div>
                                          </div>
                                          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">프로젝트코드</div>
                                            <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                                              {textOrDash(row.projectCode)}
                                            </div>
                                          </div>
                                          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Filter Cut</div>
                                            <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                                              {textOrDash(row.filterCut)}
                                            </div>
                                          </div>
                                          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">CSH</div>
                                            <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                                              {textOrDash(row.csh)}
                                            </div>
                                          </div>
                                          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Feedthru</div>
                                            <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                                              {textOrDash(row.feedthruType)}
                                            </div>
                                          </div>
                                          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 md:col-span-3 xl:col-span-6 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">특이사항</div>
                                            <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                                              {textOrDash(row.specialNote)}
                                            </div>
                                          </div>
                                          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 md:col-span-3 xl:col-span-6 dark:border-gray-700 dark:bg-gray-900">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">비고</div>
                                            <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                                              {textOrDash(row.remark)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
