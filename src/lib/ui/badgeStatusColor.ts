/** `Badge` `color` 와 동일한 값 */
export type StatusBadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

type BadgeStatusDomain = "order" | "delivery" | "approval" | "use-status";

function normalizeStatusText(status: string): string {
  return String(status ?? "").trim().toLowerCase();
}

function colorFromKoLifecycleStatus(status: string): StatusBadgeColor {
  const s = normalizeStatusText(status);
  if (s.includes("미승인") || s.includes("미지정") || s.includes("등록")) return "primary";
  if (s.includes("완료") || s.includes("승인") || s.includes("확정")) return "success";
  if (s.includes("대기") || s.includes("진행")) return "warning";
  if (s.includes("반려") || s.includes("취소")) return "error";
  return "primary";
}

function colorFromApprovalStatus(status: string): StatusBadgeColor {
  const s = normalizeStatusText(status);
  if (s.includes("결재중") || s.includes("임시")) return "warning";
  if (s.includes("완료") || s.includes("승인")) return "success";
  if (s.includes("반려")) return "error";
  return "primary";
}

function colorFromUseStatusCode(code: string): StatusBadgeColor {
  const c = String(code ?? "").trim().toUpperCase();
  if (c === "ACTIVE") return "success";
  if (c === "INACTIVE") return "error";
  return "primary";
}

export function badgeColorByDomain(
  domain: BadgeStatusDomain,
  value: string
): StatusBadgeColor {
  if (domain === "approval") return colorFromApprovalStatus(value);
  if (domain === "use-status") return colorFromUseStatusCode(value);
  return colorFromKoLifecycleStatus(value);
}

/**
 * 발주/납품 등 공통코드 `name` 기반 상태 뱃지 색 (한글 라벨).
 */
export function badgeColorFromKoStatusLabel(
  statusName: string
): StatusBadgeColor {
  return badgeColorByDomain("delivery", statusName);
}

export function badgeColorFromOrderStatus(statusName: string): StatusBadgeColor {
  return badgeColorByDomain("order", statusName);
}

export function badgeColorFromDeliveryStatus(statusName: string): StatusBadgeColor {
  return badgeColorByDomain("delivery", statusName);
}

/** 전자결재 함 목록 등 문서 상태 표시용 (mock/표시 문자열) */
export function badgeColorFromApprovalInboxLabel(
  status: string
): StatusBadgeColor {
  return badgeColorByDomain("approval", status);
}

/** USE_STATUS 코드 (ACTIVE / INACTIVE 등) */
export function badgeColorFromUseStatusCode(code: string): StatusBadgeColor {
  return badgeColorByDomain("use-status", code);
}
