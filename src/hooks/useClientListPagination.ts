import { useEffect } from "react";
import { usePagination, type UsePaginationReturn } from "./usePagination";

export interface UseClientListPaginationArgs {
  filteredCount: number;
  initialPageSize?: number;
  /** 필터·검색 값이 바뀌면 현재 페이지를 1로 리셋 */
  resetPageDeps: readonly unknown[];
}

/**
 * 전체 목록을 받아 클라이언트에서 필터한 뒤 `usePagination` + 페이지 클램프까지 한 번에 쓰는 훅.
 */
export function useClientListPagination({
  filteredCount,
  initialPageSize = 10,
  resetPageDeps,
}: UseClientListPaginationArgs): UsePaginationReturn {
  const pagination = usePagination({
    totalCount: filteredCount,
    initialPageSize,
  });

  useEffect(() => {
    pagination.setCurrentPage(1);
    // resetPageDeps만 의존하면 됨 (setCurrentPage는 usePagination에서 안정)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetPageDeps가 의도적 전체 목록
  }, [pagination.setCurrentPage, ...resetPageDeps]);

  useEffect(() => {
    if (
      pagination.totalPages > 0 &&
      pagination.currentPage > pagination.totalPages
    ) {
      pagination.setCurrentPage(pagination.totalPages);
    }
    // pagination 객체는 매 렌더마다 새 참조라 필드만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.setCurrentPage, pagination.totalPages]);

  return pagination;
}
