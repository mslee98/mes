import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import SegmentedControl from "../components/common/SegmentedControl";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { usePartnerListFilter } from "../hooks/usePartnerListFilter";
import { useServerListPagination } from "../hooks/useServerListPagination";
import { Link } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
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
  DATA_TABLE_COMPACT_LINK_CLASS,
  TablePagination,
} from "../components/list";
import Badge from "../components/ui/badge/Badge";
import ListPageLoading from "../components/common/ListPageLoading";
import { useAuth } from "../hooks/useAuth";
import {
  getDeliveriesTabCounts,
  getDeliveriesList,
  type Delivery,
  type DeliveryListParams,
  type DeliveryListTab,
  type Partner,
} from "../api/purchaseOrder";
import {
  COMMON_CODE_GROUP_DELIVERY_STATUS,
  COMMON_CODE_GROUP_COUNTRY,
  type CommonCodeItem,
} from "../api/commonCode";
import { partnerSelectLabel } from "../domains/partner/display/partnerDisplay";
import { badgeColorFromKoStatusLabel } from "../lib/ui/badgeStatusColor";

const DEFAULT_PAGE_SIZE = 20;
type DeliverySortKey = NonNullable<DeliveryListParams["sortBy"]>;
type DeliveryTab = DeliveryListTab;

const DEFAULT_DELIVERY_SORT_KEY: DeliverySortKey = "deliveryDate";
const DEFAULT_DELIVERY_TAB: DeliveryTab = "ALL";

const DELIVERY_TABS: Array<{ value: DeliveryTab; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기" },
  { value: "READY", label: "준비" },
  { value: "COMPLETED", label: "완료" },
  { value: "DELAYED", label: "지연" },
];

function getDefaultDeliverySortOrder(sortKey: DeliverySortKey): "asc" | "desc" {
  switch (sortKey) {
    case "createdAt":
    case "deliveryDate":
      return "desc";
    default:
      return "asc";
  }
}

function deliveryTabCount(
  tab: DeliveryTab,
  counts?: {
    all?: number;
    pending?: number;
    ready?: number;
    completed?: number;
    delayed?: number;
  }
): number {
  if (!counts) return 0;
  if (tab === "ALL") return Number(counts.all) || 0;
  if (tab === "PENDING") return Number(counts.pending) || 0;
  if (tab === "READY") return Number(counts.ready) || 0;
  if (tab === "COMPLETED") return Number(counts.completed) || 0;
  return Number(counts.delayed) || 0;
}

