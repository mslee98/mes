import type {
  ApprovalRequestDetail,
  ApprovalRequestLine,
} from "../api/approvalRequests";

/** 백엔드: 결재선 없이 승인·반려 액션 허용 역할 코드(대소문자 무시). */
const APPROVAL_BYPASS_ROLE_CODES = new Set(["ADMIN", "SYSTEM_MANAGER"]);

function approvalLineStatusUpper(line: ApprovalRequestLine): string {
  return String(line.status ?? line.lineStatus ?? "")
    .trim()
    .toUpperCase();
}

/** `currentApprovalRequest.lines`에서 처리 대기 중인 한 줄 — UI·권한 판별용. */
export function findPendingPurchaseOrderApprovalLine(
  lines: ApprovalRequestLine[] | undefined
): ApprovalRequestLine | undefined {
  if (!Array.isArray(lines)) return undefined;
  return lines.find((line) => approvalLineStatusUpper(line) === "PENDING");
}

function pendingLineApproverUserId(
  line: ApprovalRequestLine | undefined
): number | undefined {
  if (!line) return undefined;
  const raw = line.approverUserId ?? line.approver?.id;
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * JWT 페이로드에 노출된 `roles` / `permissions` 기준.
 * 로그인 응답·refresh user에 코드가 없으면 우회 불가로 본다.
 */
export function isPurchaseOrderApprovalBypassRole(user: unknown): boolean {
  const raw = user as { permissions?: string[]; roles?: string[] } | null;
  if (!raw) return false;
  const perms = raw.permissions ?? [];
  const roles = raw.roles ?? [];
  for (const c of [...perms, ...roles]) {
    const u = String(c ?? "").trim().toUpperCase();
    if (APPROVAL_BYPASS_ROLE_CODES.has(u)) return true;
  }
  return false;
}

/**
 * 현재 결재 요청의 PENDING 단계 결재자가 로그인 사용자와 같은지.
 * `canCurrentUserApprove` API 필드는 없으므로 `lines`로만 계산한다.
 */
export function isCurrentUserPendingPurchaseOrderApprover(
  currentUserId: number | undefined,
  approvalRequest: ApprovalRequestDetail | null | undefined
): boolean {
  if (currentUserId == null) return false;
  const pending = findPendingPurchaseOrderApprovalLine(approvalRequest?.lines);
  const approverId = pendingLineApproverUserId(pending);
  if (approverId == null) return false;
  return approverId === currentUserId;
}

/**
 * 발주 상세에서 승인·반려 버튼(및 동일 권한 액션) 표시 여부.
 * - 일반: 진행 중 + PENDING 라인의 approverUserId === 현재 사용자
 * - ADMIN / SYSTEM_MANAGER: 진행 중이면 결재선 우회 가능(백엔드와 동일 정책 가정)
 */
export function canShowPurchaseOrderApproveRejectUi(
  authUser: unknown,
  currentUserId: number | undefined,
  approvalRequest: ApprovalRequestDetail | null | undefined,
  isApprovalInProgress: boolean
): boolean {
  if (!isApprovalInProgress) return false;
  if (isPurchaseOrderApprovalBypassRole(authUser)) return true;
  return isCurrentUserPendingPurchaseOrderApprover(
    currentUserId,
    approvalRequest
  );
}
