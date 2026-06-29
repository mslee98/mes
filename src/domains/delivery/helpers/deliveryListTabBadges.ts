import type { DeliveryListTab, DeliveryPlanListTab } from "../../../api/purchaseOrder";
import type { ListTabBadgeTone } from "../../../components/list/ListTabCountBadge";

export type DeliveryTabCounts = {
  all?: number;
  pending?: number;
  ready?: number;
  completed?: number;
  delayed?: number;
};

export type DeliveryPlanTabCounts = {
  all?: number;
  open?: number;
  completed?: number;
  delayed?: number;
};

export function deliveryTabCount(
  tab: DeliveryListTab,
  counts?: DeliveryTabCounts
): number {
  if (!counts) return 0;
  if (tab === "ALL") return Number(counts.all) || 0;
  if (tab === "PENDING") return Number(counts.pending) || 0;
  if (tab === "READY") return Number(counts.ready) || 0;
  if (tab === "COMPLETED") return Number(counts.completed) || 0;
  return Number(counts.delayed) || 0;
}

export function deliveryTabBadgeTone(tab: DeliveryListTab): ListTabBadgeTone {
  if (tab === "ALL") return "all";
  if (tab === "READY") return "primary";
  if (tab === "COMPLETED") return "success";
  if (tab === "DELAYED") return "warning";
  return "info";
}

export function deliveryPlanTabCount(
  tab: DeliveryPlanListTab,
  counts?: DeliveryPlanTabCounts
): number {
  if (!counts) return 0;
  if (tab === "ALL") return Number(counts.all) || 0;
  if (tab === "OPEN") return Number(counts.open) || 0;
  if (tab === "COMPLETED") return Number(counts.completed) || 0;
  return Number(counts.delayed) || 0;
}

export function deliveryPlanTabBadgeTone(tab: DeliveryPlanListTab): ListTabBadgeTone {
  if (tab === "ALL") return "all";
  if (tab === "COMPLETED") return "success";
  if (tab === "DELAYED") return "warning";
  return "primary";
}
