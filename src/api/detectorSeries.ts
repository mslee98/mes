/**
 * 검출기 시리즈 — `GET/POST/PATCH/DELETE /api/detector-series` (product.read / product.manage)
 */
import { createApiError } from "../lib/apiError";
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

export interface DetectorSeries {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function mapDetectorSeriesFromApi(raw: unknown): DetectorSeries {
  const o = raw as Record<string, unknown>;
  const inactive =
    o.isActive === false ||
    o.is_active === false ||
    o.is_active === 0;
  return {
    id: num(o.id, 0),
    code: String(o.code ?? o.series_code ?? "").trim(),
    name: String(o.name ?? "").trim(),
    description:
      o.description == null
        ? null
        : typeof o.description === "string"
          ? o.description
          : String(o.description),
    sortOrder: num(o.sortOrder ?? o.sort_order, 0),
    isActive: inactive ? false : true,
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

function parseList(data: unknown): DetectorSeries[] {
  if (Array.isArray(data)) {
    return data.map(mapDetectorSeriesFromApi);
  }
  const o = data as Record<string, unknown>;
  const inner = o.data ?? o.items ?? o.results;
  if (Array.isArray(inner)) {
    return inner.map(mapDetectorSeriesFromApi);
  }
  return [];
}

export interface GetDetectorSeriesParams {
  /** true면 비활성 시리즈 포함 */
  includeInactive?: boolean;
}

/** GET /api/detector-series */
export async function getDetectorSeriesList(
  accessToken: string,
  params?: GetDetectorSeriesParams
): Promise<DetectorSeries[]> {
  const q = new URLSearchParams();
  if (params?.includeInactive) {
    q.set("includeInactive", "true");
  }
  const query = q.toString();
  const url = query
    ? `${API_BASE}/detector-series?${query}`
    : `${API_BASE}/detector-series`;
  const res = await fetchAuthorized(
    url,
    { headers: authHeaders(accessToken), credentials: "include" },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "검출기 시리즈 목록을 불러오지 못했습니다.");
  }
  return parseList(await res.json());
}

export interface CreateDetectorSeriesPayload {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateDetectorSeriesPayload {
  code?: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

/** POST /api/detector-series */
export async function createDetectorSeries(
  accessToken: string,
  body: CreateDetectorSeriesPayload
): Promise<DetectorSeries> {
  const res = await fetchAuthorized(
    `${API_BASE}/detector-series`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify(body),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "검출기 시리즈를 등록하지 못했습니다.");
  }
  return mapDetectorSeriesFromApi(await res.json());
}

/** PATCH /api/detector-series/:id */
export async function updateDetectorSeries(
  accessToken: string,
  id: number,
  body: UpdateDetectorSeriesPayload
): Promise<DetectorSeries> {
  const res = await fetchAuthorized(
    `${API_BASE}/detector-series/${id}`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify(body),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "검출기 시리즈를 수정하지 못했습니다.");
  }
  return mapDetectorSeriesFromApi(await res.json());
}

/** DELETE /api/detector-series/:id — 성공 시 204, 본문 없음 */
export async function deleteDetectorSeries(
  accessToken: string,
  id: number
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/detector-series/${id}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (res.ok && res.status === 204) return;
  throw await createApiError(res, "검출기 시리즈를 삭제하지 못했습니다.");
}
