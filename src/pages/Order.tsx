import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { usePartnerListFilter } from "../hooks/usePartnerListFilter";
import { Link, useNavigate } from "react-router";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Korean } from "flatpickr/dist/l10n/ko.js";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Select from "../components/form/Select";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import PartnerQuickCreateModal from "../components/form/PartnerQuickCreateModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import Badge from "../components/ui/badge/Badge";
import { Dropdown } from "../components/ui/dropdown/Dropdown";
import { usePagination } from "../hooks/usePagination";
import {
  DataListSearchInput,
  DataListSearchOptionsButton,
  DataListPrimaryActionButton,
  ListPageLayout,
  ListPageToolbarRow,
  dataListOutlineButtonClassName,
  TablePagination,
} from "../components/list";
import ListPageLoading from "../components/common/ListPageLoading";
import { useAuth } from "../hooks/useAuth";
import {
  getPurchaseOrders,
  type PurchaseOrderListItem,
  type Partner,
} from "../api/purchaseOrder";
import {
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  COMMON_CODE_GROUP_APPROVAL_STATUS,
  COMMON_CODE_GROUP_COUNTRY,
  commonCodesToSelectOptions,
} from "../api/commonCode";
import { partnerSelectLabel } from "../lib/partnerDisplay";
import { badgeColorFromKoStatusLabel } from "../lib/badgeStatusColor";
// import { formatCurrency } from "../lib/formatCurrency";

const PAGE_SIZE = 10;

export default function Order() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const dateRangeInputRef = useRef<HTMLInputElement>(null);
  const flatpickrAnchorRef = useRef<HTMLDivElement>(null);

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

  /** 서버는 `?status=` 만 지원. `approvalStatus`는 아래 클라이언트 필터에서만 사용 */
  const listParams = useMemo(
    () => ({
      partnerId: partnerId ? Number(partnerId) : undefined,
      status: orderStatus || undefined,
    }),
    [partnerId, orderStatus]
  );

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["purchaseOrders", listParams],
    queryFn: () => getPurchaseOrders(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: orderStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: approvalStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_APPROVAL_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

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
        if (selectedDates[0]) setDateStart(selectedDates[0].toISOString().slice(0, 10));
        if (selectedDates[1]) setDateEnd(selectedDates[1].toISOString().slice(0, 10));
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

  const approvalStatusOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: "", label: "전체" }];
    commonCodesToSelectOptions(approvalStatusCodes).forEach((o) => list.push(o));
    return list;
  }, [approvalStatusCodes]);

  const filteredByKeywordAndDate = useMemo(() => {
    let list = orders as PurchaseOrderListItem[];
    const kw = searchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter((o) => {
        const partner = o.partner as Partner | undefined;
        const partnerLine = partner
          ? partnerSelectLabel(partner, countryCodes).toLowerCase()
          : "";
        return (
          (o.orderNo && o.orderNo.toLowerCase().includes(kw)) ||
          (o.title && o.title.toLowerCase().includes(kw)) ||
          (partner?.name && partner.name.toLowerCase().includes(kw)) ||
          (partner?.code && partner.code.toLowerCase().includes(kw)) ||
          partnerLine.includes(kw)
        );
      });
    }
    if (dateStart) {
      list = list.filter((o) => o.orderDate >= dateStart);
    }
    if (dateEnd) {
      list = list.filter((o) => o.orderDate <= dateEnd);
    }
    if (approvalStatus) {
      list = list.filter(
        (o) => String(o.approvalStatus ?? "").trim() === approvalStatus
      );
    }
    return list;
  }, [orders, searchKeyword, dateStart, dateEnd, approvalStatus, countryCodes]);

  const totalCount = filteredByKeywordAndDate.length;
  const pagination = usePagination({ totalCount, initialPageSize: PAGE_SIZE });
  const { startItem, endItem } = pagination;
  const pageList = useMemo(
    () => filteredByKeywordAndDate.slice(startItem - 1, endItem),
    [filteredByKeywordAndDate, startItem, endItem]
  );

  const handleSearchReset = () => {
    setSearchKeyword("");
    setPartnerId("");
    setOrderStatus("");
    setApprovalStatus("");
    setDateStart("");
    setDateEnd("");
    remountPartnerField();
    setSearchKey((k) => k + 1);
  };

  const getOrderStatusName = (code: string | undefined) => {
    const c = code?.trim();
    if (!c) return "미지정";
    return orderStatusCodes.find((x) => x.code === c)?.name ?? c;
  };
  const getApprovalStatusName = (code: string | undefined) => {
    const c = code?.trim();
    if (!c) return "미승인";
    return approvalStatusCodes.find((x) => x.code === c)?.name ?? c;
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
                  placeholder="발주번호, 제목, 거래처명 검색"
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
              <div key={`orderStatus-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">발주 상태</label>
                <Select
                  size="sm"
                  options={orderStatusOptions}
                  placeholder="전체"
                  defaultValue={orderStatus}
                  onChange={setOrderStatus}
                />
              </div>
              <div key={`approvalStatus-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">승인 상태</label>
                <Select
                  size="sm"
                  options={approvalStatusOptions}
                  placeholder="전체"
                  defaultValue={approvalStatus}
                  onChange={setApprovalStatus}
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
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">발주번호</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">제목</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">거래처</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">발주일자</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">요청납기</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">발주 상태</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">승인 상태</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {pageList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-5 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      검색 조건에 맞는 발주가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageList.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-5 py-4 text-start text-theme-sm sm:px-6">
                        <Link
                          to={`/order/${row.id}`}
                          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {row.orderNo}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm truncate dark:text-gray-300 max-w-[15rem]" >{row.title ?? "-"}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        {partnerSelectLabel(
                          row.partner as Partner | undefined,
                          countryCodes
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400 ">
                        {row.orderDate?.trim() ? row.orderDate : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        {row.dueDate?.trim() ? row.dueDate : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <Badge size="sm" color={badgeColorFromKoStatusLabel(getOrderStatusName(row.orderStatus))}>
                          {getOrderStatusName(row.orderStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <Badge size="sm" color={badgeColorFromKoStatusLabel(getApprovalStatusName(row.approvalStatus))}>
                          {getApprovalStatusName(row.approvalStatus)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
