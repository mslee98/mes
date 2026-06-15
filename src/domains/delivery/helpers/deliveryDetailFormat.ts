import type { CommonCodeItem } from "../../../api/commonCode";

export function formatDeliveryDetailDateYmd(
  s: string | null | undefined
): string {
  const raw = String(s ?? "").trim();
  if (!raw) return "-";
  const head = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) return head[1];
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return raw;
}

export function formatDeliveryDetailDate(
  s: string | null | undefined
): string {
  return formatDeliveryDetailDateYmd(s);
}

export function formatDeliveryDetailDateTimeKo(
  s: string | null | undefined
): string {
  const raw = String(s ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }
  return raw;
}

export function labelForSortedDeliveryStatus(
  sortedCodes: CommonCodeItem[],
  code: string | undefined | null
): string {
  const c = String(code ?? "").trim();
  if (!c) return "미지정";
  const hit = sortedCodes.find((x) => x.code === c);
  return (hit?.name ?? "").trim() || c;
}
