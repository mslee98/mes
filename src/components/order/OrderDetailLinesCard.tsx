import { Link } from "react-router";
import ComponentCard from "../common/ComponentCard";
import Badge from "../ui/badge/Badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
} from "../list";
import { formatCurrency } from "../../lib/format/formatCurrency";
import {
  OrderLineAmountSummary,
  type LineAmountSummary,
} from "../../domains/order/helpers/orderLineAmountSummary";
import type { PurchaseOrderItem } from "../../api/purchaseOrder";
import { getOrderLineDisplayName } from "../../domains/order/display/orderLineDisplay";
import { detectorLabelFromOrderLine } from "../../domains/order/helpers/orderLineItemRow";
import { DetectorTypeGuidePopover } from "../common/DetectorTypeGuidePopover";
import { ORDER_DETAIL_LINES_GRID_TEMPLATE } from "../../domains/order/layout/orderDetailLinesTableLayout";

const ORDER_LINE_BODY_TEXT_CLASS =
  "text-theme-sm text-gray-800 dark:text-gray-200";
const ORDER_LINE_MUTED_TEXT_CLASS =
  "text-theme-sm text-gray-500 dark:text-gray-400";
const ORDER_LINE_NUMERIC_TEXT_CLASS =
  "text-theme-sm tabular-nums text-gray-800 dark:text-gray-200";

type OrderDetailLinesCardProps = {
  orderLines: PurchaseOrderItem[];
  defaultCurrencyCode: string;
  orderLineSummaries: LineAmountSummary[];
  /** 라인별 생산 등록 수량(계획·유닛) — 없으면 API `deliveredQty` 폴백 */
  registeredQtyByOrderItemId?: Map<number, number>;
  /** 기본: 표 + 하단 금액 요약 / `dashboard`: 표만(대시보드 발주 상세) */
  layoutMode?: "default" | "dashboard";
};

