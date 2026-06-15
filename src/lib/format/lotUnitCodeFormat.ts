import type { CommonCodeItem } from "../../api/commonCode";
import { compactYmd } from "./dateFormat";

/** UI 안내 — 서버 LOT 채번 형식(1자리 년도코드) */
export const LOT_UNIT_CODE_PATTERN_DESCRIPTION =
  "LT-yyyyMMdd-년도코드1자+업체코드+일련번호(0001)";

/** `LOT_YEAR_CODE`: `name`=연도(YYYY), `code`=1자 */
export function yearCodeFromOrderDate(
  orderDate: string,
  lotYearCodes: CommonCodeItem[]
): string {
  const year = String(orderDate ?? "").trim().slice(0, 4);
  if (!year || !/^\d{4}$/.test(year)) return "";
  const hit = lotYearCodes.find(
    (item) =>
      item.isActive !== false && String(item.name ?? "").trim() === year
  );
  return hit ? String(hit.code ?? "").trim().toUpperCase() : "";
}

/** 팝오버 등 — "2025→O, 2026→P" */
export function formatLotYearCodeLegend(
  lotYearCodes: CommonCodeItem[]
): string {
  return lotYearCodes
    .filter((item) => item.isActive !== false)
    .slice()
    .sort(
      (a, b) =>
        Number(String(a.name ?? "")) - Number(String(b.name ?? "")) ||
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    )
    .map((item) => `${item.name}→${item.code}`)
    .join(", ");
}

export function buildLotUnitCode(opts: {
  lotIssuedDate: string;
  yearCode: string;
  partnerCode: string;
  sequenceNo: number;
}): string {
  const ymd =
    compactYmd(opts.lotIssuedDate) ||
    compactYmd(new Date().toISOString().slice(0, 10)) ||
    "";
  const year = String(opts.yearCode ?? "").trim().toUpperCase();
  const partner = String(opts.partnerCode ?? "").trim().toUpperCase();
  const seq = String(Math.max(1, Math.trunc(opts.sequenceNo))).padStart(4, "0");
  return `LT-${ymd}-${year}${partner}${seq}`;
}

/** UI 예시 — 발급일(ymd) + 발주일(년도코드) 분리 */
export function lotUnitCodeExample(opts: {
  issuedDate: string;
  orderDate: string;
  partnerCode: string;
  lotYearCodes: CommonCodeItem[];
}): string {
  const ymd =
    compactYmd(opts.issuedDate) ||
    compactYmd(new Date().toISOString().slice(0, 10)) ||
    "";
  const year =
    yearCodeFromOrderDate(opts.orderDate, opts.lotYearCodes) || "?";
  const partner = String(opts.partnerCode ?? "EO").trim().toUpperCase();
  return `LT-${ymd}-${year}${partner}0001`;
}
