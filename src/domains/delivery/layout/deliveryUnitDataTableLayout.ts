import type { CSSProperties } from "react";
import type { DataTableColSpan } from "../../../components/list/DataTable/dataTableStyles";

export type DeliveryUnitTableLayout = {
  checkbox: DataTableColSpan;
  no: DataTableColSpan;
  lot: DataTableColSpan;
  item: DataTableColSpan;
  serial: DataTableColSpan;
  partner: DataTableColSpan;
  operator: DataTableColSpan;
  process: DataTableColSpan;
  status: DataTableColSpan;
  orderPlan: DataTableColSpan;
  dates: DataTableColSpan;
  delay: DataTableColSpan;
};

/** 선택·No. 등 좁은 컬럼용 셀 패딩 */
export const DELIVERY_UNIT_NARROW_CELL_CLASS =
  "justify-center px-0.5 py-1.5";

/** 2줄 셀(품목·S/N·발주·계획) 기준 compact 행 최소 높이 */
export const DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS = "min-h-[2.75rem]";

/** LOT·발주번호 등 식별자 truncate 방지용 테이블 최소 너비 */
export const DELIVERY_UNIT_TABLE_MIN_WIDTH_PX = 1200;

const COL = {
  narrow: "1.75rem",
  lot: "minmax(11rem, 1.4fr)",
  item: "minmax(4.5rem, 1.2fr)",
  serial: "minmax(5rem, 1.1fr)",
  partner: "minmax(8rem, 1.1fr)",
  operator: "minmax(3rem, 0.65fr)",
  process: "minmax(3.5rem, 0.85fr)",
  status: "minmax(2.75rem, 0.5fr)",
  orderPlan: "minmax(9rem, 1.4fr)",
  dates: "minmax(5.5rem, 0.8fr)",
  delay: "minmax(2.75rem, 0.45fr)",
} as const;

const LEADING_PAIR = [COL.narrow, COL.narrow] as const;

const SHARED_DATA_TRACKS_BEFORE_DATES = [
  COL.lot,
  COL.item,
  COL.serial,
  COL.partner,
  COL.operator,
  COL.process,
  COL.status,
  COL.orderPlan,
] as const;

const DATE_TRACKS = [COL.dates, COL.delay] as const;

const TEMPLATE_WITH_CHECKBOX = [
  ...LEADING_PAIR,
  ...SHARED_DATA_TRACKS_BEFORE_DATES,
  ...DATE_TRACKS,
].join(" ");

const TEMPLATE_NO_CHECKBOX = [
  ...LEADING_PAIR,
  ...SHARED_DATA_TRACKS_BEFORE_DATES,
  ...DATE_TRACKS,
].join(" ");

const SHARED_DATA_COLUMNS = {
  lot: 1 as const,
  item: 1 as const,
  serial: 1 as const,
  partner: 1 as const,
  operator: 1 as const,
  process: 1 as const,
  status: 1 as const,
  orderPlan: 1 as const,
  dates: 1 as const,
  delay: 1 as const,
};

const DELIVERY_UNIT_TABLE_TRACK_COUNT = 12 as DataTableColSpan;

/** 표시되는 grid 트랙 수 (빈 목록 colSpan 등) */
export function deliveryUnitTableTrackCount(): DataTableColSpan {
  return DELIVERY_UNIT_TABLE_TRACK_COUNT;
}

/** colSpan 합 = 트랙 수 */
export function deliveryUnitTableLayout(options: {
  showCheckbox: boolean;
}): DeliveryUnitTableLayout {
  if (options.showCheckbox) {
    return {
      checkbox: 1,
      no: 1,
      ...SHARED_DATA_COLUMNS,
    };
  }

  return {
    checkbox: 1,
    no: 2,
    ...SHARED_DATA_COLUMNS,
  };
}

/** colSpan과 맞춘 grid-template-columns (inline style) */
export function deliveryUnitTableGridTemplate(options: {
  showCheckbox: boolean;
}): string {
  if (options.showCheckbox) {
    return TEMPLATE_WITH_CHECKBOX;
  }
  return TEMPLATE_NO_CHECKBOX;
}

export function deliveryUnitTableGridStyle(options: {
  showCheckbox: boolean;
}): Pick<CSSProperties, "gridTemplateColumns"> {
  return {
    gridTemplateColumns: deliveryUnitTableGridTemplate(options),
  };
}

/** @deprecated `deliveryUnitTableGridTemplate` + `gridTemplateColumns` style 사용 */
export function deliveryUnitTableGridClass(options: {
  showCheckbox: boolean;
}): string {
  void options;
  return "grid";
}
