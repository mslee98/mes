import { useCallback, useState } from "react";

/** 리스트 페이지 정렬 상태 — 토글 시 1페이지로 리셋 */
export function useListSortState<T extends string>(
  defaultSortKey: T,
  getDefaultSortOrder: (sortKey: T) => "asc" | "desc",
  setPage: (page: number) => void
) {
  const [sortBy, setSortBy] = useState<T>(defaultSortKey);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    getDefaultSortOrder(defaultSortKey)
  );

  const onToggleSort = useCallback(
    (nextSortKey: string) => {
      const normalizedSortKey = nextSortKey as T;
      setPage(1);
      if (sortBy === normalizedSortKey) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        return;
      }
      setSortBy(normalizedSortKey);
      setSortOrder(getDefaultSortOrder(normalizedSortKey));
    },
    [sortBy, getDefaultSortOrder, setPage]
  );

  return { sortBy, sortOrder, onToggleSort };
}
