import { ORDER_LINE_WAVELENGTH_CODE } from "../../../lib/orderLineDetectorFields";
import { normalizeCurrencyCode } from "../../../lib/formatCurrency";
import { parseLineUnitPrice } from "../../../lib/priceInput";
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
