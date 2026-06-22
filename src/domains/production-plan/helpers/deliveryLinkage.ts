import type {
  ProductionPlanDeliveryCoverage,
  ProductionPlanListItem,
  ProductionPlanUnitSummary,
} from "../../../api/purchaseOrder";

export type DeliveryLinkageState = "none" | "partial" | "full";

export type DeliveryLinkageCounts = {
  assigned: number;
  unassigned: number;
  total: number;
  state: DeliveryLinkageState;
  /** summary/API exact count 없을 때 false */
  isExact: boolean;
  deliveryPlanIds: string[];
};

function readSummaryNumber(
  summary: ProductionPlanUnitSummary | null | undefined,
  keys: string[]
): number | null {
  if (!summary) return null;
  for (const key of keys) {
    const raw = summary[key];
    if (raw == null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** `unitSummary`에서 납품 배정·미배정 건수 파싱 */
export function parseDeliveryAssignedCounts(
  summary?: ProductionPlanUnitSummary | null
): { assigned: number | null; unassigned: number | null; total: number } {
  const total = readSummaryNumber(summary, ["total"]) ?? 0;
  const assigned = readSummaryNumber(summary, [
    "deliveryAssigned",
    "delivery_assigned",
    "inDeliveryPlan",
    "in_delivery_plan",
    "assigned",
  ]);
  const unassignedExplicit = readSummaryNumber(summary, [
    "deliveryUnassigned",
    "delivery_unassigned",
    "unassigned",
  ]);
  const unassigned =
    unassignedExplicit ??
    (assigned != null && total > 0 ? Math.max(0, total - assigned) : null);

  return { assigned, unassigned, total };
}

type UnitDeliveryLinkageInput = {
  isInDeliveryPlan?: boolean;
  deliveryPlanId?: string | null;
  isDelivered?: boolean;
};

export function isUnitInDeliveryPlan(row: UnitDeliveryLinkageInput): boolean {
  if (row.isInDeliveryPlan === true) return true;
  return String(row.deliveryPlanId ?? "").trim() !== "";
}

function coverageToState(
  coverage: ProductionPlanDeliveryCoverage
): DeliveryLinkageState {
  if (coverage === "FULL") return "full";
  if (coverage === "PARTIAL") return "partial";
  return "none";
}

function deliveryLinkageState(
  assigned: number,
  unassigned: number,
  total: number
): DeliveryLinkageState {
  if (total <= 0 || assigned <= 0) return "none";
  if (unassigned <= 0) return "full";
  return "partial";
}

/** 유닛 배열에서 납품 연계 집계 */
export function computeDeliveryLinkageFromUnits(
  units: readonly UnitDeliveryLinkageInput[]
): DeliveryLinkageCounts {
  const total = units.length;
  if (total === 0) {
    return {
      assigned: 0,
      unassigned: 0,
      total: 0,
      state: "none",
      isExact: true,
      deliveryPlanIds: [],
    };
  }
  const assigned = units.filter((u) => isUnitInDeliveryPlan(u)).length;
  const unassigned = Math.max(0, total - assigned);
  return {
    assigned,
    unassigned,
    total,
    state: deliveryLinkageState(assigned, unassigned, total),
    isExact: true,
    deliveryPlanIds: [],
  };
}

/** 목록 API deliveryCoverage + unitSummary fallback */
export function resolveDeliveryLinkage(
  item: Pick<ProductionPlanListItem, "unitSummary" | "deliveryCoverage">
): DeliveryLinkageCounts {
  const coverage = item.deliveryCoverage;
  if (coverage) {
    return {
      assigned: coverage.assignedUnitCount,
      unassigned: coverage.unassignedUnitCount,
      total: coverage.totalUnitCount,
      state: coverageToState(coverage.coverage),
      isExact: true,
      deliveryPlanIds: coverage.deliveryPlanIds ?? [],
    };
  }

  const { assigned, unassigned, total } = parseDeliveryAssignedCounts(
    item.unitSummary
  );

  if (assigned != null && total > 0) {
    const resolvedUnassigned = unassigned ?? Math.max(0, total - assigned);
    return {
      assigned,
      unassigned: resolvedUnassigned,
      total,
      state: deliveryLinkageState(assigned, resolvedUnassigned, total),
      isExact: true,
      deliveryPlanIds: [],
    };
  }

  return {
    assigned: assigned ?? 0,
    unassigned: unassigned ?? total,
    total,
    state: "none",
    isExact: false,
    deliveryPlanIds: [],
  };
}

export function deliveryLinkageBadgeProps(state: DeliveryLinkageState): {
  label: string;
  color: "light" | "warning" | "success";
} {
  if (state === "full") {
    return { label: "전량배정", color: "success" };
  }
  if (state === "partial") {
    return { label: "부분배정", color: "warning" };
  }
  return { label: "미배정", color: "light" };
}

export function formatDeliveryLinkageRatio(linkage: DeliveryLinkageCounts): string {
  if (linkage.total <= 0) return "—";
  return `${linkage.assigned} / ${linkage.total}`;
}
