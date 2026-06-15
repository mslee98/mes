import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import type { CommonCodeItem } from "../../api/commonCode";
import type {
  ProductionPlanUnit,
  ProductionPlanUnitPerspective,
  ProductionPlanUnitTab,
} from "../../api/purchaseOrder";
import {
  completedTabLabel,
  tabLabel,
} from "../../domains/production-plan/helpers/unitListPerspective";
import { ProductionPlanProcessStageBadge } from "../delivery/ProductionPlanProcessStageBadge";
import { CopyTextButton } from "../common/CopyTextButton";
import Checkbox from "../form/input/Checkbox";
import Badge from "../ui/badge/Badge";
import {
  DataTableCell,
  DataTableRow,
} from "../list";
import type { DataTableColSpan } from "../list/DataTable/dataTableStyles";
import {
  formatUnitListCompletedDate,
  formatUnitListScheduleDate,
  unitListDelayBadgeClassName,
  unitListDelayDays,
  unitListDelayLabel,
} from "../../domains/production-plan/helpers/unitListDates";
import {
  currentProcessDisplay,
  deliveryUnitRowClassName,
  listDetectorSerialDisplay,
  listOperatorDisplay,
  listProductSerialDisplay,
  listUnitIndexLabel,
  listUnitLotCode,
  partnerCountrySubline,
  unitDetailLinkClassName,
  type DeliveryUnitListRow as DeliveryUnitListRowData,
} from "../../domains/delivery/display/deliveryUnitListDisplay";
import type { DeliveryUnitTableLayout } from "../../domains/delivery/layout/deliveryUnitDataTableLayout";
import {
  DELIVERY_UNIT_NARROW_CELL_CLASS,
  DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS,
} from "../../domains/delivery/layout/deliveryUnitDataTableLayout";

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

export type DeliveryUnitListRowProps = {
  row: DeliveryUnitListRowData;
  index: number;
  page: number;
  pageSize: number;
  tab?: ProductionPlanUnitTab;
  perspective?: ProductionPlanUnitPerspective;
  unitProcessStepCodes: CommonCodeItem[];
  countryCodes: CommonCodeItem[];
  layout: DeliveryUnitTableLayout;
  gridTemplateColumns?: string;
  showCheckbox?: boolean;
  /** false면 체크박스 슬롯만 유지(열 너비 고정) */
  reserveCheckboxColumn?: boolean;
  checked?: boolean;
  checkboxDisabled?: boolean;
  /** 동일 발주 제한으로 비활성일 때 hover 안내 */
  checkboxOrderMismatchHint?: string | null;
  onToggle?: (row: DeliveryUnitListRowData, checked: boolean) => void;
};

function Cell({
  colSpan,
  className = "",
  children,
}: {
  colSpan: DataTableColSpan;
  className?: string;
  children: ReactNode;
}) {
  return (
    <DataTableCell colSpan={colSpan} compact className={className}>
      {children}
    </DataTableCell>
  );
}

