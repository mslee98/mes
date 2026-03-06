# 리스트 페이지 공통 구조

테이블 + 검색 + 페이지네이션 리스트 페이지를 일관되게 만들기 위한 훅/컴포넌트입니다.

## 사용 순서

### 1. 페이지네이션 (필수)

```tsx
import { usePagination } from "../../hooks/usePagination";
import { TablePagination } from "../../components/list";

const totalCount = 1000; // API 등에서 조회
const pagination = usePagination({ totalCount, initialPageSize: 10 });

// 테이블 하단
<TablePagination {...pagination} />
```

- `usePagination`: `currentPage`, `pageSize`, `totalPages`, `startItem`, `endItem`, `pageNumbers`, `setCurrentPage`, `handlePageSizeChange` 등 제공
- `PAGE_SIZE_OPTIONS`(10/20/50/100개씩 보기)는 훅에서 export

### 2. 리스트 레이아웃 (선택)

툴바 + 검색 옵션 코랩스 + 테이블 + 페이지네이션 구조를 한 번에 쓰려면:

```tsx
import { ListPageLayout } from "../../components/list";

<ListPageLayout
  title="목록 제목"
  toolbar={<>검색창, 검색 옵션 버튼, 필터 등</>}
  searchOptionsOpen={searchOptionsOpen}
  searchOptions={<>제품명, 업체명 등 필터 폼</>}
  pagination={<TablePagination {...pagination} />}
  contentRef={flatpickrAnchorRef}  // Flatpickr 등 append 부모
>
  <Table>...</Table>
</ListPageLayout>
```

- 새 리스트 페이지는 `ListPageLayout` + `usePagination` + `TablePagination` 조합으로 동일 구조 유지 가능

## 참고: Order 페이지

`src/pages/Order.tsx`는 현재 다음만 적용된 상태입니다.

- `usePagination` + `TablePagination` 사용
- 레이아웃(카드, 툴바, 코랩스)은 기존 JSX 유지

다른 리스트 페이지를 만들 때는 `ListPageLayout`을 쓰면 툴바/검색 옵션/테이블/페이지네이션 구조를 그대로 재사용할 수 있습니다.
