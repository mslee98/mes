/**
 * 공정 PASS/FAIL 폼: 날짜(Y-m-d) + 시간(HH:mm) ↔ API용 ISO 문자열.
 * 브라우저 로컬 타임존 기준으로 조합합니다.
 */
export function dateTimeLocalToIso(
  dateStr: string,
  timeStr: string
): string | undefined {
  const d = String(dateStr ?? "").trim();
  if (!d) return undefined;
  const tRaw = String(timeStr ?? "").trim();
  const t = tRaw ? tRaw.slice(0, 5) : "00:00";
  if (!/^\d{2}:\d{2}$/.test(t)) return undefined;
  const dt = new Date(`${d}T${t}:00`);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString();
}

/** ISO 또는 빈 문자열 → DatePicker / time input 값 */
export function isoToDateAndTime(iso: string): {
  date: string;
  time: string;
} {
  const s = String(iso ?? "").trim();
  if (!s) return { date: "", time: "" };
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return { date: "", time: "" };
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const h = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
}
