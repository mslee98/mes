import { createApiError } from "../lib/apiError";
import { API_BASE } from "./apiBase";
import { fetchAuthorized } from "./fetchAuthorized";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export interface LensItem {
  id: string;
  manufacturerId: string;
  manufacturerName?: string | null;
  lensName?: string | null;
  fNumber: string;
  focalLength: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LensListResult {
  items: LensItem[];
  total: number;
  page: number;
  size: number;
}

export interface GetLensListParams {
  keyword?: string;
  manufacturerId?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export interface LensCreatePayload {
  manufacturerId: string;
  lensName: string;
  fNumber: string;
  focalLength: string;
  isActive?: boolean;
}

export interface LensUpdatePayload {
  manufacturerId?: string;
  lensName?: string;
  fNumber?: string;
  focalLength?: string;
  isActive?: boolean;
}

export interface FileMetadata {
  id: number;
  originalName?: string;
  storedName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
}

export interface FileLink {
  id: number;
  fileId?: number;
  targetType?: string;
  targetId?: string;
  categoryCode?: string;
  createdById?: number;
  createdAt?: string;
  file?: FileMetadata;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  uploadedAt?: string;
}

function mapLens(raw: unknown): LensItem {
  const o = raw as Record<string, unknown>;
  const manufacturerId = String(
    o.manufacturerId ?? o.manufacturer_id ?? ""
  ).trim();
  return {
    id: String(o.id ?? "").trim(),
    manufacturerId,
    manufacturerName:
      typeof o.manufacturerName === "string"
        ? o.manufacturerName
        : typeof o.manufacturer_name === "string"
          ? o.manufacturer_name
          : null,
    lensName:
      typeof o.lensName === "string"
        ? o.lensName
        : typeof o.lens_name === "string"
          ? o.lens_name
          : typeof o.productName === "string"
            ? o.productName
            : typeof o.product_name === "string"
              ? o.product_name
              : null,
    fNumber: String(o.fNumber ?? o.f_number ?? "").trim(),
    focalLength: String(o.focalLength ?? o.focal_length ?? "").trim(),
    isActive: typeof o.isActive === "boolean" ? o.isActive : true,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  };
}

function parseLensListResult(data: unknown): LensListResult {
  const o = data as Record<string, unknown>;
  const items = Array.isArray(o.items) ? o.items.map(mapLens) : [];
  return {
    items,
    total: typeof o.total === "number" ? o.total : items.length,
    page: typeof o.page === "number" ? o.page : 1,
    size: typeof o.size === "number" ? o.size : 20,
  };
}

export async function getLensList(
  accessToken: string,
  params?: GetLensListParams
): Promise<LensListResult> {
  const q = new URLSearchParams();
  if (params?.keyword?.trim()) q.set("keyword", params.keyword.trim());
  if (params?.manufacturerId != null && String(params.manufacturerId).trim() !== "") {
    q.set("manufacturerId", String(params.manufacturerId).trim());
  }
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.size != null) q.set("size", String(params.size));
  const query = q.toString();
  const url = query ? `${API_BASE}/lenses?${query}` : `${API_BASE}/lenses`;
  const res = await fetchAuthorized(
    url,
    { headers: authHeaders(accessToken), credentials: "include" },
    accessToken
  );
  if (!res.ok) throw await createApiError(res, "렌즈 목록을 불러오지 못했습니다.");
  return parseLensListResult(await res.json());
}

export async function getLens(
  id: string,
  accessToken: string
): Promise<LensItem> {
  const res = await fetchAuthorized(
    `${API_BASE}/lenses/${id}`,
    { headers: authHeaders(accessToken), credentials: "include" },
    accessToken
  );
  if (!res.ok) throw await createApiError(res, "렌즈 정보를 불러오지 못했습니다.");
  return mapLens(await res.json());
}

export async function createLens(
  accessToken: string,
  body: LensCreatePayload
): Promise<LensItem> {
  const res = await fetchAuthorized(
    `${API_BASE}/lenses`,
    {
      method: "POST",
      headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
    accessToken
  );
  if (!res.ok) throw await createApiError(res, "렌즈를 등록하지 못했습니다.");
  return mapLens(await res.json());
}

export async function updateLens(
  id: string,
  accessToken: string,
  body: LensUpdatePayload
): Promise<LensItem> {
  const res = await fetchAuthorized(
    `${API_BASE}/lenses/${id}`,
    {
      method: "PATCH",
      headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
    accessToken
  );
  if (!res.ok) throw await createApiError(res, "렌즈를 수정하지 못했습니다.");
  return mapLens(await res.json());
}

/** DELETE /api/lenses/:id — 성공 시 204, 본문 없음 */
export async function deleteLens(
  id: string,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/lenses/${id}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (res.ok && res.status === 204) return;
  throw await createApiError(res, "렌즈를 삭제하지 못했습니다.");
}

export async function uploadLensFiles(
  lensId: string,
  files: File[],
  accessToken: string
): Promise<FileLink[]> {
  if (!accessToken?.trim()) {
    throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  }
  if (files.length === 0) {
    throw new Error("파일을 1개 이상 선택해 주세요.");
  }
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const res = await fetchAuthorized(
    `${API_BASE}/lenses/${lensId}/files`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: form,
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) throw await createApiError(res, "렌즈 파일을 업로드하지 못했습니다.");
  const data = await res.json();
  return Array.isArray(data) ? (data as FileLink[]) : [];
}

export async function getLensFiles(
  lensId: string,
  accessToken: string
): Promise<FileLink[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/lenses/${lensId}/files`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) throw await createApiError(res, "렌즈 파일 목록을 불러오지 못했습니다.");
  const data = await res.json();
  return Array.isArray(data) ? (data as FileLink[]) : [];
}

export async function deleteLensFile(
  lensId: string,
  fileLinkId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/lenses/${lensId}/files/${fileLinkId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) throw await createApiError(res, "렌즈 파일을 삭제하지 못했습니다.");
}
