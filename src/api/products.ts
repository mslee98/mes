/**
 * 대표 제품(Product) API — `GET/POST/PATCH/DELETE /api/products`.
 * 제품 정의 등 레거시 API는 `src/deprecated-inactive/api/productDefinitionsLegacy.ts`.
 */
import { createApiError } from "../lib/apiError";
import { API_BASE } from "./apiBase";
import { fetchAuthorized } from "./fetchAuthorized";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

/** 제품 마스터 공통 필드 (목록·상세·셀렉트) */
export interface RepresentativeProduct {
  id: string;
  businessCode?: string | null;
  businessName: string;
  productName: string;
  productType: "ENGINE" | "CAMERA";
  arrayType: "QVGA" | "VGA" | "SXGA" | "CUSTOM";
  arrayCustomText?: string | null;
  arrayWidth?: number | null;
  arrayHeight?: number | null;
  pixelPitch?: string | null;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /api/products 한 행 (ProductListResultDto.items) */
export type ProductListItemDto = RepresentativeProduct;

/** GET /api/products 응답 본문 */
export interface ProductListResultDto {
  items: ProductListItemDto[];
  total: number;
  page: number;
  size: number;
}

/** GET /api/products/:id */
export type ProductDetailDto = RepresentativeProduct;

export interface ProductCreatePayload {
  businessCode: string;
  businessName: string;
  productName: string;
  productType: "ENGINE" | "CAMERA";
  arrayType: "QVGA" | "VGA" | "SXGA" | "CUSTOM";
  arrayCustomText?: string | null;
  arrayWidth: number;
  arrayHeight: number;
  pixelPitch: number;
  description?: string | null;
  isActive?: boolean;
}

export interface ProductUpdatePayload {
  businessCode?: string;
  businessName?: string;
  productName?: string;
  productType?: "ENGINE" | "CAMERA";
  arrayType?: "QVGA" | "VGA" | "SXGA" | "CUSTOM";
  arrayCustomText?: string | null;
  arrayWidth?: number | null;
  arrayHeight?: number | null;
  pixelPitch?: number;
  description?: string | null;
  isActive?: boolean;
}

export interface ProductFileMetadata {
  id: number;
  originalName?: string;
  storedName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
}

export interface ProductFileLink {
  id: number;
  fileId?: number;
  targetType?: string;
  targetId?: string;
  categoryCode?: string;
  createdById?: number;
  createdAt?: string;
  file?: ProductFileMetadata;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  uploadedAt?: string;
}

export interface ProductBusinessCodeCheckResult {
  businessCode: string;
  available: boolean;
}

/** 목록·셀렉트용 표시 문자열 (이름·코드 구분) */
export function representativeProductLabel(p: RepresentativeProduct): string {
  const name = (p.productName ?? "").trim();
  const businessName = (p.businessName ?? "").trim();
  if (name && businessName && name !== businessName) return `${name} (${businessName})`;
  return name || businessName || "-";
}

/** 제품 유형 — UI 표시용 (공통코드 그룹 없음, 고정 매핑) */
export function productTypeDisplayLabel(
  productType: RepresentativeProduct["productType"] | string | null | undefined
): string {
  const code = String(productType ?? "").trim().toUpperCase();
  if (code === "CAMERA") return "카메라";
  if (code === "ENGINE") return "엔진";
  return code || "-";
}

/** 드롭다운용: 제품명 + 유형(엔진/카메라) */
export function representativeProductSelectLabel(p: RepresentativeProduct): string {
  const base = representativeProductLabel(p);
  const typeLabel = productTypeDisplayLabel(p.productType);
  if (base === "-") return typeLabel;
  return `${base} · ${typeLabel}`;
}

function mapProduct(raw: unknown): RepresentativeProduct {
  const o = raw as Record<string, unknown>;
  const businessCodeRaw = o.businessCode ?? o.business_code;
  const businessCode =
    businessCodeRaw == null || String(businessCodeRaw).trim() === ""
      ? null
      : String(businessCodeRaw).trim();
  const businessName =
    typeof o.businessName === "string"
      ? o.businessName
      : typeof o.business_name === "string"
        ? o.business_name
        : "";
  const productName =
    typeof o.productName === "string"
      ? o.productName
      : typeof o.name === "string"
        ? o.name
        : "";
  const productTypeRaw = o.productType ?? o.product_type;
  const productType =
    productTypeRaw === "ENGINE" || productTypeRaw === "CAMERA"
      ? productTypeRaw
      : "ENGINE";
  const arrayTypeRaw = o.arrayType ?? o.array_type;
  const arrayType =
    arrayTypeRaw === "QVGA" ||
    arrayTypeRaw === "VGA" ||
    arrayTypeRaw === "SXGA" ||
    arrayTypeRaw === "CUSTOM"
      ? arrayTypeRaw
      : "QVGA";
  const arrayCustomRaw = o.arrayCustomText ?? o.array_custom_text;
  const arrayCustomText =
    arrayCustomRaw == null || arrayCustomRaw === ""
      ? null
      : String(arrayCustomRaw);
  const widthRaw = o.arrayWidth ?? o.array_width;
  const heightRaw = o.arrayHeight ?? o.array_height;
  const arrayWidth =
    typeof widthRaw === "number" && Number.isFinite(widthRaw)
      ? widthRaw
      : widthRaw == null || widthRaw === ""
        ? null
        : Number(widthRaw);
  const arrayHeight =
    typeof heightRaw === "number" && Number.isFinite(heightRaw)
      ? heightRaw
      : heightRaw == null || heightRaw === ""
        ? null
        : Number(heightRaw);
  const pixelPitchRaw = o.pixelPitch ?? o.pixel_pitch;
  const pixelPitch =
    pixelPitchRaw == null || pixelPitchRaw === "" ? null : String(pixelPitchRaw);
  const desc = o.description;
  const description =
    desc == null ? null : typeof desc === "string" ? desc : String(desc);
  const createdAt =
    typeof o.createdAt === "string" ? o.createdAt : undefined;
  const updatedAt =
    typeof o.updatedAt === "string" ? o.updatedAt : undefined;
  return {
    id: String(o.id ?? "").trim(),
    businessCode,
    businessName,
    productName,
    productType,
    arrayType,
    arrayCustomText,
    arrayWidth: Number.isFinite(arrayWidth) ? arrayWidth : null,
    arrayHeight: Number.isFinite(arrayHeight) ? arrayHeight : null,
    pixelPitch,
    description,
    isActive: typeof o.isActive === "boolean" ? o.isActive : undefined,
    createdAt,
    updatedAt,
  };
}

function mapProductListItem(raw: unknown): ProductListItemDto {
  return mapProduct(raw);
}

function parseProductListResult(data: unknown): ProductListResultDto {
  if (Array.isArray(data)) {
    const items = data.map(mapProductListItem);
    return { items, total: items.length, page: 1, size: items.length };
  }
  const o = data as Record<string, unknown>;
  const itemsRaw = o.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(mapProductListItem)
    : [];
  const total = typeof o.total === "number" ? o.total : items.length;
  const page = typeof o.page === "number" ? o.page : 1;
  const size = typeof o.size === "number" ? o.size : 20;
  return { items, total, page, size };
}

function mapProductDetail(raw: unknown): ProductDetailDto {
  return mapProduct(raw);
}

export interface GetProductListParams {
  keyword?: string;
  categoryCode?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

/** GET /api/products — 페이지네이션 목록 (product.read) */
export async function getProductList(
  accessToken: string,
  params?: GetProductListParams
): Promise<ProductListResultDto> {
  const q = new URLSearchParams();
  if (params?.keyword != null && params.keyword.trim() !== "") {
    q.set("keyword", params.keyword.trim());
  }
  if (params?.categoryCode != null && params.categoryCode.trim() !== "") {
    q.set("categoryCode", params.categoryCode.trim());
  }
  if (params?.isActive !== undefined) {
    q.set("isActive", String(params.isActive));
  }
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.size != null) q.set("size", String(params.size));
  const query = q.toString();
  const url = query ? `${API_BASE}/products?${query}` : `${API_BASE}/products`;
  const res = await fetchAuthorized(url, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "대표 제품 목록을 불러오지 못했습니다.");
  }
  return parseProductListResult(await res.json());
}

