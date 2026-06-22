import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import SegmentedControl from "../components/common/SegmentedControl";
import DatePicker from "../components/form/date-picker";
import Select from "../components/form/Select";
import {
  DataListSearchInput,
  DataListSearchOptionsButton,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import ListPageLoading from "../components/common/ListPageLoading";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import { DeliveryPlanCreateModal } from "../components/delivery/DeliveryPlanCreateModal";
import { DeliveryUnitListRow } from "../components/production/DeliveryUnitListRow";
import { useAuth } from "../hooks/useAuth";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { useDeliveryPermissions } from "../hooks/useDeliveryPermissions";
import { useDeliveryPlanUnitSelection } from "../hooks/useDeliveryPlanUnitSelection";
import { useServerListPagination } from "../hooks/useServerListPagination";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
} from "../api/commonCode";
import { todayYmdInTimeZone } from "../lib/format/dateFormat";
import { getDueDateRelative } from "../lib/format/dueDateDisplay";
import {
  PRODUCTION_PLAN_UNIT_TABS,
  tabLabel,
  type UnitListMode,
  unitListBreadcrumbTitle,
  unitListMetaDescription,
  unitListPageTitle,
  perspectiveForUnitListMode,
} from "../domains/production-plan/helpers/unitListPerspective";
import {
  compareUnitsNewestFirst,
  resolveUnitListSort,
} from "../domains/production-plan/helpers/unitListSort";
import { PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS } from "../domains/production-plan/queries/unitListQueryOptions";
import {
  DELIVERY_UNIT_COLUMN_ALIGN,
  DELIVERY_UNIT_TABLE_MIN_WIDTH_PX,
  deliveryUnitTableGridTemplate,
  deliveryUnitTableLayout,
  deliveryUnitTableTrackCount,
} from "../domains/delivery/layout/deliveryUnitDataTableLayout";
import {
  getProductionPlanUnitOverview,
  getProductionPlanUnits,
  type DeliveryPlanAssignmentFilter,
  type ProductionPlanUnitCounts,
  type ProductionPlanUnitDateBasis,
  type ProductionPlanUnitListParams,
  type ProductionPlanUnitListResponse,
  type ProductionPlanUnitPerspective,
  type ProductionPlanUnitTab,
} from "../api/purchaseOrder";

const DEFAULT_PAGE_SIZE = 20;
/** 지연 탭: 서버 `DELAYED` 외 대기·진행 중 달력 지연 유닛 포함 — 소스 탭별 상한(백엔드와 동일 범위·검색 조건) */
const DELAYED_TAB_SOURCE_PAGE_SIZE = 500;

const DELIVERY_PLAN_ASSIGNMENT_LABELS: Record<
  DeliveryPlanAssignmentFilter | "all",
  string
> = {
  unassigned: "미배정",
  assigned: "배정됨",
  all: "전체",
};

type ProductionAssignmentView = DeliveryPlanAssignmentFilter | "all";

function normalizeMonthInput(v: string): string {
  if (!/^\d{4}-\d{2}$/.test(v)) return "";
  const [yearText, monthText] = v.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
  if (month < 1 || month > 12) return "";
  return `${yearText}-${monthText}`;
}

type ProductionPlanUnitListRow = ProductionPlanUnitListResponse["items"][number];

function tabBadgeCount(
  tab: ProductionPlanUnitTab,
  summary?: ProductionPlanUnitCounts
): number {
  if (!summary) return 0;
  if (tab === "ALL") return Number(summary.all) || Number(summary.total) || 0;
  if (tab === "WAITING") return Number(summary.waiting) || 0;
  if (tab === "IN_PROGRESS") return Number(summary.inProgress) || 0;
  if (tab === "COMPLETED") return Number(summary.completed) || 0;
  return Number(summary.delayed) || 0;
}

function tabCountBadge(tab: ProductionPlanUnitTab, count: number) {
  if (tab === "ALL") {
    return (
      <Badge size="sm" variant="solid" color="dark">
        {count}
      </Badge>
    );
  }
  if (tab === "WAITING") {
    return (
      <Badge size="sm" variant="solid" color="dark">
        {count}
      </Badge>
    );
  }
  if (tab === "COMPLETED") {
    return (
      <Badge size="sm" color="success">
        {count}
      </Badge>
    );
  }
  if (tab === "DELAYED") {
    return (
      <Badge size="sm" color="warning">
        {count}
      </Badge>
    );
  }
  return (
    <Badge size="sm" color="primary">
      {count}
    </Badge>
  );
}

