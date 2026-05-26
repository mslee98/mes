import { useMemo, useState } from "react";
import type { ProductionPlanItem } from "../../api/purchaseOrder";
import Checkbox from "../form/input/Checkbox";
import Badge from "../ui/badge/Badge";

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
      <table className="min-w-full divide-y divide-gray-200 text-theme-sm dark:divide-white/10">
        <thead className="bg-gray-50/80 dark:bg-white/[0.03]">
          <tr className="text-left text-theme-xs text-gray-500 dark:text-gray-400">
            <th className="w-10 px-2 py-2 font-medium">
              <span className="sr-only">행 선택</span>
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
                label=""
              />
            </th>
            <th className="px-3 py-2 font-medium">발주 품목 ID</th>
            <th className="px-3 py-2 font-medium">품목명</th>
            <th className="px-3 py-2 font-medium">계획 수량</th>
            <th className="px-3 py-2 font-medium">제품 수</th>
            <th className="px-3 py-2 font-medium">일치</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
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
              <tr
                key={key || String(item.purchaseOrderItemId)}
                className="hover:bg-gray-50 dark:hover:bg-white/[0.03]"
              >
                <td className="px-2 py-2 align-middle">
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
                      label=""
                    />
                  ) : null}
                </td>
                <td className="px-3 py-2 font-mono text-theme-xs text-gray-800 dark:text-white/90">
                  {item.purchaseOrderItemId ?? "—"}
                </td>
                <td className="max-w-md px-3 py-2 text-gray-800 dark:text-white/90">
                  {label}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-800 dark:text-white/90">
                  {item.plannedQty ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-800 dark:text-white/90">
                  {unitCount}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {plannedNum == null ? (
                    <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                      —
                    </span>
                  ) : qtyMatch ? (
                    <Badge size="sm" color="success">
                      일치
                    </Badge>
                  ) : (
                    <Badge size="sm" color="warning">
                      불일치
                    </Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
