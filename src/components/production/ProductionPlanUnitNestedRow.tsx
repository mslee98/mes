import { Link, useNavigate } from "react-router";
import type { CommonCodeItem } from "../../api/commonCode";
import type { ProductionPlanUnit } from "../../api/purchaseOrder";
import { ProductionPlanProcessStageBadge } from "../delivery/ProductionPlanProcessStageBadge";
import Badge from "../ui/badge/Badge";
import { TableCell, TableRow } from "../ui/table";
import { formatDateYmd } from "../../lib/format/dateFormat";
import {
  dueDateDdayBadgeClassName,
  getDueDateRelative,
} from "../../lib/format/dueDateDisplay";
import {
  currentProcessDisplay,
  deliveryUnitRowClassName,
  listDetectorSerialDisplay,
  listOperatorDisplay,
  listProductSerialDisplay,
  listUnitIndexLabel,
  listUnitLotOrDetailLabel,
  listUnitLotCode,
  unitDetailLinkClassName,
  unitDetailPath,
  type DeliveryUnitListRow as DeliveryUnitListRowData,
} from "../../domains/delivery/display/deliveryUnitListDisplay";

const NESTED_CELL =
  "px-2 py-1 align-middle text-[11px] leading-snug text-gray-700 dark:text-gray-300";

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
};

/** 생산 계획 목록 콜랩스 — 컴팩트 유닛 행(행 클릭 → 유닛 상세, LOT 없으면 unitId 표시) */
export function ProductionPlanUnitNestedRow({
  row,
  index,
  page,
  pageSize,
  unitProcessStepCodes,
  todayYmd,
}: ProductionPlanUnitNestedRowProps) {
  const navigate = useNavigate();
  const detailPath = unitDetailPath(row.unitId);
  const lotLabel = listUnitLotOrDetailLabel(row);
  const hasLot = listUnitLotCode(row) !== "—";
  const business = row.item?.businessNameSnapshot?.trim();
  const product = row.item?.productNameSnapshot?.trim();
  const productSn = listProductSerialDisplay(row);
  const detectorSn = listDetectorSerialDisplay(row);
  const dueRel =
    row.isDelivered === true
      ? null
      : getDueDateRelative(row.dueDate, { todayYmd });

  const openUnitDetail = () => {
    if (detailPath) navigate(detailPath);
  };

  return (
    <TableRow
      className={`${deliveryUnitRowClassName(index)} ${
        detailPath ? "cursor-pointer" : ""
      }`}
      onClick={detailPath ? openUnitDetail : undefined}
      title={detailPath ? "유닛 상세로 이동" : undefined}
    >
      <TableCell
        className={`${NESTED_CELL} w-9 text-center tabular-nums`}
      >
        <span
          className={
            detailPath
              ? `font-mono ${unitDetailLinkClassName}`
              : "font-mono text-gray-500"
          }
        >
          {listUnitIndexLabel(index, page, pageSize)}
        </span>
      </TableCell>
      <TableCell className={`${NESTED_CELL} min-w-[9rem] max-w-[12rem] text-start`}>
        <span
          className={`block truncate font-mono font-semibold ${
            detailPath
              ? unitDetailLinkClassName
              : "text-gray-500 dark:text-gray-400"
          } ${!hasLot && detailPath ? "text-theme-xs font-normal" : ""}`}
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
      <TableCell className={`${NESTED_CELL} min-w-[9rem] max-w-[13rem] text-start font-mono`}>
        <div className="flex flex-col gap-0.5">
          <span className="block min-w-0 truncate text-gray-800 dark:text-gray-200" title={productSn}>
            <span className="font-sans text-[10px] font-medium text-gray-500 dark:text-gray-400">
              제품{" "}
            </span>
            {productSn}
          </span>
          <span className="block min-w-0 truncate text-gray-800 dark:text-gray-200" title={detectorSn}>
            <span className="font-sans text-[10px] font-medium text-gray-500 dark:text-gray-400">
              검출{" "}
            </span>
            {detectorSn}
          </span>
        </div>
      </TableCell>
      <TableCell className={`${NESTED_CELL} min-w-[8rem] max-w-[14rem] text-start`}>
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
      <TableCell
        className={`${NESTED_CELL} min-w-[5.5rem] max-w-[8rem] text-center`}
      >
        <span className="line-clamp-2 break-words">{listOperatorDisplay(row)}</span>
      </TableCell>
      <TableCell className={`${NESTED_CELL} min-w-[6.5rem] text-center`}>
        <div className="flex justify-center">
          <Badge size="sm" color="light">
            <span className="max-w-[8rem] truncate text-start normal-case text-gray-800 dark:text-gray-200">
              {currentProcessDisplay(row, unitProcessStepCodes)}
            </span>
          </Badge>
        </div>
      </TableCell>
      <TableCell className={`${NESTED_CELL} w-[4.5rem] text-center`}>
        <div className="flex justify-center">
          <ProductionPlanProcessStageBadge unit={toProcessBadgeUnit(row)} />
        </div>
      </TableCell>
      <TableCell className={`${NESTED_CELL} min-w-[6.5rem] max-w-[9rem] text-center`}>
        {row.order?.orderId ? (
          <Link
            to={`/order/${row.order.orderId}`}
            className={`break-words font-medium ${unitDetailLinkClassName}`}
            onClick={(e) => e.stopPropagation()}
          >
            {row.order.orderNo?.trim() || row.order.orderId}
          </Link>
        ) : (
          <span>{row.order?.orderNo?.trim() || "—"}</span>
        )}
      </TableCell>
      <TableCell className={`${NESTED_CELL} min-w-[5.5rem] text-center`}>
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