export const DeliveryUnitListRow = memo(function DeliveryUnitListRow({
  row,
  index,
  page,
  pageSize,
  tab = "IN_PROGRESS",
  perspective = "production",
  unitProcessStepCodes,
  countryCodes,
  layout,
  gridTemplateColumns,
  showCheckbox = false,
  reserveCheckboxColumn = false,
  checked = false,
  checkboxDisabled = false,
  checkboxOrderMismatchHint = null,
  onToggle,
}: DeliveryUnitListRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const [hintOpen, setHintOpen] = useState(false);
  const [hintCoords, setHintCoords] = useState({ top: 0, left: 0 });

  const updateHintPosition = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const HINT_ANCHOR_LEFT_PX = 40;
    setHintCoords({
      top: rect.top + rect.height / 2,
      left: rect.left + HINT_ANCHOR_LEFT_PX,
    });
  }, []);

  const handleRowMouseEnter = useCallback(() => {
    if (!checkboxOrderMismatchHint) return;
    updateHintPosition();
    setHintOpen(true);
  }, [checkboxOrderMismatchHint, updateHintPosition]);

  const handleRowMouseLeave = useCallback(() => {
    setHintOpen(false);
  }, []);

  useEffect(() => {
    if (!hintOpen) return;
    updateHintPosition();
    window.addEventListener("scroll", updateHintPosition, true);
    window.addEventListener("resize", updateHintPosition);
    return () => {
      window.removeEventListener("scroll", updateHintPosition, true);
      window.removeEventListener("resize", updateHintPosition);
    };
  }, [hintOpen, updateHintPosition]);

  const orderMismatchHintPortal =
    hintOpen && checkboxOrderMismatchHint
      ? createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: hintCoords.top,
              left: hintCoords.left,
              transform: "translate(0, -50%)",
            }}
            className="pointer-events-none z-[100120] w-max max-w-[20rem] whitespace-normal break-keep rounded-base bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-xs dark:bg-gray-700"
          >
            {checkboxOrderMismatchHint}
          </span>,
          document.body
        )
      : null;

  const business = row.item?.businessNameSnapshot?.trim();
  const product = row.item?.productNameSnapshot?.trim();
  const detectorSn = listDetectorSerialDisplay(row);
  const partnerName =
    row.partner?.name?.trim() || row.order?.partnerName?.trim() || "-";
  const countryCode =
    row.partner?.countryCode ?? row.order?.partnerCountryCode;
  const countryLine = partnerCountrySubline(countryCode, countryCodes);
  const delayDays = unitListDelayDays(row);
  const lotCode = listUnitLotCode(row);
  const orderNo = row.order?.orderNo?.trim() || row.order?.orderId || "";
  const planNo = row.plan?.planNo?.trim() || row.plan?.planId || "";
  const deliveryPlanNo =
    row.deliveryPlanNo?.trim() || row.deliveryPlanId || "";
  return (
    <>
    <DataTableRow
      ref={rowRef}
      selected={showCheckbox && checked}
      gridTemplateColumns={gridTemplateColumns}
      className={`group ${deliveryUnitRowClassName(index)} ${DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS}${
        checkboxOrderMismatchHint ? " cursor-not-allowed" : ""
      }`}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={handleRowMouseLeave}
      aria-describedby={hintOpen ? tooltipId : undefined}
    >
      {reserveCheckboxColumn ? (
        <Cell colSpan={layout.checkbox} className={DELIVERY_UNIT_NARROW_CELL_CLASS}>
          {showCheckbox ? (
            <Checkbox
              checked={checked}
              disabled={checkboxDisabled}
              onChange={(next) => onToggle?.(row, next)}
              aria-label={`${listUnitLotCode(row)} 선택`}
            />
          ) : null}
        </Cell>
      ) : null}
      <Cell
        colSpan={layout.no}
        className={
          layout.no === 1 ? DELIVERY_UNIT_NARROW_CELL_CLASS : "justify-center"
        }
      >
        <Link
          to={`/delivery/units/${row.unitId}`}
          className={`font-mono text-theme-xs ${unitDetailLinkClassName}`}
          title="생산·납품 현황"
        >
          {listUnitIndexLabel(index, page, pageSize)}
        </Link>
      </Cell>
      <Cell colSpan={layout.lot}>
        <div className="flex items-center gap-0.5">
          <Link
            to={`/delivery/units/${row.unitId}`}
            className={`whitespace-nowrap font-mono text-sm font-semibold ${unitDetailLinkClassName}`}
            title={lotCode}
          >
            {lotCode}
          </Link>
          <CopyTextButton value={lotCode} ariaLabel="LOT 복사" />
        </div>
      </Cell>
      <Cell colSpan={layout.item} className="min-w-0 items-start">
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
          <div
            className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white"
            title={business || undefined}
          >
            {business || "-"}
          </div>
          <div
            className="truncate text-theme-xs text-gray-500 dark:text-gray-400"
            title={product || undefined}
          >
            {product || "-"}
          </div>
        </div>
      </Cell>
      <Cell colSpan={layout.serial} className="min-w-0 items-start">
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight text-[11px]">
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">
              제품
            </span>
            <span
              className="min-w-0 truncate font-mono text-gray-800 dark:text-white/90"
              title={listProductSerialDisplay(row)}
            >
              {listProductSerialDisplay(row)}
            </span>
          </div>
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">
              검출기
            </span>
            <span
              className="min-w-0 truncate font-mono text-gray-800 dark:text-white/90"
              title={detectorSn}
            >
              {detectorSn}
            </span>
          </div>
        </div>
      </Cell>
      <Cell colSpan={layout.partner} className="min-w-0 flex-col items-start">
        <div
          className="w-full break-words text-theme-sm font-semibold text-gray-800 dark:text-white/90"
          title={partnerName !== "-" ? partnerName : undefined}
        >
          {partnerName}
        </div>
        {countryLine ? (
          <div className="mt-0.5 flex w-full min-w-0 items-center gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {countryLine.flagUrl ? (
              <img
                src={countryLine.flagUrl}
                alt=""
                className="h-3.5 w-[1.125rem] shrink-0 rounded-sm object-cover"
                decoding="async"
              />
            ) : null}
            <span
              className="min-w-0 flex-1 truncate"
              title={countryLine.label}
            >
              {countryLine.label}
            </span>
            <span className="inline-flex w-[1.125rem] shrink-0 justify-center">
              {countryCode ? (
                <CopyTextButton
                  value={String(countryCode).trim().toUpperCase()}
                  ariaLabel="국가 코드 복사"
                />
              ) : null}
            </span>
          </div>
        ) : null}
      </Cell>
      <Cell colSpan={layout.operator} className="justify-center">
        {listOperatorDisplay(row)}
      </Cell>
      <Cell colSpan={layout.process} className="justify-center">
        <Badge size="sm" color="light">
          <span className="break-words text-start normal-case">
            {currentProcessDisplay(row, unitProcessStepCodes)}
          </span>
        </Badge>
      </Cell>
      <Cell colSpan={layout.status} className="justify-center">
        {tab === "COMPLETED" ? (
          row.isDelivered ? (
            <Badge size="sm" color="success">
              {completedTabLabel("delivery")}
            </Badge>
          ) : perspective === "production" && row.isDeliveryReady ? (
            <Badge size="sm" color="info">
              {tabLabel("delivery", "WAITING")}
            </Badge>
          ) : (
            <Badge size="sm" color="success">
              {completedTabLabel(perspective)}
            </Badge>
          )
        ) : (
          <ProductionPlanProcessStageBadge unit={toProcessBadgeUnit(row)} />
        )}
      </Cell>
      <Cell colSpan={layout.orderPlan} className="min-w-0 items-start">
        <div className="flex min-w-0 w-full flex-col gap-0.5 leading-tight text-[11px]">
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">
              발주
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-0.5">
              {row.order?.orderId ? (
                <Link
                  to={`/order/${row.order.orderId}`}
                  className="min-w-0 flex-1 truncate font-mono text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                  title={orderNo}
                >
                  {orderNo}
                </Link>
              ) : (
                <span
                  className="min-w-0 flex-1 truncate font-mono text-theme-xs text-gray-600 dark:text-gray-300"
                  title={row.order?.orderNo?.trim() || undefined}
                >
                  {orderNo || "-"}
                </span>
              )}
              <span className="inline-flex w-[1.125rem] shrink-0 justify-center">
                {orderNo ? (
                  <CopyTextButton value={orderNo} ariaLabel="발주 번호 복사" />
                ) : null}
              </span>
            </div>
          </div>
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">
              생산계획
            </span>
            <div
              className="flex min-w-0 flex-1 items-center gap-0.5"
              title={planNo || row.plan?.planNo?.trim() || undefined}
            >
              {row.plan?.planId && row.order?.orderId ? (
                <Link
                  to={`/order/${row.order.orderId}/plan/${row.plan.planId}`}
                  className="min-w-0 flex-1 truncate font-mono text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {planNo || "-"}
                </Link>
              ) : (
                <span className="min-w-0 flex-1 truncate font-mono text-theme-xs text-gray-600 dark:text-gray-300">
                  {planNo || "-"}
                </span>
              )}
              <span className="inline-flex w-[1.125rem] shrink-0 justify-center">
                {planNo ? (
                  <CopyTextButton value={planNo} ariaLabel="생산 계획 번호 복사" />
                ) : null}
              </span>
            </div>
          </div>
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">
              납품계획
            </span>
            <div
              className="flex min-w-0 flex-1 items-center gap-0.5"
              title={deliveryPlanNo || undefined}
            >
              {row.deliveryPlanId ? (
                <Link
                  to={`/delivery/plans/${encodeURIComponent(row.deliveryPlanId)}`}
                  className="min-w-0 flex-1 truncate font-mono text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {deliveryPlanNo || "-"}
                </Link>
              ) : (
                <span className="min-w-0 flex-1 truncate font-mono text-theme-xs text-gray-600 dark:text-gray-300">
                  -
                </span>
              )}
              <span className="inline-flex w-[1.125rem] shrink-0 justify-center">
                {deliveryPlanNo ? (
                  <CopyTextButton
                    value={deliveryPlanNo}
                    ariaLabel="납품 계획 번호 복사"
                  />
                ) : null}
              </span>
            </div>
          </div>
        </div>
      </Cell>
      <Cell colSpan={layout.dates} className="items-start">
        <div className="flex w-full flex-col gap-0.5 leading-tight text-[11px]">
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">
              예정
            </span>
            <span className="text-theme-sm text-gray-700 dark:text-gray-300">
              {formatUnitListScheduleDate(perspective, row)}
            </span>
          </div>
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">
              완료
            </span>
            <span className="text-theme-xs text-gray-700 dark:text-gray-300">
              {formatUnitListCompletedDate(perspective, row)}
            </span>
          </div>
        </div>
      </Cell>
      <Cell colSpan={layout.delay} className="justify-center border-r-0">
        <span
          className={unitListDelayBadgeClassName(delayDays)}
          title={delayDays > 0 ? `${delayDays}일 지연` : undefined}
        >
          {unitListDelayLabel(delayDays)}
        </span>
      </Cell>
    </DataTableRow>
    {orderMismatchHintPortal}
    </>
  );
});
