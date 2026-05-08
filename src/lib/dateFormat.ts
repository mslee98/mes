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
