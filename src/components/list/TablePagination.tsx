import Select from "../form/Select";
import { PAGE_SIZE_OPTIONS } from "../../hooks/usePagination";
import type { UsePaginationReturn } from "../../hooks/usePagination";

const btnBase =
  "flex h-full items-center justify-center border py-1.5 px-3 text-sm leading-tight disabled:opacity-50 disabled:pointer-events-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white";
const btnPrevNext =
  "rounded-l-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 " + btnBase;
const btnPrevNextLast =
  "rounded-r-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 " + btnBase;
const btnPage =
  "flex items-center justify-center border px-3 py-2 text-sm leading-tight " + btnBase;
const btnPageActive =
  "z-10 border-brand-300 bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white";
const btnPageInactive =
  "border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white";

export interface TablePaginationProps extends UsePaginationReturn {
  /** 페이지 크기 옵션 (기본: PAGE_SIZE_OPTIONS) */
  pageSizeOptions?: readonly { value: string; label: string }[];
}

export function TablePagination({
  currentPage,
  setCurrentPage,
  pageSize,
  totalCount,
  totalPages,
  startItem,
  endItem,
  pageNumbers,
  handlePageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  return (
    <nav
      className="flex flex-col items-start justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/[0.05] md:flex-row md:items-center md:gap-0"
      aria-label="테이블 페이지 이동"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          Showing{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {startItem}-{endItem}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {totalCount}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">표시</span>
          <Select
            key={`page-size-${pageSize}`}
            size="sm"
            options={[...pageSizeOptions]}
            placeholder="10개씩 보기"
            defaultValue={String(pageSize)}
            onChange={handlePageSizeChange}
            className="!w-auto min-w-[7rem]"
          />
        </div>
      </div>
      <ul className="inline-flex -space-x-px">
        <li>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={btnPrevNext}
            aria-label="이전"
          >
            <svg className="h-5 w-5" aria-hidden fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </li>
        {pageNumbers.map((page, idx) =>
          page === "ellipsis" ? (
            <li key={`ellipsis-${idx}`}>
              <span className={`${btnPage} rounded-none text-gray-500 dark:bg-gray-800 dark:text-gray-400`}>
                ...
              </span>
            </li>
          ) : (
            <li key={page}>
              <button
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`${btnPage} ${currentPage === page ? btnPageActive : btnPageInactive}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            </li>
          )
        )}
        <li>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(Math.max(totalPages, 1), p + 1))}
            disabled={totalPages === 0 || currentPage >= totalPages}
            className={btnPrevNextLast}
            aria-label="다음"
          >
            <svg className="h-5 w-5" aria-hidden fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </li>
      </ul>
    </nav>
  );
}
