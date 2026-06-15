import type { PurchaseOrderItem } from "../../../api/purchaseOrder";
import { detectorIdFromOrderLine } from "../../../domains/order/helpers/orderLineItemRow";

export function resolveOrderLineDetectorId(
  line: PurchaseOrderItem
): number | null {
  const id = Number(detectorIdFromOrderLine(line));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function resolveOrderLineWavelengthCode(line: PurchaseOrderItem): string {
  const code = String(line.wavelengthCode ?? "").trim().toUpperCase();
  return code || "M";
}

/** 발주 라인·사업명 기준 소자 1자리 코드 */
export function resolveOrderLineDetectorElementInitial(
  line: PurchaseOrderItem
): string {
  const fromLine = String(line.detectorElementCode ?? "").trim().toUpperCase();
  if (fromLine) return fromLine.slice(0, 1);
  const biz =
    line.businessName?.trim() ||
    line.businessNameSnapshot?.trim() ||
    "";
  const core = biz.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() ?? biz;
  const token = core.split("_").filter(Boolean).pop() ?? "";
  return token ? token.slice(0, 1) : "";
}
