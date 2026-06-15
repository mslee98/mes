import type { ReactNode } from "react";
import type { PurchaseOrderItem } from "../../api/purchaseOrder";
import { formatDateYmd } from "../../lib/format/dateFormat";
import {
  formatOrderLineCountLabel,
  formatOrderLinesTotalQtyLabel,
} from "../../domains/order/display/orderLineDisplay";
import { ProductionPlanOrderLinesPreview } from "./ProductionPlanOrderLinesPreview";

export type ProductionPlanOrderReferenceProps = {
  orderNo: string;
  partnerLabel: ReactNode;
  orderLines: PurchaseOrderItem[];
  dueDate?: string | null;
  requesterName?: string | null;
};

/**
 * 생산 계획·실제 생산 모달 상단 — 발주 요약(컴팩트) + 제품 라인.
 */
export function ProductionPlanOrderReference({
  orderNo,
  partnerLabel,
  orderLines,
  dueDate,
  requesterName,
}: ProductionPlanOrderReferenceProps) {
  const requester = requesterName?.trim();
  const dueLabel = dueDate?.trim()
    ? formatDateYmd(dueDate, { emptyFallback: "" })
    : "";
  const lineCountLabel = formatOrderLineCountLabel(orderLines.length);
  const totalQtyLabel = formatOrderLinesTotalQtyLabel(orderLines);
  const hasLines = orderLines.length > 0;

  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-white/[0.03]"
      role="region"
      aria-label="발주 요약"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-theme-xs">
          <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">
            발주 요약
          </span>
          <span
            className="shrink-0 font-semibold text-gray-900 dark:text-white"
            title={orderNo.trim() || undefined}
          >
            {orderNo.trim() || "—"}
          </span>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden>
            ·
          </span>
          <span className="inline-flex min-w-0 max-w-full truncate text-gray-600 dark:text-gray-300">
            {partnerLabel}
          </span>
          {requester ? (
            <>
              <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                ·
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                담당 {requester}
              </span>
            </>
          ) : null}
          {dueLabel ? (
            <>
              <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                ·
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                납기 {dueLabel}
              </span>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200/80 dark:bg-gray-900/60 dark:text-gray-300 dark:ring-gray-600">
            {lineCountLabel}
          </span>
          <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-gray-600 ring-1 ring-gray-200/80 dark:bg-gray-900/60 dark:text-gray-300 dark:ring-gray-600">
            합계 {totalQtyLabel}
          </span>
        </div>
      </div>

      {hasLines ? (
        <div className="border-t border-gray-200/80 dark:border-gray-700/80">
          <ProductionPlanOrderLinesPreview orderLines={orderLines} />
        </div>
      ) : null}
    </div>
  );
}
