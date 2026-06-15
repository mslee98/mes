import type { Partner, PartnerSummary } from "../../../api/purchaseOrder";
import type { CommonCodeItem } from "../../../api/commonCode";
import { labelForCommonCode } from "../../../api/commonCode";

/**
 * 드롭다운·표시용: 국가명 | 업체코드 | 업체명 (국가명은 COUNTRY 공통코드로 매핑)
 */
export function partnerSelectLabel(
  p: Partner | undefined | null,
  countryCodes: CommonCodeItem[]
): string {
  if (!p) return "—";
  const country = labelForCommonCode(countryCodes, p.countryCode);
  const code = (p.code ?? "").trim() || "—";
  const name = (p.name ?? "").trim() || "—";
  return `${country} | ${code} | ${name}`;
}

/** `partnerSummary` → `Partner` (표시·국기 URL용) */
export function partnerFromSummary(s: PartnerSummary): Partner {
  return {
    id: String(s.id ?? ""),
    code: String(s.code ?? ""),
    name: String(s.name ?? ""),
    countryCode: s.countryCode ?? undefined,
  };
}

export function partnerSummaryHasDisplayableFields(
  s: PartnerSummary | null | undefined
): boolean {
  if (s == null || typeof s !== "object") return false;
  return (
    String(s.name ?? "").trim() !== "" ||
    String(s.code ?? "").trim() !== "" ||
    String(s.countryCode ?? "").trim() !== ""
  );
}