/** POST /api/products (product.manage) */
export async function createProduct(
  accessToken: string,
  body: ProductCreatePayload
): Promise<RepresentativeProduct> {
  const res = await fetchAuthorized(`${API_BASE}/products`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "제품을 등록하지 못했습니다.");
  }
  return mapProduct(await res.json());
}

/** GET /api/products/:id (product.read) */
export async function getProduct(
  id: string,
  accessToken: string
): Promise<ProductDetailDto> {
  const res = await fetchAuthorized(`${API_BASE}/products/${id}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "대표 제품을 불러오지 못했습니다.");
  }
  return mapProductDetail(await res.json());
}
 
/** PATCH /api/products/:id (product.manage) */
export async function updateProduct(
  id: string,
  accessToken: string,
  body: ProductUpdatePayload
): Promise<RepresentativeProduct> {
  const res = await fetchAuthorized(`${API_BASE}/products/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "제품을 수정하지 못했습니다.");
  }
  return mapProduct(await res.json());
}

/** DELETE /api/products/:id — 성공 시 204, 본문 없음 */
export async function deleteProduct(
  id: string,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/products/${id}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (res.ok && res.status === 204) return;
  throw await createApiError(res, "대표 제품을 삭제하지 못했습니다.");
}

export async function uploadProductFiles(
  productId: string,
  files: File[],
  accessToken: string
): Promise<ProductFileLink[]> {
  if (!accessToken?.trim()) {
    throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  }
  if (files.length === 0) {
    throw new Error("파일을 1개 이상 선택해 주세요.");
  }
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const res = await fetchAuthorized(
    `${API_BASE}/products/${productId}/files`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: form,
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "제품 파일을 업로드하지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as ProductFileLink[]) : [];
}

export async function getProductFiles(
  productId: string,
  accessToken: string
): Promise<ProductFileLink[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/products/${productId}/files`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "제품 파일 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as ProductFileLink[]) : [];
}

export async function deleteProductFile(
  productId: string,
  fileLinkId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/products/${productId}/files/${fileLinkId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "제품 파일을 삭제하지 못했습니다.");
  }
}

export async function checkProductBusinessCode(
  accessToken: string,
  businessCode: string,
  excludeProductId?: string
): Promise<ProductBusinessCodeCheckResult> {
  const normalizedCode = businessCode.trim().toUpperCase();
  if (!normalizedCode) {
    return { businessCode: "", available: false };
  }
  const q = new URLSearchParams();
  q.set("businessCode", normalizedCode);
  if (excludeProductId != null && String(excludeProductId).trim() !== "") {
    q.set("excludeProductId", String(excludeProductId).trim());
  }
  const res = await fetchAuthorized(
    `${API_BASE}/products/check-business-code?${q.toString()}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "사업코드 중복 확인에 실패했습니다.");
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    businessCode:
      typeof data.businessCode === "string"
        ? data.businessCode.trim().toUpperCase()
        : normalizedCode,
    available: Boolean(data.available),
  };
}
