/** 24시간 "HH:mm" → 12시간제 표시용 */
export function twentyFourToParts(s: string): {
  period: "AM" | "PM";
  hour12: number;
  minute: number;
} | null {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const [a, b] = t.split(":");
  const h24 = Number.parseInt(a, 10);
  const minute = Number.parseInt(b, 10);
  if (Number.isNaN(h24) || h24 < 0 || h24 > 23) return null;
  const m = Number.isNaN(minute) ? 0 : Math.min(59, Math.max(0, minute));
  const period: "AM" | "PM" = h24 < 12 ? "AM" : "PM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { period, hour12, minute: m };
}

/** 12시간제 + 분 → 24시간 "HH:mm" */
export function twelveToTwentyFour(
  period: "AM" | "PM",
  hour12: number,
  minute: number
): string {
  const m = Math.min(59, Math.max(0, minute));
  const h = Math.min(12, Math.max(1, hour12));
  let h24: number;
  if (period === "AM") {
    h24 = h === 12 ? 0 : h;
  } else {
    h24 = h === 12 ? 12 : h + 12;
  }
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatKoreanTimeLabel(hhmm: string): string {
  const p = twentyFourToParts(hhmm);
  if (!p) return "";
  const ap = p.period === "AM" ? "오전" : "오후";
  return `${ap} ${p.hour12}:${String(p.minute).padStart(2, "0")}`;
}
