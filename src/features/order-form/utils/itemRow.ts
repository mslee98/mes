import { ORDER_LINE_WAVELENGTH_CODE } from "../../../domains/order/helpers/orderLineDetectorFields";
import { detectorFieldsFromOrderLine } from "../../../domains/order/helpers/orderLineItemRow";
import { normalizeCurrencyCode } from "../../../lib/format/formatCurrency";
import { formatLineUnitPriceDisplay, parseLineUnitPrice } from "../../../lib/format/priceInput";
import type { PurchaseOrderItem } from "../../../api/purchaseOrder";
import type { ItemRow } from "../types";

export function emptyItemRow(): ItemRow {
  return {
    lineId: undefined,
    productId: "",
    lensId: "",
    detectorId: "",
    detectorElementCode: "",
    wavelengthCode: ORDER_LINE_WAVELENGTH_CODE,
    unitCode: "",
    qty: 0,
    unitPrice: "",
    currencyCode: normalizeCurrencyCode(undefined),
    requestDeliveryDate: "",
    remark: "",
  };
}

export function isBlankProductRow(row: ItemRow): boolean {
  return (
    row.productId.trim() === "" &&
    row.unitCode.trim() === "" &&
    row.qty <= 0 &&
    row.unitPrice.trim() === "" &&
    row.remark.trim() === ""
  );
}

export function isPartialProductRow(row: ItemRow): boolean {
  if (isBlankProductRow(row)) return false;
  const price = parseLineUnitPrice(row.unitPrice);
  return (
    row.productId.trim() === "" ||
    row.detectorId.trim() === "" ||
    row.unitCode.trim() === "" ||
    row.qty <= 0 ||
    !Number.isFinite(price) ||
    price < 0
  );
}

export function serializeItemRows(rows: ItemRow[]): string {
  return JSON.stringify(
    rows.map((row) => ({
      lineId: row.lineId ?? null,
      productId: row.productId.trim(),
      lensId: row.lensId.trim(),
      detectorId: row.detectorId.trim(),
      unitCode: row.unitCode.trim(),
      qty: row.qty,
      unitPrice: row.unitPrice.trim(),
      currencyCode: row.currencyCode.trim(),
      requestDeliveryDate: row.requestDeliveryDate.trim(),
      remark: row.remark.trim(),
    }))
  );
}

export function itemRowsFromOrderLines(
  lines: PurchaseOrderItem[],
  orderCurrency: string | undefined,
  firstUnitValue: string
): ItemRow[] {
  if (lines.length === 0) {
    return [{ ...emptyItemRow(), unitCode: firstUnitValue }];
  }
  return lines.map((line) => ({
    lineId: Number(line.id ?? 0) || undefined,
    productId: line.productId ?? "",
    lensId: line.lensId?.trim() ?? "",
    ...detectorFieldsFromOrderLine(line),
    unitCode: String(line.unit ?? firstUnitValue ?? "").trim(),
    qty: Number(line.qty ?? 0),
    unitPrice: formatLineUnitPriceDisplay(line.unitPrice),
    currencyCode: normalizeCurrencyCode(line.currencyCode ?? orderCurrency),
    requestDeliveryDate: line.requestDeliveryDate ?? "",
    remark: line.remark ?? "",
  }));
}
