import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePartnerListFilter } from "../hooks/usePartnerListFilter";
import { useServerListPagination } from "../hooks/useServerListPagination";
import { useOrderCommonCodes } from "../hooks/useOrderCommonCodes";
import { Link, useNavigate } from "react-router";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Korean } from "flatpickr/dist/l10n/ko.js";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Select from "../components/form/Select";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import { PartnerCountryCell } from "../components/partner/PartnerCountryCell";
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
  DataListPrimaryActionButton,
  ListPageLayout,
  ListPageToolbarRow,
  dataListOutlineButtonClassName,
  TablePagination,
} from "../components/list";
import Badge from "../components/ui/badge/Badge";
import { Dropdown } from "../components/ui/dropdown/Dropdown";
import ListPageLoading from "../components/common/ListPageLoading";
import { useAuth } from "../hooks/useAuth";
import {
  getPurchaseOrders,
  type Partner,
  type PurchaseOrderListParams,
} from "../api/purchaseOrder";
import { commonCodesToSelectOptions } from "../api/commonCode";
import { FileIcon } from "../icons";
import { badgeColorFromKoStatusLabel } from "../lib/ui/badgeStatusColor";
// import { formatCurrency } from "../lib/format/formatCurrency";

const DEFAULT_PAGE_SIZE = 10;
type PurchaseOrderSortKey = NonNullable<PurchaseOrderListParams["sortBy"]>;

const DEFAULT_ORDER_SORT_KEY: PurchaseOrderSortKey = "orderedAt";

function getDefaultOrderSortOrder(sortKey: PurchaseOrderSortKey): "asc" | "desc" {
  switch (sortKey) {
    case "orderedAt":
    case "dueDate":
      return "desc";
    default:
      return "asc";
  }
}

