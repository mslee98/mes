/** 발주 상세 — 발주 제품 카드 테이블 8컬럼 그리드 */
export const ORDER_DETAIL_LINES_GRID_TEMPLATE =
  "minmax(8rem, 2.5fr) minmax(4rem, 1fr) minmax(4rem, 1.2fr) minmax(3.5rem, 0.65fr) minmax(4rem, 0.75fr) minmax(4rem, 0.75fr) minmax(4rem, 1fr) minmax(3.5rem, 0.65fr)";

/** 생산 계획 모달 — 발주 요약 품목 미리보기 4컬럼 */
export const PRODUCTION_PLAN_ORDER_LINES_GRID_TEMPLATE =
  "minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(4rem, 0.6fr)";

/** 생산 계획 모달 — 대상 발주 품목 선택 6컬럼 */
export const PRODUCTION_PLAN_LINE_SELECTION_GRID_TEMPLATE =
  "minmax(2.5rem, 0.35fr) minmax(8rem, 2.5fr) minmax(3rem, 0.9fr) minmax(3rem, 0.9fr) minmax(5.5rem, 1.1fr) minmax(2.5rem, 0.55fr)";

/** 생산 계획 모달 — LOT 목록 4컬럼 */
export const PRODUCTION_PLAN_LOT_LIST_GRID_TEMPLATE =
  "minmax(2.5rem, 0.35fr) minmax(8rem, 2fr) minmax(10rem, 2.5fr) minmax(10rem, 2.15fr)";

/** 생산 계획 모달 — LOT 목록 스크롤 영역 높이 */
export const PRODUCTION_LOT_LIST_VISIBLE_ROW_COUNT = 6;
const PRODUCTION_LOT_LIST_ROW_HEIGHT_REM = 2.5;
const PRODUCTION_LOT_LIST_HEADER_HEIGHT_REM = 2.25;
export const PRODUCTION_LOT_LIST_SCROLL_MAX_HEIGHT = `${
  PRODUCTION_LOT_LIST_HEADER_HEIGHT_REM +
  PRODUCTION_LOT_LIST_VISIBLE_ROW_COUNT * PRODUCTION_LOT_LIST_ROW_HEIGHT_REM
}rem`;
