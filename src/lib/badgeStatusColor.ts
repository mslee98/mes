/** `Badge` `color` 와 동일한 값 */
export type StatusBadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

/**
 * 발주/납품 등 공통코드 `name` 기반 상태 뱃지 색 (한글 라벨).
 */
export function badgeColorFromKoStatusLabel(
  statusName: string
): StatusBadgeColor {
  const s = statusName?.toLowerCase() ?? "";
  if (s.includes("미승인") || s.includes("미지정") || s.includes("등록")) {
    return "primary";
  }
  if (s.includes("완료") || s.includes("승인") || s.includes("확정")) {
    return "success";
  }
  if (s.includes("대기") || s.includes("진행")) {
    return "warning";
  }
  if (s.includes("반려") || s.includes("취소")) {
    return "error";
  }
  return "primary";
}

/** 전자결재 함 목록 등 문서 상태 표시용 (mock/표시 문자열) */
export function badgeColorFromApprovalInboxLabel(
  status: string
): StatusBadgeColor {
  if (status.includes("결재중") || status.includes("임시")) return "warning";
  if (status.includes("완료") || status.includes("승인")) return "success";
  if (status.includes("반려")) return "error";
  return "primary";
}

/** USE_STATUS 코드 (ACTIVE / INACTIVE 등) */
export function badgeColorFromUseStatusCode(code: string): StatusBadgeColor {
  const c = code?.trim().toUpperCase() ?? "";
  if (c === "ACTIVE") return "success";
  if (c === "INACTIVE") return "error";
  return "primary";
}