export default function Order() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<PurchaseOrderSortKey>(DEFAULT_ORDER_SORT_KEY);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    getDefaultOrderSortOrder(DEFAULT_ORDER_SORT_KEY)
  );
  const dateRangeInputRef = useRef<HTMLInputElement>(null);
  const flatpickrAnchorRef = useRef<HTMLDivElement>(null);

  const {
    countryCodes,
    purchaseOrderStatusCodes: orderStatusCodes,
  } = useOrderCommonCodes(accessToken, !!accessToken && !isAuthLoading);

  const {
    partnerId,
    setPartnerId,
    partnerFilterOptions,
    partnerFieldKey,
    remountPartnerField,
  } = usePartnerListFilter({
    accessToken,
    isAuthLoading,
    countryCodes,
  });

  const listParams = useMemo(
    () => ({
      page,
      pageSize,
      q: searchKeyword.trim() || undefined,
      partnerId: partnerId || undefined,
      orderedFrom: dateStart || undefined,
      orderedTo: dateEnd || undefined,
      status: orderStatus || undefined,
      sortBy,
      sortOrder,
    }),
    [
      page,
      pageSize,
      searchKeyword,
      partnerId,
      dateStart,
      dateEnd,
      orderStatus,
      sortBy,
      sortOrder,
    ]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["purchaseOrders", listParams],
    queryFn: () => getPurchaseOrders(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading,
  });

  const totalCount = data?.total ?? 0;

  const pagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [
      searchKeyword,
      partnerId,
      orderStatus,
      dateStart,
      dateEnd,
      sortBy,
      sortOrder,
    ],
  });

  useEffect(() => {
    if (!dateRangeInputRef.current) return;
    const fp = flatpickr(dateRangeInputRef.current, {
      locale: Korean,
      mode: "range",
      dateFormat: "Y-m-d",
      static: false,
      monthSelectorType: "static",
      appendTo: document.body,
      position: "above",
      onReady: (_selectedDates, _dateStr, instance) => {
        if (instance.calendarContainer) {
          instance.calendarContainer.style.setProperty("z-index", "99999", "important");
        }
      },
      onOpen: (_selectedDates, _dateStr, instance) => {
        if (instance.calendarContainer) {
          instance.calendarContainer.style.setProperty("z-index", "99999", "important");
        }
      },
      onChange: (selectedDates: Date[]) => {
        setDateStart(selectedDates[0] ? selectedDates[0].toISOString().slice(0, 10) : "");
        setDateEnd(selectedDates[1] ? selectedDates[1].toISOString().slice(0, 10) : "");
      },
    });
    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
  }, [searchKey]);

  const orderStatusOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: "", label: "전체" }];
    commonCodesToSelectOptions(orderStatusCodes).forEach((o) => list.push(o));
    return list;
  }, [orderStatusCodes]);

  const pageList = data?.items ?? [];

  const handleSearchReset = () => {
    setSearchKeyword("");
    setPartnerId("");
    setOrderStatus("");
    setDateStart("");
    setDateEnd("");
    setPage(1);
    remountPartnerField();
    setSearchKey((k) => k + 1);
  };

  const getOrderStatusName = (code: string | undefined) => {
    const c = code?.trim();
    if (!c) return "미지정";
    return orderStatusCodes.find((x) => x.code === c)?.name ?? c;
  };

  const handleOrderSortToggle = (nextSortKey: string) => {
    const normalizedSortKey = nextSortKey as PurchaseOrderSortKey;
    setPage(1);
    if (sortBy === normalizedSortKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(normalizedSortKey);
    setSortOrder(getDefaultOrderSortOrder(normalizedSortKey));
  };
  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 요청 발주 목록"
        description="아이쓰리시스템(주) | 요청 발주 목록 페이지"
      />
      <PageBreadcrumb pageTitle="발주 목록" />
      <div className="space-y-6">
        <ListPageLayout
          title="발주 목록 (타 업체 → 우리 회사 요청)"
          contentRef={flatpickrAnchorRef}
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="simple-search"
                  placeholder="발주번호, 제목, 고객명 검색"
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                />
              }
              actions={
                <>
                  <DataListPrimaryActionButton onClick={() => navigate("/order/new")}>
                    발주 추가
                  </DataListPrimaryActionButton>
                  <div className="flex items-center gap-3">
                    <DataListSearchOptionsButton
                      open={searchOptionsOpen}
                      onToggle={() => setSearchOptionsOpen((open) => !open)}
                    />
                    <div className="relative dropdown-toggle">
                      <button
                        type="button"
                        onClick={() => setFilterOpen(!filterOpen)}
                        className={dataListOutlineButtonClassName}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                          className="mr-2 h-4 w-4 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        필터
                        <svg
                          className="-mr-1 ml-1.5 h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path
                            clipRule="evenodd"
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          />
                        </svg>
                      </button>
                      <Dropdown isOpen={filterOpen} onClose={() => setFilterOpen(false)} className="right-0 w-48 p-3">
                        <h6 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                          발주 상태
                        </h6>
                        <ul className="space-y-2 text-sm" aria-labelledby="filter-dropdown">
                          {[
                            { id: "confirm", label: "확정" },
                            { id: "pending", label: "대기" },
                            { id: "completed", label: "완료" },
                            { id: "canceled", label: "취소" },
                          ].map((cat) => (
                            <li key={cat.id} className="flex items-center">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {cat.label} (검색 옵션에서 선택)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Dropdown>
                    </div>
                  </div>
                </>
              }
            />
          }
          searchOptionsOpen={searchOptionsOpen}
          searchOptions={
            <>
              <div key={`partner-${partnerFieldKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                <SearchableSelectWithCreate
                  id={`order-list-partner-${partnerFieldKey}`}
                  label="고객"
                  value={partnerId}
                  onChange={setPartnerId}
                  options={partnerFilterOptions}
                  placeholder="전체 또는 검색"
                  compact
                  addTrigger="none"
                  addButtonLabel="고객 등록"
                  onAddClick={() => {}}
                />
              </div>
              <div key={`orderStatus-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">발주 상태</label>
                <Select
                  size="sm"
                  options={orderStatusOptions}
                  placeholder="전체"
                  value={orderStatus}
                  onChange={setOrderStatus}
                />
              </div>
              <div key={`date-range-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[14rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">발주 일자</label>
                <div className="relative">
                  <input
                    ref={dateRangeInputRef}
                    type="text"
                    readOnly
                    placeholder="년-월-일 ~ 년-월-일"
                    className="h-9 w-full rounded-md border border-gray-300 bg-transparent py-2 pl-3 pr-9 text-theme-xs text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>
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
          pagination={
            !isLoading && !error ? <TablePagination {...pagination} /> : null
          }
        >
          {isLoading ? (
            <ListPageLoading message="발주 목록을 불러오는 중입니다." skeletonRows={8} minHeight={320} />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              목록을 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <DataTable minWidth={900}>
              <DataTableHeader>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortKey="orderNo"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleOrderSortToggle}
                >
                  <DataTableHeaderLabel>발주번호</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={3} compact sortable={false}>
                  <DataTableHeaderLabel>제목</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortKey="partnerName"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleOrderSortToggle}
                >
                  <DataTableHeaderLabel>고객</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={1}
                  compact
                  sortKey="orderedAt"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleOrderSortToggle}
                >
                  <DataTableHeaderLabel>발주일자</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={1}
                  compact
                  sortKey="dueDate"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleOrderSortToggle}
                >
                  <DataTableHeaderLabel>요청납기</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortKey="status"
                  activeSortBy={sortBy}
                  activeSortOrder={sortOrder}
                  onToggleSort={handleOrderSortToggle}
                  className="justify-center"
                >
                  <DataTableHeaderLabel className="w-full text-center">
                    발주 상태
                  </DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={1} compact sortable={false} className="justify-center border-r-0">
                  <DataTableHeaderLabel className="w-full text-center">
                    첨부
                    <span className="sr-only">첨부 파일 여부</span>
                  </DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                {pageList.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell colSpan={12} compact className="justify-center border-r-0 py-6">
                      검색 조건에 맞는 발주가 없습니다.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  pageList.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableCell colSpan={2} compact>
                        <Link
                          to={`/order/${row.id}`}
                          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {row.orderNo}
                        </Link>
                      </DataTableCell>
                      <DataTableCell colSpan={3} compact className="min-w-0">
                        <p className="truncate text-theme-sm text-gray-700 dark:text-gray-300">
                          {row.title ?? "-"}
                        </p>
                      </DataTableCell>
                      <DataTableCell colSpan={2} compact>
                        <PartnerCountryCell
                          partner={row.partner as Partner | undefined}
                          countryCodes={countryCodes}
                          variant="orderList"
                        />
                      </DataTableCell>
                      <DataTableCell colSpan={1} compact>
                        {row.orderDate?.trim() ? row.orderDate : "-"}
                      </DataTableCell>
                      <DataTableCell colSpan={1} compact>
                        {row.dueDate?.trim() ? row.dueDate : "-"}
                      </DataTableCell>
                      <DataTableCell colSpan={2} compact className="justify-center">
                        <Badge size="sm" color={badgeColorFromKoStatusLabel(getOrderStatusName(row.orderStatus))}>
                          {getOrderStatusName(row.orderStatus)}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell colSpan={1} compact className="justify-center border-r-0">
                        {row.hasAttachments ? (
                          <span className="inline-flex justify-center" title="첨부 있음">
                            <FileIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" aria-hidden />
                            <span className="sr-only">첨부 있음</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          )}
        </ListPageLayout>
      </div>

    </>
  );
}
