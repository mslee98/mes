import { Link } from "react-router";
import type { CommonCodeItem } from "../../../api/commonCode";
import type {
  DeliveryPlanGroup,
  DeliveryPlanUnitSummary,
} from "../../../api/purchaseOrder";
import Badge from "../../ui/badge/Badge";
import {
  DataTableCell,
  DataTableRow,
  DATA_TABLE_COMPACT_BODY_TEXT_CLASS,
  DATA_TABLE_COMPACT_LINK_CLASS,
  DATA_TABLE_COMPACT_MUTED_TEXT_CLASS,
} from "../../list";
import { ProductionPlanProcessStageBadge } from "../ProductionPlanProcessStageBadge";
import {
  DELIVERY_PLAN_DETAIL_TABLE_GRID,
  deliveryPlanUnitProductSerialDisplay,
  deliveryReadyLabel,
  deliveryStatusLabel,
  labelForUnitProcessStatus,
  resolveUnitItemLabel,
  resolveUnitProductionPlanNo,
} from "../../../domains/delivery/helpers/deliveryPlanDetailHelpers";
import { labelForProcessCode } from "../../../domains/production-plan/labels/processLabels";
import { DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS } from "../../../domains/delivery/layout/deliveryUnitDataTableLayout";
import { EyeIcon, TrashBinIcon } from "../../../icons";

type DeliveryPlanUnitRowProps = {
  unit: DeliveryPlanUnitSummary;
  group: DeliveryPlanGroup;
  processStatusCodes: CommonCodeItem[];
  processStepCodes: CommonCodeItem[];
  editable: boolean;
  onRemove: (unit: DeliveryPlanUnitSummary) => void;
};

export function DeliveryPlanUnitRow({
  unit,
  group,
  processStatusCodes,
  processStepCodes,
  editable,
  onRemove,
}: DeliveryPlanUnitRowProps) {
  const unitId = String(unit.id).trim();
  const processName =
    unit.currentProcessName?.trim() ||
    labelForProcessCode(unit.currentProcessCode, processStepCodes);
  const processStatusName = labelForUnitProcessStatus(
    unit.processStatus,
    processStatusCodes
  );
  const readyLabel = deliveryReadyLabel(unit);
  const readyColor =
    unit.isDelivered === true
      ? "success"
      : unit.isDeliveryReady === true
        ? "success"
        : "warning";

  return (
    <DataTableRow
      gridTemplateColumns={DELIVERY_PLAN_DETAIL_TABLE_GRID}
      className={DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS}
    >
      <DataTableCell compact className="min-w-0 font-mono">
        <Link
          to={`/delivery/units/${encodeURIComponent(unitId)}`}
          className={`truncate ${DATA_TABLE_COMPACT_LINK_CLASS}`}
          title={unit.unitCode?.trim() || unitId}
        >
          {unit.unitCode?.trim() || unitId}
        </Link>
      </DataTableCell>
      <DataTableCell compact>
        {resolveUnitProductionPlanNo(unit, group)}
      </DataTableCell>
      <DataTableCell compact className="min-w-0 items-start">
        <span
          className={`truncate ${DATA_TABLE_COMPACT_BODY_TEXT_CLASS} text-gray-800 dark:text-white/90`}
          title={resolveUnitItemLabel(unit, group)}
        >
          {resolveUnitItemLabel(unit, group)}
        </span>
      </DataTableCell>
      <DataTableCell compact className="font-mono">
        {deliveryPlanUnitProductSerialDisplay(unit)}
      </DataTableCell>
      <DataTableCell compact>
        {processName}
      </DataTableCell>
      <DataTableCell compact align="center" className="gap-1">
        <span className={DATA_TABLE_COMPACT_MUTED_TEXT_CLASS}>
          {processStatusName}
        </span>
        <ProductionPlanProcessStageBadge unit={unit} />
      </DataTableCell>
      <DataTableCell compact align="center">
        <Badge size="sm" color={readyColor}>
          {readyLabel}
        </Badge>
      </DataTableCell>
      <DataTableCell compact align="center">
        {deliveryStatusLabel(unit)}
      </DataTableCell>
      <DataTableCell compact align="center" className="gap-1 border-r-0">
        <Link
          to={`/delivery/units/${encodeURIComponent(unitId)}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.08]"
          title="품목 상세"
        >
          <EyeIcon className="size-4" aria-hidden />
          <span className="sr-only">품목 상세</span>
        </Link>
        {editable && unit.isDelivered !== true ? (
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            title="납품 계획에서 제거"
            onClick={() => onRemove(unit)}
          >
            <TrashBinIcon className="size-4" aria-hidden />
            <span className="sr-only">제거</span>
          </button>
        ) : null}
      </DataTableCell>
    </DataTableRow>
  );
}
