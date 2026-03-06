import { useState, useMemo } from "react";

export const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10개씩 보기" },
  { value: "20", label: "20개씩 보기" },
  { value: "50", label: "50개씩 보기" },
  { value: "100", label: "100개씩 보기" },
] as const;

export interface UsePaginationOptions {
  totalCount: number;
  initialPageSize?: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalCount: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  pageNumbers: (number | "ellipsis")[];
  handlePageSizeChange: (value: string) => void;
}

export function usePagination({
  totalCount,
  initialPageSize = 10,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [1, 2];
    if (currentPage > 2) pages.push(currentPage);
    if (totalPages > 3) pages.push("ellipsis", totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const handlePageSizeChange = (value: string) => {
    const size = Number(value);
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    startItem,
    endItem,
    pageNumbers,
    handlePageSizeChange,
  };
}
