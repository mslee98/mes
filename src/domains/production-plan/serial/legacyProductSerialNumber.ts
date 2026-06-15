import { getPurchaseOrderSerialMaxSequence } from "../../../api/purchaseOrder";
import type { RepresentativeProduct } from "../../../api/products";
import type { DetectorListItem } from "../../../api/detectors";
import type { PlanUnitOrderLineSnapshot } from "../helpers/detailHelpers";

const SERIAL_MAKER_CODE = "I";

const PIXEL_PITCH_CODE_MAP: Record<string, string> = {
  "7.5": "S",
  "10.0": "T",
  "15.0": "F",
  "20.0": "W",
  "30.0": "H",
};

const YEAR_CODE_MAP: Record<string, string> = {
  "2025": "O",
  "2026": "P",
  "2027": "Q",
  "2028": "R",
  "2029": "S",
  "2030": "T",
  "2031": "U",
  "2032": "V",
  "2033": "W",
  "2034": "X",
  "2035": "Y",
};

export type ProductSerialMeta = {
  businessCode: string;
  pixelPitch: string;
};

export type ProductSerialDraftRow = {
  unitId: string;
  lotCode: string;
  lineLabel: string;
  serialNo: string;
  sequenceKey: string;
  detectorElementCode: string;
  wavelengthCode: string;
  detectorId: number | null;
};

export function productSerialMetaMapFromProducts(
  products: RepresentativeProduct[]
): Map<string, ProductSerialMeta> {
  const map = new Map<string, ProductSerialMeta>();
  for (const p of products) {
    const id = String(p.id ?? "").trim();
    if (!id) continue;
    map.set(id, {
      businessCode: String(p.businessCode ?? "").trim().toUpperCase(),
      pixelPitch: String(p.pixelPitch ?? "").trim(),
    });
  }
  return map;
}

export function detectorByIdMapFromList(
  detectors: DetectorListItem[]
): Map<number, DetectorListItem> {
  const map = new Map<number, DetectorListItem>();
  for (const d of detectors) {
    if (d.id != null && Number.isFinite(Number(d.id))) {
      map.set(Number(d.id), d);
    }
  }
  return map;
}

export function itemTypeCodeFromLine(
  line: {
    itemName?: string | null;
    productNameSnapshot?: string | null;
    definitionNameSnapshot?: string | null;
    spec?: string | null;
  }
): string {
  const joined = [
    line.itemName,
    line.productNameSnapshot,
    line.definitionNameSnapshot,
    line.spec,
  ]
    .map((v) => String(v ?? "").toUpperCase())
    .join(" ");
  if (joined.includes("CAMERA") || joined.includes("카메라")) return "C";
  return "E";
}

export function detectorTypeSuffixCode(rawType: string): string {
  const t = String(rawType ?? "").trim().toUpperCase();
  if (!t) return "";
  const parts = t.split("-").map((p) => p.trim()).filter(Boolean);
  return (parts[parts.length - 1] ?? "").replace(/[^A-Z0-9]/g, "");
}

export function pitchCodeFromRaw(rawPitch: string): string {
  const trimmed = String(rawPitch ?? "").trim().replace(/UM$/i, "");
  if (!trimmed) return "";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return "";
  const normalized = parsed.toFixed(1);
  return PIXEL_PITCH_CODE_MAP[normalized] ?? "";
}

export function yearCodeFromDate(deliveryDate: string): string {
  const year = String(deliveryDate ?? "").trim().slice(0, 4);
  return YEAR_CODE_MAP[year] ?? "";
}

function sequenceText(n: number): string {
  return String(n).padStart(4, "0");
}

/** 사업명 스냅샷 → 소자 코드 (예: `ICC640_T2SL` → `T2SL`) */
export function detectorElementCodeFromBusinessName(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const parenMatch = trimmed.match(/\(([^)]+)\)\s*$/);
  const core = (parenMatch ? parenMatch[1] : trimmed).trim();
  const parts = core.split("_").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

export function detectorElementInitial(code: string): string {
  const normalized = String(code ?? "").trim().toUpperCase();
  if (!normalized) return "";
  return normalized.slice(0, 1);
}

