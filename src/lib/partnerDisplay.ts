import type { Partner } from "../api/purchaseOrder";
import type { CommonCodeItem } from "../api/commonCode";
import { labelForCommonCode } from "../api/commonCode";

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
