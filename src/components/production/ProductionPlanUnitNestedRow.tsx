import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import type { CommonCodeItem } from "../../api/commonCode";
import type {
  ProductionPlanUnit,
} from "../../api/purchaseOrder";
import { getUnitCheckboxDisabledReason } from "../../domains/delivery/helpers/deliveryPlanUnitSelection";
import { ProductionPlanProcessStageBadge } from "../production-plan/ProductionPlanProcessStageBadge";
import Badge from "../ui/badge/Badge";
import Checkbox from "../form/input/Checkbox";
import { TableCell, TableRow } from "../ui/table";
import { formatDateYmd } from "../../lib/format/dateFormat";
import {
  dueDateDdayBadgeClassName,
  getDueDateRelative,
} from "../../lib/format/dueDateDisplay";
import { isUnitDeliveryOrProductionFinished } from "../../domains/production-plan/helpers/planCompletion";
import { formatUnitDeliveryStatus } from "../../domains/production-plan/helpers/deliveryActionCopy";
import {
  currentProcessDisplay,
  listDetectorSerialDisplay,
  listOperatorDisplay,
  listProductSerialDisplay,
  listUnitIndexLabel,
  listUnitLotOrDetailLabel,
  listUnitLotCode,
  unitDetailPath,
  deliveryUnitAssignedRowClassName,
  isUnitAssignedToDeliveryPlan,
  type DeliveryUnitListRow as DeliveryUnitListRowData,
} from "../../domains/delivery/display/deliveryUnitListDisplay";
import {
  DATA_TABLE_COMPACT_BODY_TEXT_CLASS,
  DATA_TABLE_COMPACT_LABEL_CLASS,
  DATA_TABLE_COMPACT_LINK_CLASS,
  DATA_TABLE_COMPACT_STACK_CLASS,
  DATA_TABLE_COMPACT_STACK_ROW_CLASS,
} from "../list/DataTable/dataTableStyles";

const NESTED_CELL =
  `px-2 py-1 align-middle leading-snug ${DATA_TABLE_COMPACT_BODY_TEXT_CLASS}`;

const NESTED_CELL_START = `${NESTED_CELL} text-start`;
const NESTED_CELL_CENTER = `${NESTED_CELL} text-center`;

function toProcessBadgeUnit(
  row: DeliveryUnitListRowData
): Pick<
  ProductionPlanUnit,
  "processStatus" | "currentProcessCode" | "isDeliveryReady" | "isDelivered"
> {
  return {
    processStatus: row.processStatus ?? null,
    currentProcessCode: row.currentProcessCode ?? null,
    isDeliveryReady: row.isDeliveryReady === true,
    isDelivered: row.isDelivered === true,
  };
}

export type ProductionPlanUnitNestedRowProps = {
  row: DeliveryUnitListRowData;
  index: number;
  page: number;
  pageSize: number;
  unitProcessStepCodes: CommonCodeItem[];
  todayYmd: string;
  showCheckbox?: boolean;
  checked?: boolean;
  checkboxDisabled?: boolean;
  checkboxDisabledReason?: string | null;
  checkboxOrderMismatchHint?: string | null;
  onToggle?: (row: DeliveryUnitListRowData, checked: boolean) => void;
};

