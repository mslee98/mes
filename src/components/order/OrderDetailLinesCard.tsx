import ComponentCard from "../common/ComponentCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { formatCurrency } from "../../lib/formatCurrency";
import {
  OrderLineAmountSummary,
  type LineAmountSummary,
} from "../../lib/orderLineAmountSummary";
import type {
  PurchaseOrderItem,
  PurchaseOrderLensLine,
} from "../../api/purchaseOrder";

type OrderDetailLinesCardProps = {
  orderLines: PurchaseOrderItem[];
  orderLenses: PurchaseOrderLensLine[];
  defaultCurrencyCode: string;
  orderLineSummaries: LineAmountSummary[];
};

function getOrderLineDisplayName(item: PurchaseOrderItem): string {
  const baseName =
    item.itemName?.trim() ||
    item.productNameSnapshot?.trim() ||
    item.definitionNameSnapshot?.trim() ||
    (item.productId != null && String(item.productId).trim() !== ""
      ? `제품 #${item.productId}`
      : "-");

  const lineCode =
    item.businessName?.trim() ||
    item.businessNameSnapshot?.trim() ||
    item.versionSnapshot?.trim() ||
    "";
  if (!lineCode || baseName === "-" || baseName.includes(`(${lineCode})`)) {
    return baseName;
  }
  return `${baseName} (${lineCode})`;
}

function getOrderLensDisplayName(lens: PurchaseOrderLensLine): string {
  const lensName =
    lens.lens?.lensName?.trim() || lens.lensNameSnapshot?.trim() || "";
  if (lensName) return lensName;
  return lens.lensId?.trim() ? `렌즈 #${lens.lensId}` : "-";
}

export function OrderDetailLinesCard({
  orderLines,
  orderLenses,
  defaultCurrencyCode,
  orderLineSummaries,
}: OrderDetailLinesCardProps) {
  return (
    <ComponentCard title="발주 제품 요약" collapsible>
      <div className="space-y-4 dark:border-gray-700">
        <div className="relative overflow-x-auto border-b dark:border-gray-800">
          <div className="mb-2 flex items-center justify-between px-1">
            <h4 className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
              제품 라인
            </h4>
          </div>
          <Table className="w-full text-center text-sm text-gray-900 dark:text-white md:table-fixed">
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[22%]"
                >
                  제품/사업 명
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[15%]"
                >
                  단위 · 수량
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[18%]"
                >
                  통화 · 단가
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[14%]"
                >
                  금액
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[25%]"
                >
                  비고
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[6%]"
                >
                  납품
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
              {orderLines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-3 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    등록된 발주 라인이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                orderLines.map((item) => {
                  const lineCc = item.currencyCode ?? defaultCurrencyCode ?? "KRW";
                  return (
                    <TableRow
                      key={item.id}
                      className="align-middle hover:bg-transparent"
                    >
                      <TableCell className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-900 dark:text-white">
                        {getOrderLineDisplayName(item)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                        <span>{item.unit ?? "-"}</span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span>{item.qty}</span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                        <span className="text-gray-500 dark:text-gray-400">{lineCc}</span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span>
                          {item.unitPrice != null
                            ? formatCurrency(item.unitPrice, lineCc)
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle font-medium tabular-nums text-gray-900 dark:text-white">
                        {item.amount != null
                          ? formatCurrency(item.amount, lineCc)
                          : "-"}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle text-gray-600 dark:text-gray-400">
                        {item.remark ?? "-"}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                        {item.deliveredQty ?? 0}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="relative overflow-x-auto border-b dark:border-gray-800">
          <div className="mb-2 flex items-center justify-between px-1">
            <h4 className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
              렌즈 라인
            </h4>
          </div>
          <Table className="w-full text-center text-sm text-gray-900 dark:text-white md:table-fixed">
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[22%]"
                >
                  렌즈
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[15%]"
                >
                  단위 · 수량
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[18%]"
                >
                  통화 · 단가
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[14%]"
                >
                  금액
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[25%]"
                >
                  비고
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[6%]"
                >
                  납품
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
              {orderLenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-3 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    등록된 렌즈 라인이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                orderLenses.map((lens) => {
                  const lineCc = lens.currencyCode ?? defaultCurrencyCode ?? "KRW";
                  return (
                    <TableRow
                      key={lens.id}
                      className="align-middle hover:bg-transparent"
                    >
                      <TableCell className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-900 dark:text-white">
                        {getOrderLensDisplayName(lens)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                        <span>{lens.quantityUnitCode ?? lens.unit ?? "-"}</span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span>{lens.qty}</span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                        <span className="text-gray-500 dark:text-gray-400">{lineCc}</span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span>
                          {lens.unitPrice != null
                            ? formatCurrency(lens.unitPrice, lineCc)
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle font-medium tabular-nums text-gray-900 dark:text-white">
                        {lens.amount != null ? formatCurrency(lens.amount, lineCc) : "-"}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle text-gray-600 dark:text-gray-400">
                        {lens.remark ?? lens.note ?? "-"}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                        {lens.deliveredQty ?? 0}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="relative inline-flex w-full items-center justify-center">
          <hr className="my-8 h-px w-64 max-w-full border-0 bg-gray-200 dark:bg-gray-700" />
          <span className="absolute left-1/2 -translate-x-1/2 bg-white px-3 text-sm font-medium text-gray-600 dark:bg-[#171F2F] dark:text-gray-400">
            주문 요약
          </span>
        </div>

        <OrderLineAmountSummary
          summaries={
            orderLineSummaries.length > 0
              ? orderLineSummaries
              : [
                  {
                    currencyCode: defaultCurrencyCode || "KRW",
                    subtotal: 0,
                    vat: 0,
                    total: 0,
                  },
                ]
          }
        />
      </div>
    </ComponentCard>
  );
}