export function lineCodeFromOrderLine(line: PlanUnitOrderLineSnapshot): string {
  return (
    line.businessName?.trim() ||
    line.businessNameSnapshot?.trim() ||
    line.versionSnapshot?.trim() ||
    ""
  );
}

export function resolveDetectorElementCodeForSerial(
  explicitCode: string | null | undefined,
  lineCode: string
): string {
  const explicit = String(explicitCode ?? "").trim();
  if (explicit) return explicit;
  return detectorElementCodeFromBusinessName(lineCode);
}

export function detectorElementCodeForApi(
  explicitCode: string | null | undefined,
  lineCode: string
): string {
  const full = resolveDetectorElementCodeForSerial(explicitCode, lineCode);
  return detectorElementInitial(full);
}

export type BuildSequenceKeyResult =
  | { ok: true; sequenceKey: string; detectorElementInitial: string }
  | { ok: false; reason: string };

export function buildProductSerialSequenceKey(params: {
  orderLine: PlanUnitOrderLineSnapshot;
  productMeta?: ProductSerialMeta;
  detector?: Pick<DetectorListItem, "detectorType" | "arrayWidth"> | null;
  wavelengthCode: string;
  yearCode: string;
  customerCode: string;
  explicitDetectorElementCode?: string | null;
}): BuildSequenceKeyResult {
  const normalizedWavelength = String(params.wavelengthCode ?? "")
    .trim()
    .toUpperCase();
  if (!normalizedWavelength) {
    return { ok: false, reason: "파장 정보가 없습니다." };
  }

  const lineCode = lineCodeFromOrderLine(params.orderLine);
  const detectorElementCode = resolveDetectorElementCodeForSerial(
    params.explicitDetectorElementCode,
    lineCode
  );
  if (!detectorElementCode) {
    return { ok: false, reason: "검출기 소자 정보를 찾을 수 없습니다." };
  }

  const businessCode = String(params.productMeta?.businessCode ?? "").trim();
  if (!businessCode) {
    return { ok: false, reason: "제품 business_code를 찾을 수 없습니다." };
  }

  const pitchCode = pitchCodeFromRaw(params.productMeta?.pixelPitch ?? "");
  if (!pitchCode) {
    return { ok: false, reason: "제품 Pixel Pitch 코드 매핑이 없습니다." };
  }

  const arrayWidth = Number(params.detector?.arrayWidth);
  if (!Number.isFinite(arrayWidth) || arrayWidth <= 0) {
    return { ok: false, reason: "검출기 해상도(가로) 정보가 없습니다." };
  }

  const resolutionCode = String(Math.trunc(arrayWidth)).padStart(4, "0");
  const detectorTypeCode = detectorTypeSuffixCode(
    String(params.detector?.detectorType ?? "")
  );
  if (!detectorTypeCode) {
    return {
      ok: false,
      reason: "검출기 타입 코드(A/A2 등)를 파싱하지 못했습니다.",
    };
  }

  const yearCode = String(params.yearCode ?? "").trim();
  if (!yearCode) {
    return {
      ok: false,
      reason: "시작연도 코드 매핑이 없습니다. (예: 2025→O, 2026→P)",
    };
  }

  const customerCode = String(params.customerCode ?? "").trim().toUpperCase();
  if (!customerCode) {
    return { ok: false, reason: "고객사(거래처) 코드가 없습니다." };
  }

  const itemTypeCode = itemTypeCodeFromLine(params.orderLine);
  const elInitial = detectorElementInitial(detectorElementCode);
  const sequenceKey = `${businessCode}${elInitial}${normalizedWavelength}-${itemTypeCode}${SERIAL_MAKER_CODE}${resolutionCode}${pitchCode}${detectorTypeCode}-${yearCode}${customerCode}`;

  return { ok: true, sequenceKey, detectorElementInitial: elInitial };
}

export function validateLegacyProductSerialNo(
  serialNo: string
): string | null {
  const s = String(serialNo ?? "").trim();
  if (!s) return "제품 시리얼을 입력하세요.";
  if (!/^(.*?)(\d{4})$/.test(s)) {
    return "제품 시리얼은 끝 4자리 숫자가 필요합니다.";
  }
  return null;
}

