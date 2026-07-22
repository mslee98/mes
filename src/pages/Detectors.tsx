import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import SegmentedControl from "../components/common/SegmentedControl";
import ListPageLoading from "../components/common/ListPageLoading";
import Select from "../components/form/Select";
import ActiveStatusBadge from "../components/common/ActiveStatusBadge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DATA_TABLE_COMPACT_LINK_CLASS,
  DataListPrimaryActionButton,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import { PlusIcon } from "../icons";
import { useAuth } from "../hooks/useAuth";
import { usePagination } from "../hooks/usePagination";
import { useProductPermissions } from "../hooks/useProductPermissions";
import { getDetectors, type DetectorListItem } from "../api/detectors";
import { getDetectorSeriesList, type DetectorSeries } from "../api/detectorSeries";
import { useProductCommonCodes } from "../hooks/useProductCommonCodes";
import { labelForCommonCode } from "../api/commonCode";
import { IDDCA_TYPE_PATH } from "../lib/appRoutes";

const PAGE_SIZE = 10;

const ACTIVE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "true", label: "활성만" },
  { value: "false", label: "비활성만" },
];

const TAB_ALL = "all";
const TAB_SERIES_PREFIX = "series:";
/** 세그먼트 중 실제 필터가 아님 — 클릭 시 시리즈 등록 화면으로 이동 */
const TAB_ADD_SERIES = "__add_series__";

function tabValueForSeries(id: number): string {
  return `${TAB_SERIES_PREFIX}${id}`;
}

