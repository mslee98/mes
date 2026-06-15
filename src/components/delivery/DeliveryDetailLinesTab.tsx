import { Fragment } from "react";
import type { DeliveryOrderWithDetail } from "../../api/purchaseOrder";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
} from "../list";
import ComponentCard from "../common/ComponentCard";
import { formatCurrency } from "../../lib/format/formatCurrency";
import {
  asDeliveryDetailRecord,
  formatQtyDisplayForDelivery,
  lineNoteFromOrderItem,
  pickNestedOrderLensFromLine,
  orderLineQtyFromOrderItem,
  productCodeFromOrderItem,
  productNameFromOrderItem,
  resolveOrderItemForDeliveryLine,
  unitCodeFromOrderItem,
  unitPriceFromOrderItem,
  currencyFromOrderItem,
} from "../../domains/delivery/helpers/deliveryDetailHelpers";

type DeliveryDetailLinesTabProps = {
  lines: unknown[];
  order: DeliveryOrderWithDetail | undefined;
  unitLabel: (code: string | undefined) => string;
  orderCurrency: string;
};

export function DeliveryDetailLinesTab({
  lines,
  order,
  unitLabel,
  orderCurrency,
}: DeliveryDetailLinesTabProps) {
  return (
    <ComponentCard title="납품 품목">
      {lines.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">등록된 품목이 없습니다.</p>
      ) : (
        <DataTable minWidth={720}>
          <DataTableHeader>
            <DataTableHeaderCell colSpan={1} compact sortable={false}>
              <DataTableHeaderLabel>구분</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell colSpan={3} compact sortable={false}>
              <DataTableHeaderLabel>품목</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell colSpan={2} compact sortable={false} className="justify-end">
              <DataTableHeaderLabel className="w-full text-end">발주 수량</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell colSpan={2} compact sortable={false} className="justify-end">
              <DataTableHeaderLabel className="w-full text-end">단가</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell colSpan={2} compact sortable={false} className="justify-end">
              <DataTableHeaderLabel className="w-full text-end">이번 납품</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell colSpan={2} compact sortable={false} className="border-r-0">
              <DataTableHeaderLabel>비고</DataTableHeaderLabel>
            </DataTableHeaderCell>
          </DataTableHeader>
          <DataTableBody>
            {lines.map((line, idx) => {
              const rec = asDeliveryDetailRecord(line);
              const oi = resolveOrderItemForDeliveryLine(line, order);
              const ol = pickNestedOrderLensFromLine(line);
              const qtyRaw = rec?.quantity ?? rec?.delivery_qty ?? rec?.deliveryQty;
              const lineType = String(rec?.lineType ?? "").trim().toUpperCase();
              const isLensLine =
                lineType === "LENS" || rec?.orderLensId != null || !!ol;
              const rowTypeLabel = isLensLine ? "렌즈" : "제품";
              const lineName = String(rec?.lineName ?? "").trim();
              const pcode = productCodeFromOrderItem(oi);
              const pname = productNameFromOrderItem(oi);
              const lensName =
                (typeof ol?.lensNameSnapshot === "string" &&
                  ol.lensNameSnapshot.trim()) ||
                (typeof ol?.lens_name_snapshot === "string" &&
                  ol.lens_name_snapshot.trim()) ||
                (typeof (asDeliveryDetailRecord(ol?.lens)?.lensName) === "string" &&
                  String(asDeliveryDetailRecord(ol?.lens)?.lensName).trim()) ||
                "";
              const productTitle = isLensLine
                ? lineName ||
                  lensName ||
                  (rec?.orderLensId != null
                    ? `렌즈 #${rec.orderLensId}`
                    : rec?.lineId != null
                      ? `렌즈 #${rec.lineId}`
                      : `렌즈 행 ${idx + 1}`)
                : pcode && pname
                  ? `${pcode} · ${pname}`
                  : lineName ||
                    pname ||
                    pcode ||
                    (rec?.orderItemId != null
                      ? `품목 #${rec.orderItemId}`
                      : rec?.lineId != null
                        ? `품목 #${rec.lineId}`
                        : `행 ${idx + 1}`);
              const lineKey = `${rec?.id ?? "x"}-${rec?.lineType ?? "T"}-${rec?.lineId ?? rec?.orderItemId ?? rec?.orderLensId ?? idx}-${idx}`;

              const oQty = orderLineQtyFromOrderItem(oi);
              const lensQtyRaw = ol?.quantity ?? ol?.qty;
              const uCode = isLensLine
                ? (typeof ol?.quantityUnitCode === "string" &&
                    ol.quantityUnitCode.trim()) ||
                  (typeof ol?.unit === "string" && ol.unit.trim()) ||
                  undefined
                : unitCodeFromOrderItem(oi);
              const uName = uCode ? unitLabel(uCode) : "";
              const orderQtyCell =
                (isLensLine
                  ? formatQtyDisplayForDelivery(lensQtyRaw)
                  : oQty != null
                    ? String(oQty)
                    : "—") !== "—"
                  ? `${isLensLine ? formatQtyDisplayForDelivery(lensQtyRaw) : oQty}${uName ? ` ${uName}` : uCode ? ` (${uCode})` : ""}`
                  : "—";
              const cur =
                (isLensLine
                  ? (typeof ol?.currencyCode === "string" &&
                      ol.currencyCode.trim()) ||
                    undefined
                  : currencyFromOrderItem(oi)) ||
                orderCurrency ||
                "KRW";
              const up = isLensLine
                ? (typeof ol?.unitPrice === "number"
                    ? ol.unitPrice
                    : Number(ol?.unitPrice)) || undefined
                : unitPriceFromOrderItem(oi);
              const note = isLensLine
                ? (typeof ol?.remark === "string" && ol.remark.trim()) ||
                  (typeof ol?.note === "string" && ol.note.trim()) ||
                  ""
                : lineNoteFromOrderItem(oi);

              return (
                <Fragment key={lineKey}>
                  <DataTableRow>
                    <DataTableCell colSpan={1} compact>
                      {rowTypeLabel}
                    </DataTableCell>
                    <DataTableCell colSpan={3} compact className="min-w-0 items-start">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {productTitle}
                      </p>
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact className="justify-end whitespace-nowrap">
                      {orderQtyCell}
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact className="justify-end whitespace-nowrap">
                      {up != null ? formatCurrency(up, cur) : "—"}
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact className="justify-end whitespace-nowrap font-medium">
                      {formatQtyDisplayForDelivery(qtyRaw)}
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact className="min-w-0 items-start border-r-0">
                      <p className="text-theme-xs text-gray-600 dark:text-gray-300">
                        {note || "—"}
                      </p>
                    </DataTableCell>
                  </DataTableRow>
                </Fragment>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </ComponentCard>
  );
}
