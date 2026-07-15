import type {
  PurchaseOrderCreatePayload,
  PurchaseOrderUpdatePayload,
} from "../../../api/purchaseOrder";
import type { RepresentativeProduct } from "../../../api/products";
import { buildOrderLineRequestPayload } from "../../../domains/order/helpers/buildOrderLineRequestPayload";
import type { ItemRow } from "../types";

type BuildCreatePayloadParams = {
  title: string;
  partnerId: string;
  orderDate: string;
  dueDate: string;
  requestDeliveryDate: string;
  requesterDepartment: string;
  requesterName: string;
  requesterEmployeeNo: string | null;
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
  productById: Map<string, RepresentativeProduct>;
};

export function buildCreatePayload({
  title,
  partnerId,
  orderDate,
  dueDate,
  requestDeliveryDate,
  requesterDepartment,
  requesterName,
  requesterEmployeeNo,
  vendorOrderNo,
  vendorRequest,
  specialNote,
  effectiveOrderTypeCode,
  effectiveOrderStatusCode,
  headerCurrency,
  supplyAmount,
  exchangeRate,
  validItems,
  productById,
}: BuildCreatePayloadParams): PurchaseOrderCreatePayload {
  const lines = validItems.map((row) =>
    buildOrderLineRequestPayload({
      row,
      product: productById.get(row.productId.trim()),
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
    ...(requesterEmployeeNo
      ? { requesterEmployeeNo }
      : {}),
    vendorOrderNo: vendorOrderNo.trim() || null,
    vendorRequest: vendorRequest.trim() || null,
    specialNote: specialNote.trim() || null,
    orderType: effectiveOrderTypeCode.trim() || null,
    memo: null,
    status: effectiveOrderStatusCode.trim() || null,
    supplyAmount,
    exchangeRate,
    exchangeRateDate: orderDate || null,
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
  requesterEmployeeNo: string | null;
  vendorOrderNo: string;
  vendorRequest: string;
  specialNote: string;
  effectiveOrderTypeCode: string;
  headerCurrency: string;
  supplyAmount: number;
  exchangeRate: number | null;
  /** 서버가 허용하면 발주 수정 시 라인 전체 갱신용 */
  validItems?: ItemRow[];
  productById?: Map<string, RepresentativeProduct>;
};

export function buildUpdatePayload({
  title,
  partnerId,
  orderDate,
  dueDate,
  requestDeliveryDate,
  requesterDepartment,
  requesterName,
  requesterEmployeeNo,
  vendorOrderNo,
  vendorRequest,
  specialNote,
  effectiveOrderTypeCode,
  headerCurrency,
  supplyAmount,
  exchangeRate,
  validItems,
  productById,
}: BuildUpdatePayloadParams): PurchaseOrderUpdatePayload {
  const lines =
    validItems?.map((row) =>
      buildOrderLineRequestPayload({
        row,
        product: productById?.get(row.productId.trim()),
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
    ...(requesterEmployeeNo
      ? { requesterEmployeeNo }
      : {}),
    vendorOrderNo: vendorOrderNo.trim() || null,
    vendorRequest: vendorRequest.trim() || null,
    specialNote: specialNote.trim() || null,
    orderType: effectiveOrderTypeCode.trim() || null,
    supplyAmount,
    exchangeRate,
    exchangeRateDate: orderDate || null,
    ...(lines && lines.length > 0 ? { lines } : {}),
  };
}
