import {
  DEFAULT_PARTNER_COUNTRY_CODE,
  isPartnerCountryCode,
  PARTNER_COUNTRY_OPTIONS,
  type PartnerCountryCode,
} from "../../../domains/partner/helpers/partnerCountryOptions";

export const PARTNER_CODE_REGEX = /^[A-Z]{1,2}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_NATIONAL_REGEX = /^(02-\d{3,4}-\d{4}|0\d{2}-\d{3,4}-\d{4})$/;
export const PARTNER_TYPE_SUPPLIER = "SUPPLIER";

const PARTNER_CODE_SINGLE_ALPHABET = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
);
const PARTNER_CODE_DOUBLE_A_PREFIX = Array.from({ length: 26 }, (_, i) =>
  `A${String.fromCharCode(65 + i)}`
);
export const PARTNER_CODE_SLOT_CANDIDATES = [
  ...PARTNER_CODE_SINGLE_ALPHABET,
  ...PARTNER_CODE_DOUBLE_A_PREFIX,
];

/** 업체 폼 「국가」 선택과 동기화할 기본 국가번호 */
export const PARTNER_COUNTRY_TO_DIAL: Partial<Record<PartnerCountryCode, string>> = {
  KR: "+82",
  US: "+1",
  JP: "+81",
  CN: "+86",
  TW: "+886",
  HK: "+852",
  SG: "+65",
  MY: "+60",
  TH: "+66",
  VN: "+84",
  IN: "+91",
  ID: "+62",
  PH: "+63",
  AU: "+61",
  DE: "+49",
  FR: "+33",
  GB: "+44",
  IT: "+39",
  NL: "+31",
  CH: "+41",
  CA: "+1",
  PL: "+48",
  TR: "+90",
  AE: "+971",
};

export const PHONE_COUNTRY_ROWS = PARTNER_COUNTRY_OPTIONS.filter((c) =>
  Boolean(PARTNER_COUNTRY_TO_DIAL[c.code as PartnerCountryCode])
).map((c) => {
  const countryCode = c.code as PartnerCountryCode;
  const dial = PARTNER_COUNTRY_TO_DIAL[countryCode]!;
  return {
    countryCode,
    dial,
    labelLine: `${countryCode} · ${dial}`,
  };
}).sort((a, b) => a.labelLine.localeCompare(b.labelLine, "ko"));

function uniqueDialsLongestFirst(): string[] {
  const set = new Set(
    Object.values(PARTNER_COUNTRY_TO_DIAL).filter(
      (d): d is string => typeof d === "string" && d.length > 0
    )
  );
  return [...set].sort((a, b) => b.length - a.length);
}

function countryCodeForDial(dial: string): PartnerCountryCode {
  for (const row of PARTNER_COUNTRY_OPTIONS) {
    const cc = row.code as PartnerCountryCode;
    if (PARTNER_COUNTRY_TO_DIAL[cc] === dial) return cc;
  }
  return DEFAULT_PARTNER_COUNTRY_CODE;
}

export function splitPartnerPhone(full: string): {
  countryCode: PartnerCountryCode;
  national: string;
} {
  const t = full.trim();
  if (!t)
    return { countryCode: DEFAULT_PARTNER_COUNTRY_CODE, national: "" };
  for (const dial of uniqueDialsLongestFirst()) {
    if (t.startsWith(dial)) {
      return {
        countryCode: countryCodeForDial(dial),
        national: t.slice(dial.length).trim(),
      };
    }
  }
  return {
    countryCode: DEFAULT_PARTNER_COUNTRY_CODE,
    national: t,
  };
}

export function formatPartnerNationalPhone(raw: string): string {
  const numbersOnly = raw.replace(/\D/g, "");
  if (!numbersOnly) return "";

  if (numbersOnly.startsWith("02")) {
    const digits = numbersOnly.slice(0, 10);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  const digits = numbersOnly.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function phoneDialForCountry(countryCode: PartnerCountryCode): string {
  return (
    PARTNER_COUNTRY_TO_DIAL[countryCode] ??
    PARTNER_COUNTRY_TO_DIAL[DEFAULT_PARTNER_COUNTRY_CODE]!
  );
}

export { DEFAULT_PARTNER_COUNTRY_CODE, isPartnerCountryCode };
export type { PartnerCountryCode };
