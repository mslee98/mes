import { createApiError } from "../lib/apiError";
import { API_BASE } from "./apiBase";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

function jsonHeaders(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(accessToken),
  };
}

// --- 타입 정의 ---

export interface ItemCategory {
  id: number;
  code: string;
  name: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  children?: ItemCategory[];
}

export interface ItemCategoryCreatePayload {
  code: string;
  name: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ItemCategoryUpdatePayload {
  code?: string;
  name?: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ItemType {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ItemTypeCreatePayload {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ItemTypeUpdatePayload {
  code?: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ItemAttribute {
  attributeId?: number;
  attributeCode?: string;
  attributeName?: string;
  value?: string | null;
}

export interface Item {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  itemTypeId: number;
  category?: ItemCategory;
  itemType?: ItemType;
  productDiv?: string | null;
  unit?: string | null;
  unitPrice?: number | null;
  currencyCode?: string | null;
  spec?: string | null;
  isActive?: boolean;
  attributes?: ItemAttribute[];
}

export interface ItemCreatePayload {
  code: string;
  name: string;
  categoryId: number;
  itemTypeId: number;
  productDiv?: string | null;
  unit?: string | null;
  unitPrice?: number | null;
  currencyCode?: string | null;
  spec?: string | null;
  isActive?: boolean;
}

export interface ItemUpdatePayload {
  code?: string;
  name?: string;
  categoryId?: number;
  itemTypeId?: number;
  productDiv?: string | null;
  unit?: string | null;
  unitPrice?: number | null;
  currencyCode?: string | null;
  spec?: string | null;
  isActive?: boolean;
}

export interface ItemCategoriesParams {
  tree?: boolean;
}

export interface ItemsListParams {
  categoryId?: number;
  itemTypeId?: number;
  productDiv?: string;
  isActive?: boolean;
}

function normalizeList<T>(data: unknown): T[] {
  const arr = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
  return arr as T[];
}

/** API 응답: categoryCode, categoryName → code, name */
function normalizeItemCategory(raw: unknown): ItemCategory {
  const o = raw as Record<string, unknown>;
  const children = (o.children as unknown[] | undefined)?.map(normalizeItemCategory);
  return {
    id: Number(o.id ?? 0),
    code: String(o.categoryCode ?? o.code ?? ""),
    name: String(o.categoryName ?? o.name ?? ""),
    parentId: o.parentId != null ? Number(o.parentId) : null,
    sortOrder: o.sortOrder != null ? Number(o.sortOrder) : undefined,
    isActive: o.isActive !== undefined ? Boolean(o.isActive) : undefined,
    children: children?.length ? children : undefined,
  };
}

/** API 응답: typeCode, typeName → code, name */
function normalizeItemType(raw: unknown): ItemType {
  const o = raw as Record<string, unknown>;
  return {
    id: Number(o.id ?? 0),
    code: String(o.typeCode ?? o.code ?? ""),
    name: String(o.typeName ?? o.name ?? ""),
    description: o.description != null ? String(o.description) : null,
    sortOrder: o.sortOrder != null ? Number(o.sortOrder) : undefined,
    isActive: o.isActive !== undefined ? Boolean(o.isActive) : undefined,
  };
}

/** API 응답 품목: standardPrice → unitPrice, description → spec, category/itemType 정규화 */
function normalizeItem(raw: unknown): Item {
  const o = raw as Record<string, unknown>;
  const categoryRaw = o.category;
  const itemTypeRaw = o.itemType;
  const standardPriceRaw = o.standardPrice ?? o.unitPrice;
  const unitPriceNum =
    standardPriceRaw != null && standardPriceRaw !== ""
      ? Number(standardPriceRaw)
      : null;
  const specValue =
    o.description != null ? String(o.description) : o.spec != null ? String(o.spec) : null;
  const isActiveValue =
    o.isActive !== undefined
      ? Boolean(o.isActive)
      : o.statusCode === "ACTIVE" || o.statusCode === "active";
  return {
    id: Number(o.id ?? 0),
    code: String(o.code ?? ""),
    name: String(o.name ?? ""),
    categoryId: Number(o.categoryId ?? 0),
    itemTypeId: Number(o.itemTypeId ?? 0),
    category:
      categoryRaw && typeof categoryRaw === "object"
        ? normalizeItemCategory(categoryRaw)
        : undefined,
    itemType:
      itemTypeRaw && typeof itemTypeRaw === "object"
        ? normalizeItemType(itemTypeRaw)
        : undefined,
    productDiv: o.productDiv != null ? String(o.productDiv) : null,
    unit: o.unit != null ? String(o.unit) : null,
    unitPrice: Number.isFinite(unitPriceNum) ? unitPriceNum : null,
    currencyCode:
      o.currencyCode != null ? String(o.currencyCode) : (o.currency_code != null ? String(o.currency_code) : null),
    spec: specValue,
    isActive: isActiveValue,
    attributes: Array.isArray(o.attributes)
      ? (o.attributes as ItemAttribute[])
      : undefined,
  };
}

// --- 품목 분류 (item-categories) ---

export async function getItemCategories(
  accessToken: string,
  params?: ItemCategoriesParams
): Promise<ItemCategory[]> {
  const q = new URLSearchParams();
  if (params?.tree === true) q.set("tree", "true");
  const query = q.toString();
  const url = query ? `${API_BASE}/item-categories?${query}` : `${API_BASE}/item-categories`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 분류 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = normalizeList<unknown>(data);
  return list.map(normalizeItemCategory);
}

export async function getItemCategory(
  id: number,
  accessToken: string
): Promise<ItemCategory> {
  const res = await fetch(`${API_BASE}/item-categories/${id}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 분류를 불러오지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItemCategory(data);
}

export async function createItemCategory(
  payload: ItemCategoryCreatePayload,
  accessToken: string
): Promise<ItemCategory> {
  const body = {
    categoryCode: payload.code,
    categoryName: payload.name,
    parentId: payload.parentId ?? null,
    sortOrder: payload.sortOrder ?? 0,
    ...(payload.isActive !== undefined && { isActive: payload.isActive }),
  };
  const res = await fetch(`${API_BASE}/item-categories`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 분류를 등록하지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItemCategory(data);
}

export async function updateItemCategory(
  id: number,
  payload: ItemCategoryUpdatePayload,
  accessToken: string
): Promise<ItemCategory> {
  const body: Record<string, unknown> = {};
  if (payload.code !== undefined) body.categoryCode = payload.code;
  if (payload.name !== undefined) body.categoryName = payload.name;
  if (payload.parentId !== undefined) body.parentId = payload.parentId;
  if (payload.sortOrder !== undefined) body.sortOrder = payload.sortOrder;
  if (payload.isActive !== undefined) body.isActive = payload.isActive;
  const res = await fetch(`${API_BASE}/item-categories/${id}`, {
    method: "PUT",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 분류를 수정하지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItemCategory(data);
}

export async function deleteItemCategory(
  id: number,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/item-categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 분류를 삭제하지 못했습니다. 하위 분류가 있으면 삭제할 수 없습니다.");
  }
}

// --- 품목 유형 (item-types) ---

export async function getItemTypes(accessToken: string): Promise<ItemType[]> {
  const res = await fetch(`${API_BASE}/item-types`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 유형 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = normalizeList<unknown>(data);
  return list.map(normalizeItemType);
}

export async function getItemType(
  id: number,
  accessToken: string
): Promise<ItemType> {
  const res = await fetch(`${API_BASE}/item-types/${id}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 유형을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItemType(data);
}

export async function createItemType(
  payload: ItemTypeCreatePayload,
  accessToken: string
): Promise<ItemType> {
  const body = {
    typeCode: payload.code,
    typeName: payload.name,
    description: payload.description ?? null,
    sortOrder: payload.sortOrder ?? 0,
    ...(payload.isActive !== undefined && { isActive: payload.isActive }),
  };
  const res = await fetch(`${API_BASE}/item-types`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 유형을 등록하지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItemType(data);
}

export async function updateItemType(
  id: number,
  payload: ItemTypeUpdatePayload,
  accessToken: string
): Promise<ItemType> {
  const body: Record<string, unknown> = {};
  if (payload.code !== undefined) body.typeCode = payload.code;
  if (payload.name !== undefined) body.typeName = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.sortOrder !== undefined) body.sortOrder = payload.sortOrder;
  if (payload.isActive !== undefined) body.isActive = payload.isActive;
  const res = await fetch(`${API_BASE}/item-types/${id}`, {
    method: "PUT",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 유형을 수정하지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItemType(data);
}

export async function deleteItemType(
  id: number,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/item-types/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 유형을 삭제하지 못했습니다.");
  }
}

// --- 품목 마스터 (items) ---

export async function getItems(
  accessToken: string,
  params?: ItemsListParams
): Promise<Item[]> {
  const q = new URLSearchParams();
  if (params?.categoryId != null) q.set("categoryId", String(params.categoryId));
  if (params?.itemTypeId != null) q.set("itemTypeId", String(params.itemTypeId));
  if (params?.productDiv) q.set("productDiv", params.productDiv);
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  const query = q.toString();
  const url = query ? `${API_BASE}/items?${query}` : `${API_BASE}/items`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = normalizeList<unknown>(data);
  return list.map(normalizeItem);
}

export async function getItem(
  id: number,
  accessToken: string,
  withAttributes?: boolean
): Promise<Item> {
  const q = withAttributes ? "?withAttributes=true" : "";
  const res = await fetch(`${API_BASE}/items/${id}${q}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItem(data);
}

export async function createItem(
  payload: ItemCreatePayload,
  accessToken: string
): Promise<Item> {
  const body = {
    code: payload.code,
    name: payload.name,
    categoryId: payload.categoryId,
    itemTypeId: payload.itemTypeId,
    productDiv: payload.productDiv ?? null,
    spec: payload.spec ?? null,
    unit: payload.unit ?? null,
    ...(payload.unitPrice != null && { standardPrice: payload.unitPrice }),
    ...(payload.currencyCode != null && { currencyCode: payload.currencyCode }),
    isActive: payload.isActive !== false,
  };
  const res = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목을 등록하지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItem(data);
}

export async function updateItem(
  id: number,
  payload: ItemUpdatePayload,
  accessToken: string
): Promise<Item> {
  const body: Record<string, unknown> = {};
  if (payload.code !== undefined) body.code = payload.code;
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.categoryId !== undefined) body.categoryId = payload.categoryId;
  if (payload.itemTypeId !== undefined) body.itemTypeId = payload.itemTypeId;
  if (payload.productDiv !== undefined) body.productDiv = payload.productDiv;
  if (payload.unit !== undefined) body.unit = payload.unit;
  if (payload.unitPrice !== undefined)
    body.standardPrice = payload.unitPrice;
  if (payload.currencyCode !== undefined) body.currencyCode = payload.currencyCode;
  if (payload.spec !== undefined) body.spec = payload.spec;
  if (payload.isActive !== undefined) body.isActive = payload.isActive;
  const res = await fetch(`${API_BASE}/items/${id}`, {
    method: "PUT",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목을 수정하지 못했습니다.");
  }
  const data = await res.json();
  return normalizeItem(data);
}

export async function deleteItem(
  id: number,
  accessToken: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/items/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목을 비활성화하지 못했습니다.");
  }
}
