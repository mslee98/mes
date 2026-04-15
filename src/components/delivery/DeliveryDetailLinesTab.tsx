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
                const qtyRaw = rec?.quantity ?? rec?.delivery_qty ?? rec?.deliveryQty;
                const pcode = productCodeFromOrderItem(oi);
                const pname = productNameFromOrderItem(oi);
                const productTitle =
                  pcode && pname
                    ? `${pcode} · ${pname}`
                    : pname ||
                      pcode ||
                      (rec?.orderItemId != null ? `품목 #${rec.orderItemId}` : `행 ${idx + 1}`);
                const lineKey = `${rec?.id ?? "x"}-${rec?.orderItemId ?? idx}-${idx}`;

                const oQty = orderLineQtyFromOrderItem(oi);
                const uCode = unitCodeFromOrderItem(oi);
                const uName = uCode ? unitLabel(uCode) : "";
                const orderQtyCell =
                  oQty != null
                    ? `${oQty}${uName ? ` ${uName}` : uCode ? ` (${uCode})` : ""}`
                    : "—";
                const cur = currencyFromOrderItem(oi) || orderCurrency || "KRW";
                const up = unitPriceFromOrderItem(oi);
                const note = lineNoteFromOrderItem(oi);

                return (
                  <Fragment key={lineKey}>
                    <TableRow>
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
