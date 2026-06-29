import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addUnitsToDeliveryPlan,
  getProductionPlanUnits,
  type ProductionPlanUnitListItem,
} from "../../../api/purchaseOrder";
import Checkbox from "../../form/input/Checkbox";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
} from "../../list";
import { Modal } from "../../ui/modal";
import Button from "../../ui/button/Button";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../lib/notify";
import { invalidateProductionPlanUnitListQueries } from "../../../domains/production-plan/queries/invalidateUnitListQueries";
import { invalidateDeliveryPlanListQueries } from "../../../domains/delivery/queries/invalidateDeliveryPlanListQueries";
import { listUnitLotCode } from "../../../domains/delivery/display/deliveryUnitListDisplay";
import { DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS } from "../../../domains/delivery/layout/deliveryUnitDataTableLayout";
import { DATA_TABLE_COMPACT_BODY_TEXT_CLASS } from "../../list";

const ADD_UNITS_MODAL_GRID_TEMPLATE =
  "2.5rem minmax(5.5rem, 1.1fr) minmax(8rem, 2fr) minmax(5.5rem, 1.2fr)";

type DeliveryPlanAddUnitsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  purchaseOrderId: string;
  existingUnitIds: ReadonlySet<string>;
};

export function DeliveryPlanAddUnitsModal({
  isOpen,
  onClose,
  planId,
  purchaseOrderId,
  existingUnitIds,
}: DeliveryPlanAddUnitsModalProps) {
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["productionPlanUnits", "addToDp", purchaseOrderId],
    queryFn: async () => {
      const tabs = ["WAITING", "IN_PROGRESS", "COMPLETED", "DELAYED"] as const;
      const responses = await Promise.all(
        tabs.map((tab) =>
          getProductionPlanUnits(accessToken!, {
            tab,
            perspective: "production",
            orderId: purchaseOrderId,
            deliveryPlanAssignment: "unassigned",
            page: 1,
            pageSize: 500,
          })
        )
      );
      const seen = new Set<string>();
      const items: ProductionPlanUnitListItem[] = [];
      for (const response of responses) {
        for (const row of response.items ?? []) {
          const unitId = String(row.unitId ?? "").trim();
          if (!unitId || seen.has(unitId)) continue;
          seen.add(unitId);
          items.push(row);
        }
      }
      return items;
    },
    enabled:
      isOpen && !!accessToken && !isAuthLoading && purchaseOrderId.trim() !== "",
  });

  const candidates = useMemo(() => {
    const items = data ?? [];
    return items.filter((row) => {
      const unitId = String(row.unitId ?? "").trim();
      if (!unitId) return false;
      if (existingUnitIds.has(unitId)) return false;
      if (row.isDelivered === true) return false;
      return true;
    });
  }, [data, existingUnitIds]);

  const toggleRow = useCallback((row: ProductionPlanUnitListItem, checked: boolean) => {
    const unitId = String(row.unitId ?? "").trim();
    if (!unitId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(unitId);
      else next.delete(unitId);
      return next;
    });
  }, []);

  const addMutation = useMutation({
    mutationFn: async () => {
      const unitIds = [...selectedIds];
      if (unitIds.length === 0) {
        throw new Error("추가할 품목을 선택하세요.");
      }
      return addUnitsToDeliveryPlan(
        planId,
        { unitIds },
        accessToken!
      );
    },
    onSuccess: () => {
      notify.success("품목이 납품 계획에 추가되었습니다.");
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["deliveryPlan", planId] });
      void invalidateDeliveryPlanListQueries(queryClient);
      void invalidateProductionPlanUnitListQueries(queryClient);
      onClose();
    },
    onError: (e: Error) => {
      notify.error(e.message || "품목 추가에 실패했습니다.");
    },
  });

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="mx-4 flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-6"
      header={
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            품목 추가
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            납품 계획에 포함되지 않은 품목만 표시됩니다.
          </p>
        </>
      }
    >
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg border border-gray-100 dark:border-white/[0.06]">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
              목록을 불러오는 중입니다.
            </p>
          ) : candidates.length === 0 ? (
            <p className="px-4 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
              추가 가능한 품목이 없습니다.
            </p>
          ) : (
            <DataTable fillWidth minWidth={0} scrollContainer={false}>
              <DataTableHeader
                gridTemplateColumns={ADD_UNITS_MODAL_GRID_TEMPLATE}
                className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                <DataTableHeaderCell compact sortable={false} align="center">
                  <DataTableHeaderLabel align="center">선택</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell compact sortable={false} align="center">
                  <DataTableHeaderLabel align="center">LOT</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell compact sortable={false} align="center">
                  <DataTableHeaderLabel align="center">품목</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  compact
                  sortable={false}
                  align="center"
                  className="border-r-0"
                >
                  <DataTableHeaderLabel align="center">생산 계획</DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                {candidates.map((row) => {
                  const unitId = String(row.unitId ?? "").trim();
                  const checked = selectedIds.has(unitId);
                  return (
                    <DataTableRow
                      key={unitId}
                      gridTemplateColumns={ADD_UNITS_MODAL_GRID_TEMPLATE}
                      className={DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS}
                    >
                      <DataTableCell compact align="center">
                        <Checkbox
                          checked={checked}
                          onChange={(next) => toggleRow(row, next)}
                        />
                      </DataTableCell>
                      <DataTableCell
                        compact
                        align="center"
                        className="font-mono"
                        textClassName="text-theme-xs font-mono text-gray-800 dark:text-white/90"
                      >
                        {listUnitLotCode(row)}
                      </DataTableCell>
                      <DataTableCell compact align="center" className="min-w-0">
                        <div className="flex min-w-0 flex-col items-center justify-center leading-tight">
                          <p className="w-full truncate text-theme-xs font-medium text-gray-900 dark:text-white">
                            {row.item?.businessNameSnapshot?.trim() || "—"}
                          </p>
                          <p className="w-full truncate text-theme-xs text-gray-500 dark:text-gray-400">
                            {row.item?.productNameSnapshot?.trim() || "—"}
                          </p>
                        </div>
                      </DataTableCell>
                      <DataTableCell
                        compact
                        align="center"
                        className="border-r-0"
                        textClassName={DATA_TABLE_COMPACT_BODY_TEXT_CLASS}
                      >
                        {row.plan?.planNo?.trim() || row.plan?.planId || "—"}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2">
          <span className="text-theme-sm text-gray-600 dark:text-gray-400">
            {selectedIds.size}건 선택
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={addMutation.isPending || selectedIds.size === 0}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? "추가 중..." : "추가"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
