import type { CommonCodeItem } from "../../api/commonCode";

/**
 * 현재 납품 상태 코드가 공통 코드 목록에서 몇 번째 단계인지에 따라 완료된 스텝 수(체크된 칸 개수)를 계산한다.
 * `sortOrder` 정렬된 목록에서 `statusCode`의 인덱스가 i이면 i+1칸까지 완료로 본다.
 */
export function computeDeliveryStatusCompletedCount(
  statusCode: string | undefined,
  sortedDeliveryStatusCodes: CommonCodeItem[]
): number {
  const code = String(statusCode ?? "").trim();
  if (!code || sortedDeliveryStatusCodes.length === 0) return 0;
  const idx = sortedDeliveryStatusCodes.findIndex((c) => c.code === code);
  if (idx < 0) return 0;
  return idx + 1;
}

/** 각 단계 아래 보조 텍스트 — 현재 상태에 해당하는 칸에만 납품일 등을 표시 */
export function buildDeliveryStepperDetailsFromCodes(
  sortedCodes: CommonCodeItem[],
  currentStatusCode: string | undefined,
  detailForCurrentStep: string
): string[] {
  const cur = String(currentStatusCode ?? "").trim();
  const idx = sortedCodes.findIndex((c) => c.code === cur);
  return sortedCodes.map((_, i) => (i === idx ? detailForCurrentStep : ""));
}
