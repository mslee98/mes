import { normalizeCurrencyCode } from "../../../lib/formatCurrency";
import { parseLineUnitPrice } from "../../../lib/priceInput";
import type { ItemRow } from "../types";

/** 헤더 통화 기준 라인 공급가액 (백엔드 `supplyAmount`) */
export function computeHeaderSupplyAmount(
  rows: ItemRow[],
  headerCurrency: string
): number {
  const cc = normalizeCurrencyCode(headerCurrency);
  let subtotal = 0;
  for (const row of rows) {
    const rcc = normalizeCurrencyCode(row.currencyCode);
    if (rcc !== cc) continue;
    if (row.qty <= 0) continue;
    subtotal += row.qty * parseLineUnitPrice(row.unitPrice);
  }
  return subtotal;
}
