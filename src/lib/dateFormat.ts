export interface DateFormatOptions {
  emptyFallback?: string;
}

function parseValidDate(value: string | null | undefined): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatDateTimeKo(
  value: string | null | undefined,
  options: DateFormatOptions = {}
): string {
  const raw = String(value ?? "").trim();
  const emptyFallback = options.emptyFallback ?? "—";
  if (!raw) return emptyFallback;
  const date = parseValidDate(raw);
  if (!date) return raw;
  return date.toLocaleString("ko-KR");
}

export function formatDateYmd(
  value: string | null | undefined,
  options: DateFormatOptions = {}
): string {
  const raw = String(value ?? "").trim();
  const emptyFallback = options.emptyFallback ?? "-";
  if (!raw) return emptyFallback;
  const head = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) return head[1];
  const date = parseValidDate(raw);
  if (!date) return raw;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 로컬 타임존 기준 오늘 날짜 `Y-m-d` */
export function localYmdToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function ymdToLocalMidnightMs(ymd: string): number | null {
  const normalized = formatDateYmd(ymd, { emptyFallback: "" });
  if (!normalized || normalized === "-") return null;
  const parts = normalized.split("-").map((x) => Number.parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getTime();
}

/** `toYmd` − `fromYmd` (로컬 달력 일수). 파싱 실패 시 `null` */
export function diffCalendarDaysLocal(
  fromYmd: string,
  toYmd: string
): number | null {
  const a = ymdToLocalMidnightMs(fromYmd);
  const b = ymdToLocalMidnightMs(toYmd);
  if (a == null || b == null) return null;
  return Math.round((b - a) / 86400000);
}

/** `Y-m-d` → 한국어 표기 (예: 2026년 5월 31일) */
export function formatDateYmdKoLong(value: string | null | undefined): string {
  const s = formatDateYmd(value, { emptyFallback: "" });
  if (!s || s === "-") return "—";
  const parts = s.split("-").map((x) => Number.parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return s;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return s;
  return dt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 로컬 오늘 기준 목표일까지(또는 초과) 달력 일수.
 * `null`: 날짜 없음/파싱 불가
 */
export function calendarDaysFromLocalToday(
  targetYmd: string | null | undefined
): number | null {
  const t = formatDateYmd(targetYmd, { emptyFallback: "" });
  if (!t || t === "-") return null;
  return diffCalendarDaysLocal(localYmdToday(), t);
}

/** 오늘 대비 남은·지난 일수 안내 문구 */
export function formatDaysRelativeToTodayKo(
  targetYmd: string | null | undefined
): string {
  const diff = calendarDaysFromLocalToday(targetYmd);
  if (diff == null) return "";
  if (diff === 0) return "오늘";
  if (diff > 0) return `${diff}일 남음`;
  return `${Math.abs(diff)}일 지남`;
}
