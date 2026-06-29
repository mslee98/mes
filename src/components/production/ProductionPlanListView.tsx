import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SegmentedControl from "../common/SegmentedControl";
import DatePicker from "../form/date-picker";
import Select from "../form/Select";
import {
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../list";
import { CollapsibleDataTable } from "../list";
import ListPageLoading from "../common/ListPageLoading";
import { TableCell, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import { ProductionPlanListRowCells } from "./ProductionPlanListRow";
import { ProductionPlanUnitsPanel } from "./ProductionPlanUnitsPanel";
import { useAuth } from "../../hooks/useAuth";
import { useProductionPlanCommonCodes } from "../../hooks/useProductionPlanCommonCodes";
import { useDeliveryPermissions } from "../../hooks/useDeliveryPermissions";
import { useServerListPagination } from "../../hooks/useServerListPagination";
import {
  getProductionPlanCoverageCounts,
  getProductionPlans,
  type ProductionPlanDeliveryCoverageFilter,
  type ProductionPlanListParams,
  type ProductionPlanUnitDateBasis,
} from "../../api/purchaseOrder";
import {
  PRODUCTION_PLAN_COVERAGE_TABS,
  productionPlanCoverageTabBadgeColor,
  productionPlanCoverageTabBadgeSolid,
  productionPlanCoverageTabCount,
  type ProductionPlanCoverageTabValue,
} from "../../domains/production-plan/helpers/planListTabs";
import { todayYmdInTimeZone } from "../../lib/format/dateFormat";
import {
  hasValidMonthRange,
  normalizeMonthInput,
} from "../../lib/format/monthRangeInput";
import { resolveProductionPlanListSort } from "../../domains/production-plan/helpers/planListSort";

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_COVERAGE_TAB: ProductionPlanCoverageTabValue = "";

function toDateBasisLabel(v: ProductionPlanUnitDateBasis): string {
  if (v === "delivery") return "납품일";
  if (v === "coalesce") return "계획우선(보정)";
  return "계획일";
}

export function ProductionPlanListView() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadDelivery } = useDeliveryPermissions();

  const { countryCodes, unitProcessStepCodes } = useProductionPlanCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [coverageTab, setCoverageTab] =
    useState<ProductionPlanCoverageTabValue>(DEFAULT_COVERAGE_TAB);
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
      q: searchKeyword.trim() || undefined,
    }),
    [hasMonthRange, safeFromMonth, safeToMonth, dateBasis, searchKeyword]
  );

  const filterKey = useMemo(
    () => JSON.stringify(overviewParams),
    [overviewParams]
  );

  const listParams = useMemo((): ProductionPlanListParams => {
    const deliveryCoverage: ProductionPlanDeliveryCoverageFilter | undefined =
      coverageTab === ""
        ? undefined
        : coverageTab;
    return {
      ...overviewParams,
      tab: "ALL",
      ...(deliveryCoverage ? { deliveryCoverage } : {}),
      page,
      pageSize,
      ...resolveProductionPlanListSort(),
    };
  }, [overviewParams, coverageTab, page, pageSize]);

  const {
    data: coverageCounts,
    isLoading: isCoverageCountsLoading,
    error: coverageCountsError,
  } = useQuery({
    queryKey: ["productionPlanCoverageCounts", filterKey],
    queryFn: () => getProductionPlanCoverageCounts(accessToken!, overviewParams),
    enabled: !!accessToken && !isAuthLoading && canReadDelivery,
  });

  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
  } = useQuery({
    queryKey: ["productionPlans", listParams],
    queryFn: () => getProductionPlans(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading && canReadDelivery,
  });

  const items = listData?.items ?? [];
  const totalCount = Number(listData?.meta?.total) || 0;

  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [filterKey, coverageTab],
  });

  const coverageTabOptions = useMemo(
    () =>
      PRODUCTION_PLAN_COVERAGE_TABS.map((tabOption) => {
        const count = productionPlanCoverageTabCount(
          tabOption.value,
          coverageCounts
        );
        const color = productionPlanCoverageTabBadgeColor(tabOption.value);
        const solid = productionPlanCoverageTabBadgeSolid(tabOption.value);
        return {
          value: tabOption.value,
          label: (
            <span className="inline-flex items-center gap-2">
              <span>{tabOption.label}</span>
              <Badge
                size="sm"
                variant={solid ? "solid" : undefined}
                color={color}
              >
                {count}
              </Badge>
            </span>
          ),
        };
      }),
    [coverageCounts]
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
    setCoverageTab(DEFAULT_COVERAGE_TAB);
    setPage(1);
    setExpandedIds(new Set());
  };

  const isLoading =
    isAuthLoading || isCoverageCountsLoading || isListLoading;
  const error = coverageCountsError ?? listError;
  const todaySeoulYmd = todayYmdInTimeZone();
  const tableColSpan = 9;
  const activeCoverageLabel =
    PRODUCTION_PLAN_COVERAGE_TABS.find((t) => t.value === coverageTab)?.label ??
    "전체";

  if (!canReadDelivery) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-400/90">
        생산 계획 조회 권한이 없습니다.
      </p>
    );
  }

  return (
    <ListPageLayout
      title="생산 계획"
      desc="생산 진행과 남은 납품 업무를 확인합니다."
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
            ariaLabel="납품 배정"
            value={coverageTab}
            onChange={(next) => {
              setCoverageTab(next);
              setPage(1);
            }}
            options={coverageTabOptions}
            className="max-w-full"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            조회 범위:{" "}
            {hasMonthRange ? `${safeFromMonth} ~ ${safeToMonth}` : "전체 기간"}{" "}
            / 기준일: {toDateBasisLabel(dateBasis)} / 배정: {activeCoverageLabel}{" "}
            / 총 {coverageCounts?.total ?? totalCount}건
          </p>
        </div>
      }
      pagination={
        !isLoading && !error ? <TablePagination {...listPagination} /> : null
      }
    >
      {isLoading ? (
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
          items={items}
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
                className="min-w-[5rem] px-3 py-2 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
              >
                생산
              </TableCell>
              <TableCell
                isHeader
                className="min-w-[6rem] px-3 py-2 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
              >
                배정
              </TableCell>
              <TableCell
                isHeader
                className="min-w-[10rem] px-3 py-2 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
              >
                남은 업무
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
                planNo={item.planNo?.trim() || item.planId}
                orderId={item.orderId ?? undefined}
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
  );
}
