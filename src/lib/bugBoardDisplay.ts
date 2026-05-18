import type { BugBoardStatus, BugPriority } from "../api/devBoards";

const BUG_BOARD_STATUS_LABELS: Record<string, string> = {
  OPEN: "접수",
  IN_PROGRESS: "처리 중",
  FIXED: "수정 완료",
  VERIFIED: "검증 완료",
  CLOSED: "종료",
};

const BUG_BOARD_PRIORITY_LABELS: Record<string, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

function normalizeCode(code: string | null | undefined): string {
  return String(code ?? "").trim().toUpperCase();
}

/** API 상태 코드 → 화면용 한글 라벨 */
export function labelForBugBoardStatus(status: BugBoardStatus | string | null | undefined): string {
  const key = normalizeCode(status);
  if (!key) return "-";
  return BUG_BOARD_STATUS_LABELS[key] ?? status ?? "-";
}

/** API 우선순위 코드 → 화면용 한글 라벨 */
export function labelForBugPriority(priority: BugPriority | string | null | undefined): string {
  const key = normalizeCode(priority);
  if (!key) return "-";
  return BUG_BOARD_PRIORITY_LABELS[key] ?? priority ?? "-";
}

export function statusBadgeColor(status: string): "success" | "warning" | "error" | "info" {
  const normalized = normalizeCode(status);
  if (normalized === "CLOSED") return "error";
  if (normalized === "FIXED" || normalized === "VERIFIED") return "success";
  if (normalized === "IN_PROGRESS") return "warning";
  return "info";
}

export const BUG_BOARD_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "OPEN", label: BUG_BOARD_STATUS_LABELS.OPEN },
  { value: "IN_PROGRESS", label: BUG_BOARD_STATUS_LABELS.IN_PROGRESS },
  { value: "FIXED", label: BUG_BOARD_STATUS_LABELS.FIXED },
  { value: "VERIFIED", label: BUG_BOARD_STATUS_LABELS.VERIFIED },
  { value: "CLOSED", label: BUG_BOARD_STATUS_LABELS.CLOSED },
];

export const BUG_BOARD_PRIORITY_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "LOW", label: BUG_BOARD_PRIORITY_LABELS.LOW },
  { value: "MEDIUM", label: BUG_BOARD_PRIORITY_LABELS.MEDIUM },
  { value: "HIGH", label: BUG_BOARD_PRIORITY_LABELS.HIGH },
  { value: "URGENT", label: BUG_BOARD_PRIORITY_LABELS.URGENT },
];
