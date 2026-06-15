import type { PurchaseOrderItem } from "../../../api/purchaseOrder";
import { isYmdOnOrAfter } from "../../../lib/format/dateFormat";
import type { ProductionPlanItemInput } from "./distributeItems";

export type PlanLineDraft = {
  orderItemId: number;
  selected: boolean;
  qtyInput: string;
};

export type ProductionPlanLineSelectionValidationResult =
  | { ok: true; items: ProductionPlanItemInput[] }
  | { ok: false; message: string };

export const MSG_SELECT_LINE_QTY = "선택한 품목의 생산 수량을 입력해주세요.";
export const MSG_EXCEED_UNPLANNED = "미계획 수량을 초과할 수 없습니다.";
export const MSG_PLANNED_DATE_BEFORE_DELIVERY =
  "완료예정일은 IDCCA 인수일 이후 날짜로 선택해주세요.";

export function unplannedQtyForLine(
  line: PurchaseOrderItem,
  registeredQtyByOrderItemId: Map<number, number>
): number {
  const orderQty = Math.max(0, Math.floor(Number(line.qty) || 0));
  const registered = registeredQtyByOrderItemId.get(line.id) ?? 0;
  return Math.max(0, orderQty - registered);
}

export function parsePlanLineQtyInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

export function createInitialPlanLineDrafts(
  orderLines: PurchaseOrderItem[]
): PlanLineDraft[] {
  return orderLines.map((line) => ({
    orderItemId: line.id,
    selected: false,
    qtyInput: "",
  }));
}

export function buildProductionPlanItemsFromSelection(
  drafts: PlanLineDraft[]
): ProductionPlanItemInput[] {
  const items: ProductionPlanItemInput[] = [];
  for (const draft of drafts) {
    if (!draft.selected) continue;
    const qty = parsePlanLineQtyInput(draft.qtyInput);
    if (qty == null) continue;
    items.push({ purchaseOrderItemId: draft.orderItemId, plannedQty: qty });
  }
  return items;
}

export function totalPlannedQtyFromItems(items: ProductionPlanItemInput[]): number {
  return items.reduce((sum, item) => sum + item.plannedQty, 0);
}

export function validateProductionPlanLineQtyOnly(params: {
  drafts: PlanLineDraft[];
  orderLines: PurchaseOrderItem[];
  registeredQtyByOrderItemId: Map<number, number>;
}): ProductionPlanLineSelectionValidationResult {
  const { drafts, orderLines, registeredQtyByOrderItemId } = params;
  const items = buildProductionPlanItemsFromSelection(drafts);
  if (items.length === 0) {
    return { ok: false, message: MSG_SELECT_LINE_QTY };
  }
  for (const item of items) {
    const line = orderLines.find((l) => l.id === item.purchaseOrderItemId);
    if (!line) continue;
    const unplanned = unplannedQtyForLine(line, registeredQtyByOrderItemId);
    if (item.plannedQty > unplanned) {
      return { ok: false, message: MSG_EXCEED_UNPLANNED };
    }
  }
  return { ok: true, items };
}

export function validateProductionPlanLineSelection(params: {
  drafts: PlanLineDraft[];
  orderLines: PurchaseOrderItem[];
  registeredQtyByOrderItemId: Map<number, number>;
  deliveryDate: string;
  plannedDeliveryDate: string;
}): ProductionPlanLineSelectionValidationResult {
  const qtyOnly = validateProductionPlanLineQtyOnly(params);
  if (!qtyOnly.ok) return qtyOnly;
  if (
    params.plannedDeliveryDate.trim() &&
    params.deliveryDate.trim() &&
    !isYmdOnOrAfter(params.plannedDeliveryDate.trim(), params.deliveryDate.trim())
  ) {
    return { ok: false, message: MSG_PLANNED_DATE_BEFORE_DELIVERY };
  }
  return qtyOnly;
}
