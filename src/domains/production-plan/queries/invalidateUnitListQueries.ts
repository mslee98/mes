import type { QueryClient } from "@tanstack/react-query";

/** 공정 PASS/FAIL 등 품목 상태 변경 후 생산·납품 품목 목록·탭 카운트 즉시 갱신 */
export async function invalidateProductionPlanUnitListQueries(
  queryClient: QueryClient
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnits"] }),
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnitTabCounts"] }),
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnit"] }),
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnitProcessRecords"] }),
    queryClient.invalidateQueries({ queryKey: ["productionPlan"] }),
  ]);
}
