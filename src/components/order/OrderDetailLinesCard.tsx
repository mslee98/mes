import { Link } from "react-router";
import ComponentCard from "../common/ComponentCard";
import Badge from "../ui/badge/Badge";
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
import type { PurchaseOrderItem } from "../../api/purchaseOrder";

type OrderDetailLinesCardProps = {
  orderLines: PurchaseOrderItem[];
  defaultCurrencyCode: string;
  orderLineSummaries: LineAmountSummary[];
  /** 기본: 표 + 하단 금액 요약 / `dashboard`: 표만(대시보드 발주 상세) */
  layoutMode?: "default" | "dashboard";
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

function getLineLensDisplayName(item: PurchaseOrderItem): string {
  const lensName =
    item.lens?.lensName?.trim() || item.lensNameSnapshot?.trim() || "";
  if (lensName) return lensName;
  if (item.lensId?.trim()) return `렌즈 #${item.lensId}`;
  return "-";
}

function lineLinkClassName() {
  return "inline-block max-w-full truncate font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400";
}

function ProductLineLink({ item }: { item: PurchaseOrderItem }) {
  const label = getOrderLineDisplayName(item);
  const productId = String(item.productId ?? "").trim();
  if (!productId) {
    return (
      <span className="font-medium text-gray-900 dark:text-white">{label}</span>
    );
  }
  return (
    <Link
      to={`/products/${encodeURIComponent(productId)}`}
      className={lineLinkClassName()}
      title={label}
    >
      {label}
    </Link>
  );
}

function LensLineLink({ item }: { item: PurchaseOrderItem }) {
  const label = getLineLensDisplayName(item);
  const lensId = String(item.lensId ?? item.lens?.id ?? "").trim();
  if (!lensId || label === "-") {
    return (
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
    );
  }
  return (
    <Link
      to={`/lenses/${encodeURIComponent(lensId)}`}
      className={`${lineLinkClassName()} font-normal`}
      title={label}
    >
      {label}
    </Link>
  );
}

export function OrderDetailLinesCard({
  orderLines,
  defaultCurrencyCode,
  orderLineSummaries,
  layoutMode = "default",
}: OrderDetailLinesCardProps) {
  const isDashboard = layoutMode === "dashboard";
  const cardTitle = isDashboard ? "발주 제품" : "발주 제품 요약";
  const cardDesc = isDashboard
    ? "품목별 수량·금액 및 납품 진행 현황입니다."
    : undefined;

  const tableBlock = (
    <div
      className={
        isDashboard
          ? "relative overflow-x-auto rounded-lg border border-gray-100 dark:border-white/10"
          : "relative overflow-x-auto border-b dark:border-gray-800"
      }
    >
      {!isDashboard ? (
        <div className="mb-2 flex items-center justify-between px-1">
          <h4 className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
            제품 라인
          </h4>
        </div>
      ) : null}
      <Table className="w-full text-center text-sm text-gray-900 dark:text-white md:table-fixed">
        <TableHeader className="border-b border-gray-100 dark:border-white/5">
          <TableRow className="hover:bg-transparent">
            <TableCell
              isHeader
              className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[18%]"
            >
              {isDashboard ? "품목 / 사업명" : "제품/사업 명"}
            </TableCell>
            <TableCell
              isHeader
              className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[14%]"
            >
              렌즈
            </TableCell>
            <TableCell
              isHeader
              className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[14%]"
            >
              {isDashboard ? "수량" : "단위 · 수량"}
            </TableCell>
            <TableCell
              isHeader
              className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[16%]"
            >
              {isDashboard ? "단가" : "통화 · 단가"}
            </TableCell>
            <TableCell
              isHeader
              className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[14%]"
            >
              금액
            </TableCell>
            <TableCell
              isHeader
              className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[22%]"
            >
              비고
            </TableCell>
            <TableCell
              isHeader
              className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[6%]"
            >
              {isDashboard ? "납품현황" : "납품"}
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
          {orderLines.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="px-3 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
              >
                등록된 발주 라인이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            orderLines.map((item) => {
              const lineCc = item.currencyCode ?? defaultCurrencyCode ?? "KRW";
              const delivered = item.deliveredQty ?? 0;
              const qty = Number(item.qty ?? 0);
              return (
                <TableRow
                  key={item.id}
                  className="align-middle hover:bg-transparent"
                >
                  <TableCell className="min-w-0 max-w-[18rem] whitespace-nowrap px-3 py-3 text-center align-middle">
                    <ProductLineLink item={item} />
                  </TableCell>
                  <TableCell className="min-w-0 max-w-[14rem] px-3 py-3 text-center align-middle">
                    <LensLineLink item={item} />
                  </TableCell>
                  <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                    {isDashboard ? (
                      <span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {item.unit ?? "EA"}
                        </span>{" "}
                        <span className="font-medium">{item.qty}</span>
                      </span>
                    ) : (
                      <>
                        <span>{item.unit ?? "-"}</span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span>{item.qty}</span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                    {isDashboard ? (
                      <span>
                        {item.unitPrice != null
                          ? formatCurrency(item.unitPrice, lineCc)
                          : "-"}
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-500 dark:text-gray-400">{lineCc}</span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span>
                          {item.unitPrice != null
                            ? formatCurrency(item.unitPrice, lineCc)
                            : "-"}
                        </span>
                      </>
                    )}
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
                    {isDashboard ? (
                      <span className="inline-flex justify-center">
                        <Badge size="sm" color="primary" variant="light">
                          {delivered} / {qty}
                        </Badge>
                      </span>
                    ) : (
                      <span>{delivered}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  const summaryBlock = !isDashboard ? (
    <>
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
    </>
  ) : null;

  return (
    <ComponentCard
      title={cardTitle}
      desc={cardDesc}
      collapsible={!isDashboard}
      defaultCollapsed={false}
      className={isDashboard ? "[&>div:first-child]:px-4 [&>div:first-child]:py-3.5" : ""}
      bodyClassName={isDashboard ? "!p-3 sm:!p-4" : ""}
    >
      <div className={isDashboard ? undefined : "space-y-4 dark:border-gray-700"}>
        {isDashboard ? (
          tableBlock
        ) : (
          <>
            {tableBlock}
            {summaryBlock}
          </>
        )}
      </div>
    </ComponentCard>
  );
}
