import { Link } from "react-router";
import { ChevronDownIcon, PageIcon } from "../../icons";
import { TableCell } from "../ui/table";
import type { CommonCodeItem } from "../../api/commonCode";
import type { ProductionPlanListItem } from "../../api/purchaseOrder";
import { formatDateYmd } from "../../lib/format/dateFormat";
import {
  dueDateDdayBadgeClassName,
  getDueDateRelative,
} from "../../lib/format/dueDateDisplay";
import { buttonClassName } from "../../lib/ui/buttonStyles";
import { partnerCountrySubline } from "../../domains/delivery/display/deliveryUnitListDisplay";
import { ProductionPlanUnitCountRatio } from "./ProductionPlanUnitSummary";

export type ProductionPlanListRowCellsProps = {
  item: ProductionPlanListItem;
  expanded: boolean;
  countryCodes: CommonCodeItem[];
  todayYmd: string;
};

function planDisplayTitle(item: ProductionPlanListItem): string {
  const title = item.title?.trim();
  if (title) return title;
  const no = item.planNo?.trim();
  if (no) return no;
  if (item.planSeq != null && Number.isFinite(item.planSeq)) {
    return `생산 계획 ${item.planSeq}차`;
  }
  return item.planId;
}

function plannedDateForRow(item: ProductionPlanListItem): string | null {
  return (
    item.plannedDate ??
    item.plannedDeliveryDate ??
    item.deliveryDate ??
    null
  );
}

function planDetailPath(item: ProductionPlanListItem): string | null {
  const orderId = String(item.orderId ?? "").trim();
  const planId = String(item.planId ?? "").trim();
  if (!orderId || !planId) return null;
  return `/order/${encodeURIComponent(orderId)}/plan/${encodeURIComponent(planId)}`;
}

export function ProductionPlanListRowCells({
  item,
  expanded,
  countryCodes,
  todayYmd,
}: ProductionPlanListRowCellsProps) {
  const plannedRaw = plannedDateForRow(item);
  const plannedRel = getDueDateRelative(plannedRaw, { todayYmd });
  const countryLine = partnerCountrySubline(
    item.partnerCountryCode,
    countryCodes
  );
  const detailHref = planDetailPath(item);

  return (
    <>
      <TableCell className="w-10 align-middle px-2 py-2 text-center">
        <ChevronDownIcon
          className={`mx-auto size-5 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
            expanded ? "rotate-0" : "-rotate-90"
          }`}
          aria-hidden
        />
      </TableCell>
      <TableCell className="min-w-[18rem] align-middle px-3 py-2 text-start text-theme-sm">
        <div className="flex flex-col gap-0.5 leading-tight">
          <span className="break-words font-semibold text-gray-900 dark:text-white">
            {item.planNo?.trim() || planDisplayTitle(item)}
          </span>
          {item.title?.trim() ? (
            <span className="break-words text-theme-xs text-gray-500 dark:text-gray-400">
              {item.title.trim()}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="min-w-[8rem] max-w-[12rem] align-middle px-3 py-2 text-start text-theme-sm">
        <div className="break-words font-semibold text-gray-800 dark:text-white/90">
          {item.partnerName?.trim() || "—"}
        </div>
        {countryLine ? (
          <div className="mt-1 flex items-center gap-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {countryLine.flagUrl ? (
              <img
                src={countryLine.flagUrl}
                alt=""
                className="h-3.5 w-[1.125rem] shrink-0 rounded-sm object-cover"
                decoding="async"
              />
            ) : null}
            <span className="min-w-0 break-words">{countryLine.label}</span>
          </div>
        ) : null}
      </TableCell>
      <TableCell className="min-w-[7rem] align-middle px-3 py-2 text-center text-theme-sm text-gray-700 dark:text-gray-300">
        <div
          className={`flex min-h-[3.75rem] flex-col items-center justify-center ${
            plannedRel ? "gap-1" : ""
          }`}
        >
          <span className="leading-tight">
            {formatDateYmd(plannedRaw, { emptyFallback: "-" })}
          </span>
          {plannedRel ? (
            <span
              className={dueDateDdayBadgeClassName(plannedRel.diff)}
              title={plannedRel.koLabel}
            >
              {plannedRel.ddayLabel}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="min-w-[7rem] max-w-[10rem] align-middle px-3 py-2 text-center text-theme-sm text-gray-600 dark:text-gray-300">
        {item.productionManagerName?.trim() || "—"}
      </TableCell>
      <TableCell className="min-w-[5rem] align-middle px-3 py-2 text-center">
        <ProductionPlanUnitCountRatio summary={item.unitSummary} />
      </TableCell>
      <TableCell className="min-w-[8.5rem] align-middle px-2 py-2 text-center">
        <div
          className="flex justify-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {detailHref ? (
            <Link
              to={detailHref}
              title="생산 계획 상세"
              aria-label={`${planDisplayTitle(item)} 생산 계획 상세`}
              className={buttonClassName({
                actionRole: "navigate",
                size: "compact",
              })}
              onClick={(e) => e.stopPropagation()}
            >
              <PageIcon className="size-4 shrink-0" aria-hidden />
              상세보기
            </Link>
          ) : (
            <span className="text-theme-xs text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>
      </TableCell>
    </>
  );
}
