import type {
  ProductionPlanItem,
  ProductionPlanUnit,
} from "../api/purchaseOrder";

/** 백엔드 `parseSerialNo`: `^(.*?)(\d{4})$` */
export const PRODUCT_SERIAL_SUFFIX_LEN = 4;
const PRODUCT_SERIAL_SUFFIX_RE = /^(.*?)(\d{4})$/;

export function parseProductSerialSuffix(serialNo: string | null | undefined): string {
  const s = String(serialNo ?? "").trim();
  if (!s) return "";
  const m = s.match(PRODUCT_SERIAL_SUFFIX_RE);
  if (m) return m[2];
  return s.length >= PRODUCT_SERIAL_SUFFIX_LEN
    ? s.slice(-PRODUCT_SERIAL_SUFFIX_LEN)
    : "";
}

export function parseProductSerialPrefix(serialNo: string | null | undefined): string {
  const s = String(serialNo ?? "").trim();
  const m = s.match(PRODUCT_SERIAL_SUFFIX_RE);
  return m ? m[1] : "";
}

export function normalizeSerialSuffixInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PRODUCT_SERIAL_SUFFIX_LEN);
}

/** `GET .../serials/max-sequence` — 발주 상세 LT 채번과 동일 API, 키만 접두사 기준 */
export function productSerialSequenceKey(serialPrefix: string): string {
  const p = String(serialPrefix ?? "").trim();
  return p ? `PROD:${p}` : "";
}

export function formatProductSerialSuffixFromSequence(
  nextSequence: number,
  nextSequenceText?: string
): string {
  const text = String(nextSequenceText ?? "").trim();
  if (/^\d{4}$/.test(text)) return text;
  return String(Math.max(1, Math.trunc(nextSequence))).padStart(
    PRODUCT_SERIAL_SUFFIX_LEN,
    "0"
  );
}

/** 사업명 스냅샷 → 시리얼용 코드 (예: `EI0640PA`) */
export function normalizeBusinessCodeFromSnapshot(
  snapshot: string | null | undefined
): string {
  const raw = String(snapshot ?? "").trim().toUpperCase();
  if (!raw) return "";
  const paren = raw.match(/\(([^)]+)\)\s*$/)?.[1]?.trim();
  const core = paren ?? raw;
  return core.replace(/\s+/g, "");
}

export function formatPartnerCodeForSerialPrefix(
  partnerCode: string | null | undefined
): string {
  const code = String(partnerCode ?? "").trim().toUpperCase();
  if (!code) return "";
  return code.endsWith("_") ? code : `${code}_`;
}

/**
 * 제품 시리얼 접두사 — 예: `YIM_EI0640PA-PC`
 * (`assign-product-serials` 요청의 `serialNo`는 접두사+끝 4자리 전체)
 */
export function buildProductSerialPrefix(parts: {
  partnerCode?: string | null;
  businessNameSnapshot?: string | null;
  wavelengthCode?: string | null;
}): string {
  const partnerPart = formatPartnerCodeForSerialPrefix(parts.partnerCode);
  const business = normalizeBusinessCodeFromSnapshot(parts.businessNameSnapshot);
  const wavelength = String(parts.wavelengthCode ?? "").trim().toUpperCase();
  if (!partnerPart || !business || !wavelength) return "";
  return `${partnerPart}${business}-${wavelength}`;
}

export type ProductSerialAssignContext = {
  partnerCode?: string | null;
  businessNameSnapshot?: string | null;
};

export function businessNameSnapshotForPlanUnit(
  items: ProductionPlanItem[] | undefined,
  unitId: string
): string | null {
  for (const item of items ?? []) {
    for (const u of item.units ?? []) {
      if (u.id === unitId) {
        return item.businessNameSnapshot?.trim() ?? null;
      }
    }
  }
  return null;
}

export function resolveProductSerialPrefix(
  unit: ProductionPlanUnit,
  ctx?: ProductSerialAssignContext
): string {
  const fromApi = String(unit.serialPrefix ?? "").trim();
  if (fromApi) return fromApi;

  const fromSerial = parseProductSerialPrefix(unit.serialNo);
  if (fromSerial) return fromSerial;

  return buildProductSerialPrefix({
    partnerCode: ctx?.partnerCode,
    businessNameSnapshot: ctx?.businessNameSnapshot,
    wavelengthCode: unit.wavelengthCode,
  });
}

/** API `serialNo` — 접두사 + 끝 4자리 숫자 전체 문자열 */
export function buildFullProductSerialNo(
  prefix: string,
  suffixDigits: string
): string {
  const p = String(prefix ?? "").trim();
  if (!p) {
    throw new Error(
      "제품 시리얼 접두사를 만들 수 없습니다. 거래처·사업·파장 정보를 확인하세요."
    );
  }
  const suffix = normalizeSerialSuffixInput(suffixDigits);
  if (suffix.length !== PRODUCT_SERIAL_SUFFIX_LEN) {
    throw new Error("제품 시리얼 끝 4자리를 입력하세요.");
  }
  const full = `${p}${suffix}`;
  if (!PRODUCT_SERIAL_SUFFIX_RE.test(full)) {
    throw new Error("제품 시리얼 형식이 올바르지 않습니다.");
  }
  return full;
}

/** UI 미리보기 — suffix 미완성 시 0 패딩 */
export function previewFullProductSerialNo(
  prefix: string,
  suffixDigits: string
): string {
  const p = String(prefix ?? "").trim();
  if (!p) return "";
  const raw = normalizeSerialSuffixInput(suffixDigits);
  if (!raw) return p;
  const suffix =
    raw.length >= PRODUCT_SERIAL_SUFFIX_LEN
      ? raw.slice(-PRODUCT_SERIAL_SUFFIX_LEN)
      : raw.padStart(PRODUCT_SERIAL_SUFFIX_LEN, "0");
  return `${p}${suffix}`;
}
