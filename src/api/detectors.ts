/**
 * 검출기 마스터 — `GET/POST/PATCH/DELETE /api/detectors` (product.read / product.manage)
 */
import { createApiError } from "../lib/api/apiError";
import type { Partner } from "./purchaseOrder";
import {
  mapDetectorSeriesFromApi,
  type DetectorSeries,
} from "./detectorSeries";
import { API_BASE } from "./apiBase";
import { fetchAuthorized } from "./fetchAuthorized";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

function jsonHeaders(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(accessToken),
  };
}

function strOpt(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function strNull(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v).trim() || null;
}

function strArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);
  }
  const one = strNull(v);
  if (!one) return [];
  if (!one.includes(",")) return [one];
  return one
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** 목록 기본 행 (forSelect 아님일 때 seriesCode 등 추가 필드 가능) */
export interface DetectorListItem {
  id: number;
  detectorSeriesId: number;
  partnerId?: string | null;
  detectorType: string;
  arrayWidth?: number | null;
  arrayHeight?: number | null;
  pitch?: string | null;
  roicType?: string | null;
  seriesCode?: string;
  displayLabel?: string;
  customerName?: string | null;
  countryCode?: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  isActive: boolean;
  detectorSeries?: DetectorSeries;
  partner?: Partner | null;
  [key: string]: unknown;
}

/** 단건·저장 응답 — 엔티티 + 관계 */
export interface DetectorDetail extends DetectorListItem {
  arrayType?: "QVGA" | "VGA" | "SXGA" | "CUSTOM";
  arrayWidth?: number | null;
  arrayHeight?: number | null;
  pitch?: string | null;
  cooler?: string | null;
  fNumber?: string | null;
  csh?: string | null;
  feedthruType?: string | null;
  roicType?: string | null;
  filterCut?: string | null;
  specialNote?: string | null;
  deliveryType?: string[] | null;
  isMassProduction?: boolean;
  remark?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function mapDetectorSeriesRel(raw: unknown): DetectorSeries | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  return mapDetectorSeriesFromApi(raw);
}

export function mapDetectorFromApi(raw: unknown): DetectorDetail {
  const o = raw as Record<string, unknown>;
  const inactive =
    o.isActive === false ||
    o.is_active === false ||
    o.is_active === 0;

  const seriesIdRaw = o.detectorSeriesId ?? o.detector_series_id;
  const detectorSeriesId =
    typeof seriesIdRaw === "number"
      ? seriesIdRaw
      : Number(seriesIdRaw) || 0;

  const seriesRel =
    o.detectorSeries ?? o.detector_series ?? undefined;

  const arrayTypeRaw = o.arrayType ?? o.array_type;
  const arrayType =
    arrayTypeRaw === "QVGA" ||
    arrayTypeRaw === "VGA" ||
    arrayTypeRaw === "SXGA" ||
    arrayTypeRaw === "CUSTOM"
      ? arrayTypeRaw
      : undefined;
  const arrayWidthRaw = o.arrayWidth ?? o.array_width;
  const arrayHeightRaw = o.arrayHeight ?? o.array_height;
  const arrayWidth =
    typeof arrayWidthRaw === "number"
      ? arrayWidthRaw
      : arrayWidthRaw == null || arrayWidthRaw === ""
        ? null
        : Number(arrayWidthRaw);
  const arrayHeight =
    typeof arrayHeightRaw === "number"
      ? arrayHeightRaw
      : arrayHeightRaw == null || arrayHeightRaw === ""
        ? null
        : Number(arrayHeightRaw);

  const partnerId = strNull(o.partnerId ?? o.partner_id);
  const partnerRaw = o.partner;
  const partner =
    partnerRaw && typeof partnerRaw === "object"
      ? (partnerRaw as Partner)
      : null;

  return {
    id: typeof o.id === "number" ? o.id : Number(o.id) || 0,
    detectorSeriesId,
    partnerId,
    detectorType: String(o.detectorType ?? o.detector_type ?? "").trim(),
    seriesCode: strOpt(o.seriesCode ?? o.series_code),
    displayLabel: strOpt(o.displayLabel ?? o.display_label),
    customerName: strNull(o.customerName ?? o.customer_name),
    countryCode: strNull(o.countryCode ?? o.country_code),
    projectCode: strNull(o.projectCode ?? o.project_code),
    projectName: strNull(o.projectName ?? o.project_name),
    arrayType,
    arrayWidth: Number.isFinite(arrayWidth) ? arrayWidth : null,
    arrayHeight: Number.isFinite(arrayHeight) ? arrayHeight : null,
    pitch: strNull(o.pitch),
    cooler: strNull(o.cooler),
    fNumber: strNull(o.fNumber ?? o.f_number),
    csh: strNull(o.csh),
    feedthruType: strNull(o.feedthruType ?? o.feedthru_type),
    roicType: strNull(o.roicType ?? o.roic_type),
    filterCut: strNull(o.filterCut ?? o.filter_cut),
    specialNote: strNull(o.specialNote ?? o.special_note),
    deliveryType: (() => {
      const values = strArray(o.deliveryType ?? o.delivery_type);
      return values.length > 0 ? values : null;
    })(),
    isMassProduction:
      typeof o.isMassProduction === "boolean"
        ? o.isMassProduction
        : typeof o.is_mass_production === "boolean"
          ? o.is_mass_production
          : false,
    remark: strNull(o.remark),
    isActive: inactive ? false : true,
    detectorSeries: mapDetectorSeriesRel(seriesRel),
    partner,
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : typeof o.created_at === "string"
          ? o.created_at
          : undefined,
    updatedAt:
      typeof o.updatedAt === "string"
        ? o.updatedAt
        : typeof o.updated_at === "string"
          ? o.updated_at
          : undefined,
  };
}

