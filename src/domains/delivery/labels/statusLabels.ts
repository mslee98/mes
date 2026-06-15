import { createStatusLabelFn } from "../../../lib/status/createCommonCodeLabel";

/** 사용자-facing — 품목 상세 화면(생산·납품 현황)에서 개별 납품 안내 */
export const MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL =
  "품목 상세(생산·납품 현황)에서 개별 납품";

export const MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL_SENTENCE =
  `${MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL}하세요.`;

const DELIVERY_PLAN_STATUS_FALLBACK: Record<string, string> = {
  COMPLETE: "완료",
  COMPLETED: "완료",
  OPEN: "진행",
  IN_PROGRESS: "진행",
  CANCELLED: "취소",
  CANCELED: "취소",
  CLOSED: "종료",
};

const DELIVER_PLAN_SKIP_REASON_LABELS: Record<string, string> = {
  NOT_DELIVERY_READY: "납품 대기 아님",
};

/** 납품 계획 status code → 공통코드 name (없으면 폴백·code) */
export const labelForDeliveryPlanStatus = createStatusLabelFn(
  DELIVERY_PLAN_STATUS_FALLBACK
);

/** 일괄 납품 skip reason code → 사용자 라벨 */
export function labelForDeliverPlanSkipReason(reason?: string | null): string {
  const raw = String(reason ?? "").trim();
  if (!raw) return "납품 대기 아님";
  const mapped = DELIVER_PLAN_SKIP_REASON_LABELS[raw.toUpperCase()];
  return mapped ?? raw;
}
