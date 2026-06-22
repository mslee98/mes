import { forwardRef, type CSSProperties, type MouseEventHandler, type ReactNode } from "react";
import Badge from "../../ui/badge/Badge";
import type { TableSortOrder } from "../../ui/table/SortableHeaderCell";
import { PencilIcon, TrashBinIcon } from "../../../icons";
import {
  DATA_TABLE_BODY_CELL_CLASS,
  DATA_TABLE_BODY_CELL_COMPACT_CLASS,
  DATA_TABLE_BODY_ROW_CLASS,
  DATA_TABLE_BODY_TEXT_CLASS,
  DATA_TABLE_COMPACT_BODY_TEXT_CLASS,
  DATA_TABLE_COL_SPAN_CLASS,
  DATA_TABLE_GRID_CLASS,
  DATA_TABLE_HEADER_CELL_CLASS,
  DATA_TABLE_HEADER_CELL_COMPACT_CLASS,
  DATA_TABLE_HEADER_LABEL_CLASS,
  DATA_TABLE_HEADER_ROW_CLASS,
  DATA_TABLE_SELECTED_ROW_CLASS,
  dataTableFlexAlignClass,
  dataTableHeaderInnerAlignClass,
  dataTableHeaderLabelAlignClass,
  dataTableTextAlignClass,
  type DataTableAlign,
  type DataTableColSpan,
} from "./dataTableStyles";
import { DataTableSortIndicator } from "./DataTableSortIndicator";

export type DataTableProps = {
  children: ReactNode;
  minWidth?: number | string;
  /** true면 카드/부모 너비 100% (컬럼은 fr로 균등 확장) */
  fillWidth?: boolean;
  /** false면 overflow-x-auto 래퍼 없이 렌더 (부모 스크롤 컨테이너 사용) */
  scrollContainer?: boolean;
  className?: string;
};

export function DataTable({
  children,
  minWidth = 1102,
  fillWidth = false,
  scrollContainer = true,
  className = "",
}: DataTableProps) {
  const minWidthStyle =
    typeof minWidth === "number" ? `${minWidth}px` : minWidth;

  const innerClass = fillWidth
    ? "w-full min-w-0"
    : "w-max max-w-full min-w-0";

  const innerStyle: CSSProperties | undefined =
    fillWidth && minWidth === 0
      ? undefined
      : { minWidth: minWidthStyle };

  const tableInner = (
    <div
      className={`${innerClass} ${scrollContainer ? "" : className}`.trim()}
      style={innerStyle}
    >
      {children}
    </div>
  );

  if (!scrollContainer) {
    return tableInner;
  }

  return (
    <div className={`overflow-x-auto ${className}`.trim()}>
      {tableInner}
    </div>
  );
}

export type DataTableHeaderProps = {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
  gridTemplateColumns?: string;
};

export function DataTableHeader({
  children,
  className = "",
  gridClassName = DATA_TABLE_GRID_CLASS,
  gridTemplateColumns,
}: DataTableHeaderProps) {
  const gridClass = gridTemplateColumns ? "grid" : gridClassName;
  const gridStyle: CSSProperties | undefined = gridTemplateColumns
    ? { gridTemplateColumns }
    : undefined;

  return (
    <div
      className={`${gridClass} ${DATA_TABLE_HEADER_ROW_CLASS} ${className}`.trim()}
      style={gridStyle}
    >
      {children}
    </div>
  );
}

export type DataTableHeaderCellProps = {
  children: ReactNode;
  colSpan?: DataTableColSpan;
  sortKey?: string;
  activeSortBy?: string;
  activeSortOrder?: TableSortOrder;
  onToggleSort?: (sortKey: string) => void;
  sortable?: boolean;
  compact?: boolean;
  /** 셀·헤더 라벨 가로 정렬 (기본 start) */
  align?: DataTableAlign;
  className?: string;
};

export function DataTableHeaderCell({
  children,
  colSpan = 1,
  sortKey,
  activeSortBy,
  activeSortOrder,
  onToggleSort,
  sortable = Boolean(sortKey && onToggleSort),
  compact = false,
  align = "start",
  className = "",
}: DataTableHeaderCellProps) {
  const cellClass = compact
    ? DATA_TABLE_HEADER_CELL_COMPACT_CLASS
    : DATA_TABLE_HEADER_CELL_CLASS;
  const isActive = sortKey != null && activeSortBy === sortKey;
  const ariaSort = isActive
    ? activeSortOrder === "desc"
      ? "descending"
      : "ascending"
    : "none";
  const alignClass = dataTableFlexAlignClass(align);
  const innerAlignClass = dataTableHeaderInnerAlignClass(align, sortable);

  const content = (
    <>
      {children}
      {sortable ? (
        <DataTableSortIndicator active={isActive} order={activeSortOrder} />
      ) : null}
    </>
  );

  return (
    <div
      className={`${DATA_TABLE_COL_SPAN_CLASS[colSpan]} ${cellClass} ${alignClass} ${className}`.trim()}
      aria-sort={sortable ? ariaSort : undefined}
    >
      {sortable && sortKey && onToggleSort ? (
        <button
          type="button"
          onClick={() => onToggleSort(sortKey)}
          className={`${innerAlignClass} cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-brand-400`}
        >
          {content}
        </button>
      ) : (
        <div className={innerAlignClass}>{content}</div>
      )}
    </div>
  );
}

