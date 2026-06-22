import Badge from "../ui/badge/Badge";
import type { ProductionPlanUnitListItem } from "../../api/purchaseOrder";
import {
  deliveryLinkageBadgeProps,
  formatDeliveryLinkageRatio,
  isUnitInDeliveryPlan,
  type DeliveryLinkageCounts,
} from "../../domains/production-plan/helpers/deliveryLinkage";
import { Link } from "react-router";
import { DATA_TABLE_COMPACT_BODY_TEXT_CLASS, DATA_TABLE_COMPACT_LINK_CLASS, DATA_TABLE_COMPACT_MUTED_TEXT_CLASS } from "../list/DataTable/dataTableStyles";

export type ProductionPlanDeliveryLinkageCellProps = {
  linkage: DeliveryLinkageCounts;
  compact?: boolean;
  className?: string;
};

/** 생산 계획 목록·펼침 — 납품 연계 N/M + 상태 뱃지 */
export function ProductionPlanDeliveryLinkageCell({
  linkage,
  compact: _compact = false,
  className = "",
}: ProductionPlanDeliveryLinkageCellProps) {
  if (linkage.total <= 0) {
    return (
      <span
        className={`text-theme-xs text-gray-400 dark:text-gray-500 ${className}`}
      >
        —
      </span>
    );
  }

  const ratio = formatDeliveryLinkageRatio(linkage);
  const badge = deliveryLinkageBadgeProps(linkage.state);

  return (
    <div
      className={`flex flex-col items-center gap-0.5 leading-tight ${className}`}
    >
      <span
        className={`tabular-nums font-medium text-gray-800 dark:text-gray-200 ${DATA_TABLE_COMPACT_BODY_TEXT_CLASS} ${className}`}
        title={`납품 배정 ${linkage.assigned} · 전체 ${linkage.total}`}
      >
        {ratio}
      </span>
      <Badge size="sm" color={badge.color}>
        {badge.label}
      </Badge>
      {linkage.unassigned > 0 ? (
        <span className={DATA_TABLE_COMPACT_MUTED_TEXT_CLASS}>
          미배정 {linkage.unassigned}
        </span>
      ) : null}
    </div>
  );
}

export function ProductionPlanDeliveryLinkageInline({
  linkage,
}: {
  linkage: DeliveryLinkageCounts;
}) {
  if (linkage.total <= 0) return null;
  const badge = deliveryLinkageBadgeProps(linkage.state);
  return (
    <span className={`inline-flex items-center gap-1.5 ${DATA_TABLE_COMPACT_BODY_TEXT_CLASS}`}>
      <span className="tabular-nums font-medium">
        납품 {formatDeliveryLinkageRatio(linkage)}
      </span>
      <Badge size="sm" color={badge.color}>
        {badge.label}
      </Badge>
      {linkage.unassigned > 0 ? (
        <span className="text-gray-500 dark:text-gray-400">
          · 미배정 {linkage.unassigned}
        </span>
      ) : null}
    </span>
  );
}

/** 펼침 패널 유닛 행 — 납품 계획 링크 또는 미배정 */
export function UnitDeliveryLinkageCell({
  row,
  onClickStopPropagation,
}: {
  row: Pick<
    ProductionPlanUnitListItem,
    "deliveryPlanId" | "deliveryPlanNo" | "isInDeliveryPlan"
  >;
  onClickStopPropagation?: boolean;
}) {
  const deliveryPlanId = String(row.deliveryPlanId ?? "").trim();
  const deliveryPlanNo =
    row.deliveryPlanNo?.trim() || deliveryPlanId || "";
  const assigned = isUnitInDeliveryPlan(row);

  if (!assigned) {
    return (
      <span className={`font-medium text-amber-700 dark:text-amber-400/90 ${DATA_TABLE_COMPACT_BODY_TEXT_CLASS}`}>
        미배정
      </span>
    );
  }

  return deliveryPlanId ? (
    <Link
      to={`/delivery/plans/${encodeURIComponent(deliveryPlanId)}`}
      className={`truncate font-mono ${DATA_TABLE_COMPACT_LINK_CLASS}`}
      title={deliveryPlanNo}
      onClick={onClickStopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {deliveryPlanNo || "-"}
    </Link>
  ) : (
    <span className={DATA_TABLE_COMPACT_BODY_TEXT_CLASS}>배정됨</span>
  );
}
