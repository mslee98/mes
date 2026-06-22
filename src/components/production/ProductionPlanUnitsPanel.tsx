import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ListPageLoading from "../common/ListPageLoading";
import Button from "../ui/button/Button";
import Select from "../form/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { CommonCodeItem } from "../../api/commonCode";
import {
  addUnitsToDeliveryPlan,
  getProductionPlan,
  getPurchaseOrderDeliveryPlans,
} from "../../api/purchaseOrder";
import { DeliveryPlanCreateModal } from "../delivery/DeliveryPlanCreateModal";
import {
  formatPlanDeliveryActionFromLinkage,
} from "../../domains/production-plan/helpers/deliveryActionCopy";
import { flattenPlanUnits } from "../../domains/production-plan/helpers/detailHelpers";
import {
  computeDeliveryLinkageFromUnits,
  isUnitInDeliveryPlan,
} from "../../domains/production-plan/helpers/deliveryLinkage";
import { mapPlanDetailUnitsToListItems } from "../../domains/production-plan/mappers/listMappers";
import {
  isUnitSelectableForDeliveryPlan,
  validateDeliveryPlanUnitSelection,
} from "../../domains/delivery/helpers/deliveryPlanUnitSelection";
import { invalidateDeliveryPlanListQueries } from "../../domains/delivery/queries/invalidateDeliveryPlanListQueries";
import { isDeliveryPlanCompleted } from "../../domains/delivery/policy/unitDetailDeliveryPolicy";
import { useDeliveryPermissions } from "../../hooks/useDeliveryPermissions";
import { useDeliveryPlanUnitSelection } from "../../hooks/useDeliveryPlanUnitSelection";
import { notify } from "../../lib/notify";
import { ProductionPlanUnitNestedRow } from "./ProductionPlanUnitNestedRow";
import { DATA_TABLE_HEADER_LABEL_CLASS } from "../list/DataTable/dataTableStyles";

const NESTED_UNITS_DEFAULT_LIMIT = 5;
const NESTED_UNITS_LIMIT_STEP = 5;

type UnitVisibleLimit = 5 | 10 | "all";

const NESTED_HEADER_CELL = `px-2 py-1 ${DATA_TABLE_HEADER_LABEL_CLASS}`;

const NESTED_HEADER_START = `${NESTED_HEADER_CELL} text-start`;
const NESTED_HEADER_CENTER = `${NESTED_HEADER_CELL} text-center`;

const LIMIT_TOGGLE_BASE =
  "rounded-md px-2 py-0.5 text-theme-xs font-medium transition-colors";
const LIMIT_TOGGLE_ACTIVE =
  "bg-brand-500/15 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300";
const LIMIT_TOGGLE_IDLE =
  "text-gray-600 hover:bg-gray-200/80 dark:text-gray-400 dark:hover:bg-white/[0.08]";

type ProductionPlanUnitsPanelProps = {
  planId: string;
  planNo?: string;
  orderId?: string;
  accessToken: string;
  enabled: boolean;
  unitProcessStepCodes: CommonCodeItem[];
  todayYmd: string;
};

