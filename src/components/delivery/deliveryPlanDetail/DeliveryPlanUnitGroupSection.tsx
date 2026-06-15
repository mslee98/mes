import { useState } from "react";
import type { CommonCodeItem } from "../../../api/commonCode";
import type {
  DeliveryPlanGroup,
  DeliveryPlanUnitSummary,
} from "../../../api/purchaseOrder";
import {
  DataTable,
  DataTableBody,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
} from "../../list";
import {
  DELIVERY_PLAN_DETAIL_TABLE_GRID,
  resolveGroupItemLabel,
} from "../../../domains/delivery/helpers/deliveryPlanDetailHelpers";
import { DeliveryPlanUnitRow } from "./DeliveryPlanUnitRow";
import { ChevronDownIcon, ChevronUpIcon } from "../../../icons";

type DeliveryPlanUnitGroupSectionProps = {
  group: DeliveryPlanGroup;
  units: DeliveryPlanUnitSummary[];
  groupKey: string;
  processStatusCodes: CommonCodeItem[];
  processStepCodes: CommonCodeItem[];
  editable: boolean;
  onRemove: (unit: DeliveryPlanUnitSummary) => void;
  defaultExpanded?: boolean;
};

export function DeliveryPlanUnitGroupSection({
  group,
  units,
  groupKey,
  processStatusCodes,
  processStepCodes,
  editable,
  onRemove,
  defaultExpanded = true,
}: DeliveryPlanUnitGroupSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const ppLabel =
    group.productionPlanNo?.trim() ||
    group.productionPlanTitle?.trim() ||
    "생산 계획";
  const itemLabel = resolveGroupItemLabel(group);

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.06]">
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-3 text-left dark:border-white/[0.05] dark:bg-white/[0.03]"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronUpIcon className="size-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
        ) : (
          <ChevronDownIcon className="size-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
        )}
        <span className="text-theme-sm font-semibold text-gray-900 dark:text-white">
          {ppLabel}
        </span>
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">/</span>
        <span className="truncate text-theme-sm text-gray-700 dark:text-gray-300">
          {itemLabel}
        </span>
        <span className="ml-auto shrink-0 text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">
          {units.length}대
        </span>
      </button>

      {expanded ? (
        <DataTable fillWidth minWidth={0} scrollContainer={false}>
          <DataTableHeader
            gridTemplateColumns={DELIVERY_PLAN_DETAIL_TABLE_GRID}
            className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          >
            <DataTableHeaderCell compact sortable={false}>
              <DataTableHeaderLabel>LOT / 품목</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell compact sortable={false}>
              <DataTableHeaderLabel>PP 번호</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell compact sortable={false}>
              <DataTableHeaderLabel>품목</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell compact sortable={false}>
              <DataTableHeaderLabel>제품 S/N</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell compact sortable={false}>
              <DataTableHeaderLabel>현재 공정</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell compact sortable={false} className="justify-center">
              <DataTableHeaderLabel className="w-full text-center">
                공정 상태
              </DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell compact sortable={false} className="justify-center">
              <DataTableHeaderLabel className="w-full text-center">
                납품 가능
              </DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell compact sortable={false} className="justify-center">
              <DataTableHeaderLabel className="w-full text-center">
                납품 상태
              </DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell
              compact
              sortable={false}
              className="justify-center border-r-0"
            >
              <DataTableHeaderLabel className="w-full text-center">액션</DataTableHeaderLabel>
            </DataTableHeaderCell>
          </DataTableHeader>
          <DataTableBody>
            {units.map((unit) => {
              const unitId = String(unit.id).trim();
              return (
                <DeliveryPlanUnitRow
                  key={`${groupKey}-${unitId}`}
                  unit={unit}
                  group={group}
                  processStatusCodes={processStatusCodes}
                  processStepCodes={processStepCodes}
                  editable={editable}
                  onRemove={onRemove}
                />
              );
            })}
          </DataTableBody>
        </DataTable>
      ) : null}
    </section>
  );
}
