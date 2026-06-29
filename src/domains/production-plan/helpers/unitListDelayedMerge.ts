import { getDueDateRelative } from "../../../lib/format/dueDateDisplay";
import type { ProductionPlanUnitListResponse } from "../../../api/purchaseOrder";
import { compareUnitsNewestFirst } from "./unitListSort";

/** 지연 탭: 서버 `DELAYED` 외 대기·진행 중 달력 지연 유닛 포함 — 소스 탭별 상한 */
export const DELAYED_TAB_SOURCE_PAGE_SIZE = 500;

export const DELAYED_SOURCE_TABS = ["IN_PROGRESS", "WAITING", "DELAYED"] as const;

export type ProductionPlanUnitListRow =
  ProductionPlanUnitListResponse["items"][number];

export function normalizeUnitListMonthInput(v: string): string {
  if (!/^\d{4}-\d{2}$/.test(v)) return "";
  const [yearText, monthText] = v.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
  if (month < 1 || month > 12) return "";
  return `${yearText}-${monthText}`;
}

/** 서울 달력 기준: 미납품이고 발주 최종 납기가 오늘보다 이전이면 지연 */
export function isRowCalendarDelayed(
  row: ProductionPlanUnitListRow,
  todayYmd: string
): boolean {
  if (row.isDelivered === true) return false;
  const rel = getDueDateRelative(row.dueDate, { todayYmd });
  return rel != null && rel.diff < 0;
}

export function mergeDelayedTabItems(
  responses: Array<ProductionPlanUnitListResponse | undefined>,
  todayYmd: string
): ProductionPlanUnitListRow[] {
  const byId = new Map<string, ProductionPlanUnitListRow>();
  for (const res of responses) {
    for (const item of res?.items ?? []) {
      byId.set(item.unitId, item);
    }
  }
  const merged = [...byId.values()].filter((row) =>
    isRowCalendarDelayed(row, todayYmd)
  );
  merged.sort(compareUnitsNewestFirst);
  return merged;
}
