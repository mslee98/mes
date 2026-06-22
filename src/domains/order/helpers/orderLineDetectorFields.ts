/**
 * 발주 등록 시 숨김 검출기 필드(소자·파장) — UI에 노출하지 않고 행/API에 채움.
 *
 * 생산·Unit 공정에서는 `resolvePlanUnitDetectorFields`(productionPlanDetailHelpers)가
 * 동일 취지로 보정합니다. 통합·제거 시 두 경로를 함께 수정하세요.
 *
 * @see docs/domains/PRODUCTION.md
 */
import type { RepresentativeProduct } from "../../../api/products";
import type { ItemRow } from "../../../features/order-form/types";

/** 발주 라인 WAVELENGTH — UI 미노출, 고정값(임시) */
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
