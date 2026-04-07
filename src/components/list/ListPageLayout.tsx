import type React from "react";
import ComponentCard from "../common/ComponentCard";

export interface ListPageLayoutProps {
  /** 카드 제목 (예: "발주 목록") */
  title: string;
  /** 상단 툴바: 검색창 + 검색 옵션 버튼 + 필터 등 */
  toolbar: React.ReactNode;
  /** 검색 옵션 패널 열림 여부 */
  searchOptionsOpen: boolean;
  /** 검색 옵션 패널 내용 (제품명, 업체명 등 필터 폼) */
  searchOptions: React.ReactNode;
  /** 테이블 영역 */
  children: React.ReactNode;
  /** 페이지네이션 (TablePagination 등) */
  pagination: React.ReactNode;
  /** Flatpickr 등 포탈/드롭다운이 붙을 부모 ref (overflow 밖에 두기 위함) */
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * 리스트 페이지 공통 레이아웃
 * - 상단 툴바(검색 + 버튼들)
 * - 접었다 펼치기 검색 옵션
 * - 테이블
 * - 하단 페이지네이션
 */
export function ListPageLayout({
  title,
  toolbar,
  searchOptionsOpen,
  searchOptions,
  children,
  pagination,
  contentRef,
}: ListPageLayoutProps) {
  return (
    <ComponentCard title={title}>
      <div ref={contentRef} className="relative z-[100]">
        {/* 툴바: 검색 + 검색 옵션 버튼 + 필터 등 */}
        <div className="flex flex-col items-stretch gap-3 border-b border-gray-100 pb-4 dark:border-white/[0.05] md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="w-full min-w-0 md:flex-1">{toolbar}</div>
        </div>

        {/* 검색 옵션 (코랩스) */}
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            searchOptionsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 pt-1 dark:border-white/[0.05] sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
              {searchOptions}
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div className="custom-scrollbar max-w-full overflow-x-auto pt-4">
          {children}
        </div>

        {/* 페이지네이션 */}
        {pagination}
      </div>
    </ComponentCard>
  );
}
