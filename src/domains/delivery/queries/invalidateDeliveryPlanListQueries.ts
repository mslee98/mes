import type { QueryClient } from "@tanstack/react-query";

/** 납품 계획 생성·수정·납품 등 후 목록·탭 건수 즉시 갱신 */
export async function invalidateDeliveryPlanListQueries(
  queryClient: QueryClient
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["deliveryPlans"] }),
    queryClient.invalidateQueries({ queryKey: ["deliveryPlansTabCounts"] }),
  ]);
}
