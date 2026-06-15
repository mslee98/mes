import assert from "node:assert/strict";
import type { PurchaseOrderItem } from "../../../api/purchaseOrder";
import {
  buildProductionPlanItemsFromSelection,
  createInitialPlanLineDrafts,
  MSG_EXCEED_UNPLANNED,
  MSG_PLANNED_DATE_BEFORE_DELIVERY,
  MSG_SELECT_LINE_QTY,
  parsePlanLineQtyInput,
  unplannedQtyForLine,
  validateProductionPlanLineSelection,
} from "./lineSelection";

function line(id: number, qty: number): PurchaseOrderItem {
  return { id, qty, productId: String(id) } as PurchaseOrderItem;
}

function runTests() {
  assert.equal(parsePlanLineQtyInput("2"), 2);
  assert.equal(parsePlanLineQtyInput("0"), null);
  assert.equal(parsePlanLineQtyInput("1.5"), null);

  const registered = new Map<number, number>([[1, 2]]);
  assert.equal(unplannedQtyForLine(line(1, 5), registered), 3);

  const drafts = [
    { orderItemId: 1, selected: true, qtyInput: "2" },
    { orderItemId: 2, selected: true, qtyInput: "1" },
  ];
  const items = buildProductionPlanItemsFromSelection(drafts);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { purchaseOrderItemId: 1, plannedQty: 2 });

  const failNone = validateProductionPlanLineSelection({
    drafts: createInitialPlanLineDrafts([line(1, 5)]),
    orderLines: [line(1, 5)],
    registeredQtyByOrderItemId: new Map(),
    deliveryDate: "2026-06-10",
    plannedDeliveryDate: "2026-06-10",
  });
  assert.equal(failNone.ok, false);
  if (!failNone.ok) assert.equal(failNone.message, MSG_SELECT_LINE_QTY);

  const failOver = validateProductionPlanLineSelection({
    drafts: [{ orderItemId: 1, selected: true, qtyInput: "99" }],
    orderLines: [line(1, 5)],
    registeredQtyByOrderItemId: new Map(),
    deliveryDate: "2026-06-10",
    plannedDeliveryDate: "2026-06-15",
  });
  assert.equal(failOver.ok, false);
  if (!failOver.ok) assert.equal(failOver.message, MSG_EXCEED_UNPLANNED);

  const failDate = validateProductionPlanLineSelection({
    drafts: [{ orderItemId: 1, selected: true, qtyInput: "1" }],
    orderLines: [line(1, 5)],
    registeredQtyByOrderItemId: new Map(),
    deliveryDate: "2026-06-10",
    plannedDeliveryDate: "2026-06-09",
  });
  assert.equal(failDate.ok, false);
  if (!failDate.ok) assert.equal(failDate.message, MSG_PLANNED_DATE_BEFORE_DELIVERY);

  const okSameDay = validateProductionPlanLineSelection({
    drafts: [{ orderItemId: 1, selected: true, qtyInput: "1" }],
    orderLines: [line(1, 5)],
    registeredQtyByOrderItemId: new Map(),
    deliveryDate: "2026-06-10",
    plannedDeliveryDate: "2026-06-10",
  });
  assert.equal(okSameDay.ok, true);

  const ok = validateProductionPlanLineSelection({
    drafts: [
      { orderItemId: 1, selected: true, qtyInput: "2" },
      { orderItemId: 2, selected: true, qtyInput: "1" },
    ],
    orderLines: [line(1, 5), line(2, 3)],
    registeredQtyByOrderItemId: new Map([[1, 2]]),
    deliveryDate: "2026-06-01",
    plannedDeliveryDate: "2026-06-20",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.items.length, 2);
    assert.equal(ok.items[0].plannedQty, 2);
  }
}

runTests();