export function DataTableHeaderLabel({
  children,
  className = "",
  title,
  align,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  align?: DataTableAlign;
}) {
  const alignClass = align ? dataTableHeaderLabelAlignClass(align) : "";
  return (
    <p
      title={title}
      className={`${DATA_TABLE_HEADER_LABEL_CLASS} ${alignClass} ${className}`.trim()}
    >
      {children}
    </p>
  );
}

export type DataTableBodyProps = {
  children: ReactNode;
  className?: string;
};

export function DataTableBody({ children, className = "" }: DataTableBodyProps) {
  return <div className={className}>{children}</div>;
}

export type DataTableRowProps = {
  children: ReactNode;
  selected?: boolean;
  className?: string;
  gridClassName?: string;
  gridTemplateColumns?: string;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
};

export const DataTableRow = forwardRef<HTMLDivElement, DataTableRowProps>(
  function DataTableRow(
    {
      children,
      selected = false,
      className = "",
      gridClassName = DATA_TABLE_GRID_CLASS,
      gridTemplateColumns,
      onMouseEnter,
      onMouseLeave,
    },
    ref
  ) {
    const gridClass = gridTemplateColumns ? "grid" : gridClassName;
    const gridStyle: CSSProperties | undefined = gridTemplateColumns
      ? { gridTemplateColumns }
      : undefined;

    return (
      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`${gridClass} ${DATA_TABLE_BODY_ROW_CLASS} ${
          selected ? DATA_TABLE_SELECTED_ROW_CLASS : ""
        } ${className}`.trim()}
        style={gridStyle}
      >
        {children}
      </div>
    );
  }
);
DataTableRow.displayName = "DataTableRow";

export type DataTableCellProps = {
  children: ReactNode;
  colSpan?: DataTableColSpan;
  compact?: boolean;
  /** flex 셀 가로 정렬 (기본 start) */
  align?: DataTableAlign;
  className?: string;
  textClassName?: string;
};

export function DataTableCell({
  children,
  colSpan = 1,
  compact = false,
  align = "start",
  className = "",
  textClassName,
}: DataTableCellProps) {
  const cellClass = compact
    ? DATA_TABLE_BODY_CELL_COMPACT_CLASS
    : DATA_TABLE_BODY_CELL_CLASS;
  const alignClass = dataTableFlexAlignClass(align);
  const defaultTextClassName = compact
    ? DATA_TABLE_COMPACT_BODY_TEXT_CLASS
    : DATA_TABLE_BODY_TEXT_CLASS;
  const resolvedTextClassName =
    typeof children === "string" || typeof children === "number"
      ? `${textClassName ?? defaultTextClassName} ${dataTableTextAlignClass(align)}`.trim()
      : (textClassName ?? defaultTextClassName);

  return (
    <div
      className={`${DATA_TABLE_COL_SPAN_CLASS[colSpan]} ${cellClass} ${alignClass} ${className}`.trim()}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <p className={resolvedTextClassName}>{children}</p>
      ) : (
        children
      )}
    </div>
  );
}

export type DataTableStatusTone = "success" | "warning" | "error";

const STATUS_TONE_TO_BADGE_COLOR: Record<
  DataTableStatusTone,
  "success" | "warning" | "error"
> = {
  success: "success",
  warning: "warning",
  error: "error",
};

export function DataTableStatusPill({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: DataTableStatusTone;
}) {
  return (
    <Badge color={STATUS_TONE_TO_BADGE_COLOR[tone]} size="sm">
      {children}
    </Badge>
  );
}

export type DataTableRowActionsProps = {
  onDelete?: () => void;
  onEdit?: () => void;
  deleteLabel?: string;
  editLabel?: string;
  className?: string;
};

export function DataTableRowActions({
  onDelete,
  onEdit,
  deleteLabel = "삭제",
  editLabel = "수정",
  className = "",
}: DataTableRowActionsProps) {
  return (
    <div className={`flex w-full items-center gap-2 ${className}`.trim()}>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-500"
          aria-label={deleteLabel}
        >
          <TrashBinIcon className="size-[21px]" aria-hidden />
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
          aria-label={editLabel}
        >
          <PencilIcon className="size-[21px]" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
