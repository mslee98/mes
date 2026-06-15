import type { PurchaseOrderItem } from "../../api/purchaseOrder";
import {
  formatOrderLineQtyLabel,
  getOrderLineDisplayName,
  getOrderLineLensDisplayName,
} from "../../domains/order/display/orderLineDisplay";
import { detectorLabelFromOrderLine } from "../../domains/order/helpers/orderLineItemRow";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
} from "../list";
import { PRODUCTION_PLAN_ORDER_LINES_GRID_TEMPLATE } from "../../domains/order/layout/orderDetailLinesTableLayout";

/** 스크롤 전 표시할 최대 라인 수 (참고용 — 영역 절약) */
const LINES_PREVIEW_MAX_VISIBLE_ROWS = 4;

type ProductionPlanOrderLinesPreviewProps = {
  orderLines: PurchaseOrderItem[];
};

export function ProductionPlanOrderLinesPreview({
  orderLines,
}: ProductionPlanOrderLinesPreviewProps) {
  if (orderLines.length === 0) return null;

  const scrollable = orderLines.length > LINES_PREVIEW_MAX_VISIBLE_ROWS;

  return (
    <div
      className={`w-full ${
        scrollable
          ? "max-h-[6.75rem] overflow-y-auto overscroll-contain"
          : ""
      }`.trim()}
    >
      <DataTable fillWidth minWidth={0}>
        <DataTableHeader
          gridTemplateColumns={PRODUCTION_PLAN_ORDER_LINES_GRID_TEMPLATE}
          className="sticky top-0 z-[1] bg-gray-50/95 dark:bg-gray-900/95"
        >
          <DataTableHeaderCell compact sortable={false} className="justify-start">
            <DataTableHeaderLabel className="w-full text-left">품목명</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-start">
            <DataTableHeaderLabel className="w-full text-left">검출기</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-start">
            <DataTableHeaderLabel className="w-full text-left">렌즈</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-start border-r-0">
            <DataTableHeaderLabel className="w-full text-left">발주수량</DataTableHeaderLabel>
          </DataTableHeaderCell>
        </DataTableHeader>
        <DataTableBody>
          {orderLines.map((line) => {
            const productLabel = getOrderLineDisplayName(line);
            const detectorLabel = detectorLabelFromOrderLine(line);
            const lensLabel = getOrderLineLensDisplayName(line);
            const qtyLabel = formatOrderLineQtyLabel(line);

            return (
              <DataTableRow
                key={line.id}
                gridTemplateColumns={PRODUCTION_PLAN_ORDER_LINES_GRID_TEMPLATE}
              >
                <DataTableCell compact className="min-w-0 items-start justify-start">
                  <span
                    className="block truncate text-left text-[11px] text-gray-800 dark:text-gray-200"
                    title={productLabel}
                  >
                    {productLabel}
                  </span>
                </DataTableCell>
                <DataTableCell compact className="min-w-0 items-start justify-start">
                  <span
                    className="block truncate text-left text-[11px] text-gray-700 dark:text-gray-300"
                    title={detectorLabel}
                  >
                    {detectorLabel}
                  </span>
                </DataTableCell>
                <DataTableCell compact className="min-w-0 items-start justify-start">
                  <span
                    className="block truncate text-left text-[11px] text-gray-700 dark:text-gray-300"
                    title={lensLabel}
                  >
                    {lensLabel}
                  </span>
                </DataTableCell>
                <DataTableCell
                  compact
                  className="items-start justify-start border-r-0 tabular-nums text-left text-[11px] text-gray-600 dark:text-gray-300"
                >
                  {qtyLabel}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
