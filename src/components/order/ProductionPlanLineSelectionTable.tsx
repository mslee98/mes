import Checkbox from "../form/input/Checkbox";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
} from "../list";
import type { PurchaseOrderItem } from "../../api/purchaseOrder";
import { getOrderLineDisplayName } from "../../domains/order/display/orderLineDisplay";
import { PRODUCTION_PLAN_LINE_SELECTION_GRID_TEMPLATE } from "../../domains/order/layout/orderDetailLinesTableLayout";
import {
  parsePlanLineQtyInput,
  type PlanLineDraft,
  unplannedQtyForLine,
} from "../../domains/production-plan/helpers/lineSelection";

type ProductionPlanLineSelectionTableProps = {
  orderLines: PurchaseOrderItem[];
  drafts: PlanLineDraft[];
  registeredQtyByOrderItemId: Map<number, number>;
  onDraftChange: (orderItemId: number, patch: Partial<PlanLineDraft>) => void;
};

export function ProductionPlanLineSelectionTable({
  orderLines,
  drafts,
  registeredQtyByOrderItemId,
  onDraftChange,
}: ProductionPlanLineSelectionTableProps) {
  const draftByItemId = new Map(drafts.map((d) => [d.orderItemId, d]));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
      <DataTable fillWidth minWidth={0}>
        <DataTableHeader
          gridTemplateColumns={PRODUCTION_PLAN_LINE_SELECTION_GRID_TEMPLATE}
        >
          <DataTableHeaderCell compact sortable={false} className="justify-center">
            <DataTableHeaderLabel className="w-full text-center">선택</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-start">
            <DataTableHeaderLabel className="w-full text-left">품목명</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-center">
            <DataTableHeaderLabel className="w-full text-center">발주수량</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-center">
            <DataTableHeaderLabel className="w-full text-center">미계획수량</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-center">
            <DataTableHeaderLabel className="w-full text-center">이번 생산수량</DataTableHeaderLabel>
          </DataTableHeaderCell>
          <DataTableHeaderCell compact sortable={false} className="justify-center border-r-0">
            <DataTableHeaderLabel className="w-full text-center">잔여</DataTableHeaderLabel>
          </DataTableHeaderCell>
        </DataTableHeader>
        <DataTableBody>
          {orderLines.length === 0 ? (
            <DataTableRow
              gridTemplateColumns={PRODUCTION_PLAN_LINE_SELECTION_GRID_TEMPLATE}
            >
              <DataTableCell colSpan={6} compact className="justify-center border-r-0 py-4">
                등록된 발주 품목이 없습니다.
              </DataTableCell>
            </DataTableRow>
          ) : (
            orderLines.map((line) => {
              const draft = draftByItemId.get(line.id) ?? {
                orderItemId: line.id,
                selected: false,
                qtyInput: "",
              };
              const orderQty = Math.max(0, Math.floor(Number(line.qty) || 0));
              const unplanned = unplannedQtyForLine(
                line,
                registeredQtyByOrderItemId
              );
              const rowDisabled = unplanned <= 0;
              const qtyDisabled = rowDisabled || !draft.selected;
              const thisQty = parsePlanLineQtyInput(draft.qtyInput) ?? 0;
              const displayedLineRemaining = unplanned - thisQty;

              return (
                <DataTableRow
                  key={line.id}
                  gridTemplateColumns={PRODUCTION_PLAN_LINE_SELECTION_GRID_TEMPLATE}
                >
                  <DataTableCell compact className="justify-center">
                    <Checkbox
                      checked={draft.selected}
                      disabled={rowDisabled}
                      onChange={(checked) =>
                        onDraftChange(line.id, {
                          selected: checked,
                          ...(checked ? {} : { qtyInput: "" }),
                        })
                      }
                      aria-label={`${getOrderLineDisplayName(line)} 선택`}
                    />
                  </DataTableCell>
                  <DataTableCell compact className="min-w-0 justify-start">
                    <p className="break-words text-left text-theme-sm font-medium text-gray-900 dark:text-white">
                      {getOrderLineDisplayName(line)}
                    </p>
                  </DataTableCell>
                  <DataTableCell compact className="justify-center tabular-nums">
                    {orderQty}
                  </DataTableCell>
                  <DataTableCell compact className="justify-center tabular-nums">
                    {unplanned}
                  </DataTableCell>
                  <DataTableCell compact className="justify-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={qtyDisabled}
                      value={draft.qtyInput}
                      onChange={(e) =>
                        onDraftChange(line.id, {
                          qtyInput: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="0"
                      aria-label={`${getOrderLineDisplayName(line)} 이번 생산수량`}
                      className="h-8 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 text-center text-sm tabular-nums text-gray-900 shadow-theme-xs disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
                    />
                  </DataTableCell>
                  <DataTableCell compact className="justify-center border-r-0 tabular-nums">
                    {draft.selected && !rowDisabled ? (
                      <span
                        className={
                          thisQty > unplanned
                            ? "font-medium text-amber-700 dark:text-amber-400"
                            : thisQty > 0
                              ? "font-semibold text-brand-600 dark:text-brand-400"
                              : "text-gray-700 dark:text-gray-300"
                        }
                      >
                        {displayedLineRemaining}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
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
}
