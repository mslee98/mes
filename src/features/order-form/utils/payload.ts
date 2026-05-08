import type {
  PurchaseOrderCreatePayload,
  PurchaseOrderItemPayload,
  PurchaseOrderUpdatePayload,
} from "../../../api/purchaseOrder";
import type { ItemRow } from "../types";

type BuildCreatePayloadParams = {
  title: string;
  partnerId: string;
  orderDate: string;
  dueDate: string;
  requestDeliveryDate: string;
  requesterDepartment: string;
  requesterName: string;
  requesterId: number | null;
  vendorOrderNo: string;
  vendorRequest: string;
  specialNote: string;
  effectiveOrderTypeCode: string;
  effectiveOrderStatusCode: string;
  headerCurrency: string;
  supplyAmount: number;
  /** 입력란 값 → null 이면 미전송에 가깝게 null */
  exchangeRate: number | null;
  validItems: ItemRow[];
  parseLineUnitPrice: (display: string) => number;
};

export function buildCreatePayload({
  title,
  partnerId,
  orderDate,
  dueDate,
  requestDeliveryDate,
  requesterDepartment,
  requesterName,
  requesterId,
  vendorOrderNo,
  vendorRequest,
  specialNote,
  effectiveOrderTypeCode,
  effectiveOrderStatusCode,
  headerCurrency,
  supplyAmount,
  exchangeRate,
  validItems,
  parseLineUnitPrice,
}: BuildCreatePayloadParams): PurchaseOrderCreatePayload {
  const lines = validItems.map(
    (row): PurchaseOrderItemPayload => ({
      productId: row.productId.trim(),
      lensId: row.lensId.trim() ? row.lensId.trim() : null,
      qty: row.qty,
      unitPrice: parseLineUnitPrice(row.unitPrice),
      unit: row.unitCode.trim() || null,
      currencyCode: row.currencyCode.trim() || "KRW",
      remark: row.remark.trim() || null,
    })
  );
  return {
    title: title.trim(),
    partnerId: partnerId.trim(),
    orderDate,
    currencyCode: headerCurrency,
    dueDate: dueDate || null,
    requestDeliveryDate: requestDeliveryDate || null,
    requesterDepartment: requesterDepartment.trim() || null,
    requesterName: requesterName.trim() || null,
    requesterId,
    vendorOrderNo: vendorOrderNo.trim() || null,
    vendorRequest: vendorRequest.trim() || null,
    specialNote: specialNote.trim() || null,
    orderType: effectiveOrderTypeCode.trim() || null,
    memo: null,
    status: effectiveOrderStatusCode.trim() || null,
    supplyAmount,
    exchangeRate,
    exchangeRateDate: orderDate || null,
    items: lines,
    lines,
  };
}

type BuildUpdatePayloadParams = {
  title: string;
  partnerId: string;
  orderDate: string;
  dueDate: string;
  requestDeliveryDate: string;
  requesterDepartment: string;
  requesterName: string;
  requesterId: number | null;
  vendorOrderNo: string;
  vendorRequest: string;
  specialNote: string;
  effectiveOrderTypeCode: string;
  effectiveOrderStatusCode: string;
  headerCurrency: string;
  supplyAmount: number;
  exchangeRate: number | null;
  /** 서버가 허용하면 발주 수정 시 라인 전체 갱신용 */
  validItems?: ItemRow[];
  parseLineUnitPrice?: (display: string) => number;
};

export function buildUpdatePayload({
  title,
  partnerId,
  orderDate,
  dueDate,
  requestDeliveryDate,
  requesterDepartment,
  requesterName,
  requesterId,
  vendorOrderNo,
  vendorRequest,
  specialNote,
  effectiveOrderTypeCode,
  effectiveOrderStatusCode,
  headerCurrency,
  supplyAmount,
  exchangeRate,
  validItems,
  parseLineUnitPrice,
}: BuildUpdatePayloadParams): PurchaseOrderUpdatePayload {
  const parsePrice =
    parseLineUnitPrice ??
    ((display: string) => {
      const n = Number(display.replace(/,/g, "").trim());
      return Number.isFinite(n) ? n : 0;
    });

  const lines =
    validItems?.map(
      (row): PurchaseOrderItemPayload => ({
        productId: row.productId.trim(),
        lensId: row.lensId.trim() ? row.lensId.trim() : null,
        qty: row.qty,
        unitPrice: parsePrice(row.unitPrice),
        unit: row.unitCode.trim() || null,
        currencyCode: row.currencyCode.trim() || "KRW",
        remark: row.remark.trim() || null,
      })
    ) ?? undefined;

  return {
    title: title.trim(),
    partnerId: partnerId ? partnerId.trim() : undefined,
    orderDate,
    currencyCode: headerCurrency,
    dueDate: dueDate || null,
    requestDeliveryDate: requestDeliveryDate || null,
    requesterDepartment: requesterDepartment.trim() || null,
    requesterName: requesterName.trim() || null,
    requesterId,
    vendorOrderNo: vendorOrderNo.trim() || null,
    vendorRequest: vendorRequest.trim() || null,
    specialNote: specialNote.trim() || null,
    orderType: effectiveOrderTypeCode.trim() || null,
    status: effectiveOrderStatusCode.trim() || null,
    supplyAmount,
    exchangeRate,
    exchangeRateDate: orderDate || null,
    ...(lines && lines.length > 0 ? { items: lines, lines } : {}),
  };
}
