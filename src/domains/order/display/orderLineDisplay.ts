import type { PurchaseOrderItem } from "../../../api/purchaseOrder";

/** 발주 라인 표시명 — OrderDetailLinesCard·생산 계획 모달 공통 */
export function getOrderLineDisplayName(item: PurchaseOrderItem): string {
  const baseName =
    item.itemName?.trim() ||
    item.productNameSnapshot?.trim() ||
    item.definitionNameSnapshot?.trim() ||
    (item.productId != null && String(item.productId).trim() !== ""
      ? `제품 #${item.productId}`
      : "-");

  const lineCode =
    item.businessName?.trim() ||
    item.businessNameSnapshot?.trim() ||
    item.versionSnapshot?.trim() ||
    "";
  if (!lineCode || baseName === "-" || baseName.includes(`(${lineCode})`)) {
    return baseName;
  }
  return `${baseName} (${lineCode})`;
}

export function getOrderLineLensDisplayName(item: PurchaseOrderItem): string {
  const lensName =
    item.lens?.lensName?.trim() || item.lensNameSnapshot?.trim() || "";
  if (lensName) return lensName;
  if (item.lensId?.trim()) return `렌즈 #${item.lensId}`;
  return "—";
}

function formatQtyNumber(raw: unknown): string {
  if (!Number.isFinite(Number(raw))) return "—";
  const n = Number(raw);
  return n % 1 === 0 ? String(Math.trunc(n)) : String(n);
}

/** 라인 단위 수량 라벨 (예: `5 EA`) */
export function formatOrderLineQtyLabel(
  line: PurchaseOrderItem | undefined
): string {
  if (!line) return "—";
  return `${formatQtyNumber(line.qty)} ${line.unit?.trim() || "EA"}`;
}

/** 발주 전체 수량 합 라벨 */
export function formatOrderLinesTotalQtyLabel(
  lines: PurchaseOrderItem[]
): string {
  const total = lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
  const unit = lines[0]?.unit?.trim() || "EA";
  return `${formatQtyNumber(total)} ${unit}`;
}

/** 발주 라인 건수 — 다중 발주 오해 없이 `품목 N종` */
export function formatOrderLineCountLabel(lineCount: number): string {
  if (lineCount <= 0) return "품목 없음";
  if (lineCount === 1) return "품목 1종";
  return `품목 ${lineCount}종`;
}
