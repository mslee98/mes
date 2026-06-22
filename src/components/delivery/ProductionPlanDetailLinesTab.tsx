import { useMemo, useState } from "react";
import type { ProductionPlanItem } from "../../api/purchaseOrder";
import Checkbox from "../form/input/Checkbox";
import Badge from "../ui/badge/Badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
} from "../list";

type ProductionPlanDetailLinesTabProps = {
  items: ProductionPlanItem[];
};

function lineRowKey(item: ProductionPlanItem): string {
  return String(item.id ?? item.purchaseOrderItemId ?? "");
}

export function ProductionPlanDetailLinesTab({
  items,
}: ProductionPlanDetailLinesTabProps) {
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());

  const keys = useMemo(
    () => items.map((item) => lineRowKey(item)).filter((k) => k !== ""),
    [items]
  );

  const allSelected = keys.length > 0 && keys.every((k) => selectedIds.has(k));
  const someSelected = keys.some((k) => selectedIds.has(k));

  if (!items.length) {
    return (
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        생산 계획 품목이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/10">
      <DataTable minWidth={640}>
        <DataTableHeader>
          <DataTableHeaderCell colSpan={1} compact sortable={false} align="center">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              disabled={items.length === 0}
              onChange={(checked) => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (checked) {
                    keys.forEach((k) => next.add(k));
                  } else {
                    keys.forEach((k) => next.delete(k));
                  }
                  return next;
                });
              }}
              aria-label="전체 선택"
            />
          </DataTableHeaderCell>
          <DataTableHeaderCell colSpan={2} compact sortable={false}>
            <DataTableHeaderLabel>발주 품목 ID</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell colSpan={3} compact sortable={false}>
            <DataTableHeaderLabel>품목명</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell colSpan={2} compact sortable={false} align="center">
            <DataTableHeaderLabel align="center">계획 수량</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell colSpan={2} compact sortable={false} align="center">
            <DataTableHeaderLabel align="center">제품 수</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell colSpan={2} compact sortable={false} align="center" className="border-r-0">
            <DataTableHeaderLabel align="center">일치</DataTableHeaderLabel>
          </DataTableHeaderCell>
        </DataTableHeader>
        <DataTableBody>
          {items.map((item) => {
            const label =
              item.productNameSnapshot?.trim() ||
              item.businessNameSnapshot?.trim() ||
              `품목 #${item.purchaseOrderItemId ?? "?"}`;
            const unitCount = item.units?.length ?? 0;
            const planned = item.plannedQty;
            const key = lineRowKey(item);
            const plannedNum =
              typeof planned === "number" && Number.isFinite(planned)
                ? planned
                : null;
            const qtyMatch =
              plannedNum != null && unitCount === plannedNum;

            return (
              <DataTableRow
                key={key || String(item.purchaseOrderItemId)}
                selected={key ? selectedIds.has(key) : false}
              >
                <DataTableCell colSpan={1} compact align="center">
                  {key ? (
                    <Checkbox
                      checked={selectedIds.has(key)}
                      onChange={(checked) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(key);
                          else next.delete(key);
                          return next;
                        });
                      }}
                      aria-label={`${label} 선택`}
                    />
                  ) : null}
                </DataTableCell>
                <DataTableCell colSpan={2} compact className="font-mono text-theme-xs">
                  {item.purchaseOrderItemId ?? "—"}
                </DataTableCell>
                <DataTableCell colSpan={3} compact className="min-w-0 items-start">
                  {label}
                </DataTableCell>
                <DataTableCell colSpan={2} compact align="center" className="whitespace-nowrap">
                  {item.plannedQty ?? "—"}
                </DataTableCell>
                <DataTableCell colSpan={2} compact align="center" className="whitespace-nowrap">
                  {unitCount}
                </DataTableCell>
                <DataTableCell colSpan={2} compact align="center" className="border-r-0">
                  {plannedNum == null ? (
                    <span className="text-theme-xs text-gray-400 dark:text-gray-500">—</span>
                  ) : qtyMatch ? (
                    <Badge size="sm" color="success">
                      일치
                    </Badge>
                  ) : (
                    <Badge size="sm" color="warning">
                      불일치
                    </Badge>
                  )}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