function parseList(data: unknown): DetectorListItem[] {
  const mapRow = (raw: unknown) => mapDetectorFromApi(raw) as DetectorListItem;
  if (Array.isArray(data)) {
    return data.map(mapRow);
  }
  const o = data as Record<string, unknown>;
  const inner = o.data ?? o.items ?? o.results;
  if (Array.isArray(inner)) {
    return inner.map(mapRow);
  }
  return [];
}

export interface GetDetectorsParams {
  detectorSeriesId?: number;
  isActive?: boolean;
  keyword?: string;
  /** true면 displayLabel 포함 (드롭다운용) */
  forSelect?: boolean;
}

function appendDetectorsQuery(q: URLSearchParams, params?: GetDetectorsParams) {
  if (params?.detectorSeriesId != null && Number.isFinite(params.detectorSeriesId)) {
    q.set("detectorSeriesId", String(params.detectorSeriesId));
  }
  if (params?.isActive !== undefined) {
    q.set("isActive", String(params.isActive));
  }
  if (params?.keyword != null && params.keyword.trim() !== "") {
    q.set("keyword", params.keyword.trim());
  }
  if (params?.forSelect) {
    q.set("forSelect", "true");
  }
}

/** GET /api/detectors */
export async function getDetectors(
  accessToken: string,
  params?: GetDetectorsParams
): Promise<DetectorListItem[]> {
  const q = new URLSearchParams();
  appendDetectorsQuery(q, params);
  const query = q.toString();
  const url = query
    ? `${API_BASE}/detectors?${query}`
    : `${API_BASE}/detectors`;
  const res = await fetchAuthorized(
    url,
    { headers: authHeaders(accessToken), credentials: "include" },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "검출기 목록을 불러오지 못했습니다.");
  }
  return parseList(await res.json());
}

/** GET /api/detectors/:id */
export async function getDetector(
  accessToken: string,
  id: number
): Promise<DetectorDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/detectors/${id}`,
    { headers: authHeaders(accessToken), credentials: "include" },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "검출기 정보를 불러오지 못했습니다.");
  }
  return mapDetectorFromApi(await res.json());
}

export interface CreateDetectorPayload {
  detectorSeriesId: number;
  partnerId?: string | null;
  detectorType: string;
  countryCode?: string | null;
  customerName?: string | null;
  arrayType?: "QVGA" | "VGA" | "SXGA" | "CUSTOM";
  arrayWidth?: number | null;
  arrayHeight?: number | null;
  pitch?: string | null;
  cooler?: string | null;
  projectName?: string | null;
  projectCode?: string | null;
  fNumber?: string | null;
  csh?: string | null;
  feedthruType?: string | null;
  roicType?: string | null;
  filterCut?: string | null;
  specialNote?: string | null;
  deliveryType?: string | null;
  isMassProduction?: boolean;
  remark?: string | null;
  isActive?: boolean;
}

export interface UpdateDetectorPayload {
  detectorSeriesId?: number;
  partnerId?: string | null;
  detectorType?: string;
  countryCode?: string | null;
  customerName?: string | null;
  arrayType?: "QVGA" | "VGA" | "SXGA" | "CUSTOM";
  arrayWidth?: number | null;
  arrayHeight?: number | null;
  pitch?: string | null;
  cooler?: string | null;
  projectName?: string | null;
  projectCode?: string | null;
  fNumber?: string | null;
  csh?: string | null;
  feedthruType?: string | null;
  roicType?: string | null;
  filterCut?: string | null;
  specialNote?: string | null;
  deliveryType?: string | null;
  isMassProduction?: boolean;
  remark?: string | null;
  isActive?: boolean;
}

/** POST /api/detectors */
export async function createDetector(
  accessToken: string,
  body: CreateDetectorPayload
): Promise<DetectorDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/detectors`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify(body),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "검출기를 등록하지 못했습니다.");
  }
  return mapDetectorFromApi(await res.json());
}

/** PATCH /api/detectors/:id */
export async function updateDetector(
  accessToken: string,
  id: number,
  body: UpdateDetectorPayload
): Promise<DetectorDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/detectors/${id}`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify(body),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "검출기를 수정하지 못했습니다.");
  }
  return mapDetectorFromApi(await res.json());
}

/** DELETE /api/detectors/:id — 성공 시 204, 본문 없음 */
export async function deleteDetector(
  accessToken: string,
  id: number
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/detectors/${id}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (res.ok && res.status === 204) return;
  throw await createApiError(res, "검출기를 삭제하지 못했습니다.");
}
