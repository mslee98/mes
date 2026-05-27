import type {
  Delivery,
  DeliveryCreatePayload,
  DeliveryCreateLineSerialPayload,
  ProductionPlanUnit,
  DeliveryRecordLine,
} from "../api/purchaseOrder";

/**
 * `delivery_items` 행에서 발주 품목 id(`order_items.id`)를 꺼냅니다.
 * `purchaseOrderItemId` / `orderItemId` 또는 중첩 `orderItem.id`를 봅니다.
 */
export function purchaseOrderItemIdFromDeliveryItemRow(
  row: DeliveryRecordLine
): number | null {
  const direct = row.purchaseOrderItemId ?? row.orderItemId;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  if (direct != null) {
    const n = Number(direct);
    if (Number.isFinite(n)) return n;
  }
  const oi = row.orderItem;
  if (oi && typeof oi === "object") {
    const id = (oi as { id?: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (id != null) {
      const m = Number(id);
      if (Number.isFinite(m)) return m;
    }
  }
  return null;
}

/**
 * `POST .../deliveries` 응답에서 `POST .../delivery-items/:deliveryItemId/units`에 쓸 id.
 * 반드시 **`deliveryItems[].id`**이며, `lines[].id`는 납품 품목 PK가 아닐 수 있어 `lines`는 사용하지 않습니다.
 */
export function findProductDeliveryItemId(
  delivery: Delivery,
  purchaseOrderItemId: number
): number | null {
  const items = (delivery.deliveryItems ?? []) as DeliveryRecordLine[];
  for (const row of items) {
    const lineType = String(row.lineType ?? "").trim().toUpperCase();
    if (lineType === "LENS") continue;
    const poi = purchaseOrderItemIdFromDeliveryItemRow(row);
    if (poi == null || poi !== purchaseOrderItemId) continue;
    const idRaw = row.id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : idRaw != null
          ? Number(idRaw)
          : NaN;
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

/**
 * 생산 계획 유닛 1대 기준 최소 `DeliveryCreatePayload` (실제 납품 등록 API 본문).
 * 발주 상세 납품 모달과 동일하게 `lineType: PRODUCT`, `lineId` = 발주 품목 id.
 */
export function buildMinimalDeliveryCreatePayloadFromPlanUnit(params: {
  deliveryDate: string;
  remark?: string | null;
  purchaseOrderItemId: number;
  unit: ProductionPlanUnit;
}): DeliveryCreatePayload {
  const { deliveryDate, remark, purchaseOrderItemId, unit } = params;
  const d = deliveryDate.trim();
  if (!d) throw new Error("납품일(제품 인계일)을 선택하세요.");

  const serialNo = String(unit.serialNo ?? unit.unitCode ?? "").trim();
  if (!serialNo) throw new Error("제품 시리얼이 없습니다.");

  const detectorElementCode = String(unit.detectorElementCode ?? "").trim();
  const wavelengthCode = String(unit.wavelengthCode ?? "").trim();
  if (!detectorElementCode || !wavelengthCode) {
    throw new Error("검출기 소자·파장 코드가 필요합니다.");
  }

  const serial: DeliveryCreateLineSerialPayload = {
    serialNo,
    detectorElementCode,
    wavelengthCode,
    detectorId:
      unit.detectorId != null && Number.isFinite(Number(unit.detectorId))
        ? Number(unit.detectorId)
        : null,
  };
  if (unit.serialSnapshot && typeof unit.serialSnapshot === "object") {
    serial.serialSnapshot = unit.serialSnapshot;
  }

  return {
    deliveryDate: d,
    remark: remark?.trim() ? remark.trim() : undefined,
    lines: [
      {
        lineType: "PRODUCT",
        lineId: purchaseOrderItemId,
        quantity: 1,
        serials: [serial],
      },
    ],
  };
}
