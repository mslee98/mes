import type { RmaListUiTab, RmaTabCountsResponse } from "../../../api/rma";
import type { ListTabBadgeTone } from "../../../components/list/ListTabCountBadge";

export function rmaTabCount(
  tab: RmaListUiTab,
  counts?: RmaTabCountsResponse
): number {
  if (!counts) return 0;
  if (tab === "ALL") return Number(counts.all) || 0;
  if (tab === "RECEIVED") return Number(counts.received) || 0;
  if (tab === "IN_PROGRESS") return Number(counts.inProgress) || 0;
  if (tab === "COMPLETED") return Number(counts.completed) || 0;
  if (tab === "RETURN") return Number(counts.return) || 0;
  return Number(counts.closed) || 0;
}

export function rmaTabBadgeTone(tab: RmaListUiTab): ListTabBadgeTone {
  if (tab === "ALL") return "all";
  if (tab === "COMPLETED") return "success";
  if (tab === "CLOSED") return "error";
  if (tab === "IN_PROGRESS") return "warning";
  return "primary";
}