function deliveryTabCountBadge(tab: DeliveryTab, count: number) {
  if (tab === "ALL") {
    return (
      <Badge size="sm" variant="solid" color="dark">
        {count}
      </Badge>
    );
  }
  if (tab === "READY") {
    return (
      <Badge size="sm" color="primary">
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
    <Badge size="sm" color="info">
      {count}
    </Badge>
  );
}

function deliveryOrderId(d: Delivery): number | undefined {
  const o = d.order;
  if (o && typeof o.id === "number" && Number.isFinite(o.id)) return o.id;
  if (typeof d.purchaseOrderId === "number" && Number.isFinite(d.purchaseOrderId)) {
    return d.purchaseOrderId;
  }
  const ext = d as { orderId?: number };
  return typeof ext.orderId === "number" ? ext.orderId : undefined;
}

function deliveryOrderNo(d: Delivery): string {
  const o = d.order;
  if (o?.orderNo?.trim()) return o.orderNo.trim();
  return String((d as { orderNo?: string }).orderNo ?? "-");
}

function deliveryOrderTitle(d: Delivery): string {
  return d.order?.title?.trim() || "-";
}

function partnerLabel(d: Delivery, countryCodes: CommonCodeItem[]): string {
  const p = (d.partner ?? d.order?.partner) as Partner | undefined;
  if (p) return partnerSelectLabel(p, countryCodes);
  return "-";
}

export default function Delivery() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [tab, setTab] = useState<DeliveryTab>(DEFAULT_DELIVERY_TAB);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<DeliverySortKey>(DEFAULT_DELIVERY_SORT_KEY);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    getDefaultDeliverySortOrder(DEFAULT_DELIVERY_SORT_KEY)
  );

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
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

  const listParams = useMemo(() => {
    const oid = orderIdFilter.trim();
    return {
      page,
      pageSize,
      q: searchKeyword.trim() || undefined,
      partnerId: partnerId || undefined,
      orderId: oid || undefined,
      tab,
      sortBy,
      sortOrder,
    };
  }, [
    page,
    pageSize,
    searchKeyword,
    partnerId,
    orderIdFilter,
    tab,
    sortBy,
    sortOrder,
  ]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deliveriesList", listParams],
    queryFn: () => getDeliveriesList(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading,
  });

  const totalCount = data?.total ?? 0;

  const tabCountParams = useMemo(
    () => ({
      q: searchKeyword.trim() || undefined,
      partnerId: partnerId || undefined,
      orderId: orderIdFilter.trim() || undefined,
    }),
    [searchKeyword, partnerId, orderIdFilter]
  );

  const { data: tabCounts } = useQuery({
    queryKey: ["deliveriesTabCounts", tabCountParams],
    queryFn: () => getDeliveriesTabCounts(accessToken!, tabCountParams),
    enabled: !!accessToken && !isAuthLoading,
  });

  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [
      searchKeyword,
      partnerId,
      orderIdFilter,
      tab,
      sortBy,
      sortOrder,
    ],
  });

  const { data: deliveryStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const tabOptions = useMemo(
    () =>
      DELIVERY_TABS.map((tabOption) => {
        const count = deliveryTabCount(tabOption.value, tabCounts);
        return {
          value: tabOption.value,
          label: (
            <span className="inline-flex items-center gap-2">
              <span>{tabOption.label}</span>
              {deliveryTabCountBadge(tabOption.value, count)}
            </span>
          ),
        };
      }),
    [tabCounts]
  );

  const handleSearchReset = () => {
    setSearchKeyword("");
    setPartnerId("");
    setOrderIdFilter("");
    setTab(DEFAULT_DELIVERY_TAB);
    setPage(1);
    remountPartnerField();
    setSearchKey((k) => k + 1);
  };

  const getDeliveryStatusName = (code: string | undefined) => {
    const c = code?.trim();
    if (!c) return "미지정";
    return deliveryStatusCodes.find((x) => x.code === c)?.name ?? c;
  };

  const rows = data?.items ?? [];

  const handleDeliverySortToggle = (nextSortKey: string) => {
    const normalizedSortKey = nextSortKey as DeliverySortKey;
    setPage(1);
    if (sortBy === normalizedSortKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(normalizedSortKey);
    setSortOrder(getDefaultDeliverySortOrder(normalizedSortKey));
  };

  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 납품 목록"
        description="아이쓰리시스템(주) | 납품 목록 페이지"
      />
      <PageBreadcrumb pageTitle="납품 목록" />
      <div className="space-y-6">
        <ListPageLayout
          title="납품 목록"
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="delivery-simple-search"
                  placeholder="납품번호, 제목, 발주번호, 거래처 검색"
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                />
              }
              actions={
                <div className="flex items-center gap-3">
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
              <div key={`partner-${partnerFieldKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                <SearchableSelectWithCreate
                  id={`delivery-list-partner-${partnerFieldKey}`}
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
              <div key={`orderId-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[10rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  발주 UUID
                </label>
                <Input
                  type="text"
                  placeholder="UUID 입력"
                  value={orderIdFilter}
                  onChange={(e) => {
                    setOrderIdFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9"
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
                ariaLabel="납품 상태 탭"
                value={tab}
                onChange={(nextTab) => {
                  setTab(nextTab);
                  setPage(1);
                }}
                options={tabOptions}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                현재 탭: {DELIVERY_TABS.find((tabOption) => tabOption.value === tab)?.label ?? "전체"} / 총{" "}
                {tabCounts?.total ?? totalCount}건
              </p>
            </div>
          }
          pagination={!isLoading && !error ? <TablePagination {...listPagination} /> : null}
        >
          {isLoading ? (
            <ListPageLoading message="납품 목록을 불러오는 중입니다." skeletonRows={8} minHeight={320} />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              목록을 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <DataTable minWidth={880}>
              <DataTableHeader>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortKey="deliveryNo"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleDeliverySortToggle}
                >
                  <DataTableHeaderLabel>납품</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortKey="orderNo"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleDeliverySortToggle}
                >
                  <DataTableHeaderLabel>발주번호</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={3} compact sortable={false}>
                  <DataTableHeaderLabel>발주 제목</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortKey="partnerName"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleDeliverySortToggle}
                >
                  <DataTableHeaderLabel>거래처</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={1}
                  compact
                  sortKey="deliveryDate"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleDeliverySortToggle}
                  align="center"
                >
                  <DataTableHeaderLabel align="center">납품일</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortKey="status"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleDeliverySortToggle}
                  align="center"
                  className="border-r-0"
                >
                  <DataTableHeaderLabel align="center">납품 상태</DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                {rows.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell colSpan={12} compact align="center" className="border-r-0 py-4">
                      조건에 맞는 납품이 없습니다.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  rows.map((row) => {
                    const oid = deliveryOrderId(row);
                    return (
                      <DataTableRow key={row.id}>
                        <DataTableCell colSpan={2} compact>
                          <Link
                            to={`/delivery/${row.id}`}
                            className={`flex flex-col gap-0.5 rounded-md leading-tight outline-offset-2 focus-visible:ring-2 focus-visible:ring-brand-400 ${DATA_TABLE_COMPACT_LINK_CLASS}`}
                          >
                            <span className="truncate hover:underline">
                              {row.deliveryNo?.trim() || `#${row.id}`}
                            </span>
                            <span className="text-theme-xs leading-tight text-gray-500 dark:text-gray-400">
                              {row.title?.trim() || "-"}
                            </span>
                          </Link>
                        </DataTableCell>
                        <DataTableCell colSpan={2} compact>
                          {oid != null ? (
                            <Link
                              to={`/order/${oid}`}
                              className={DATA_TABLE_COMPACT_LINK_CLASS}
                            >
                              {deliveryOrderNo(row)}
                            </Link>
                          ) : (
                            <span className="text-gray-500">{deliveryOrderNo(row)}</span>
                          )}
                        </DataTableCell>
                        <DataTableCell colSpan={3} compact className="min-w-0">
                          {oid != null ? (
                            <Link
                              to={`/order/${oid}`}
                              className={`truncate ${DATA_TABLE_COMPACT_LINK_CLASS}`}
                            >
                              {deliveryOrderTitle(row)}
                            </Link>
                          ) : (
                            <p className="truncate text-theme-xs text-gray-700 dark:text-gray-300">
                              {deliveryOrderTitle(row)}
                            </p>
                          )}
                        </DataTableCell>
                        <DataTableCell colSpan={2} compact>
                          {partnerLabel(row, countryCodes)}
                        </DataTableCell>
                        <DataTableCell colSpan={1} compact align="center">
                          {row.deliveryDate?.trim() ? row.deliveryDate : "-"}
                        </DataTableCell>
                        <DataTableCell colSpan={2} compact align="center" className="border-r-0">
                          <Badge
                            size="sm"
                            color={badgeColorFromKoStatusLabel(getDeliveryStatusName(row.status))}
                          >
                            {getDeliveryStatusName(row.status)}
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
