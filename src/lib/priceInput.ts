export function parseLineUnitPrice(display: string): number {
  const n = Number(display.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function formatLineUnitPriceDisplay(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/,/g, "");
  const [intPartRaw, decPartRaw] = normalized.split(".");
  const intDigits = (intPartRaw ?? "").replace(/\D/g, "");
  if (!intDigits && !decPartRaw) return "";
  const formattedInt = (intDigits || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decPartRaw == null) return formattedInt;
  const decDigits = decPartRaw.replace(/\D/g, "");
  return decDigits ? `${formattedInt}.${decDigits}` : formattedInt;
}

/** 환율·금액 입력 — 비어 있으면 null */
export function parseOptionalExchangeRate(display: string): number | null {
  const t = display.trim();
  if (!t) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
