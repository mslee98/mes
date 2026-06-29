import type { CommonCodeItem } from "../../../api/commonCode";
import { labelForCommonCode } from "../../../api/commonCode";
import type { RmaStatus } from "../../../api/rma";
import { createStatusLabelFn } from "../../../lib/status/createCommonCodeLabel";

const RMA_STATUS_FALLBACK: Record<string, string> = {
  RECEIVED: "접수",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  RETURN_WAITING: "반송대기",
  RETURNED: "반송완료",
  CLOSED: "종료",
};

const labelForRmaStatusBase = createStatusLabelFn(RMA_STATUS_FALLBACK);

/** RMA status code → 공통코드 name (없으면 폴백·code) */
export function labelForRmaStatus(
  statusCodes: CommonCodeItem[],
  code?: string | null
): string {
  const statusCode = String(code ?? "").trim();
  if (!statusCode) return "미지정";
  return labelForRmaStatusBase(statusCodes, statusCode);
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

/** 반송 상태 — 공통코드 우선, RMA status·플래그 폴백 */
export function labelForRmaReturnStatus(
  row: {
    returnStatus?: string | null;
    returnRequiredYn?: boolean | null;
    status?: RmaStatus;
  },
  returnStatusCodes: CommonCodeItem[]
): string {
  const explicit = toText(row.returnStatus);
  if (explicit) return labelForCommonCode(returnStatusCodes, explicit);
  if (row.status === "RETURN_WAITING") return "반송대기";
  if (row.status === "RETURNED") return "반송완료";
  if (row.returnRequiredYn) return "반송 필요";
  return "-";
}