/** 생산 계획 목록 펼침 — 컴팩트 유닛 행(행 클릭 → 유닛 상세) */
export function ProductionPlanUnitNestedRow({
  row,
  index,
  page,
  pageSize,
  unitProcessStepCodes,
  todayYmd,
  showCheckbox = false,
  checked = false,
  checkboxDisabled = false,
  checkboxDisabledReason = null,
  checkboxOrderMismatchHint = null,
  onToggle,
}: ProductionPlanUnitNestedRowProps) {
  const navigate = useNavigate();
  const detailPath = unitDetailPath(row.unitId);
  const lotLabel = listUnitLotOrDetailLabel(row);
  const hasLot = listUnitLotCode(row) !== "—";
  const business = row.item?.businessNameSnapshot?.trim();
  const product = row.item?.productNameSnapshot?.trim();
  const productSn = listProductSerialDisplay(row);
  const detectorSn = listDetectorSerialDisplay(row);
  const dueRel = isUnitDeliveryOrProductionFinished(row)
    ? null
    : getDueDateRelative(row.dueDate, { todayYmd });
  const deliveryStatus = formatUnitDeliveryStatus(row);
  const isAssignedToDeliveryPlan = isUnitAssignedToDeliveryPlan(row);
  const resolvedDisabledReason =
    checkboxDisabledReason ?? getUnitCheckboxDisabledReason(row);
  const checkboxTitle =
    checkboxOrderMismatchHint ?? resolvedDisabledReason ?? undefined;

  const openUnitDetail = () => {
    if (detailPath) navigate(detailPath);
  };

  return (
    <TableRow
      className={`${detailPath ? "cursor-pointer" : ""}${
        isAssignedToDeliveryPlan ? ` ${deliveryUnitAssignedRowClassName()}` : ""
      }`}
      onClick={detailPath ? openUnitDetail : undefined}
      title={detailPath ? "유닛 상세로 이동" : undefined}
    >
      {showCheckbox ? (
        <TableCell
          className={`${NESTED_CELL_CENTER} w-9`}
          onClick={(e: MouseEvent) => e.stopPropagation()}
          title={checkboxTitle}
        >
          <Checkbox
            checked={checked}
            disabled={checkboxDisabled}
            onChange={(next) => onToggle?.(row, next)}
          />
        </TableCell>
      ) : null}
      <TableCell className={`${NESTED_CELL_CENTER} w-9 tabular-nums`}>
        <span
          className={
            detailPath
              ? DATA_TABLE_COMPACT_LINK_CLASS
              : "font-mono text-gray-500"
          }
        >
          {listUnitIndexLabel(index, page, pageSize)}
        </span>
      </TableCell>
      <TableCell className={`${NESTED_CELL_START} min-w-[9rem] max-w-[12rem]`}>
        <span
          className={`block truncate font-mono font-semibold ${
            detailPath
              ? DATA_TABLE_COMPACT_LINK_CLASS
              : "text-gray-500 dark:text-gray-400"
          } ${!hasLot && detailPath ? "font-normal" : ""}`}
          title={
            hasLot
              ? `LOT · ${lotLabel}`
              : detailPath
                ? `LOT 미부여 · 유닛 ${lotLabel}`
                : lotLabel
          }
        >
          {lotLabel}
        </span>
      </TableCell>
      <TableCell className={`${NESTED_CELL_START} min-w-[9rem] max-w-[13rem] font-mono`}>
        <div className={DATA_TABLE_COMPACT_STACK_CLASS}>
          <div className={DATA_TABLE_COMPACT_STACK_ROW_CLASS} title={productSn}>
            <span className={DATA_TABLE_COMPACT_LABEL_CLASS}>제품</span>
            <span className="min-w-0 truncate font-mono text-gray-800 dark:text-gray-200">
              {productSn}
            </span>
          </div>
          <div className={DATA_TABLE_COMPACT_STACK_ROW_CLASS} title={detectorSn}>
            <span className={DATA_TABLE_COMPACT_LABEL_CLASS}>검출</span>
            <span className="min-w-0 truncate font-mono text-gray-800 dark:text-gray-200">
              {detectorSn}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className={`${NESTED_CELL_START} min-w-[8rem] max-w-[14rem]`}>
        <div className="flex flex-col gap-0.5">
          <span
            className="block truncate font-medium text-gray-900 dark:text-white"
            title={business || undefined}
          >
            {business || "—"}
          </span>
          <span
            className="block truncate text-gray-500 dark:text-gray-400"
            title={product || undefined}
          >
            {product || "—"}
          </span>
        </div>
      </TableCell>
      <TableCell className={`${NESTED_CELL_CENTER} min-w-[5.5rem] max-w-[8rem]`}>
        <span className="line-clamp-2 break-words">{listOperatorDisplay(row)}</span>
      </TableCell>
      <TableCell className={`${NESTED_CELL_CENTER} min-w-[6.5rem]`}>
        <div className="flex justify-center">
          <Badge size="sm" color="light">
            <span className="max-w-[8rem] truncate text-start normal-case text-gray-800 dark:text-gray-200">
              {currentProcessDisplay(row, unitProcessStepCodes)}
            </span>
          </Badge>
        </div>
      </TableCell>
      <TableCell className={`${NESTED_CELL_CENTER} w-[4.5rem]`}>
        <div className="flex justify-center">
          <ProductionPlanProcessStageBadge unit={toProcessBadgeUnit(row)} />
        </div>
      </TableCell>
      <TableCell className={`${NESTED_CELL_CENTER} min-w-[6.5rem] max-w-[9rem]`}>
        {row.order?.orderId ? (
          <Link
            to={`/order/${row.order.orderId}`}
            className={`break-words ${DATA_TABLE_COMPACT_LINK_CLASS}`}
            onClick={(e) => e.stopPropagation()}
          >
            {row.order.orderNo?.trim() || row.order.orderId}
          </Link>
        ) : (
          <span>{row.order?.orderNo?.trim() || "—"}</span>
        )}
      </TableCell>
      <TableCell className={`${NESTED_CELL_CENTER} min-w-[6rem] max-w-[9rem]`}>
        <div
          className="flex justify-center"
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          {deliveryStatus.deliveryPlanId ? (
            <Link
              to={`/delivery/plans/${encodeURIComponent(deliveryStatus.deliveryPlanId)}`}
              className={DATA_TABLE_COMPACT_LINK_CLASS}
            >
              {deliveryStatus.label}
            </Link>
          ) : (
            <span className={`font-medium text-amber-700 dark:text-amber-400/90 ${DATA_TABLE_COMPACT_BODY_TEXT_CLASS}`}>
              {deliveryStatus.label}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={`${NESTED_CELL_CENTER} min-w-[5.5rem]`}>
        <div
          className={`flex flex-col items-center ${dueRel ? "gap-0.5" : ""}`}
        >
          <span className="tabular-nums leading-tight text-gray-800 dark:text-gray-200">
            {formatDateYmd(row.dueDate, { emptyFallback: "—" })}
          </span>
          {dueRel ? (
            <span
              className={dueDateDdayBadgeClassName(dueRel.diff)}
              title={dueRel.koLabel}
            >
              {dueRel.ddayLabel}
            </span>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
