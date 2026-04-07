import { useEffect, useMemo } from "react";
import type { UsePaginationReturn } from "./usePagination";

export type ServerListEmptyTotalPages = "zero" | "one";

export interface UseServerListPaginationArgs {
  totalCount: number;
  listPage: number;
  setListPage: React.Dispatch<React.SetStateAction<number>>;
  listPageSize: number;
  setListPageSize: React.Dispatch<React.SetStateAction<number>>;
  /** 필터 변경 시 1페이지로 */
  resetPageDeps: readonly unknown[];
  /**
   * `one`: 빈 목록일 때도 totalPages 최소 1 (제품 목록 기존 동작)
   * `zero`: totalCount 0이면 totalPages 0 (품목 목록)
   */
  emptyTotalPages?: ServerListEmptyTotalPages;
}

/**
 * 서버 total + 로컬 page/size 상태에 맞춰 페이지 번호·범위·리셋·클램프를 맞춘다.
 */
export function useServerListPagination({
  totalCount,
  listPage,
  setListPage,
  listPageSize,
  setListPageSize,
  resetPageDeps,
  emptyTotalPages = "zero",
}: UseServerListPaginationArgs): UsePaginationReturn {
  const totalPages = useMemo(() => {
    const raw = Math.ceil(totalCount / listPageSize);
    if (emptyTotalPages === "one") {
      return Math.max(1, raw || 1);
    }
    return Math.max(0, raw);
  }, [totalCount, listPageSize, emptyTotalPages]);

  const startItem =
    totalCount === 0 ? 0 : (listPage - 1) * listPageSize + 1;
  const endItem = Math.min(listPage * listPageSize, totalCount);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 0) return [];
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (listPage > 3) pages.push("ellipsis");
    const start = Math.max(2, listPage - 1);
    const end = Math.min(totalPages - 1, listPage + 1);
    for (let p = start; p <= end; p += 1) pages.push(p);
    if (listPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }, [listPage, totalPages]);

  const handlePageSizeChange = (value: string) => {
    setListPageSize(Number(value));
    setListPage(1);
  };

  useEffect(() => {
    setListPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetPageDeps가 의도적 전체 목록
  }, [setListPage, ...resetPageDeps]);

  useEffect(() => {
    if (totalPages > 0 && listPage > totalPages) {
      setListPage(totalPages);
    }
  }, [listPage, totalPages, setListPage]);

  return {
    currentPage: listPage,
    setCurrentPage: setListPage,
    pageSize: listPageSize,
    setPageSize: setListPageSize,
    totalCount,
    totalPages,
    startItem,
    endItem,
    pageNumbers,
    handlePageSizeChange,
  };
}
