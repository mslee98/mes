import { createStatusLabelFn } from "../../../lib/status/createCommonCodeLabel";

const PRODUCTION_PLAN_STATUS_FALLBACK: Record<string, string> = {
  OPEN: "진행",
  IN_PROGRESS: "진행",
  COMPLETE: "완료",
  COMPLETED: "완료",
  CLOSED: "종료",
  CANCELLED: "취소",
  CANCELED: "취소",
};

/** 생산 계획 status code → 공통코드 name (없으면 폴백·code) */
export const labelForProductionPlanStatus = createStatusLabelFn(
  PRODUCTION_PLAN_STATUS_FALLBACK
);
