import type {
  ProductionPlanUnitListItem,
  ProductionPlanUnitListParams,
  ProductionPlanUnitPerspective,
  ProductionPlanUnitTab,
} from "../../../api/purchaseOrder";

type UnitListSort = Pick<
  ProductionPlanUnitListParams,
  "sortBy" | "sortOrder"
>;

const DUE_DATE_ASC_SORT = {
  sortBy: "dueDate",
  sortOrder: "asc",
} as const satisfies UnitListSort;

/** 생산·납품 품목 목록 — 백엔드 계약 정렬 (docs/domains/DELIVERY.md §2) */
export function resolveUnitListSort(
  tab: ProductionPlanUnitTab,
  perspective: ProductionPlanUnitPerspective
): UnitListSort {
  if (tab === "COMPLETED") {
    if (perspective === "production") {
      return { sortBy: "productionCompletedAt", sortOrder: "desc" };
    }
    return { sortBy: "deliveredAt", sortOrder: "desc" };
  }
  return DUE_DATE_ASC_SORT;
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
