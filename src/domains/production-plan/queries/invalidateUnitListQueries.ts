import type { QueryClient } from "@tanstack/react-query";

const UNIT_LIST_QUERY_ROOTS = [
  "productionPlanUnits",
  "productionPlanUnitTabCounts",
  "productionPlanUnitOverview",
  "productionPlanUnit",
  "productionPlanUnitProcessRecords",
  "productionPlan",
] as const;

/** 공정 PASS/FAIL 등 품목 상태 변경 후 생산·납품 품목 목록·탭 카운트 즉시 갱신 */
export async function invalidateProductionPlanUnitListQueries(
  queryClient: QueryClient
): Promise<void> {
  await Promise.all(
    UNIT_LIST_QUERY_ROOTS.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey: [queryKey],
        refetchType: "all",
      })
    )
  );
}
