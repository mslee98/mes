import type {
  ProductionPlanListItem,
  ProductionPlanUnitSummary,
} from "../../../api/purchaseOrder";
import type { DeliveryLinkageCounts } from "./deliveryLinkage";
import {
  isUnitInDeliveryPlan,
  parseDeliveryAssignedCounts,
} from "./deliveryLinkage";

export type PlanDeliveryActionCopy = {
  summaryLine: string;
  unassignedCount: number;
  totalCount: number;
  isExact: boolean;
  needsPreparation: boolean;
  ctaLabel: string | null;
};

type UnitDeliveryStatusInput = {
  isInDeliveryPlan?: boolean;
  deliveryPlanId?: string | null;
  deliveryPlanNo?: string | null;
};

function formatExactPlanCopy(
  total: number,
  unassigned: number
): PlanDeliveryActionCopy {
  if (total <= 0) {
    return {
      summaryLine: "—",
      unassignedCount: 0,
      totalCount: 0,
      isExact: true,
      needsPreparation: false,
      ctaLabel: null,
    };
  }
  if (unassigned >= total) {
    return {
      summaryLine: `${total}대 모두 납품 계획 필요`,
      unassignedCount: unassigned,
      totalCount: total,
      isExact: true,
      needsPreparation: true,
      ctaLabel: `계획 필요 ${total}대 처리`,
    };
  }
  if (unassigned <= 0) {
    return {
      summaryLine: `${total}대 모두 납품 계획 등록됨`,
      unassignedCount: 0,
      totalCount: total,
      isExact: true,
      needsPreparation: false,
      ctaLabel: null,
    };
  }
  return {
    summaryLine: `${total}대 중 ${unassigned}대는 납품 계획 필요`,
    unassignedCount: unassigned,
    totalCount: total,
    isExact: true,
    needsPreparation: true,
    ctaLabel: `계획 필요 ${unassigned}대 처리`,
  };
}

function unassignedFromItem(
  item: Pick<
    ProductionPlanListItem,
    "unitSummary" | "deliveryCoverage" | "selectableForDelivery"
  >
): { total: number; unassigned: number; isExact: boolean } {
  const coverage = item.deliveryCoverage;
  if (coverage) {
    return {
      total: coverage.totalUnitCount,
      unassigned: coverage.unassignedUnitCount,
      isExact: true,
    };
  }
  const { assigned, unassigned, total } = parseDeliveryAssignedCounts(
    item.unitSummary
  );
  if (assigned != null && unassigned != null && total > 0) {
    return { total, unassigned, isExact: true };
  }
  if (item.selectableForDelivery === true && total > 0) {
    return {
      total,
      unassigned: unassigned ?? total,
      isExact: false,
    };
  }
  return { total, unassigned: unassigned ?? 0, isExact: false };
}

/** Plan 행 — 행동 중심 문장 */
export function formatPlanDeliveryAction(
  item: Pick<
    ProductionPlanListItem,
    "unitSummary" | "planId" | "deliveryCoverage" | "selectableForDelivery"
  >
): PlanDeliveryActionCopy {
  const { total, unassigned, isExact } = unassignedFromItem(item);
  if (isExact) {
    return formatExactPlanCopy(total, unassigned);
  }
  if (total <= 0) {
    return {
      summaryLine: "—",
      unassignedCount: 0,
      totalCount: 0,
      isExact: false,
      needsPreparation: false,
      ctaLabel: null,
    };
  }
  if (item.selectableForDelivery === true) {
    return formatExactPlanCopy(total, unassigned > 0 ? unassigned : total);
  }
  return {
    summaryLine: "납품 계획 상태 확인",
    unassignedCount: 0,
    totalCount: total,
    isExact: false,
    needsPreparation: false,
    ctaLabel: null,
  };
}

/** 펼침 후 exact 집계로 Plan 문장 갱신 */
export function formatPlanDeliveryActionFromLinkage(
  linkage: DeliveryLinkageCounts,
  planId: string
): PlanDeliveryActionCopy {
  void planId;
  return formatExactPlanCopy(linkage.total, linkage.unassigned);
}

export function planNeedsDeliveryPreparationFilter(
  item: Pick<
    ProductionPlanListItem,
    "unitSummary" | "deliveryCoverage" | "selectableForDelivery"
  >
): boolean {
  if (item.selectableForDelivery === true) return true;
  const { unassigned, isExact } = unassignedFromItem(item);
  return isExact && unassigned > 0;
}

export function planNeedsDeliveryPreparationFromSummary(
  summary?: ProductionPlanUnitSummary | null
): boolean {
  const { assigned, unassigned, total } = parseDeliveryAssignedCounts(summary);
  if (assigned != null && unassigned != null && total > 0) {
    return unassigned > 0;
  }
  return false;
}

/** Unit — 납품 상태 라벨 */
export function formatUnitDeliveryStatus(row: UnitDeliveryStatusInput): {
  label: string;
  needsPreparation: boolean;
  deliveryPlanId: string | null;
  deliveryPlanNo: string | null;
} {
  const deliveryPlanId = String(row.deliveryPlanId ?? "").trim() || null;
  const deliveryPlanNo =
    row.deliveryPlanNo?.trim() || deliveryPlanId || null;
  const inPlan = isUnitInDeliveryPlan(row);

  if (!inPlan) {
    return {
      label: "납품 계획 필요",
      needsPreparation: true,
      deliveryPlanId,
      deliveryPlanNo,
    };
  }

  const dpLabel = deliveryPlanNo || deliveryPlanId || "등록됨";
  return {
    label: `${dpLabel}에 등록됨`,
    needsPreparation: false,
    deliveryPlanId,
    deliveryPlanNo,
  };
}
