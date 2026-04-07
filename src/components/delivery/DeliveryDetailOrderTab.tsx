import { Link } from "react-router";
import type { DeliveryOrderWithDetail } from "../../api/purchaseOrder";
import type { CommonCodeItem } from "../../api/commonCode";
import { labelForCommonCode } from "../../api/commonCode";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import ComponentCard from "../common/ComponentCard";
import Badge from "../ui/badge/Badge";
import { formatCurrency } from "../../lib/formatCurrency";
import {
  asDeliveryDetailRecord,
  formatDeliveryDetailDate,
  orderLineQtyFromOrderItem,
  productCodeFromOrderItem,
  productNameFromOrderItem,
  unitCodeFromOrderItem,
} from "../../lib/deliveryDetailHelpers";

type DeliveryDetailOrderTabProps = {
  order: DeliveryOrderWithDetail | undefined;
  partnerLabel: string;
  orderCurrency: string;
  purchaseOrderId: number | undefined;
  poStatusCodes: CommonCodeItem[];
  poTypeCodes: CommonCodeItem[];
  orderItemsAll: unknown[];
  deliveryLinesForMatch: unknown[];
  unitLabel: (code: string | undefined) => string;
};

export function DeliveryDetailOrderTab({
  order,
  partnerLabel,
  orderCurrency,
  purchaseOrderId,
  poStatusCodes,
  poTypeCodes,
  orderItemsAll,
  deliveryLinesForMatch,
  unitLabel,
}: DeliveryDetailOrderTabProps) {
  return (
    <>
      {order ? (
        <ComponentCard title="발주 맥락" collapsible>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주 제목</dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
                {order.title?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">거래처</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{partnerLabel}</dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주 상태 / 유형</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {labelForCommonCode(poStatusCodes, order.status ?? undefined)}
                {order.orderType?.trim() ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    · {labelForCommonCode(poTypeCodes, order.orderType)}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주일</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {order.orderedAt?.trim() ? formatDeliveryDetailDate(order.orderedAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납기 / 희망 납품일</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {order.dueDate?.trim() ? formatDeliveryDetailDate(order.dueDate) : "—"}
                {order.requestDeliveryDate?.trim() ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    / {formatDeliveryDetailDate(order.requestDeliveryDate)}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">요청 부서 / 담당</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {(order.requestDepartment ?? order.requesterDepartment)?.trim() || "—"}
                {order.requesterName?.trim() ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    · {order.requesterName.trim()}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">통화</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {orderCurrency || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">
                공급가액 / 합계(부가세포함)
              </dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {formatCurrency(order.supplyAmount ?? null, orderCurrency || "KRW")}
                <span className="text-gray-500 dark:text-gray-400">
                  {" "}
                  / {formatCurrency(order.totalAmountVatIncluded ?? null, orderCurrency || "KRW")}
                </span>
              </dd>
            </div>
            {order.priority?.trim() ? (
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">우선순위</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{order.priority.trim()}</dd>
              </div>
            ) : null}
            {order.vendorOrderNo?.trim() ? (
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">협력사 주문번호</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                  {order.vendorOrderNo.trim()}
                </dd>
              </div>
            ) : null}
          </dl>

          {order.memo?.trim() ? (
            <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
              {order.memo.trim()}
            </p>
          ) : null}

          {purchaseOrderId != null ? (
            <p className="mt-4 text-theme-sm">
              <Link
                to={`/order/${purchaseOrderId}`}
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                발주 상세에서 전체 품목·첨부 확인 →
              </Link>
              {orderItemsAll.length > 0 ? (
                <span className="ml-2 text-theme-xs text-gray-500 dark:text-gray-400">
                  (발주 품목 {orderItemsAll.length}건)
                </span>
              ) : null}
            </p>
          ) : null}
        </ComponentCard>
      ) : (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          연결된 발주 정보가 없습니다.
        </p>
      )}

      {orderItemsAll.length > 0 ? (
        <ComponentCard title="발주 품목 전체 (참고)" collapsible defaultCollapsed>
          <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
            동일 발주의 모든 라인입니다. 이번 납품에 포함되지 않은 품목도 표시됩니다.
          </p>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    #
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
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {orderItemsAll.map((row, idx) => {
                  const oi = asDeliveryDetailRecord(row);
                  if (!oi) return null;
                  const oid = oi.id;
                  const idNum = typeof oid === "number" ? oid : Number(oid);
                  const pcode = productCodeFromOrderItem(oi);
                  const pname = productNameFromOrderItem(oi);
                  const label =
                    pcode && pname
                      ? `${pcode} · ${pname}`
                      : pname ||
                        pcode ||
                        (Number.isFinite(idNum) ? `#${idNum}` : `행 ${idx + 1}`);
                  const oQty = orderLineQtyFromOrderItem(oi);
                  const uCode = unitCodeFromOrderItem(oi);
                  const uName = uCode ? unitLabel(uCode) : "";
                  const inThisDelivery = deliveryLinesForMatch.some((ln) => {
                    const r = asDeliveryDetailRecord(ln);
                    const lid = r?.orderItemId ?? r?.purchaseOrderItemId;
                    const n = typeof lid === "number" ? lid : Number(lid);
                    return Number.isFinite(idNum) && n === idNum;
                  });

                  return (
                    <TableRow key={Number.isFinite(idNum) ? idNum : idx}>
                      <TableCell className="px-4 py-2 text-theme-xs text-gray-500 dark:text-gray-400">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-theme-sm text-gray-800 dark:text-gray-200">
                        {label}
                        {inThisDelivery ? (
                          <span className="ml-2 inline-block align-middle">
                            <Badge size="sm" color="primary">
                              이번 납품
                            </Badge>
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                        {oQty != null
                          ? `${oQty}${uName ? ` ${uName}` : uCode ? ` (${uCode})` : ""}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </ComponentCard>
      ) : null}
    </>
  );
}
