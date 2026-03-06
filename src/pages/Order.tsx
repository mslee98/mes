import { useState, useRef, useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Korean } from "flatpickr/dist/l10n/ko.js";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import ComponentCard from "../components/common/ComponentCard";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
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

const FILTER_CATEGORIES = [
  { id: "confirm", label: "확정", count: 1 },
  { id: "pending", label: "대기", count: 1 },
  { id: "completed", label: "완료", count: 1 },
  { id: "canceled", label: "취소", count: 1 },
];

// 검색 옵션: 제품명
const PRODUCT_OPTIONS = [
  { value: "", label: "전체" },
  { value: "P001", label: "제품A" },
  { value: "P002", label: "제품B" },
  { value: "P003", label: "제품C" },
  { value: "P004", label: "제품D" },
];

// 검색 옵션: 업체 명
const VENDOR_OPTIONS = [
  { value: "", label: "전체" },
  { value: "V001", label: "거래처 A" },
  { value: "V002", label: "거래처 B" },
  { value: "V003", label: "거래처 C" },
];

// 검색 옵션: 발주 상태
const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "pending", label: "대기" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
  { value: "canceled", label: "취소" },
];

// 더미 발주 데이터
const dummyOrders = [
  { id: 1, orderNo: "PO-2025-001", productName: "제품A", title: "3월 정기 발주", vendorName: "거래처 A", qty: 100, amount: "1,500,000", orderDate: "2025-03-01", status: "확정" as const },
  { id: 2, orderNo: "PO-2025-002", productName: "제품B", title: "추가 발주", vendorName: "거래처 B", qty: 50, amount: "750,000", orderDate: "2025-03-02", status: "대기" as const },
  { id: 3, orderNo: "PO-2025-003", productName: "제품C", title: "긴급 발주", vendorName: "거래처 A", qty: 200, amount: "3,200,000", orderDate: "2025-03-03", status: "완료" as const },
  { id: 4, orderNo: "PO-2025-004", productName: "제품D", title: "시험 발주", vendorName: "거래처 C", qty: 30, amount: "450,000", orderDate: "2025-03-04", status: "취소" as const },
];

const getBadgeColor = (s: string) => {
  switch (s) {
    case "완료": return "success";
    case "확정": return "success";
    case "대기": return "warning";
    case "취소": return "error";
    default: return "primary";
  }
};

export default function Order() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterChecked, setFilterChecked] = useState<Record<string, boolean>>({
    confirm: false,
    pending: false,
    completed: false,
    canceled: false,
  });
  const [productName, setProductName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const dateRangeInputRef = useRef<HTMLInputElement>(null);
  const flatpickrAnchorRef = useRef<HTMLDivElement>(null);

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

  const toggleFilter = (id: string) => {
    setFilterChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSearchSubmit = () => {
    // TODO: 실제 검색 API 연동
    console.log({ searchKeyword, productName, vendorName, orderStatus, dateStart, dateEnd });
  };

  const handleSearchReset = () => {
    setSearchKeyword("");
    setProductName("");
    setVendorName("");
    setOrderStatus("");
    setDateStart("");
    setDateEnd("");
    setSearchKey((k) => k + 1); // Flatpickr/Select 리마운트
  };

  const totalCount = 1000;
  const pagination = usePagination({ totalCount, initialPageSize: 10 });

  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 요청 발주 목록"
        description="아이쓰리시스템(주) | 요청 발주 목록 페이지"
      />
      <PageBreadcrumb pageTitle="발주 목록" />
      <div className="space-y-6">
        <ComponentCard title="발주 목록">
          <div ref={flatpickrAnchorRef} className="relative z-[100]">
          {/* 검색 / 검색 옵션 / 필터 바 */}
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
                  placeholder="검색"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="!border-gray-200 !bg-transparent !py-2.5 !pl-12 !text-gray-800 !placeholder:text-gray-400 focus:!border-brand-300 focus:!ring-brand-500/10 dark:!border-gray-800 dark:!bg-white/[0.03] dark:!text-white/90 dark:!placeholder:text-white/30 dark:focus:!border-brand-800 !text-sm"
                />
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-col items-stretch justify-end gap-2 md:flex-row md:items-center md:gap-3">
              <button
                type="button"
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
                      {FILTER_CATEGORIES.map((cat) => (
                        <li key={cat.id} className="flex items-center">
                          <input
                            id={cat.id}
                            type="checkbox"
                            checked={filterChecked[cat.id] ?? false}
                            onChange={() => toggleFilter(cat.id)}
                            className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-brand-600 focus:ring-2 focus:ring-brand-500 dark:border-gray-500 dark:bg-gray-600 dark:ring-offset-gray-700 dark:focus:ring-brand-600"
                          />
                          <label
                            htmlFor={cat.id}
                            className="ml-2 font-medium text-gray-900 dark:text-gray-100"
                          >
                            {cat.label} ({cat.count})
                          </label>
                        </li>
                      ))}
                    </ul>
                  </Dropdown>
                </div>
              </div>
            </div>
          </div>

          {/* 검색 옵션 (코랩스): 제품명 | 업체 명 | 발주 상태 | 발주 일자 */}
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${
              searchOptionsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 pt-1 dark:border-white/[0.05] sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
            <div key={`product-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">제품명</label>
              <Select
                size="sm"
                options={PRODUCT_OPTIONS}
                placeholder="전체"
                defaultValue=""
                onChange={setProductName}
              />
            </div>
            <div key={`vendor-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">업체 명</label>
              <Select
                size="sm"
                options={VENDOR_OPTIONS}
                placeholder="전체"
                defaultValue=""
                onChange={setVendorName}
              />
            </div>
            <div key={`status-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">발주 상태</label>
              <Select
                size="sm"
                options={STATUS_OPTIONS}
                placeholder="전체"
                defaultValue=""
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
                onClick={handleSearchSubmit}
                className="h-9 rounded-lg border border-brand-500 bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                검색
              </button>
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

          <div className="max-w-full overflow-x-auto pt-4">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">발주번호</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">제품명</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">제목</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">업체명</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">수량</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">금액</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">발주일자</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">발주 상태</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {dummyOrders.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="px-5 py-4 text-start text-theme-sm sm:px-6">
                      <span className="font-medium text-gray-800 dark:text-white/90">{row.orderNo}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.productName}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.title}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{row.vendorName}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">{row.qty}</TableCell>
                    <TableCell className="px-4 py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">{row.amount}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">{row.orderDate}</TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge size="sm" color={getBadgeColor(row.status)}>{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination {...pagination} />
          </div>
        </ComponentCard>
      </div>
    </>
  );
}