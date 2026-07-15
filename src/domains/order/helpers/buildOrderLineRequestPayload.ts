import type { PurchaseOrderLineRequestPayload } from "../../../api/purchaseOrder";
import type { RepresentativeProduct } from "../../../api/products";
import { normalizeCurrencyCode } from "../../../lib/format/formatCurrency";
import { parseLineUnitPrice } from "../../../lib/format/priceInput";
import type { ItemRow } from "../../../features/order-form/types";
import { resolveOrderLineDetectorPayload } from "./orderLineDetectorFields";

export type BuildOrderLineRequestParams = {
  row: ItemRow;
  product?: RepresentativeProduct;
  unitPrice?: number;
};

/**
 * 발주 제품 라인 create/update 요청 본문.
 * `quantity` / `quantityUnitCode`만 사용 (`qty` / `unit` 미전송).
 */
export function buildOrderLineRequestPayload({
  row,
  product,
  unitPrice: unitPriceOverride,
}: BuildOrderLineRequestParams): PurchaseOrderLineRequestPayload {
  const detector = resolveOrderLineDetectorPayload(row, product);
  if (!detector) {
    throw new Error("검출기·소자·파장 정보를 확인하세요.");
  }
  const unitPrice =
    unitPriceOverride ?? parseLineUnitPrice(row.unitPrice);
  const quantityUnitCode = row.unitCode.trim() || null;

  return {
    productId: row.productId.trim(),
    lensId: row.lensId.trim() ? row.lensId.trim() : null,
    ...detector,
    quantity: row.qty,
    unitPrice,
    ...(quantityUnitCode ? { quantityUnitCode } : {}),
    currencyCode: normalizeCurrencyCode(row.currencyCode),
    remark: row.remark.trim() || null,
  };
}
