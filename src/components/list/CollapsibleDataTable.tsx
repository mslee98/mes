import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

export type CollapsibleDataTableProps<T> = {
  items: T[];
  getRowId: (item: T) => string;
  expandedIds: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  header: ReactNode;
  renderRow: (item: T, ctx: { index: number; expanded: boolean }) => ReactNode;
  renderExpanded?: (item: T) => ReactNode;
  emptyMessage?: string;
  colSpan: number;
  tableClassName?: string;
};

/**
 * Flowbite 아코디언 테이블 패턴 — 헤더 행 + (펼침 시) colspan 서브영역.
 * 행 클릭으로 펼침 토글. 체크박스 등은 `renderRow` 내부에서 `stopPropagation` 처리.
 */
export function CollapsibleDataTable<T>({
  items,
  getRowId,
  expandedIds,
  onToggleExpand,
  header,
  renderRow,
  renderExpanded,
  emptyMessage = "조건에 맞는 항목이 없습니다.",
  colSpan,
  tableClassName = "min-w-[960px]",
}: CollapsibleDataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <Table className={tableClassName}>
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          {header}
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="px-3 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, index) => {
              const id = getRowId(item);
              const expanded = expandedIds.has(id);
              return (
                <CollapsibleDataTableItemRows
                  key={id}
                  expanded={expanded}
                  onToggle={() => onToggleExpand(id)}
                  headerRow={renderRow(item, { index, expanded })}
                  expandedContent={
                    expanded && renderExpanded
                      ? renderExpanded(item)
                      : null
                  }
                  colSpan={colSpan}
                />
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type CollapsibleDataTableItemRowsProps = {
  expanded: boolean;
  onToggle: () => void;
  headerRow: ReactNode;
  expandedContent: ReactNode;
  colSpan: number;
};

function CollapsibleDataTableItemRows({
  expanded,
  onToggle,
  headerRow,
  expandedContent,
  colSpan,
}: CollapsibleDataTableItemRowsProps) {
  return (
    <>
      <TableRow
        className="cursor-pointer bg-white transition-colors hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/[0.03]"
        onClick={onToggle}
      >
        {headerRow}
      </TableRow>
      {expanded && expandedContent ? (
        <TableRow className="bg-gray-50/50 dark:bg-white/[0.02]">
          <TableCell colSpan={colSpan} className="p-0">
            {expandedContent}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
