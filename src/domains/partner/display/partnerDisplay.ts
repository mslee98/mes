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

/**
 * 표시·국기 URL용 — API별 계약:
 * - 발주: `partnerSummary` (목록·상세)
 * - 생산/납품 목록·계획: `partner` (id·code·name·countryCode 4필드)
 * - 중첩 `purchaseOrder`: `partnerSummary` 보장 (BE)
 * - Unit: 확장 `partner` — P1에서 `partnerSummary` 통일 예정
 */
export function resolvePartnerForDisplay(
  partner?: Partner | null,
  partnerSummary?: PartnerSummary | null
): Partner | null {
  if (
    partnerSummary != null &&
    partnerSummaryHasDisplayableFields(partnerSummary)
  ) {
    return partnerFromSummary(partnerSummary);
  }
  if (partner != null && typeof partner === "object") {
    const hasFields =
      String(partner.name ?? "").trim() !== "" ||
      String(partner.code ?? "").trim() !== "" ||
      String(partner.countryCode ?? "").trim() !== "";
    return hasFields ? partner : null;
  }
  return null;
}
