import type { ProductionPlanUnitCounts, ProductionPlanUnitTab } from "../../../api/purchaseOrder";
import type { ListTabBadgeTone } from "../../../components/list/ListTabCountBadge";

export function unitListTabCount(
  tab: ProductionPlanUnitTab,
  summary?: ProductionPlanUnitCounts
): number {
  if (!summary) return 0;
  if (tab === "ALL") return Number(summary.all) || Number(summary.total) || 0;
  if (tab === "WAITING") return Number(summary.waiting) || 0;
  if (tab === "IN_PROGRESS") return Number(summary.inProgress) || 0;
  if (tab === "COMPLETED") return Number(summary.completed) || 0;
  return Number(summary.delayed) || 0;
}

export function unitListTabBadgeTone(tab: ProductionPlanUnitTab): ListTabBadgeTone {
  if (tab === "ALL") return "all";
  if (tab === "WAITING") return "waiting";
  if (tab === "COMPLETED") return "success";
  if (tab === "DELAYED") return "warning";
  return "primary";
}
