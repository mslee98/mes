import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Korean } from "flatpickr/dist/l10n/ko.js";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import ComponentCard from "../components/common/ComponentCard";
import Input from "../components/form/input/InputField";
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
import { TablePagination } from "../components/list/TablePagination";
import ListPageLoading from "../components/common/ListPageLoading";
import { useAuth } from "../context/AuthContext";
import {
  getPurchaseOrders,
  getPartners,
  type PurchaseOrderListItem,
  type Partner,
} from "../api/purchaseOrder";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  COMMON_CODE_GROUP_APPROVAL_STATUS,
  COMMON_CODE_GROUP_COUNTRY,
  commonCodesToSelectOptions,
  type CommonCodeItem,
} from "../api/commonCode";
import { partnerSelectLabel } from "../lib/partnerDisplay";
// import { formatCurrency } from "../lib/formatCurrency";

const PAGE_SIZE = 10;

function getBadgeColor(statusName: string): "success" | "warning" | "error" | "primary" {
  const s = statusName?.toLowerCase() ?? "";
  if (s.includes("미승인") || s.includes("미지정")) return "primary";
  if (s.includes("완료") || s.includes("승인") || s.includes("확정")) return "success";
  if (s.includes("대기") || s.includes("진행")) return "warning";
  if (s.includes("반려") || s.includes("취소")) return "error";
  return "primary";
}

export default function Order() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [partnerCreateOpen, setPartnerCreateOpen] = useState(false);
  const dateRangeInputRef = useRef<HTMLInputElement>(null);
  const flatpickrAnchorRef = useRef<HTMLDivElement>(null);

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

  const { data: partners = [] } = useQuery({
    queryKey: ["partners"],
    queryFn: () => getPartners(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: countryCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_COUNTRY],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_COUNTRY, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: orderStatusCodes = [] } = useQuery<CommonCodeItem[]>({
    queryKey: ["commonCodes", "PURCHASE_ORDER_STATUS"],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
        accessToken!
      ),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: approvalStatusCodes = [] } = useQuery<CommonCodeItem[]>({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_APPROVAL_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_APPROVAL_STATUS, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
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
        if (selectedDates[0]) setDateStart(selectedDates[0].toISOString().slice(0, 10));
        if (selectedDates[1]) setDateEnd(selectedDates[1].toISOString().slice(0, 10));
      },
    });
    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
  }, [searchKey]);

  const partnerFilterOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: "", label: "전체" }];
    (partners as Partner[]).forEach((p) =>
      list.push({
        value: String(p.id),
        label: partnerSelectLabel(p, countryCodes),
      })
    );
    return list;
  }, [partners, countryCodes]);

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
        <ComponentCard title="발주 목록 (타 업체 → 우리 회사 요청)">
          <div ref={flatpickrAnchorRef} className="relative z-[100]">
            <div className="flex flex-col items-stretch gap-3 border-b border-gray-100 pb-4 dark:border-white/[0.05] md:flex-row md:items-center md:justify-between md:gap-4">
              <div className="w-full md:w-1/2">
                <label htmlFor="simple-search" className="sr-only">
                  검색
                </label>
                <div className="relative w-full">
                  <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <Input
                    id="simple-search"
                    type="text"
                    placeholder="발주번호, 제목, 거래처명 검색"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="!border-gray-200 !bg-transparent !py-2.5 !pl-12 !text-gray-800 !placeholder:text-gray-400 focus:!border-brand-300 focus:!ring-brand-500/10 dark:!border-gray-800 dark:!bg-white/[0.03] dark:!text-white/90 dark:!placeholder:text-white/30 dark:focus:!border-brand-800 !text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-stretch justify-end gap-2 md:flex-row md:items-center md:gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/order/new")}
                  className="flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
                >
                  <svg
                    className="mr-2 h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <path
                      clipRule="evenodd"
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    />
                  </svg>
                  발주 추가
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSearchOptionsOpen((open) => !open)}
                    className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-brand-600 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700 md:w-auto"
                  >
                    <span>검색 옵션</span>
                    <svg
                      className={`ml-1.5 h-5 w-5 transition-transform ${searchOptionsOpen ? "rotate-180" : ""}`}
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
                  <div className="relative dropdown-toggle">
                    <button
                      type="button"
                      onClick={() => setFilterOpen(!filterOpen)}
                      className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-brand-600 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700 md:w-auto"
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
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                searchOptionsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 pt-1 dark:border-white/[0.05] sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
                  <div key={`partner-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                    <SearchableSelectWithCreate
                      id={`order-list-partner-${searchKey}`}
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
                </div>
              </div>
            </div>

            {isLoading && (
              <ListPageLoading message="발주 목록을 불러오는 중입니다." skeletonRows={8} minHeight={320} />
            )}

            {!isLoading && error && (
              <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
                목록을 불러오는 중 오류가 발생했습니다.
              </div>
            )}

            {!isLoading && !error && (
              <>
                <div className="max-w-full overflow-x-auto pt-4">
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
                        {/* <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">총 금액</TableCell> */}
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
                              <Badge size="sm" color={getBadgeColor(getOrderStatusName(row.orderStatus))}>
                                {getOrderStatusName(row.orderStatus)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-center">
                              <Badge size="sm" color={getBadgeColor(getApprovalStatusName(row.approvalStatus))}>
                                {getApprovalStatusName(row.approvalStatus)}
                              </Badge>
                            </TableCell>
                            {/* <TableCell className="px-4 py-3 text-end font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {formatCurrency(row.totalAmount, row.currencyCode ?? "KRW")}
                            </TableCell> */}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination {...pagination} />
              </>
            )}
          </div>
        </ComponentCard>
      </div>

      <PartnerQuickCreateModal
        isOpen={partnerCreateOpen}
        onClose={() => setPartnerCreateOpen(false)}
        onCreated={(p) => setPartnerId(String(p.id))}
      />
    </>
  );
}
