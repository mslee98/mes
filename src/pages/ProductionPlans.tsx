import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import SegmentedControl from "../components/common/SegmentedControl";
import DatePicker from "../components/form/date-picker";
import Select from "../components/form/Select";
import {
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import { CollapsibleDataTable } from "../components/list";
import ListPageLoading from "../components/common/ListPageLoading";
import { TableCell, TableRow } from "../components/ui/table";
import Badge from "../components/ui/badge/Badge";
import { ProductionPlanListRowCells } from "../components/production/ProductionPlanListRow";
import { ProductionPlanUnitsPanel } from "../components/production/ProductionPlanUnitsPanel";
import { useAuth } from "../hooks/useAuth";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { useDeliveryPermissions } from "../hooks/useDeliveryPermissions";
import { useServerListPagination } from "../hooks/useServerListPagination";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
} from "../api/commonCode";
import {
  getProductionPlanTabCounts,
  getProductionPlans,
  type ProductionPlanListTab,
  type ProductionPlanUnitDateBasis,
} from "../api/purchaseOrder";
import { todayYmdInTimeZone } from "../lib/format/dateFormat";
import {
  hasValidMonthRange,
  normalizeMonthInput,
} from "../lib/format/monthRangeInput";

const DEFAULT_PAGE_SIZE = 20;

const PRODUCTION_PLAN_TABS: Array<{
  value: ProductionPlanListTab;
  label: string;
}> = [
  { value: "WITHOUT_DELIVERY", label: "납품 계획 없음" },
  { value: "WITH_DELIVERY", label: "납품 계획 포함" },
];

function toDateBasisLabel(v: ProductionPlanUnitDateBasis): string {
  if (v === "delivery") return "납품일";
  if (v === "coalesce") return "계획우선(보정)";
  return "계획일";
}

function planTabCount(
  tab: ProductionPlanListTab,
  counts?: { withoutDelivery: number; withDelivery: number }
): number {
  if (!counts) return 0;
  if (tab === "WITHOUT_DELIVERY") return Number(counts.withoutDelivery) || 0;
  return Number(counts.withDelivery) || 0;
}

function planTabCountBadge(tab: ProductionPlanListTab, count: number) {
  if (tab === "WITHOUT_DELIVERY") {
    return (
      <Badge size="sm" color="warning">
        {count}
      </Badge>
    );
  }
  return (
    <Badge size="sm" color="success">
      {count}
    </Badge>
  );
}