function seriesIdFromTab(tab: string): number | null {
  if (!tab.startsWith(TAB_SERIES_PREFIX)) return null;
  const id = Number(tab.slice(TAB_SERIES_PREFIX.length));
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export default function DetectorsPage() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadProducts, canManageProducts } = useProductPermissions();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [detectorTab, setDetectorTab] = useState<string>(TAB_ALL);
  const [activeFilter, setActiveFilter] = useState("");

  const { countryCodes } = useProductCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading && canReadProducts
  );

  const { data: seriesForTabs = [] } = useQuery({
    queryKey: ["detectorSeries", "tabs"],
    queryFn: () =>
      getDetectorSeriesList(accessToken as string, { includeInactive: true }),
    enabled: !!accessToken && !isAuthLoading && canReadProducts,
  });

  const sortedSeries = useMemo(() => {
    const list = [...(seriesForTabs as DetectorSeries[])];
    list.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id - b.id;
    });
    return list;
  }, [seriesForTabs]);

  const effectiveDetectorTab = useMemo(() => {
    const id = seriesIdFromTab(detectorTab);
    if (id == null) return detectorTab;
    const exists = sortedSeries.some((s) => s.id === id);
    return exists ? detectorTab : TAB_ALL;
  }, [detectorTab, sortedSeries]);

  const selectedSeriesId = useMemo(
    () => seriesIdFromTab(effectiveDetectorTab),
    [effectiveDetectorTab]
  );

  const detectorTabOptions = useMemo(() => {
    const tabs: { value: string; label: ReactNode }[] = [
      { value: TAB_ALL, label: "전체" },
    ];
    sortedSeries.forEach((s) => {
      const label =
        s.isActive === false ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="truncate">{s.name || s.code}</span>
            <span className="shrink-0 text-xs font-normal text-gray-400 dark:text-gray-500">
              비활성
            </span>
          </span>
        ) : (
          <span className="truncate">{s.name || s.code}</span>
        );
      tabs.push({
        value: tabValueForSeries(s.id),
        label,
      });
    });
    if (canManageProducts) {
      tabs.push({
        value: TAB_ADD_SERIES,
        label: (
          <span
            className="flex items-center gap-1.5 whitespace-nowrap text-sm"
            title="시리즈 추가"
          >
            <PlusIcon
              className="block h-3.5 w-3.5 shrink-0 text-gray-700 dark:text-gray-100"
              aria-hidden
            />
            추가
          </span>
        ),
      });
    }
    return tabs;
  }, [sortedSeries, canManageProducts]);

  const listParams = useMemo(() => {
    const p: Parameters<typeof getDetectors>[1] = {};
    const sid = seriesIdFromTab(effectiveDetectorTab);
    if (sid != null) {
      p.detectorSeriesId = sid;
    }
    if (activeFilter === "true") p.isActive = true;
    if (activeFilter === "false") p.isActive = false;
    const kw = searchKeyword.trim();
    if (kw) p.keyword = kw;
    return p;
  }, [effectiveDetectorTab, activeFilter, searchKeyword]);

  const { data: detectors = [], isLoading, error } = useQuery({
    queryKey: ["detectors", listParams],
    queryFn: () => getDetectors(accessToken as string, listParams),
    enabled: !!accessToken && !isAuthLoading && canReadProducts,
  });

  const totalCount = detectors.length;
  const pagination = usePagination({ totalCount, initialPageSize: PAGE_SIZE });
  const { startItem, endItem, setCurrentPage } = pagination;

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveDetectorTab, activeFilter, searchKeyword, setCurrentPage]);

  const pageList = useMemo(
    () => (detectors as DetectorListItem[]).slice(startItem - 1, endItem),
    [detectors, startItem, endItem]
  );

  const seriesLabel = (row: DetectorListItem) => {
    const rel = row.detectorSeries;
    if (rel) return `${rel.name} (${rel.code})`;
    return row.seriesCode?.trim() || "—";
  };

  const countryLabel = (code: string | null | undefined) => {
    const c = String(code ?? "").trim();
    if (!c) return "—";
    return labelForCommonCode(countryCodes, c);
  };

  const handleSeriesTabChange = (value: string) => {
    if (value === TAB_ADD_SERIES) {
      if (canManageProducts) navigate("/detector-series/new");
      return;
    }
    setDetectorTab(value);
  };

  const goAddDetector = () => {
    navigate("/detectors/new");
  };

  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 검출기 관리"
        description="검출기·시리즈 통합 목록"
      />
      <PageBreadcrumb pageTitle="검출기" />
      <ListPageLayout
        title="검출기 관리"
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <>
            <div className="min-w-0 flex-1 sm:max-w-[12rem]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                활성
              </label>
              <Select
                size="sm"
                options={ACTIVE_OPTIONS}
                value={activeFilter}
                onChange={setActiveFilter}
                placeholder="전체"
              />
            </div>
            <div className="flex shrink-0 items-end gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter("")}
                className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                필터 초기화
              </button>
            </div>
          </>
        }
        belowSearchOptions={
          <div className="border-b border-gray-100 pt-3 pb-3 dark:border-white/[0.05]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SegmentedControl
                  ariaLabel="검출기 시리즈 탭"
                  value={effectiveDetectorTab}
                  onChange={handleSeriesTabChange}
                  options={detectorTabOptions}
                />
              </div>
              {selectedSeriesId != null && canManageProducts ? (
                <Link
                  to={`/detector-series/${selectedSeriesId}/edit`}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
                >
                  시리즈 편집
                </Link>
              ) : null}
            </div>
          </div>
        }
        toolbar={
          <ListPageToolbarRow
            search={
              <DataListSearchInput
                id="detectors-search"
                placeholder="타입, 고객, 프로젝트 등 검색 (서버)"
                value={searchKeyword}
                onChange={setSearchKeyword}
              />
            }
            actions={
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={IDDCA_TYPE_PATH}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
                  >
                    검출기 타입 보기
                  </Link>
                  <DataListPrimaryActionButton
                    disabled={!canManageProducts}
                    onClick={goAddDetector}
                  >
                    검출기 등록
                  </DataListPrimaryActionButton>
                </div>
                <div className="flex items-center gap-3">
                  <DataListSearchOptionsButton
                    open={searchOptionsOpen}
                    onToggle={() => setSearchOptionsOpen((o) => !o)}
                  />
                </div>
              </>
            }
          />
        }
        pagination={
          !isLoading && !error && totalCount > 0 ? (
            <TablePagination {...pagination} />
          ) : null
        }
      >
        {!accessToken || !canReadProducts ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">
              {!canReadProducts
                ? "제품 조회 권한(product.read)이 없습니다."
                : "로그인 후 목록을 조회할 수 있습니다."}
            </p>
          </div>
        ) : isLoading ? (
          <ListPageLoading message="검출기 목록을 불러오는 중입니다." />
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
            목록을 불러오는 중 오류가 발생했습니다.
          </div>
        ) : (
          <DataTable fillWidth minWidth={0}>
            <DataTableHeader>
              <DataTableHeaderCell colSpan={2} compact sortable={false}>
                <DataTableHeaderLabel>시리즈</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={2} compact sortable={false}>
                <DataTableHeaderLabel>검출기 타입</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={2} compact sortable={false}>
                <DataTableHeaderLabel>고객</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>국가</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={3} compact sortable={false}>
                <DataTableHeaderLabel>프로젝트</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell
                colSpan={2}
                compact
                sortable={false}
                align="center"
                className="border-r-0"
              >
                <DataTableHeaderLabel align="center">상태</DataTableHeaderLabel>
              </DataTableHeaderCell>
            </DataTableHeader>
            <DataTableBody>
              {pageList.length === 0 ? (
                <DataTableRow>
                  <DataTableCell
                    colSpan={12}
                    compact
                    align="center"
                    className="border-r-0 py-6"
                  >
                    등록된 검출기가 없거나 조건에 맞는 항목이 없습니다.
                  </DataTableCell>
                </DataTableRow>
              ) : (
                pageList.map((row) => (
                  <DataTableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    onClick={() => navigate(`/detectors/${row.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/detectors/${row.id}`);
                      }
                    }}
                  >
                    <DataTableCell colSpan={2} compact>
                      {seriesLabel(row)}
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact>
                      <Link
                        to={`/detectors/${row.id}`}
                        className={`font-mono font-medium ${DATA_TABLE_COMPACT_LINK_CLASS}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.detectorType || "—"}
                      </Link>
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact>
                      {row.customerName?.trim() ? row.customerName : "—"}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      {countryLabel(row.countryCode)}
                    </DataTableCell>
                    <DataTableCell colSpan={3} compact className="min-w-0">
                      <span className="line-clamp-2" title={row.projectCode ?? ""}>
                        {[row.projectName, row.projectCode]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </span>
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact align="center" className="border-r-0">
                      <ActiveStatusBadge active={row.isActive} />
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        )}
      </ListPageLayout>
    </>
  );
}
