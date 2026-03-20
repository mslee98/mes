import { formatCurrency } from "./formatCurrency";
import type { PurchaseOrderItem } from "../api/purchaseOrder";

/** 제품 공급가액 기준 부가세율 (표시·안내용) */
export const ORDER_LINE_VAT_RATE = 0.1;

export type LineAmountSummary = {
  currencyCode: string;
  subtotal: number;
  vat: number;
  total: number;
};

/** 저장된 발주 라인 기준, 통화별 공급가·부가세·합계 */
export function lineItemsToAmountSummaries(
  lines: PurchaseOrderItem[],
  headerFallbackCurrency: string
): LineAmountSummary[] {
  const fc = headerFallbackCurrency.trim().toUpperCase() || "KRW";
  const map = new Map<string, number>();
  for (const line of lines) {
    const cc =
      String(line.currencyCode ?? fc).trim().toUpperCase() || "KRW";
    const up = Number(line.unitPrice ?? 0);
    const qty = Number(line.qty ?? 0);
    if (!Number.isFinite(up) || !Number.isFinite(qty) || qty <= 0) continue;
    map.set(cc, (map.get(cc) ?? 0) + qty * up);
  }
  return Array.from(map.entries())
    .map(([currencyCode, subtotal]) => {
      const vat = Math.round(subtotal * ORDER_LINE_VAT_RATE * 100) / 100;
      return {
        currencyCode,
        subtotal,
        vat,
        total: Math.round((subtotal + vat) * 100) / 100,
      };
    })
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}

export function OrderLineAmountSummary({
  summaries,
}: {
  summaries: LineAmountSummary[];
}) {
  if (summaries.length === 0) return null;
  return (
    <div className="mt-6 space-y-5 border-t border-gray-100 px-1 pt-5 dark:border-white/5 sm:px-2">
      {summaries.map((s) => (
        <div
          key={s.currencyCode}
          className="ml-auto max-w-md space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <dl className="space-y-2 text-end">
            <div className="flex justify-between gap-8 text-theme-sm">
              <dt className="text-gray-600 dark:text-gray-400">제품 합계</dt>
              <dd className="font-medium tabular-nums text-gray-800 dark:text-white/90">
                {formatCurrency(s.subtotal, s.currencyCode)}
              </dd>
            </div>
            <div className="flex justify-between gap-8 text-theme-sm">
              <dt className="text-gray-600 dark:text-gray-400">부가세 (10%)</dt>
              <dd className="tabular-nums text-gray-800 dark:text-white/90">
                {formatCurrency(s.vat, s.currencyCode)}
              </dd>
            </div>
            <div className="flex justify-between gap-8 border-t border-gray-200 pt-2 text-sm font-semibold text-gray-900 dark:border-gray-600 dark:text-white">
              <dt>합계</dt>
              <dd className="tabular-nums">
                {formatCurrency(s.total, s.currencyCode)}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
