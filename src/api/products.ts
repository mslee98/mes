/**
 * 대표 제품(Product) API — `GET/POST/PATCH /api/products`.
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
  id: number;
  productCode: string;
  productName: string;
  categoryCode?: string | null;
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
  productCode: string;
  productName: string;
  categoryCode?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface ProductUpdatePayload {
  productName?: string;
  categoryCode?: string | null;
  description?: string | null;
  isActive?: boolean;
}

/** 목록·셀렉트용 표시 문자열 (이름·코드 구분) */
export function representativeProductLabel(p: RepresentativeProduct): string {
  const name = (p.productName ?? "").trim();
  const code = (p.productCode ?? "").trim();
  if (name && code && name !== code) return `${name} (${code})`;
  return name || code || "-";
}

function mapProduct(raw: unknown): RepresentativeProduct {
  const o = raw as Record<string, unknown>;
  const productCode =
    typeof o.productCode === "string"
      ? o.productCode
      : typeof o.code === "string"
        ? o.code
        : "";
  const productName =
    typeof o.productName === "string"
      ? o.productName
      : typeof o.name === "string"
        ? o.name
        : "";
  const categoryRaw = o.categoryCode;
  const categoryCode =
    categoryRaw == null || categoryRaw === ""
      ? null
      : String(categoryRaw);
  const desc = o.description;
  const description =
    desc == null ? null : typeof desc === "string" ? desc : String(desc);
  const createdAt =
    typeof o.createdAt === "string" ? o.createdAt : undefined;
  const updatedAt =
    typeof o.updatedAt === "string" ? o.updatedAt : undefined;
  return {
    id: Number(o.id ?? 0),
    productCode,
    productName,
    categoryCode,
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
  id: number,
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
  id: number,
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
