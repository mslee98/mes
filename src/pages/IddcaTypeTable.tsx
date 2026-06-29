import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import ActiveStatusBadge from "../components/common/ActiveStatusBadge";
import {
  CollapsibleDataTable,
  ListPageLayout,
  ListPageToolbarRow,
} from "../components/list";
import { TableCell, TableRow } from "../components/ui/table";
import { useAuth } from "../hooks/useAuth";
import { IDDCA_TYPE_PATH } from "../lib/appRoutes";
import { getDetectors, type DetectorListItem } from "../api/detectors";
import { getDetectorSeriesList } from "../api/detectorSeries";
import { labelForCommonCode } from "../api/commonCode";
import { useCountryCodes } from "../hooks/useCountryCodes";

const IDDCA_TABLE_COL_SPAN = 13;

const HEADER_CELL =
  "px-3 py-2 font-medium text-theme-xs text-gray-500 dark:text-gray-400";

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

function DetectorExpandedDetail({ row }: { row: DetectorListItem }) {
  return (
    <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-4 dark:border-white/[0.06] dark:bg-gray-800/40">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
        상세 정보
      </div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <DetailField label="Cooler" value={textOrDash(row.cooler)} />
        <DetailField label="프로젝트명" value={textOrDash(row.projectName)} />
        <DetailField label="프로젝트코드" value={textOrDash(row.projectCode)} />
        <DetailField label="Filter Cut" value={textOrDash(row.filterCut)} />
        <DetailField label="CSH" value={textOrDash(row.csh)} />
        <DetailField label="Feedthru" value={textOrDash(row.feedthruType)} />
        <DetailField
          label="특이사항"
          value={textOrDash(row.specialNote)}
          className="md:col-span-3 xl:col-span-6"
        />
        <DetailField
          label="비고"
          value={textOrDash(row.remark)}
          className="md:col-span-3 xl:col-span-6"
        />
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 ${className}`.trim()}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">{value}</div>
    </div>
  );
}

export default function IddcaTypeTablePage() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { countryCodes } = useCountryCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const { data: seriesList = [] } = useQuery({
    queryKey: ["detectorSeries", IDDCA_TYPE_PATH, true],
    queryFn: () =>
      getDetectorSeriesList(accessToken as string, { includeInactive: true }),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: detectorList = [], isLoading: isDetectorLoading } = useQuery({
    queryKey: ["detectors", IDDCA_TYPE_PATH, "all"],
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

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 검출기 타입"
        description="검출기 시리즈별 타입·양산 현황"
      />
      <PageBreadcrumb pageTitle="검출기 타입" />

      <ListPageLayout
        title="제조사업부 일반품 검출기 양산 현황"
        desc="검출기 시리즈별 전체 데이터를 한 화면에서 확인합니다."
        toolbar={
          <ListPageToolbarRow
            search={
              <p className="text-sm text-gray-500 dark:text-gray-400">
                행을 클릭하면 상세 스펙을 펼칠 수 있습니다.
              </p>
            }
            actions={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                총 시리즈 {seriesList.length}개 · 총 검출기 {detectorList.length}개
              </p>
            }
          />
        }
        searchOptionsOpen={false}
        searchOptions={null}
        pagination={null}
      >
        {isDetectorLoading ? (
          <ListPageLoading message="검출기 타입 목록을 불러오는 중입니다." />
        ) : sections.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            표시할 검출기 데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map(({ series, rows }) => (
              <section key={series.id} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    {series.name} ({series.code})
                  </h2>
                  <ActiveStatusBadge active={series.isActive} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {rows.length}건
                  </span>
                </div>

                <CollapsibleDataTable
                  items={rows}
                  getRowId={(row) => String(row.id)}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  colSpan={IDDCA_TABLE_COL_SPAN}
                  tableClassName="min-w-[1200px]"
                  emptyMessage="이 시리즈에 등록된 검출기가 없습니다."
                  header={
                    <TableRow>
                      <TableCell isHeader className={HEADER_CELL}>
                        ID
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        Detector Type
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        고객사
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        국가
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        Array (W*H)
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        Pitch
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        F-number
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        ROIC
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        납품 유형
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        양산
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        비고
                      </TableCell>
                      <TableCell isHeader className={HEADER_CELL}>
                        상태
                      </TableCell>
                      <TableCell isHeader className={`${HEADER_CELL} text-end`}>
                        상세
                      </TableCell>
                    </TableRow>
                  }
                  renderRow={(row, { expanded }) => {
                    const country = row.countryCode?.trim()
                      ? labelForCommonCode(countryCodes, row.countryCode)
                      : "-";
                    const deliveryTypeText = Array.isArray(row.deliveryType)
                      ? row.deliveryType.join(", ")
                      : textOrDash(row.deliveryType);

                    return (
                      <>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                          {row.id}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm font-medium text-gray-900 dark:text-gray-100">
                          {textOrDash(row.detectorType)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          {textOrDash(row.customerName)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          {country}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          {resolutionLabel(row)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          {pitchLabel(row)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          {textOrDash(row.fNumber)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          {textOrDash(row.roicType)}
                        </TableCell>
                        <TableCell className="max-w-[240px] px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          <div className="truncate" title={deliveryTypeText}>
                            {deliveryTypeText}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          {row.isMassProduction ? "Y" : "N"}
                        </TableCell>
                        <TableCell className="max-w-[180px] px-3 py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                          <div className="truncate" title={textOrDash(row.remark)}>
                            {textOrDash(row.remark)}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-theme-sm">
                          <ActiveStatusBadge active={row.isActive} />
                        </TableCell>
                        <TableCell className="px-3 py-3 text-end text-theme-sm text-brand-600 dark:text-brand-400">
                          {expanded ? "접기 ▲" : "상세 ▼"}
                        </TableCell>
                      </>
                    );
                  }}
                  renderExpanded={(row) => <DetectorExpandedDetail row={row} />}
                />
              </section>
            ))}
          </div>
        )}
      </ListPageLayout>
    </>
  );
}
