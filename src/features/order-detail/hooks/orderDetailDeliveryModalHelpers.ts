import {
  LEGACY_USER_PREFIX,
} from "../../../lib/legacySelectValue";
import { compactYmd } from "../../../lib/format/dateFormat";
import type { PurchaseOrderItem } from "../../../api/purchaseOrder";

export type DeliverySerialPreviewRow = {
  key: string;
  orderItemId: number;
  lineLabel: string;
  serialNo: string;
  sequenceKey: string;
  detectorElementCode: string;
  wavelengthCode: string;
  detectorId: number;
  serialSnapshot?: Record<string, unknown>;
};

export const SERIAL_PREVIEW_DEBOUNCE_MS = 280;
export const LOT_PREVIEW_DEBOUNCE_MS = 280;

export function deliveryManagerUserIdFromSelect(
  selectValue: string
): number | null {
  const t = selectValue.trim();
  if (!t || t.startsWith(LEGACY_USER_PREFIX)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseThisProductionQtyInput(raw: string): number {
  const trimmed = raw.trim();
  const n = Number(trimmed);
  if (!trimmed || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return 0;
  }
  return n;
}

export function firstLineProductWithBusiness(
  line: PurchaseOrderItem | undefined
): string {
  if (!line) return "-";
  const baseLabel =
    line.itemName?.trim() ||
    line.productNameSnapshot?.trim() ||
    line.definitionNameSnapshot?.trim() ||
    (line.productId != null && String(line.productId).trim() !== ""
      ? `제품 #${line.productId}`
      : `라인 #${line.id}`);
  const lineCode =
    line.businessName?.trim() ||
    line.businessNameSnapshot?.trim() ||
    line.versionSnapshot?.trim() ||
    "";
  if (
    !lineCode ||
    baseLabel.includes(`(${lineCode})`) ||
    baseLabel.startsWith("제품 #") ||
    baseLabel.startsWith("라인 #")
  ) {
    return baseLabel;
  }
  return `${baseLabel} (${lineCode})`;
}

export function buildProductionPlanAutoTitle(opts: {
  plannedDeliveryDate: string;
  deliveryDate: string;
  lines: PurchaseOrderItem[];
  nextPlanSeq: number;
}): string {
  const plannedOrDelivery =
    opts.plannedDeliveryDate.trim() || opts.deliveryDate.trim();
  const compact =
    compactYmd(plannedOrDelivery) ||
    compactYmd(new Date().toISOString()) ||
    "";
  const productSeg = firstLineProductWithBusiness(opts.lines[0]);
  const totalQty = opts.lines.reduce(
    (s, l) => s + (Number(l.qty) || 0),
    0
  );
  return `${compact}-${productSeg}-${totalQty} ${opts.nextPlanSeq}차 생산계획`;
}