export function ProductionPlanUnitsPanel({
  planId,
  planNo: _planNo,
  orderId,
  accessToken,
  enabled,
  unitProcessStepCodes,
  todayYmd,
}: ProductionPlanUnitsPanelProps) {
  const queryClient = useQueryClient();
  const { canCreateDelivery } = useDeliveryPermissions();
  const {
    selectedItems,
    selectedCount,
    toggle,
    clear,
    isSelected,
    isRowCheckboxDisabled,
  } = useDeliveryPlanUnitSelection();

  const [visibleLimit, setVisibleLimit] = useState<UnitVisibleLimit>(
    NESTED_UNITS_DEFAULT_LIMIT
  );
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [targetDeliveryPlanId, setTargetDeliveryPlanId] = useState("");

  useEffect(() => {
    setVisibleLimit(NESTED_UNITS_DEFAULT_LIMIT);
    setUnassignedOnly(false);
    clear();
  }, [planId, clear]);

  const {
    data: plan,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["productionPlan", planId],
    queryFn: () => getProductionPlan(planId, accessToken),
    enabled: enabled && !!accessToken && String(planId).trim() !== "",
    staleTime: 0,
  });

  const resolvedOrderId = useMemo(() => {
    const fromProp = String(orderId ?? "").trim();
    if (fromProp) return fromProp;
    const fromPlan = String(
      plan?.purchaseOrderId ?? plan?.purchaseOrder?.id ?? ""
    ).trim();
    return fromPlan || "";
  }, [orderId, plan]);

  const unitRows = useMemo(() => {
    if (!plan) return [];
    const flat = flattenPlanUnits(plan.items);
    return mapPlanDetailUnitsToListItems(plan, flat);
  }, [plan]);

  const deliveryLinkage = useMemo(
    () => computeDeliveryLinkageFromUnits(unitRows),
    [unitRows]
  );
  const deliveryAction = useMemo(
    () => formatPlanDeliveryActionFromLinkage(deliveryLinkage, planId),
    [deliveryLinkage, planId]
  );

  const filteredRows = useMemo(() => {
    if (!unassignedOnly) return unitRows;
    return unitRows.filter((row) => !isUnitInDeliveryPlan(row));
  }, [unitRows, unassignedOnly]);

  const showCheckboxColumn = canCreateDelivery && deliveryLinkage.unassigned > 0;

  const { data: orderDeliveryPlans = [] } = useQuery({
    queryKey: ["purchaseOrderDeliveryPlans", resolvedOrderId],
    queryFn: () =>
      getPurchaseOrderDeliveryPlans(resolvedOrderId, accessToken),
    enabled:
      !!accessToken &&
      resolvedOrderId !== "" &&
      enabled &&
      selectedCount > 0 &&
      canCreateDelivery,
  });

  const openDeliveryPlans = useMemo(
    () =>
      orderDeliveryPlans.filter(
        (dp) => !isDeliveryPlanCompleted(String(dp.status ?? ""))
      ),
    [orderDeliveryPlans]
  );

  useEffect(() => {
    if (openDeliveryPlans.length === 1) {
      setTargetDeliveryPlanId(String(openDeliveryPlans[0]!.id).trim());
    } else if (
      targetDeliveryPlanId &&
      !openDeliveryPlans.some(
        (dp) => String(dp.id).trim() === targetDeliveryPlanId
      )
    ) {
      setTargetDeliveryPlanId("");
    }
  }, [openDeliveryPlans, targetDeliveryPlanId]);

  const addToExistingMutation = useMutation({
    mutationFn: async () => {
      const validation = validateDeliveryPlanUnitSelection(selectedItems);
      if (!validation.ok) throw new Error(validation.message);
      const dpId = targetDeliveryPlanId.trim();
      if (!dpId) throw new Error("추가할 납품 계획을 선택해 주세요.");
      await addUnitsToDeliveryPlan(
        dpId,
        { unitIds: validation.unitIds },
        accessToken
      );
    },
    onSuccess: async () => {
      notify.success("납품 계획에 유닛이 추가되었습니다.");
      clear();
      await Promise.all([
        invalidateDeliveryPlanListQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: ["productionPlan", planId] }),
        queryClient.invalidateQueries({ queryKey: ["productionPlans"] }),
        queryClient.invalidateQueries({ queryKey: ["productionPlanUnits"] }),
      ]);
    },
    onError: (err: Error) => {
      notify.error(err.message || "유닛 추가에 실패했습니다.");
    },
  });

  const handleCreateSuccess = useCallback(async () => {
    clear();
    await Promise.all([
      invalidateDeliveryPlanListQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: ["productionPlan", planId] }),
      queryClient.invalidateQueries({ queryKey: ["productionPlans"] }),
      queryClient.invalidateQueries({ queryKey: ["productionPlanUnits"] }),
    ]);
  }, [clear, planId, queryClient]);

  const totalUnits = filteredRows.length;
  const resolvedVisibleCount =
    visibleLimit === "all" ? totalUnits : Math.min(visibleLimit, totalUnits);
  const visibleRows = filteredRows.slice(0, resolvedVisibleCount);
  const hiddenUnitCount = Math.max(0, totalUnits - resolvedVisibleCount);
  const showLimitFooter = totalUnits > NESTED_UNITS_DEFAULT_LIMIT;

  if (isLoading) {
    return (
      <div className="border-t border-gray-100 bg-gray-50/40 px-3 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <ListPageLoading
          message="유닛 목록을 불러오는 중입니다."
          skeletonRows={2}
          minHeight={80}
        />
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : "유닛 목록을 불러오지 못했습니다.";
    const isForbidden =
      message.includes("403") ||
      message.toLowerCase().includes("권한") ||
      message.toLowerCase().includes("forbidden");
    return (
      <div className="border-t border-gray-100 bg-gray-50/40 px-3 py-4 text-center text-sm text-red-600 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-red-400">
        {isForbidden
          ? "생산 계획 상세 조회 권한이 없어 유닛을 표시할 수 없습니다."
          : message}
      </div>
    );
  }

  if (unitRows.length === 0) {
    return (
      <div className="border-t border-gray-100 bg-gray-50/40 px-3 py-4 text-center text-sm text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-400">
        유닛 없음
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50/40 text-gray-800 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-300">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-theme-xs font-medium tabular-nums text-gray-600 dark:text-gray-300">
            유닛 {resolvedVisibleCount} / {totalUnits}
            {unassignedOnly ? " (미배정)" : ""}
          </span>
          <span className="text-theme-xs text-gray-600 dark:text-gray-300">
            {deliveryAction.summaryLine}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {deliveryLinkage.unassigned > 0 ? (
            <button
              type="button"
              className={`${LIMIT_TOGGLE_BASE} ${
                unassignedOnly ? LIMIT_TOGGLE_ACTIVE : LIMIT_TOGGLE_IDLE
              }`}
              onClick={() => setUnassignedOnly((v) => !v)}
            >
              미배정만 보기
            </button>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto px-2 sm:px-3">
        <Table className="min-w-[40rem]">
          <TableHeader className="border-b border-gray-200 bg-gray-100/90 dark:border-white/[0.08] dark:bg-white/[0.05]">
            <TableRow className="hover:bg-transparent">
              {showCheckboxColumn ? (
                <TableCell
                  isHeader
                  className={`${NESTED_HEADER_CENTER} w-8`}
                >
                  <span className="sr-only">선택</span>
                </TableCell>
              ) : null}
              <TableCell isHeader className={`${NESTED_HEADER_CENTER} w-9`}>
                No.
              </TableCell>
              <TableCell isHeader className={`${NESTED_HEADER_START} min-w-[9rem]`}>
                LOT
              </TableCell>
              <TableCell isHeader className={`${NESTED_HEADER_START} min-w-[9rem]`}>
                시리얼
              </TableCell>
              <TableCell isHeader className={`${NESTED_HEADER_START} min-w-[8rem]`}>
                품목
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CENTER} min-w-[5.5rem]`}
              >
                생산 담당
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CENTER} min-w-[6.5rem]`}
              >
                현재 공정
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CENTER} w-[4.5rem]`}
              >
                상태
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CENTER} min-w-[6.5rem]`}
              >
                발주
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CENTER} min-w-[6rem]`}
              >
                납품
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CENTER} min-w-[5.5rem]`}
              >
                최종 납기
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200/80 dark:divide-white/[0.06]">
            {visibleRows.map((row, index) => (
              <ProductionPlanUnitNestedRow
                key={row.unitId?.trim() || `unit-row-${index}`}
                row={row}
                index={index}
                page={1}
                pageSize={visibleRows.length}
                unitProcessStepCodes={unitProcessStepCodes}
                todayYmd={todayYmd}
                showCheckbox={isUnitSelectableForDeliveryPlan(row)}
                reserveCheckboxColumn={showCheckboxColumn}
                checked={isSelected(row.unitId)}
                checkboxDisabled={isRowCheckboxDisabled(row)}
                onToggle={toggle}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {showLimitFooter ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-gray-200/80 px-3 py-2 dark:border-white/[0.06]">
          <span className="mr-1 text-theme-xs text-gray-500 dark:text-gray-400">
            표시
          </span>
          {([5, 10] as const).map((limit) => (
            <button
              key={limit}
              type="button"
              disabled={totalUnits < limit}
              className={`${LIMIT_TOGGLE_BASE} ${
                visibleLimit === limit
                  ? LIMIT_TOGGLE_ACTIVE
                  : LIMIT_TOGGLE_IDLE
              } disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() => setVisibleLimit(limit)}
            >
              {limit}건
            </button>
          ))}
          {hiddenUnitCount > 0 ? (
            <button
              type="button"
              className={`${LIMIT_TOGGLE_BASE} ${LIMIT_TOGGLE_IDLE}`}
              onClick={() => {
                if (visibleLimit === 5) {
                  setVisibleLimit(10);
                } else {
                  setVisibleLimit("all");
                }
              }}
            >
              {hiddenUnitCount <= NESTED_UNITS_LIMIT_STEP
                ? `${hiddenUnitCount}건 더 보기`
                : `+${NESTED_UNITS_LIMIT_STEP}건 더`}
            </button>
          ) : null}
          {totalUnits > 10 && visibleLimit !== "all" ? (
            <button
              type="button"
              className={`${LIMIT_TOGGLE_BASE} ${LIMIT_TOGGLE_IDLE}`}
              onClick={() => setVisibleLimit("all")}
            >
              전체 {totalUnits}건
            </button>
          ) : null}
        </div>
      ) : null}
      {showCheckboxColumn && selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center gap-3 border-t border-gray-200/80 px-3 py-2.5 dark:border-white/[0.06]"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-theme-xs text-gray-600 dark:text-gray-300">
            {selectedCount}건 선택
          </span>
          <Button size="sm" onClick={() => setCreatePlanOpen(true)}>
            새 납품 계획 만들기
          </Button>
          {openDeliveryPlans.length > 0 ? (
            <>
              {openDeliveryPlans.length > 1 ? (
                <div className="min-w-[10rem]">
                  <Select
                    size="sm"
                    options={openDeliveryPlans.map((dp) => ({
                      value: String(dp.id).trim(),
                      label: dp.planNo?.trim() || String(dp.id),
                    }))}
                    placeholder="납품 계획 선택"
                    defaultValue={targetDeliveryPlanId}
                    onChange={setTargetDeliveryPlanId}
                  />
                </div>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={addToExistingMutation.isPending}
                onClick={() => addToExistingMutation.mutate()}
              >
                기존 계획에 추가
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      <DeliveryPlanCreateModal
        isOpen={createPlanOpen}
        onClose={() => setCreatePlanOpen(false)}
        selectedUnits={selectedItems}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