export type GenerateSerialUnitInput = {
  unitId: string;
  lotCode: string;
  lineLabel: string;
  orderLine: PlanUnitOrderLineSnapshot;
  detectorElementCode?: string | null;
  wavelengthCode: string;
  detectorId: number | null;
};

export async function generateProductSerialDraftRows(opts: {
  purchaseOrderId: string;
  accessToken: string;
  units: GenerateSerialUnitInput[];
  productMetaById: Map<string, ProductSerialMeta>;
  detectorById: Map<number, DetectorListItem>;
  deliveryDate: string;
  customerCode: string;
}): Promise<ProductSerialDraftRow[] | { error: string }> {
  const yearCode = yearCodeFromDate(opts.deliveryDate);
  if (!yearCode) {
    return {
      error:
        "시작연도 코드 매핑이 없습니다. 납기일(또는 발주일) 연도를 확인하세요.",
    };
  }

  const planned: Array<{
    unitId: string;
    lotCode: string;
    lineLabel: string;
    sequenceKey: string;
    detectorElementCode: string;
    wavelengthCode: string;
    detectorId: number | null;
  }> = [];

  for (const unit of opts.units) {
    const productId = String(unit.orderLine.productId ?? "").trim();
    const productMeta = productId
      ? opts.productMetaById.get(productId)
      : undefined;
    const detectorId = unit.detectorId;
    if (detectorId == null || !Number.isFinite(detectorId)) {
      return { error: `${unit.lineLabel}: 검출기가 지정되지 않았습니다.` };
    }
    const detector = opts.detectorById.get(detectorId);
    if (!detector) {
      return {
        error: `${unit.lineLabel}: 검출기 마스터 정보를 찾을 수 없습니다.`,
      };
    }

    const built = buildProductSerialSequenceKey({
      orderLine: unit.orderLine,
      productMeta,
      detector,
      wavelengthCode: unit.wavelengthCode,
      yearCode,
      customerCode: opts.customerCode,
      explicitDetectorElementCode: unit.detectorElementCode,
    });
    if (!built.ok) {
      return { error: `${unit.lineLabel}: ${built.reason}` };
    }

    planned.push({
      unitId: unit.unitId,
      lotCode: unit.lotCode,
      lineLabel: unit.lineLabel,
      sequenceKey: built.sequenceKey,
      detectorElementCode: built.detectorElementInitial,
      wavelengthCode: String(unit.wavelengthCode).trim().toUpperCase(),
      detectorId,
    });
  }

  const uniqueKeys = [...new Set(planned.map((r) => r.sequenceKey))];
  const nextBaseByKey = new Map<string, number>();
  try {
    const results = await Promise.all(
      uniqueKeys.map((sequenceKey) =>
        getPurchaseOrderSerialMaxSequence(
          opts.purchaseOrderId,
          sequenceKey,
          opts.accessToken
        )
      )
    );
    results.forEach((r) => {
      nextBaseByKey.set(r.sequenceKey, r.nextSequence);
    });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "시리얼 순번 조회 중 오류가 발생했습니다.";
    return { error: message };
  }

  const counterByKey = new Map<string, number>();
  const rows: ProductSerialDraftRow[] = [];

  for (const row of planned) {
    const startNo = nextBaseByKey.get(row.sequenceKey) ?? 1;
    const offset = counterByKey.get(row.sequenceKey) ?? 0;
    const nextSequenceNo = startNo + offset;
    counterByKey.set(row.sequenceKey, offset + 1);
    rows.push({
      unitId: row.unitId,
      lotCode: row.lotCode,
      lineLabel: row.lineLabel,
      serialNo: `${row.sequenceKey}${sequenceText(nextSequenceNo)}`,
      sequenceKey: row.sequenceKey,
      detectorElementCode: row.detectorElementCode,
      wavelengthCode: row.wavelengthCode,
      detectorId: row.detectorId,
    });
  }

  return rows;
}
