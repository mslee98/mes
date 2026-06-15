import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import SegmentedControl from "../components/common/SegmentedControl";
import DatePicker from "../components/form/date-picker";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import PartnerQuickCreateModal from "../components/form/PartnerQuickCreateModal";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import Badge from "../components/ui/badge/Badge";
import ListPageLoading from "../components/common/ListPageLoading";
import { useAuth } from "../hooks/useAuth";
import { useDeliveryPermissions } from "../hooks/useDeliveryPermissions";
import { usePartnerListFilter } from "../hooks/usePartnerListFilter";
import { useServerListPagination } from "../hooks/useServerListPagination";
import { COMMON_CODE_GROUP_COUNTRY, COMMON_CODE_GROUP_DELIVERY_PLAN_STATUS } from "../api/commonCode";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  getDeliveryPlansList,
  getDeliveryPlansTabCounts,
  type DeliveryPlanListItem,
  type DeliveryPlanListParams,
  type DeliveryPlanListTab,
} from "../api/purchaseOrder";
import { badgeColorFromKoStatusLabel } from "../lib/ui/badgeStatusColor";
import { labelForDeliveryPlanStatus } from "../domains/delivery/labels/statusLabels";
import { isDeliveryPlanCompleted } from "../domains/delivery/policy/unitDetailDeliveryPolicy";
import { formatDateYmd } from "../lib/format/dateFormat";
import {
  hasValidMonthRange,
  normalizeMonthInput,
} from "../lib/format/monthRangeInput";

const DEFAULT_PAGE_SIZE = 20;
type DeliveryPlanSortKey = NonNullable<DeliveryPlanListParams["sortBy"]>;
type DeliveryPlanTab = DeliveryPlanListTab;

const DEFAULT_SORT_KEY: DeliveryPlanSortKey = "plannedDeliveryDate";
const DEFAULT_TAB: DeliveryPlanTab = "OPEN";

const DELIVERY_PLAN_TABS: Array<{ value: DeliveryPlanTab; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "OPEN", label: "진행" },
  { value: "COMPLETED", label: "완료" },
  { value: "DELAYED", label: "지연" },
];

function getDefaultSortOrder(sortKey: DeliveryPlanSortKey): "asc" | "desc" {
  if (sortKey === "createdAt" || sortKey === "plannedDeliveryDate") return "desc";
  return "asc";
}

function deliveryPlanTabCount(
  tab: DeliveryPlanTab,
  counts?: {
    all?: number;
    open?: number;
    completed?: number;
    delayed?: number;
  }
): number {
  if (!counts) return 0;
  if (tab === "ALL") return Number(counts.all) || 0;
  if (tab === "OPEN") return Number(counts.open) || 0;
  if (tab === "COMPLETED") return Number(counts.completed) || 0;
  return Number(counts.delayed) || 0;
}

