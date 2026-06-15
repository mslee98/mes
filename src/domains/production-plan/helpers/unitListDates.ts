import type {
  ProductionPlanUnitListItem,
  ProductionPlanUnitPerspective,
} from "../../../api/purchaseOrder";
import { formatDateTimeKo, formatDateYmd } from "../../../lib/format/dateFormat";

const DELAY_BADGE_BASE =
  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium";

export function unitListScheduleDateYmd(
  perspective: ProductionPlanUnitPerspective,
  row: ProductionPlanUnitListItem
): string | null {
  if (perspective === "production") {
    const planned = String(row.plan?.plannedDate ?? "").trim();
    return planned || null;
  }
  const fromPlan = String(row.deliveryPlanPlannedDeliveryDate ?? "").trim();
  if (fromPlan) return fromPlan;
  const due = String(row.dueDate ?? "").trim();
  return due || null;
}

export function unitListCompletedAt(
  perspective: ProductionPlanUnitPerspective,
  row: ProductionPlanUnitListItem
): string | null {
  if (perspective === "production") {
    const at = String(row.productionCompletedAt ?? "").trim();
    return at || null;
  }
  const at = String(row.deliveredAt ?? "").trim();
  return at || null;
}

export function unitListDelayDays(row: ProductionPlanUnitListItem): number {
  const n = Number(row.delayDays);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

export function formatUnitListScheduleDate(
  perspective: ProductionPlanUnitPerspective,
  row: ProductionPlanUnitListItem
): string {
  return formatDateYmd(unitListScheduleDateYmd(perspective, row), {
    emptyFallback: "-",
  });
}

export function formatUnitListCompletedDate(
  perspective: ProductionPlanUnitPerspective,
  row: ProductionPlanUnitListItem
): string {
  const raw = unitListCompletedAt(perspective, row);
  if (!raw) return "-";
  if (perspective === "production") {
    return formatDateTimeKo(raw, { emptyFallback: "-" });
  }
  return formatDateYmd(raw, { emptyFallback: "-" });
}

export function unitListDelayLabel(delayDays: number): string {
  if (delayDays <= 0) return "-";
  return `${delayDays}일`;
}

export function unitListDelayBadgeClassName(delayDays: number): string {
  if (delayDays <= 0) {
    return `${DELAY_BADGE_BASE} text-gray-500 dark:text-gray-400`;
  }
  return `${DELAY_BADGE_BASE} bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500`;
}

export function unitListScheduleColumnTitle(
  perspective: ProductionPlanUnitPerspective
): string {
  return perspective === "production" ? "생산 예정일" : "납품 예정일";
}

export function unitListCompletedColumnTitle(
  perspective: ProductionPlanUnitPerspective
): string {
  return perspective === "production" ? "생산 완료일" : "납품 완료일";
}
