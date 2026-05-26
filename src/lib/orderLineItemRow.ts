import type { PurchaseOrderItem } from "../api/purchaseOrder";
import type { ItemRow } from "../features/order-form/types";
import { ORDER_LINE_WAVELENGTH_CODE } from "./orderLineDetectorFields";

export function detectorIdFromOrderLine(line: PurchaseOrderItem): string {
  const id = line.detectorId;
  if (id == null || !Number.isFinite(Number(id)) || Number(id) <= 0) {
    return "";
  }
  return String(id);
}

export function detectorFieldsFromOrderLine(
  line: PurchaseOrderItem
): Pick<ItemRow, "detectorId" | "detectorElementCode" | "wavelengthCode"> {
  return {
    detectorId: detectorIdFromOrderLine(line),
    detectorElementCode: String(line.detectorElementCode ?? "").trim(),
    wavelengthCode: ORDER_LINE_WAVELENGTH_CODE,
  };
}

export function detectorLabelFromOrderLine(
  line: PurchaseOrderItem,
  labelById?: Map<string, string>
): string {
  const id = detectorIdFromOrderLine(line);
  if (!id) return "미지정";
  const fromSelect = labelById?.get(id);
  if (fromSelect) return fromSelect;
  const type =
    line.detector?.detectorType?.trim() ||
    line.detectorTypeSnapshot?.trim() ||
    "";
  const series =
    line.detector?.detectorSeries?.seriesCode?.trim() ||
    line.detector?.detectorSeries?.name?.trim() ||
    "";
  if (type && series) return `${type} (${series})`;
  if (type) return type;
  return `검출기 #${id}`;
}
