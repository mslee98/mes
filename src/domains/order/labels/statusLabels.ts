import { createStatusLabelFn } from "../../../lib/status/createCommonCodeLabel";

const PURCHASE_ORDER_STATUS_FALLBACK: Record<string, string> = {
  PO_REGISTERED: "등록",
  REGISTERED: "등록",
  OPEN: "진행",
  IN_PROGRESS: "진행",
  COMPLETED: "완료",
  COMPLETE: "완료",
  CLOSED: "종료",
  CANCELLED: "취소",
  CANCELED: "취소",
};

/** 발주 status code → 공통코드 name (없으면 폴백·code) */
export const labelForPurchaseOrderStatus = createStatusLabelFn(
  PURCHASE_ORDER_STATUS_FALLBACK
);
