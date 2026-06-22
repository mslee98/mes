import type {
  ProductionPlanUnitListItem,
  ProductionPlanUnitListParams,
  ProductionPlanUnitTab,
} from "../../../api/purchaseOrder";
import { ORDER_NEWEST_FIRST_SORT } from "./planListSort";

type UnitListSort = Pick<
  ProductionPlanUnitListParams,
  "sortBy" | "sortOrder"
>;

/** 생산·납품 품목 목록 — 발주일 최신순(완료 탭은 납품 완료일) */
export function resolveUnitListSort(tab: ProductionPlanUnitTab): UnitListSort {
  if (tab === "COMPLETED") {
    return { sortBy: "deliveredAt", sortOrder: "desc" };
  }
  return ORDER_NEWEST_FIRST_SORT;
}

function parseSortInstant(value: unknown): number {
  const ms = Date.parse(String(value ?? "").trim());
  return Number.isFinite(ms) ? ms : 0;
}

function unitListOrderSortInstant(row: ProductionPlanUnitListItem): number {
  const order = row.order;
  const orderInstant =
    order?.orderedAt ??
    order?.orderDate ??
    row.createdAt;
  return parseSortInstant(orderInstant);
}

/** 클라이언트 지연 탭 병합 — 발주일(없으면 createdAt) 내림차순 */
export function compareUnitsNewestFirst(
  a: ProductionPlanUnitListItem,
  b: ProductionPlanUnitListItem
): number {
  const tb = unitListOrderSortInstant(b);
  const ta = unitListOrderSortInstant(a);
  if (tb !== ta) return tb - ta;
  return String(b.unitId ?? "").localeCompare(String(a.unitId ?? ""));
}