function deliveryPlanTabCountBadge(tab: DeliveryPlanTab, count: number) {
  if (tab === "ALL") {
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

function resolveOrderId(row: DeliveryPlanListItem): string {
  return String(row.purchaseOrderId ?? row.order?.orderId ?? "").trim();
}

function unitSummaryLabel(row: DeliveryPlanListItem): string {
  const summary = row.summary;
  if (!summary) {
    const total = row.unitCount;
    return total != null ? `${total}대` : "—";
  }
  const total = Number(summary.totalUnitCount) || row.unitCount || 0;
  const ready = Number(summary.readyUnitCount) || 0;
  const undelivered =
    summary.undeliveredUnitCount != null
      ? Number(summary.undeliveredUnitCount) || 0
      : Math.max(0, total - (Number(summary.deliveredUnitCount) || 0));
  const status = String(row.status ?? "").trim();
  if (isDeliveryPlanCompleted(status) && undelivered > 0) {
    return `${total}대 · 완료 · 미출고 ${undelivered}`;
  }
  return `${total} / ${ready} / ${undelivered}`;
}

export default function DeliveryPlans() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadDelivery } = useDeliveryPermissions();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [tab, setTab] = useState<DeliveryPlanTab>(DEFAULT_TAB);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<DeliveryPlanSortKey>(DEFAULT_SORT_KEY);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    getDefaultSortOrder(DEFAULT_SORT_KEY)
  );

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadDelivery }
  );

  const { data: deliveryPlanStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_PLAN_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadDelivery }
  );

  const {
    partnerId,
    setPartnerId,
    partnerCreateOpen,
    setPartnerCreateOpen,
    partnerFilterOptions,
    partnerFieldKey,
    remountPartnerField,
  } = usePartnerListFilter({
    accessToken,
    isAuthLoading,
    countryCodes,
  });

  const safeFromMonth = normalizeMonthInput(fromMonth);
  const safeToMonth = normalizeMonthInput(toMonth);
  const hasMonthRange = hasValidMonthRange(fromMonth, toMonth);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        q: searchKeyword.trim() || undefined,
        partnerId: partnerId || undefined,
        fromMonth: hasMonthRange ? safeFromMonth : undefined,
        toMonth: hasMonthRange ? safeToMonth : undefined,
      }),
    [searchKeyword, partnerId, hasMonthRange, safeFromMonth, safeToMonth]
  );

  const listParams = useMemo(
    (): DeliveryPlanListParams => ({
      page,
      pageSize,
      q: searchKeyword.trim() || undefined,
      partnerId: partnerId || undefined,
      ...(hasMonthRange
        ? { fromMonth: safeFromMonth, toMonth: safeToMonth }
        : {}),
      tab,
      sortBy,
      sortOrder,
    }),
    [
      page,
      pageSize,
      searchKeyword,
      partnerId,
      hasMonthRange,
      safeFromMonth,
      safeToMonth,
      tab,
      sortBy,
      sortOrder,
    ]
  );

  const tabCountsParams = useMemo(
    () => ({
      q: searchKeyword.trim() || undefined,
      partnerId: partnerId || undefined,
      ...(hasMonthRange
        ? { fromMonth: safeFromMonth, toMonth: safeToMonth }
        : {}),
    }),
    [searchKeyword, partnerId, hasMonthRange, safeFromMonth, safeToMonth]
  );

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["deliveryPlans", listParams],
    queryFn: () => getDeliveryPlansList(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading && canReadDelivery,
  });

  const { data: tabCounts } = useQuery({
    queryKey: ["deliveryPlansTabCounts", filterKey],
    queryFn: () => getDeliveryPlansTabCounts(accessToken!, tabCountsParams),
    enabled: !!accessToken && !isAuthLoading && canReadDelivery,
  });

  const totalCount = data?.total ?? 0;

  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [filterKey, tab, sortBy, sortOrder],
  });

  const tabOptions = useMemo(
    () =>
      DELIVERY_PLAN_TABS.map((tabOption) => {
        const count = deliveryPlanTabCount(tabOption.value, tabCounts);
        return {
          value: tabOption.value,
          label: (
            <span className="inline-flex items-center gap-2">
              <span>{tabOption.label}</span>
              {deliveryPlanTabCountBadge(tabOption.value, count)}
            </span>
          ),
        };
      }),
    [tabCounts]
  );

  const handleSearchReset = () => {
    setSearchKeyword("");
    setPartnerId("");
    setFromMonth("");
    setToMonth("");
    setTab(DEFAULT_TAB);
    setPage(1);
    remountPartnerField();
  };

  const handleSortToggle = (nextSortKey: string) => {
    const normalized = nextSortKey as DeliveryPlanSortKey;
    setPage(1);
    if (sortBy === normalized) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(normalized);
    setSortOrder(getDefaultSortOrder(normalized));
  };

  const rows = data?.items ?? [];

  if (!canReadDelivery) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-400/90">
        납품 계획 조회 권한이 없습니다.
      </p>
    );
  }

  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 납품 계획 목록"
        description="아이쓰리시스템(주) | 납품 계획 목록"
      />
      <PageBreadcrumb pageTitle="납품 계획" />

      <div className="space-y-6">
        <ListPageLayout
          title="납품 계획"
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="delivery-plan-search"
                  placeholder="계획번호, 제목, 발주번호·제목, 거래처 검색"
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                />
              }
              actions={
                <DataListSearchOptionsButton
                  open={searchOptionsOpen}
                  onToggle={() => setSearchOptionsOpen((open) => !open)}
                />
              }
            />
          }
          searchOptionsOpen={searchOptionsOpen}
          searchOptions={
            <>
              <div
                key={`partner-${partnerFieldKey}`}
                className="min-w-0 flex-1 sm:max-w-[12rem]"
              >
                <SearchableSelectWithCreate
                  id={`delivery-plan-partner-${partnerFieldKey}`}
                  label="거래처"
                  value={partnerId}
                  onChange={setPartnerId}
                  options={partnerFilterOptions}
                  placeholder="전체 또는 검색"
                  compact
                  addTrigger="popover"
                  popoverDescription="필터에 쓸 거래처가 없으면 정보 아이콘에서 등록한 뒤 목록이 갱신됩니다."
                  popoverAriaLabel="거래처 등록 안내"
                  addButtonLabel="거래처 등록"
                  onAddClick={() => setPartnerCreateOpen(true)}
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[9rem]">
                <DatePicker
                  id="delivery-plan-from-month"
                  label="시작월"
                  monthOnly
                  placeholder="YYYY-MM"
                  value={fromMonth}
                  onValueChange={setFromMonth}
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[9rem]">
                <DatePicker
                  id="delivery-plan-to-month"
                  label="종료월"
                  monthOnly
                  placeholder="YYYY-MM"
                  value={toMonth}
                  onValueChange={setToMonth}
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
                ariaLabel="납품 계획 상태 탭"
                value={tab}
                onChange={(nextTab) => {
                  setTab(nextTab);
                  setPage(1);
                }}
                options={tabOptions}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                현재 탭:{" "}
                {DELIVERY_PLAN_TABS.find((t) => t.value === tab)?.label ?? "전체"}{" "}
                / 조회 범위:{" "}
                {hasMonthRange ? `${safeFromMonth} ~ ${safeToMonth}` : "전체 기간"}{" "}
                / 기준일: 납품(실납)일 우선·없으면 예정일 / 총{" "}
                {tabCounts?.total ?? totalCount}건
              </p>
            </div>
          }
          pagination={
            !isLoading && !error ? <TablePagination {...listPagination} /> : null
          }
        >
          {isLoading ? (
            <ListPageLoading
              message="납품 계획 목록을 불러오는 중입니다."
              skeletonRows={8}
              minHeight={320}
            />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              목록을 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <DataTable fillWidth minWidth={0}>
              <DataTableHeader>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortKey="planNo"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleSortToggle}
                >
                  <DataTableHeaderLabel>계획</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>발주</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>거래처</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={1}
                  compact
                  sortKey="plannedDeliveryDate"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleSortToggle}
                >
                  <DataTableHeaderLabel>예정일</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel className="text-center">
                    품목 (전체/납품대기/미납품)
                  </DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={1} compact sortable={false}>
                  <DataTableHeaderLabel>담당</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortable={false}
                  className="justify-center border-r-0"
                >
                  <DataTableHeaderLabel className="w-full text-center">
                    상태
                  </DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                {rows.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={12}
                      compact
                      className="justify-center border-r-0 py-4"
                    >
                      조건에 맞는 납품 계획이 없습니다.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  rows.map((row) => {
                    const planId = String(row.id).trim();
                    const orderId = resolveOrderId(row);
                    const statusName = labelForDeliveryPlanStatus(
                      deliveryPlanStatusCodes,
                      row.status
                    );

                    return (
                      <DataTableRow key={planId}>
                        <DataTableCell colSpan={2} compact className="min-w-0">
                          <Link
                            to={`/delivery/plans/${encodeURIComponent(planId)}`}
                            className="flex min-w-0 flex-col gap-0.5 rounded-md leading-tight outline-offset-2 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400 dark:hover:text-brand-400"
                          >
                            <span className="truncate font-medium text-brand-600 hover:underline dark:text-brand-400">
                              {row.planNo?.trim() || planId}
                            </span>
                            <span className="truncate text-theme-xs leading-tight text-gray-500 dark:text-gray-400">
                              {row.title?.trim() || "-"}
                            </span>
                          </Link>
                        </DataTableCell>
                        <DataTableCell colSpan={2} compact className="min-w-0">
                          {orderId ? (
                            <Link
                              to={`/order/${encodeURIComponent(orderId)}`}
                              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {row.order?.orderNo?.trim() || orderId}
                            </Link>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </DataTableCell>
                        <DataTableCell colSpan={2} compact className="min-w-0">
                          <span className="truncate">{row.partner?.name?.trim() || "—"}</span>
                        </DataTableCell>
                        <DataTableCell colSpan={1} compact>
                          {formatDateYmd(row.plannedDeliveryDate)}
                        </DataTableCell>
                        <DataTableCell
                          colSpan={2}
                          compact
                          className="justify-center tabular-nums"
                        >
                          {unitSummaryLabel(row)}
                        </DataTableCell>
                        <DataTableCell colSpan={1} compact>
                          {row.deliveryManager?.name?.trim() || "—"}
                        </DataTableCell>
                        <DataTableCell
                          colSpan={2}
                          compact
                          className="justify-center border-r-0"
                        >
                          <Badge
                            size="sm"
                            color={badgeColorFromKoStatusLabel(statusName)}
                          >
                            {statusName}
                          </Badge>
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })
                )}
              </DataTableBody>
            </DataTable>
          )}
        </ListPageLayout>
      </div>

      <PartnerQuickCreateModal
        isOpen={partnerCreateOpen}
        onClose={() => setPartnerCreateOpen(false)}
        onCreated={(p) => setPartnerId(String(p.id))}
      />
    </>
  );
}