function toDateBasisLabel(v: ProductionPlanUnitDateBasis): string {
  if (v === "delivery") return "납품일";
  if (v === "coalesce") return "계획우선(보정)";
  return "계획일";
}

/** 서울 달력 기준: 미납품이고 발주 최종 납기가 오늘보다 이전이면 지연 */
function isRowCalendarDelayed(
  row: ProductionPlanUnitListRow,
  todayYmd: string
): boolean {
  if (row.isDelivered === true) return false;
  const rel = getDueDateRelative(row.dueDate, { todayYmd });
  return rel != null && rel.diff < 0;
}

function mergeDelayedTabItems(
  responses: Array<ProductionPlanUnitListResponse | undefined>,
  todayYmd: string
): ProductionPlanUnitListRow[] {
  const byId = new Map<string, ProductionPlanUnitListRow>();
  for (const res of responses) {
    for (const item of res?.items ?? []) {
      byId.set(item.unitId, item);
    }
  }
  const merged = [...byId.values()].filter((row) => isRowCalendarDelayed(row, todayYmd));
  merged.sort(compareUnitsNewestFirst);
  return merged;
}

type DeliveryUnitsProps = {
  /** @deprecated perspective 대신 mode 사용 */
  perspective?: ProductionPlanUnitPerspective;
  mode?: UnitListMode;
  embedded?: boolean;
};

