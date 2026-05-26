import type { RepresentativeProduct } from "../api/products";
import type { ItemRow } from "../features/order-form/types";

/** 발주 라인 WAVELENGTH 공통코드 — UI 미노출, 고정값 */
export const ORDER_LINE_WAVELENGTH_CODE = "M";

/**
 * 발주 라인 사업명에서 소자 토큰 추출.
 * 예: `ICC640_T2SL` 또는 `… (ICC640_T2SL)` → `T2SL`
 */
export function detectorElementCodeFromBusinessName(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const parenMatch = trimmed.match(/\(([^)]+)\)\s*$/);
  const core = (parenMatch ? parenMatch[1] : trimmed).trim();
  const parts = core.split("_").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

/** API·시리얼용 소자 1자리 코드 */
export function detectorElementInitial(code: string): string {
  const normalized = String(code ?? "").trim().toUpperCase();
  if (!normalized) return "";
  return normalized.slice(0, 1);
}

function businessLabelFromProduct(product: RepresentativeProduct | undefined): string {
  if (!product) return "";
  return (
    product.businessName?.trim() ||
    product.businessCode?.trim() ||
    ""
  );
}

/** 제품 선택 시 UI 없이 행에 채울 기본 소자·파장(비어 있을 때만) */
export function defaultHiddenDetectorCodesForProduct(
  product: RepresentativeProduct | undefined
): Pick<ItemRow, "detectorElementCode" | "wavelengthCode"> {
  const businessLabel = businessLabelFromProduct(product);
  const elementToken = detectorElementCodeFromBusinessName(businessLabel);
  const elementCode = elementToken
    ? detectorElementInitial(elementToken)
    : "";
  return {
    detectorElementCode: elementCode,
    wavelengthCode: ORDER_LINE_WAVELENGTH_CODE,
  };
}

export type ResolvedOrderLineDetectorPayload = {
  detectorId: number;
  detectorElementCode: string;
  wavelengthCode: string;
};

/**
 * 저장 API용 검출기 3필드 — 행에 있으면 우선, 없으면 제품 메타에서 보완.
 */
export function resolveOrderLineDetectorPayload(
  row: ItemRow,
  product: RepresentativeProduct | undefined
): ResolvedOrderLineDetectorPayload | null {
  const detectorId = Number(String(row.detectorId ?? "").trim());
  if (!Number.isFinite(detectorId) || detectorId <= 0) return null;

  const defaults = defaultHiddenDetectorCodesForProduct(product);
  const detectorElementCode = (
    row.detectorElementCode.trim() || defaults.detectorElementCode
  ).trim();

  if (!detectorElementCode) return null;

  return {
    detectorId,
    detectorElementCode,
    wavelengthCode: ORDER_LINE_WAVELENGTH_CODE,
  };
}
