import type { PurchaseOrderItem } from "../../../api/purchaseOrder";

export type ProductionPlanItemInput = {
  purchaseOrderItemId: number;
  plannedQty: number;
};

const QTY_EPS = 1e-9;

/**
 * 이번 생산 수량을 발주 라인 잔여 수량 기준으로 분배합니다.
 */
export function distributeProductionPlanItems(
  orderLines: PurchaseOrderItem[],
  qtyRequested: number,
  registeredQtyByOrderItemId: Map<number, number>
): { items: ProductionPlanItemInput[]; error?: string } {
  const items: ProductionPlanItemInput[] = [];
  let remainingToAssign = qtyRequested;

  for (const line of orderLines) {
    if (remainingToAssign <= QTY_EPS) break;
    const prev = registeredQtyByOrderItemId.get(line.id) ?? 0;
    const lineRemaining = Math.max(0, Number(line.qty) - prev);
    const assignQty = Math.min(
      Math.max(0, Math.floor(lineRemaining)),
      Math.floor(remainingToAssign)
    );
    if (assignQty > 0) {
      items.push({
        purchaseOrderItemId: line.id,
        plannedQty: assignQty,
      });
    }
    remainingToAssign -= assignQty;
  }

  if (remainingToAssign > QTY_EPS) {
    const totalRemaining = orderLines.reduce((sum, line) => {
      const prev = registeredQtyByOrderItemId.get(line.id) ?? 0;
      return sum + Math.max(0, Number(line.qty) - prev);
    }, 0);
    return {
      items: [],
      error: `잔여 수량(${totalRemaining})을 초과했습니다.`,
    };
  }

  if (items.length === 0) {
    return { items: [], error: "이번 생산 수량을 1건 이상 입력하세요." };
  }

  return { items };
}
