export const DATA_TABLE_GRID_CLASS = "grid grid-cols-12";

export const DATA_TABLE_HEADER_ROW_CLASS =
  "border-t border-gray-200 dark:border-gray-800";

export const DATA_TABLE_BODY_ROW_CLASS =
  "border-t border-gray-100 dark:border-gray-800";

export const DATA_TABLE_HEADER_CELL_CLASS =
  "flex min-w-0 items-center border-r border-gray-200 px-4 py-3 dark:border-gray-800";

export const DATA_TABLE_HEADER_CELL_COMPACT_CLASS =
  "flex min-w-0 items-center border-r border-gray-200 px-2 py-1.5 dark:border-gray-800";

export const DATA_TABLE_BODY_CELL_CLASS =
  "flex min-w-0 items-center border-r border-gray-100 px-4 py-3 dark:border-gray-800";

export const DATA_TABLE_BODY_CELL_COMPACT_CLASS =
  "flex min-w-0 items-center border-r border-gray-100 px-2 py-1.5 dark:border-gray-800";

export const DATA_TABLE_HEADER_LABEL_CLASS =
  "text-theme-xs font-medium text-gray-700 dark:text-gray-400";

export const DATA_TABLE_BODY_TEXT_CLASS =
  "text-theme-sm text-gray-700 dark:text-gray-400";

/** compact DataTable 본문 — 발주·생산·납품 목록 공통 */
export const DATA_TABLE_COMPACT_BODY_TEXT_CLASS =
  "text-theme-xs text-gray-700 dark:text-gray-300";

export const DATA_TABLE_COMPACT_LABEL_CLASS =
  "shrink-0 text-theme-xs font-medium text-gray-500 dark:text-gray-400";

export const DATA_TABLE_COMPACT_PRIMARY_TEXT_CLASS =
  "text-theme-xs font-semibold text-gray-900 dark:text-white";

export const DATA_TABLE_COMPACT_MUTED_TEXT_CLASS =
  "text-theme-xs text-gray-500 dark:text-gray-400";

export const DATA_TABLE_COMPACT_STACK_CLASS =
  "flex flex-col gap-0.5 leading-tight";

export const DATA_TABLE_COMPACT_STACK_ROW_CLASS =
  "flex min-w-0 items-baseline gap-1";

/** DataTable 내 Link 공통 — brand 파란색 */
export const DATA_TABLE_LINK_CLASS =
  "font-medium text-brand-600 hover:underline dark:text-brand-400";

export const DATA_TABLE_COMPACT_LINK_CLASS =
  "text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400";

export const DATA_TABLE_PRIMARY_TEXT_CLASS =
  "text-theme-sm block font-medium text-gray-800 dark:text-white/90";

export const DATA_TABLE_SECONDARY_TEXT_CLASS =
  "text-theme-sm text-gray-500 dark:text-gray-400";

export const DATA_TABLE_SELECTED_ROW_CLASS =
  "bg-gray-50 dark:bg-gray-900";

export const DATA_TABLE_COL_SPAN_CLASS = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
  13: "col-span-[13]",
  14: "col-span-[14]",
} as const;

export type DataTableColSpan = keyof typeof DATA_TABLE_COL_SPAN_CLASS;

/** flex 셀(헤더·본문) 가로 정렬 */
export type DataTableAlign = "start" | "center" | "end";

export function dataTableFlexAlignClass(
  align: DataTableAlign = "start"
): string {
  if (align === "center") return "justify-center";
  if (align === "end") return "justify-end";
  return "";
}

export function dataTableTextAlignClass(
  align: DataTableAlign = "start"
): string {
  if (align === "center") return "text-center";
  if (align === "end") return "text-end";
  return "";
}

export function dataTableHeaderLabelAlignClass(
  align: DataTableAlign = "start"
): string {
  if (align === "center") return "w-full text-center";
  if (align === "end") return "w-full text-end";
  return "";
}

export function dataTableHeaderInnerAlignClass(
  align: DataTableAlign,
  sortable: boolean
): string {
  if (sortable) return "flex w-full items-center justify-between";
  if (align === "center") return "flex w-full items-center justify-center";
  if (align === "end") return "flex w-full items-center justify-end";
  return "flex w-full items-center";
}
