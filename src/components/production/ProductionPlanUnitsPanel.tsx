import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ListPageLoading from "../common/ListPageLoading";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { CommonCodeItem } from "../../api/commonCode";
import { getProductionPlan } from "../../api/purchaseOrder";
import { flattenPlanUnits } from "../../domains/production-plan/helpers/detailHelpers";
import { mapPlanDetailUnitsToListItems } from "../../domains/production-plan/mappers/listMappers";
import { ProductionPlanUnitNestedRow } from "./ProductionPlanUnitNestedRow";

const NESTED_UNITS_DEFAULT_LIMIT = 5;
const NESTED_UNITS_LIMIT_STEP = 5;

type UnitVisibleLimit = 5 | 10 | "all";

const NESTED_HEADER_CELL =
  "px-2 py-1 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400";

const LIMIT_TOGGLE_BASE =
  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors";
const LIMIT_TOGGLE_ACTIVE =
  "bg-brand-500/15 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300";
const LIMIT_TOGGLE_IDLE =
  "text-gray-600 hover:bg-gray-200/80 dark:text-gray-400 dark:hover:bg-white/[0.08]";

type ProductionPlanUnitsPanelProps = {
  planId: string;
  accessToken: string;
  enabled: boolean;
  unitProcessStepCodes: CommonCodeItem[];
  todayYmd: string;
};

export function ProductionPlanUnitsPanel({
  planId,
  accessToken,
  enabled,
  unitProcessStepCodes,
  todayYmd,
}: ProductionPlanUnitsPanelProps) {
  const [visibleLimit, setVisibleLimit] = useState<UnitVisibleLimit>(
    NESTED_UNITS_DEFAULT_LIMIT
  );

  useEffect(() => {
    setVisibleLimit(NESTED_UNITS_DEFAULT_LIMIT);
  }, [planId]);

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

  const unitRows = useMemo(() => {
    if (!plan) return [];
    const flat = flattenPlanUnits(plan.items);
    return mapPlanDetailUnitsToListItems(plan, flat);
  }, [plan]);

  const totalUnits = unitRows.length;
  const resolvedVisibleCount =
    visibleLimit === "all"
      ? totalUnits
      : Math.min(visibleLimit, totalUnits);
  const visibleRows = unitRows.slice(0, resolvedVisibleCount);
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
      <div className="px-3 py-1.5">
        <span className="text-[11px] font-medium tabular-nums text-gray-600 dark:text-gray-300">
          유닛 {resolvedVisibleCount} / {totalUnits}
        </span>
      </div>
      <div className="overflow-x-auto px-2 sm:px-3">
        <Table className="min-w-[36rem]">
          <TableHeader className="border-b border-gray-200 bg-gray-100/90 dark:border-white/[0.08] dark:bg-white/[0.05]">
            <TableRow className="hover:bg-transparent">
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CELL} w-9 text-center`}
              >
                No.
              </TableCell>
              <TableCell isHeader className={`${NESTED_HEADER_CELL} min-w-[9rem]`}>
                LOT
              </TableCell>
              <TableCell isHeader className={`${NESTED_HEADER_CELL} min-w-[9rem]`}>
                시리얼
              </TableCell>
              <TableCell isHeader className={`${NESTED_HEADER_CELL} min-w-[8rem]`}>
                품목
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CELL} min-w-[5.5rem] text-center`}
              >
                생산 담당
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CELL} min-w-[6.5rem] text-center`}
              >
                현재 공정
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CELL} w-[4.5rem] text-center`}
              >
                상태
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CELL} min-w-[6.5rem] text-center`}
              >
                발주
              </TableCell>
              <TableCell
                isHeader
                className={`${NESTED_HEADER_CELL} min-w-[5.5rem] text-center`}
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
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {showLimitFooter ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-gray-200/80 px-3 py-2 dark:border-white/[0.06]">
          <span className="mr-1 text-[11px] text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