export default function DeliveryUnits({
  perspective: perspectiveProp,
  mode: modeProp,
  embedded = false,
}: DeliveryUnitsProps) {
  const mode: UnitListMode =
    modeProp ??
    (perspectiveProp === "delivery" ? "delivery" : "overview-units");
  const perspective = perspectiveForUnitListMode(mode);
  const isOverviewUnits = mode === "overview-units";
  const isDelivery = mode === "delivery";
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canCreateDelivery } = useDeliveryPermissions();

  const { data: unitProcessStepCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const {
    selectedItems,
    selectedCount,
    toggle,
    clear,
    isSelected,
    isRowCheckboxDisabled,
    getRowCheckboxOrderMismatchHint,
  } = useDeliveryPlanUnitSelection();

  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [tab, setTab] = useState<ProductionPlanUnitTab>("ALL");
  const [assignmentView, setAssignmentView] =
    useState<ProductionAssignmentView>("all");
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [dateBasis, setDateBasis] = useState<ProductionPlanUnitDateBasis>("planned");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const safeFromMonth = normalizeMonthInput(fromMonth);
  const safeToMonth = normalizeMonthInput(toMonth);
  const hasMonthRange = safeFromMonth !== "" && safeToMonth !== "";

  const assignmentParams = useMemo(
    () => {
      if (isOverviewUnits) return {};
      if (perspective === "production" && assignmentView !== "all") {
        return { deliveryPlanAssignment: assignmentView };
      }
      return {};
    },
    [isOverviewUnits, perspective, assignmentView]
  );

  const overviewParams = useMemo(
    () => ({
      perspective,
      ...assignmentParams,
      ...(hasMonthRange
        ? {
            fromMonth: safeFromMonth,
            toMonth: safeToMonth,
          }
        : {}),
      dateBasis,
      tz: "Asia/Seoul",
    }),
    [
      perspective,
      assignmentParams,
      hasMonthRange,
      safeFromMonth,
      safeToMonth,
      dateBasis,
    ]
  );

  const listParams = useMemo(() => {
    const sort = resolveUnitListSort(tab);
    return {
      ...overviewParams,
      tab,
      page,
      pageSize,
      q: searchKeyword.trim() || undefined,
      ...sort,
    };
  }, [overviewParams, tab, page, pageSize, searchKeyword]);

  const delayedMergeFetchParams = useMemo((): Omit<ProductionPlanUnitListParams, "tab"> => {
    const sort = resolveUnitListSort("DELAYED");
    return {
      ...overviewParams,
      page: 1,
      pageSize: DELAYED_TAB_SOURCE_PAGE_SIZE,
      q: searchKeyword.trim() || undefined,
      ...sort,
    };
  }, [overviewParams, searchKeyword]);

  const delayedSourceTabs = useMemo(
    () => ["IN_PROGRESS", "WAITING", "DELAYED"] as const satisfies readonly ProductionPlanUnitTab[],
    []
  );

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ["productionPlanUnitOverview", overviewParams],
    queryFn: () => getProductionPlanUnitOverview(accessToken!, overviewParams),
    enabled: !!accessToken && !isAuthLoading,
    staleTime: PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS,
  });

  const {
    data: serverListData,
    isLoading: isServerListLoading,
    error: serverListError,
  } = useQuery({
    queryKey: ["productionPlanUnits", listParams],
    queryFn: () => getProductionPlanUnits(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading && tab !== "DELAYED",
    staleTime: PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS,
  });

  const delayedSourceQueries = useQueries({
    queries: delayedSourceTabs.map((sourceTab) => ({
      queryKey: ["productionPlanUnits", "DELAYED_MERGE", sourceTab, delayedMergeFetchParams],
      queryFn: () =>
        getProductionPlanUnits(accessToken!, {
          ...delayedMergeFetchParams,
          tab: sourceTab,
        }),
      enabled: !!accessToken && !isAuthLoading,
      staleTime: PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS,
    })),
  });

  const todaySeoulYmd = todayYmdInTimeZone();
  const delayedMergeReady = delayedSourceQueries.every((q) => q.isFetched);

  const calendarDelayedMerged = useMemo((): ProductionPlanUnitListRow[] | null => {
    if (!delayedMergeReady) return null;
    return mergeDelayedTabItems(
      delayedSourceQueries.map((q) => q.data),
      todaySeoulYmd
    );
  }, [delayedMergeReady, delayedSourceQueries, todaySeoulYmd]);

  const listData = useMemo((): ProductionPlanUnitListResponse | undefined => {
    if (tab !== "DELAYED") return serverListData;
    if (calendarDelayedMerged === null) return undefined;
    const firstMeta = delayedSourceQueries[0]?.data?.meta;
    const start = (page - 1) * pageSize;
    return {
      meta: {
        tab: "DELAYED",
        page,
        pageSize,
        total: calendarDelayedMerged.length,
        dateBasis: firstMeta?.dateBasis ?? dateBasis,
        fromMonth: firstMeta?.fromMonth ?? null,
        toMonth: firstMeta?.toMonth ?? null,
      },
      items: calendarDelayedMerged.slice(start, start + pageSize),
    };
  }, [
    tab,
    serverListData,
    calendarDelayedMerged,
    delayedSourceQueries,
    page,
    pageSize,
    dateBasis,
  ]);

  const isDelayedSourcesLoading =
    tab === "DELAYED" &&
    (delayedSourceQueries.some((q) => q.isLoading) || calendarDelayedMerged === null);
  const delayedSourcesError = delayedSourceQueries.find((q) => q.error)?.error;

  /** overview-units: 미배정 유닛 선택 → 납품 계획 생성 */
  const reserveCheckboxColumn = isOverviewUnits && canCreateDelivery;

  const showCheckboxColumn = reserveCheckboxColumn;

  const unitTableLayout = useMemo(
    () => deliveryUnitTableLayout({ showCheckbox: reserveCheckboxColumn }),
    [reserveCheckboxColumn]
  );

  const unitTableGridColumns = useMemo(
    () => deliveryUnitTableGridTemplate({ showCheckbox: reserveCheckboxColumn }),
    [reserveCheckboxColumn]
  );

  const tableTrackCount = deliveryUnitTableTrackCount();

  useEffect(() => {
    clear();
  }, [assignmentView, tab, perspective, clear]);

  const totalCount = Number(listData?.meta?.total) || 0;
  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [
      tab,
      fromMonth,
      toMonth,
      dateBasis,
      searchKeyword,
      assignmentView,
      perspective,
    ],
  });

  const tabOptions = useMemo(
    () =>
      PRODUCTION_PLAN_UNIT_TABS.map((tabValue) => {
        const badgeCount =
          tabValue === "DELAYED"
            ? calendarDelayedMerged !== null
              ? calendarDelayedMerged.length
              : Number(overviewData?.summary?.delayed) || 0
            : tabBadgeCount(tabValue, overviewData?.summary);
        return {
          value: tabValue,
          label: (
            <span className="inline-flex items-center gap-2">
              <span>{tabLabel(perspective, tabValue)}</span>
              {tabCountBadge(tabValue, badgeCount)}
            </span>
          ),
        };
      }),
    [overviewData?.summary, calendarDelayedMerged, perspective]
  );

  const assignmentOptions = useMemo(
    () =>
      (["unassigned", "assigned", "all"] as const).map((value) => ({
        value,
        label: DELIVERY_PLAN_ASSIGNMENT_LABELS[value],
      })),
    []
  );

  const handleSearchReset = () => {
    setSearchKeyword("");
    setFromMonth("");
    setToMonth("");
    setDateBasis("planned");
    setTab("ALL");
    setAssignmentView("all");
    setPage(1);
    clear();
  };

  const isLoading =
    isAuthLoading ||
    isOverviewLoading ||
    (tab === "DELAYED" ? isDelayedSourcesLoading : isServerListLoading);
  const error = overviewError ?? (tab === "DELAYED" ? delayedSourcesError : serverListError);

  const statusSectionTitle = isDelivery ? "납품 상태" : "생산 상태";

  const pageDesc = isOverviewUnits
    ? "생산 진행과 납품 등록 상태를 확인하고, 유닛을 선택해 납품 계획을 등록합니다."
    : "납품 계획에 포함된 유닛만 표시됩니다.";

  const listItems = listData?.items ?? [];

  const pageTitle = unitListPageTitle(mode);
  const showStatusTabs = true;
  const showAssignmentFilter =
    perspective === "production" && !isOverviewUnits;

  return (
    <>
      {!embedded ? (
        <>
          <PageMeta
            title={`아이쓰리시스템(주) | ${pageTitle}`}
            description={unitListMetaDescription(mode)}
          />
          <PageBreadcrumb pageTitle={unitListBreadcrumbTitle(mode)} />
        </>
      ) : null}
      <div className={embedded ? "" : "space-y-6"}>
        <ListPageLayout
          title={pageTitle}
          desc={pageDesc}
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="delivery-unit-search"
                  placeholder="계획·유닛·시리얼·사업명·제품명·공정·업체 검색"
                  value={searchKeyword}
                  onChange={(v) => {
                    setSearchKeyword(v);
                    setPage(1);
                  }}
                />
              }
              actions={
                <div className="flex flex-wrap items-center gap-3">
                  {showCheckboxColumn && selectedCount > 0 ? (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedCount}건 선택
                      </span>
                      <Button
                        size="sm"
                        onClick={() => setCreatePlanOpen(true)}
                      >
                        납품 계획 만들기
                      </Button>
                    </>
                  ) : null}
                  <DataListSearchOptionsButton
                    open={searchOptionsOpen}
                    onToggle={() => setSearchOptionsOpen((open) => !open)}
                  />
                </div>
              }
            />
          }
          searchOptionsOpen={searchOptionsOpen}
          searchOptions={
            <>
              <div className="min-w-0 flex-1 sm:max-w-[10rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  시작 월
                </label>
                <DatePicker
                  id="delivery-units-from-month"
                  value={safeFromMonth ? `${safeFromMonth}-01` : ""}
                  monthOnly
                  onValueChange={(v) => {
                    setFromMonth(String(v ?? "").slice(0, 7));
                    setPage(1);
                  }}
                  compact
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[10rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  종료 월
                </label>
                <DatePicker
                  id="delivery-units-to-month"
                  value={safeToMonth ? `${safeToMonth}-01` : ""}
                  monthOnly
                  onValueChange={(v) => {
                    setToMonth(String(v ?? "").slice(0, 7));
                    setPage(1);
                  }}
                  compact
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  기준일
                </label>
                <Select
                  size="sm"
                  options={[
                    { value: "planned", label: toDateBasisLabel("planned") },
                    { value: "delivery", label: toDateBasisLabel("delivery") },
                    { value: "coalesce", label: toDateBasisLabel("coalesce") },
                  ]}
                  placeholder="기준일"
                  defaultValue={dateBasis}
                  onChange={(v) => {
                    setDateBasis(v as ProductionPlanUnitDateBasis);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleSearchReset}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                >
                  초기화
                </button>
              </div>
            </>
          }
          belowSearchOptions={
            <div className="space-y-2 border-b border-gray-100 pt-2 pb-3 dark:border-white/[0.05]">
              {showStatusTabs ? (
                <>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {statusSectionTitle}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                    <SegmentedControl
                      ariaLabel="유닛 상태 탭"
                      value={tab}
                      onChange={(nextTab) => {
                        setTab(nextTab);
                        setPage(1);
                      }}
                      options={tabOptions}
                      className="min-w-0 flex-1"
                    />
                    {showAssignmentFilter ? (
                      <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:min-w-[16rem]">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          납품 배정
                        </p>
                        <SegmentedControl
                          ariaLabel="납품 계획 배정 필터"
                          value={assignmentView}
                          onChange={(next) => {
                            setAssignmentView(next);
                            setPage(1);
                          }}
                          options={assignmentOptions}
                          className="w-full"
                        />
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  생산 상태는 각 행의 뱃지로 표시됩니다. 상태별로 좁히려면 검색
                  옵션을 사용하세요.
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                조회 범위:{" "}
                {hasMonthRange ? `${safeFromMonth} ~ ${safeToMonth}` : "전체 기간"} / 기준일:{" "}
                {toDateBasisLabel(dateBasis)} / 총{" "}
                {overviewData?.summary?.all ??
                  overviewData?.summary?.total ??
                  0}
                건
              </p>
            </div>
          }
          pagination={!isLoading && !error ? <TablePagination {...listPagination} /> : null}
        >
          {isLoading ? (
            <ListPageLoading
              message="생산 유닛 목록을 불러오는 중입니다."
              skeletonRows={8}
              minHeight={320}
            />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              목록을 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <DataTable
              fillWidth
              minWidth={DELIVERY_UNIT_TABLE_MIN_WIDTH_PX}
            >
              <DataTableHeader
                gridTemplateColumns={unitTableGridColumns}
              >
                {reserveCheckboxColumn ? (
                  <DataTableHeaderCell
                    colSpan={unitTableLayout.checkbox}
                    compact
                    sortable={false}
                    align={DELIVERY_UNIT_COLUMN_ALIGN.checkbox}
                  >
                    {showCheckboxColumn ? (
                      <span className="sr-only">선택</span>
                    ) : null}
                  </DataTableHeaderCell>
                ) : null}
                <DataTableHeaderCell
                  colSpan={unitTableLayout.no}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.no}
                >
                  <DataTableHeaderLabel align="center">No.</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.lot}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.lot}
                >
                  <DataTableHeaderLabel>LOT</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.item}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.item}
                >
                  <DataTableHeaderLabel>품목</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.serial}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.serial}
                >
                  <DataTableHeaderLabel>S/N</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.partner}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.partner}
                >
                  <DataTableHeaderLabel>고객</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.operator}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.operator}
                >
                  <DataTableHeaderLabel align="center">생산 담당</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.process}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.process}
                >
                  <DataTableHeaderLabel align="center">공정</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.status}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.status}
                >
                  <DataTableHeaderLabel align="center">상태</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.orderPlan}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.orderPlan}
                >
                  <DataTableHeaderLabel>발주·계획</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.dates}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.dates}
                >
                  <DataTableHeaderLabel>일정</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.delay}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.delay}
                >
                  <DataTableHeaderLabel align="center">지연</DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                {(listItems ?? []).length === 0 ? (
                  <DataTableRow
                    gridTemplateColumns={unitTableGridColumns}
                  >
                    <DataTableCell
                      colSpan={tableTrackCount}
                      compact
                      align="center"
                      className="py-4 text-theme-xs text-gray-500 dark:text-gray-400"
                    >
                      조건에 맞는 유닛이 없습니다.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  listItems.map((row, index) => (
                    <DeliveryUnitListRow
                      key={row.unitId}
                      row={row}
                      index={index}
                      page={page}
                      pageSize={pageSize}
                      tab={tab}
                      perspective={perspective}
                      mode={mode}
                      unitProcessStepCodes={unitProcessStepCodes}
                      countryCodes={countryCodes}
                      layout={unitTableLayout}
                      gridTemplateColumns={unitTableGridColumns}
                      showCheckbox={showCheckboxColumn}
                      reserveCheckboxColumn={reserveCheckboxColumn}
                      checked={isSelected(row.unitId)}
                      checkboxDisabled={isRowCheckboxDisabled(row)}
                      checkboxOrderMismatchHint={getRowCheckboxOrderMismatchHint(row)}
                      onToggle={toggle}
                    />
                  ))
                )}
              </DataTableBody>
            </DataTable>
          )}
        </ListPageLayout>
      </div>

      {isOverviewUnits ? (
        <DeliveryPlanCreateModal
          isOpen={createPlanOpen}
          onClose={() => setCreatePlanOpen(false)}
          selectedUnits={selectedItems}
          onSuccess={() => {
            clear();
            setCreatePlanOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
