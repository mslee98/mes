/**
 * 업체 등록 등에서 선택 가능한 국가(ISO 3166-1 alpha-2).
 * 공통코드 COUNTRY와 별도로 두며, 백엔드에 저장되는 값은 `code`입니다.
 */
export const PARTNER_COUNTRY_OPTIONS = [
  { code: "KR", label: "대한민국" },
  { code: "US", label: "미국" },
  { code: "JP", label: "일본" },
  { code: "CN", label: "중국" },
  { code: "TW", label: "대만" },
  { code: "HK", label: "홍콩" },
  { code: "SG", label: "싱가포르" },
  { code: "MY", label: "말레이시아" },
  { code: "TH", label: "태국" },
  { code: "VN", label: "베트남" },
  { code: "IN", label: "인도" },
  { code: "ID", label: "인도네시아" },
  { code: "PH", label: "필리핀" },
  { code: "AU", label: "호주" },
  { code: "DE", label: "독일" },
  { code: "FR", label: "프랑스" },
  { code: "GB", label: "영국" },
  { code: "IT", label: "이탈리아" },
  { code: "NL", label: "네덜란드" },
  { code: "CH", label: "스위스" },
  { code: "CA", label: "캐나다" },
  { code: "PL", label: "폴란드" },
  { code: "TR", label: "튀르키예" },
  { code: "AE", label: "아랍에미리트" },
] as const;

export type PartnerCountryCode = (typeof PARTNER_COUNTRY_OPTIONS)[number]["code"];

export const DEFAULT_PARTNER_COUNTRY_CODE: PartnerCountryCode = "KR";

const flagModules = import.meta.glob<string>("../icons/country/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

const FLAG_URL_BY_CODE: Record<string, string> = {};

for (const path of Object.keys(flagModules)) {
  const m = path.match(/[\\/]+([A-Za-z]{2})\.svg$/i);
  if (m) FLAG_URL_BY_CODE[m[1].toUpperCase()] = flagModules[path];
}

export function partnerCountryFlagUrl(code: string): string | undefined {
  return FLAG_URL_BY_CODE[code.trim().toUpperCase()];
}

export function isPartnerCountryCode(value: string): value is PartnerCountryCode {
  return PARTNER_COUNTRY_OPTIONS.some((o) => o.code === value);
}
