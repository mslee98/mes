import { Fragment } from "react";
import type { DeliveryOrderWithDetail } from "../../api/purchaseOrder";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import ComponentCard from "../common/ComponentCard";
import { formatCurrency } from "../../lib/formatCurrency";
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
} from "../../lib/deliveryDetailHelpers";

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
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  구분
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  품목
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  발주 수량
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  단가
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  이번 납품
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  비고
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
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
                    <TableRow>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">
                        {rowTypeLabel}
                      </TableCell>
                      <TableCell className="max-w-[18rem] px-4 py-3 text-theme-sm text-gray-800 dark:text-gray-200">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {productTitle}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                        {orderQtyCell}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                        {up != null ? formatCurrency(up, cur) : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-end font-medium text-theme-sm text-gray-900 dark:text-white">
                        {formatQtyDisplayForDelivery(qtyRaw)}
                      </TableCell>
                      <TableCell className="max-w-[12rem] px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-300">
                        {note || "—"}
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </ComponentCard>
  );
}