export default function ProductionPlans() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadDelivery } = useDeliveryPermissions();

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: unitProcessStepCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [tab, setTab] = useState<ProductionPlanListTab>("WITHOUT_DELIVERY");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [dateBasis, setDateBasis] =
    useState<ProductionPlanUnitDateBasis>("planned");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const safeFromMonth = normalizeMonthInput(fromMonth);
  const safeToMonth = normalizeMonthInput(toMonth);
  const hasMonthRange = hasValidMonthRange(fromMonth, toMonth);

  const overviewParams = useMemo(
    () => ({
      ...(hasMonthRange
        ? { fromMonth: safeFromMonth, toMonth: safeToMonth }
        : {}),
      dateBasis,
      tz: "Asia/Seoul",
    }),
    [hasMonthRange, safeFromMonth, safeToMonth, dateBasis]
  );

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        ...overviewParams,
        q: searchKeyword.trim() || undefined,
      }),
    [overviewParams, searchKeyword]
  );

  const listParams = useMemo(
    () => ({
      ...overviewParams,
      tab,
      page,
      pageSize,
      q: searchKeyword.trim() || undefined,
      sortBy: "plannedDate" as const,
      sortOrder: "asc" as const,
    }),
    [overviewParams, tab, page, pageSize, searchKeyword]
  );

  const {
    data: tabCounts,
    isLoading: isTabCountsLoading,
    error: tabCountsError,
  } = useQuery({
    queryKey: ["productionPlanTabCounts", filterKey],
    queryFn: () => getProductionPlanTabCounts(accessToken!, overviewParams),
    enabled: !!accessToken && !isAuthLoading && canReadDelivery,
  });

  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
  } = useQuery({
    queryKey: ["productionPlans", tab, filterKey, page, pageSize],
    queryFn: () => getProductionPlans(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading && canReadDelivery,
  });

  const totalCount = Number(listData?.meta?.total) || 0;
  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [tab, fromMonth, toMonth, dateBasis, searchKeyword],
  });

  const todaySeoulYmd = todayYmdInTimeZone();
  const tableColSpan = 8;

  const tabOptions = useMemo(
    () =>
      PRODUCTION_PLAN_TABS.map((tabOption) => {
        const count = planTabCount(tabOption.value, tabCounts);
        return {
          value: tabOption.value,
          label: (
            <span className="inline-flex items-center gap-2">
              <span>{tabOption.label}</span>
              {planTabCountBadge(tabOption.value, count)}
            </span>
          ),
        };
      }),
    [tabCounts]
  );

  const toggleExpand = useCallback((planId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }, []);

  const handleSearchReset = () => {
    setSearchKeyword("");
    setFromMonth("");
    setToMonth("");
    setDateBasis("planned");
    setTab("WITHOUT_DELIVERY");
    setPage(1);
    setExpandedIds(new Set());
  };

  const handleTabChange = (nextTab: ProductionPlanListTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const isLoading = isAuthLoading || isTabCountsLoading || isListLoading;
  const error = tabCountsError ?? listError;

  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 생산 계획 목록"
        description="아이쓰리시스템(주) | 생산 계획 목록"
      />
      <PageBreadcrumb pageTitle="생산 계획 목록" />
      <div className="space-y-6">
        {!canReadDelivery ? (
          <p className="text-sm text-amber-700 dark:text-amber-400/90">
            생산·납품 목록 조회 권한이 없습니다.
          </p>
        ) : null}

        <ListPageLayout
          title="생산 계획 목록"
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="production-plan-search"
                  placeholder="계획·발주·고객·담당자 검색"
                  value={searchKeyword}
                  onChange={(v) => {
                    setSearchKeyword(v);
                    setPage(1);
                  }}
                />
              }
              actions={
                <div className="flex flex-wrap items-center gap-3">
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
                  id="production-plans-from-month"
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
                  id="production-plans-to-month"
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
              <SegmentedControl
                ariaLabel="생산 계획 납품 연계 탭"
                value={tab}
                onChange={handleTabChange}
                options={tabOptions}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                조회 범위:{" "}
                {hasMonthRange ? `${safeFromMonth} ~ ${safeToMonth}` : "전체 기간"}{" "}
                / 기준일: {toDateBasisLabel(dateBasis)} / 총{" "}
                {tabCounts?.total ?? totalCount}건
              </p>
            </div>
          }
          pagination={
            !isLoading && !error && canReadDelivery ? (
              <TablePagination {...listPagination} />
            ) : null
          }
        >
          {!canReadDelivery ? null : isLoading ? (
            <ListPageLoading
              message="생산 계획 목록을 불러오는 중입니다."
              skeletonRows={8}
              minHeight={320}
            />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              목록을 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <CollapsibleDataTable
              items={listData?.items ?? []}
              getRowId={(item) => item.planId}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              colSpan={tableColSpan}
              emptyMessage="조건에 맞는 생산 계획이 없습니다."
              header={
                <TableRow>
                  <TableCell
                    isHeader
                    className="w-10 px-2 py-2 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  >
                    펼침
                  </TableCell>
                  <TableCell
                    isHeader
                    className="min-w-[18rem] px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    계획
                  </TableCell>
                  <TableCell
                    isHeader
                    className="min-w-[8rem] px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    고객
                  </TableCell>
                  <TableCell
                    isHeader
                    className="min-w-[7rem] px-3 py-2 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  >
                    생산예정일
                  </TableCell>
                  <TableCell
                    isHeader
                    className="min-w-[7rem] px-3 py-2 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  >
                    담당자
                  </TableCell>
                  <TableCell
                    isHeader
                    className="min-w-[8rem] px-3 py-2 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  >
                    품목
                  </TableCell>
                  <TableCell
                    isHeader
                    className="min-w-[8.5rem] px-2 py-2 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  >
                    Action
                  </TableCell>
                </TableRow>
              }
              renderRow={(item, { expanded }) => (
                <ProductionPlanListRowCells
                  item={item}
                  expanded={expanded}
                  countryCodes={countryCodes}
                  todayYmd={todaySeoulYmd}
                />
              )}
              renderExpanded={(item) =>
                accessToken ? (
                  <ProductionPlanUnitsPanel
                    planId={item.planId}
                    accessToken={accessToken}
                    enabled={expandedIds.has(item.planId)}
                    unitProcessStepCodes={unitProcessStepCodes}
                    todayYmd={todaySeoulYmd}
                  />
                ) : null
              }
            />
          )}
        </ListPageLayout>
      </div>
    </>
  );
}
