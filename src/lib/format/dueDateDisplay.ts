import {
  diffCalendarDaysLocal,
  formatDateYmd,
  koLabelFromDiff,
  todayYmdInTimeZone,
} from "./dateFormat";

/** 오늘 기준 D-day 뱃지에서 '임박'으로 보는 남은 일수 상한 */
export const DUE_DATE_SOON_DAYS = 7;

export type DueDateRelativeTone = "overdue" | "today" | "soon" | "ok";

export interface DueDateRelative {
  diff: number;
  ddayLabel: string;
  koLabel: string;
  tone: DueDateRelativeTone;
}

export function dueDateDdayLabel(diff: number): string {
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export function dueDateRelativeTone(diff: number): DueDateRelativeTone {
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= DUE_DATE_SOON_DAYS) return "soon";
  return "ok";
}

/**
 * 기준일(기본: 서울 오늘) 대비 목표 납기일 상대 정보.
 * `null`: 날짜 없음·파싱 불가
 */
export function getDueDateRelative(
  targetYmd: string | null | undefined,
  options?: { todayYmd?: string }
): DueDateRelative | null {
  const target = formatDateYmd(targetYmd, { emptyFallback: "" });
  if (!target || target === "-") return null;
  const today = options?.todayYmd?.trim() || todayYmdInTimeZone();
  const diff = diffCalendarDaysLocal(today, target);
  if (diff == null) return null;
  return {
    diff,
    ddayLabel: dueDateDdayLabel(diff),
    koLabel: koLabelFromDiff(diff),
    tone: dueDateRelativeTone(diff),
  };
}

/** @deprecated 이름 호환 — `getDueDateRelative` 사용 권장 */
export function dueDateDdayFromToday(
  targetYmd: string | null | undefined
): { label: string; diff: number } | null {
  const rel = getDueDateRelative(targetYmd);
  if (!rel) return null;
  return { label: rel.ddayLabel, diff: rel.diff };
}

const DDAY_BADGE_BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-2 pr-2.5 text-xs font-medium";

/** D-day pill 뱃지 (발주 상세·납품 목록·계획 상세 공통) */
export function dueDateDdayBadgeClassName(diff: number): string {
  if (diff < 0) {
    return `${DDAY_BADGE_BASE} bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500`;
  }
  if (diff <= DUE_DATE_SOON_DAYS) {
    return `${DDAY_BADGE_BASE} bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500`;
  }
  return `${DDAY_BADGE_BASE} bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500`;
}

/** 테이블 등에서 pill 대신 텍스트만 쓸 때 (tone 기준) */
export function dueDateDdayTextClassName(tone: DueDateRelativeTone): string {
  if (tone === "overdue") {
    return "font-medium text-error-600 dark:text-error-500";
  }
  if (tone === "today") {
    return "font-medium text-warning-600 dark:text-warning-500";
  }
  if (tone === "soon") {
    return "font-medium text-warning-600 dark:text-warning-500";
  }
  return "text-gray-700 dark:text-gray-300";
}