function lineRegisteredQty(
  item: PurchaseOrderItem,
  registeredQtyByOrderItemId?: Map<number, number>
): number {
  if (registeredQtyByOrderItemId) {
    return registeredQtyByOrderItemId.get(item.id) ?? 0;
  }
  return item.deliveredQty ?? 0;
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
  registeredQtyByOrderItemId,
  layoutMode = "default",
}: OrderDetailLinesCardProps) {
  const isDashboard = layoutMode === "dashboard";
  const cardTitle = isDashboard ? "발주 제품" : "발주 제품 요약";
  const cardDesc = isDashboard
    ? "품목별 수량·금액 및 생산 등록 진행 현황입니다."
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
      <DataTable fillWidth minWidth={0}>
        <DataTableHeader gridTemplateColumns={ORDER_DETAIL_LINES_GRID_TEMPLATE}>
          <DataTableHeaderCell compact sortable={false} className="justify-start">
            <DataTableHeaderLabel className="w-full text-left">
              {isDashboard ? "품목 / 사업명" : "제품/사업 명"}
            </DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-start">
            <DataTableHeaderLabel className="w-full text-left">렌즈</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-center">
            <DataTableHeaderLabel className="w-full text-center">
              <span className="inline-flex items-center gap-1">
                <span>검출기</span>
                <DetectorTypeGuidePopover />
              </span>
            </DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-center">
            <DataTableHeaderLabel className="w-full text-center">
              {isDashboard ? "수량" : "단위 · 수량"}
            </DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-end">
            <DataTableHeaderLabel className="w-full text-end">
              {isDashboard ? "단가" : "통화 · 단가"}
            </DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-end">
            <DataTableHeaderLabel className="w-full text-end">금액</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-start">
            <DataTableHeaderLabel className="w-full text-left">비고</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-center border-r-0">
            <DataTableHeaderLabel className="w-full text-center">
              {isDashboard ? "생산현황" : "생산"}
            </DataTableHeaderLabel>
          </DataTableHeaderCell>
        </DataTableHeader>
        <DataTableBody>
          {orderLines.length === 0 ? (
            <DataTableRow>
              <DataTableCell colSpan={12} compact className="justify-center border-r-0 py-4">
                등록된 발주 라인이 없습니다.
              </DataTableCell>
            </DataTableRow>
          ) : (
            orderLines.map((item) => {
              const lineCc = item.currencyCode ?? defaultCurrencyCode ?? "KRW";
              const registered = lineRegisteredQty(
                item,
                registeredQtyByOrderItemId
              );
              const qty = Number(item.qty ?? 0);
              const isProductionComplete = qty > 0 && registered >= qty;
              return (
                <DataTableRow
                  key={item.id}
                  gridTemplateColumns={ORDER_DETAIL_LINES_GRID_TEMPLATE}
                >
                  <DataTableCell compact className="min-w-0 items-start justify-start">
                    <ProductLineLink item={item} />
                  </DataTableCell>
                  <DataTableCell compact className="min-w-0 items-start justify-start">
                    <LensLineLink item={item} />
                  </DataTableCell>
                  <DataTableCell compact className="min-w-0 items-start justify-center text-theme-xs">
                    <span
                      className={
                        item.detectorId == null
                          ? ORDER_LINE_MUTED_TEXT_CLASS
                          : ORDER_LINE_BODY_TEXT_CLASS
                      }
                      title={detectorLabelFromOrderLine(item)}
                    >
                      {detectorLabelFromOrderLine(item)}
                    </span>
                  </DataTableCell>
                  <DataTableCell compact className="justify-center">
                    {isDashboard ? (
                      <span className={`whitespace-nowrap ${ORDER_LINE_NUMERIC_TEXT_CLASS}`}>
                        <span className="text-gray-500 dark:text-gray-400">
                          {item.unit ?? "EA"}
                        </span>{" "}
                        <span className="font-medium">{item.qty}</span>
                      </span>
                    ) : (
                      <span className={ORDER_LINE_NUMERIC_TEXT_CLASS}>
                        <span className="text-gray-500 dark:text-gray-400">
                          {item.unit ?? "-"}
                        </span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span>{item.qty}</span>
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell compact className="justify-end">
                    {isDashboard ? (
                      <span className={`whitespace-nowrap ${ORDER_LINE_NUMERIC_TEXT_CLASS}`}>
                        {item.unitPrice != null
                          ? formatCurrency(item.unitPrice, lineCc)
                          : "-"}
                      </span>
                    ) : (
                      <span className={ORDER_LINE_NUMERIC_TEXT_CLASS}>
                        <span className="text-gray-500 dark:text-gray-400">{lineCc}</span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        <span>
                          {item.unitPrice != null
                            ? formatCurrency(item.unitPrice, lineCc)
                            : "-"}
                        </span>
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell compact className="justify-end font-medium">
                    <span className={ORDER_LINE_NUMERIC_TEXT_CLASS}>
                      {item.amount != null
                        ? formatCurrency(item.amount, lineCc)
                        : "-"}
                    </span>
                  </DataTableCell>
                  <DataTableCell compact className="min-w-0 items-start justify-start">
                    <span
                      className={`${ORDER_LINE_BODY_TEXT_CLASS} ${isDashboard ? "block truncate" : ""}`}
                      title={item.remark?.trim() || undefined}
                    >
                      {item.remark ?? "-"}
                    </span>
                  </DataTableCell>
                  <DataTableCell compact className="justify-center border-r-0">
                    {isDashboard ? (
                      <Badge
                        size="sm"
                        color={isProductionComplete ? "success" : "primary"}
                        variant="light"
                      >
                        <span className="whitespace-nowrap tabular-nums">
                          {registered}
                          <span className="mx-0.5">/</span>
                          {qty}
                        </span>
                      </Badge>
                    ) : (
                      <span className={ORDER_LINE_NUMERIC_TEXT_CLASS}>
                        {registered}
                        {qty > 0 ? (
                          <span className="text-gray-400 dark:text-gray-500">
                            {" "}
                            / {qty}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </DataTableCell>
                </DataTableRow>
              );
            })
          )}
        </DataTableBody>
      </DataTable>
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
