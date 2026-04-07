/**
 * 대표 제품(Product) · 제품 정의(ProductDefinition) API.
 * 스펙: GET/POST/PATCH /products, definition-candidates, default-definition 등.
 *
 * @see docs/api-purchase-orders.md
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
export type ProductListItemDto = RepresentativeProduct & {
  definitionCount: number;
  defaultDefinitionId?: number | null;
};

/** GET /api/products 응답 본문 */
export interface ProductListResultDto {
  items: ProductListItemDto[];
  total: number;
  page: number;
  size: number;
}

/** GET /api/products/:id — 정의 요약 배열 포함 */
export type ProductDetailDto = RepresentativeProduct & {
  definitions: ProductDefinition[];
};

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

/** 제품 정의 (목록/단건/후보 공통 매핑) */
export interface ProductDefinition {
  id: number;
  productId?: number;
  name?: string;
  code?: string;
  version?: string | null;
  isActive?: boolean;
  /** API status: DRAFT | ACTIVE | OBSOLETE */
  definitionStatus?: string | null;
  purchaseOrderTypeCode?: string | null;
  projectCode?: string | null;
  remark?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isDefault?: boolean;
  product?: RepresentativeProduct;
  /** 연결된 하우징 템플릿 (선택) */
  housingTemplateId?: number | null;
  housingTemplateCode?: string | null;
  housingTemplateName?: string | null;
}

export interface ProductDefinitionCandidatesResultDto {
  candidates: ProductDefinition[];
  recommendedDefinitionId: number | null;
}

/** `product_definition_item_revisions` 한 줄 */
export interface DefinitionItemRevisionLineDto {
  /** 라인 id — DELETE `.../item-revisions/:lineId` */
  id: number;
  itemRevisionId: number;
  itemRole?: string | null;
  quantity?: string | number | null;
  sortOrder?: number | null;
  isRequired?: boolean;
  remark?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  revisionCode?: string | null;
  revisionName?: string | null;
}

/** GET `/product-definitions/:id` — 헤더 + 구성 라인 */
export type ProductDefinitionDetailDto = ProductDefinition & {
  lines: DefinitionItemRevisionLineDto[];
};

export interface CreateProductDefinitionPayload {
  definitionCode: string;
  definitionName: string;
  versionNo?: string | null;
  orderType?: string | null;
  projectCode?: string | null;
  /** 기본 DRAFT */
  status?: string | null;
  isDefault?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  remark?: string | null;
  housingTemplateId?: number | null;
}

export type UpdateProductDefinitionPayload =
  Partial<CreateProductDefinitionPayload>;

export interface CreateDefinitionItemRevisionPayload {
  itemRevisionId: number;
  itemRole?: string | null;
  quantity?: string | number | null;
  sortOrder?: number | null;
  /** 기본 true */
  isRequired?: boolean;
  remark?: string | null;
}

/** 목록·셀렉트용 표시 문자열 (이름·코드 구분) */
export function representativeProductLabel(p: RepresentativeProduct): string {
  const name = (p.productName ?? "").trim();
  const code = (p.productCode ?? "").trim();
  if (name && code && name !== code) return `${name} (${code})`;
  return name || code || "-";
}

/**
 * 발주 라인용 제품 정의 ID 결정 (전체 정의 목록 + 발주 유형 필터 기준).
 * 후보 API(`getProductDefinitionCandidates`)가 있으면 별도 로직으로 우선 적용.
 */
export function resolveProductDefinitionIdForOrderLine(
  selectedDefinitionId: number,
  definitions: ProductDefinition[],
  orderTypeCode: string
): number {
  const filtered = filterProductDefinitionsByOrderType(
    definitions,
    orderTypeCode
  );
  if (!filtered.length) return 0;
  const idSet = new Set(filtered.map((d) => d.id));
  if (selectedDefinitionId > 0 && idSet.has(selectedDefinitionId)) {
    return selectedDefinitionId;
  }
  if (filtered.length === 1) return filtered[0].id;
  const defaultDef = filtered.find((d) => d.isDefault === true);
  if (defaultDef) return defaultDef.id;
  return filtered[0].id;
}

/**
 * GET .../definition-candidates 결과 기준 ID 결정.
 * - recommendedDefinitionId가 있으면(후보 정확히 1건) 그대로 사용
 * - 후보 0건 → 0
 * - 후보 1건(추천 null인 예외 케이스) → 그 id
 * - 후보 2건 이상 → 현재 선택이 후보에 있으면 유지, 아니면 0(사용자 선택 유도)
 */
export function resolveDefinitionIdFromCandidates(
  selectedDefinitionId: number,
  candidates: ProductDefinition[],
  recommendedDefinitionId: number | null
): number {
  if (recommendedDefinitionId != null && recommendedDefinitionId > 0) {
    return recommendedDefinitionId;
  }
  if (!candidates.length) return 0;
  if (candidates.length === 1) return candidates[0].id;
  const idSet = new Set(candidates.map((c) => c.id));
  if (selectedDefinitionId > 0 && idSet.has(selectedDefinitionId)) {
    return selectedDefinitionId;
  }
  return 0;
}

/** 발주 유형에 맞는 정의만 남김. 정의에 유형이 하나도 없으면 전체 유지. */
export function filterProductDefinitionsByOrderType(
  defs: ProductDefinition[],
  orderTypeCode: string
): ProductDefinition[] {
  const trimmed = orderTypeCode.trim();
  if (!trimmed) return defs;
  const hasAnyType = defs.some(
    (d) =>
      d.purchaseOrderTypeCode != null &&
      String(d.purchaseOrderTypeCode).trim() !== ""
  );
  if (!hasAnyType) return defs;
  return defs.filter(
    (d) =>
      !d.purchaseOrderTypeCode?.trim() ||
      d.purchaseOrderTypeCode.trim() === trimmed
  );
}

/** 셀렉트·목록용 라벨 */
export function productDefinitionSelectLabel(d: ProductDefinition): string {
  const base = (d.name || d.code || `#${d.id}`).trim();
  const v = d.version != null ? String(d.version).trim() : "";
  const core = v ? `${base} · ${v}` : base;
  const htCode = (d.housingTemplateCode ?? "").trim();
  const htName = (d.housingTemplateName ?? "").trim();
  if (htCode || htName) {
    const ht =
      htCode && htName && htCode !== htName
        ? `${htName} (${htCode})`
        : htCode || htName;
    return `${core} · 하우징: ${ht}`;
  }
  return core;
}

function normalizeList<T>(data: unknown): T[] {
  const arr = Array.isArray(data)
    ? data
    : (data as { data?: unknown[] })?.data ?? [];
  return arr as T[];
}

function mapStatusToIsActive(
  status: string | undefined
): boolean | undefined {
  if (!status) return undefined;
  const s = status.trim().toUpperCase();
  if (s === "ACTIVE") return true;
  if (s === "DRAFT" || s === "OBSOLETE" || s === "INACTIVE" || s === "ARCHIVED")
    return false;
  return undefined;
}

function housingTemplateRefsFromRaw(o: Record<string, unknown>): Pick<
  ProductDefinition,
  "housingTemplateId" | "housingTemplateCode" | "housingTemplateName"
> {
  const hid = o.housingTemplateId ?? o.housing_template_id;
  const n =
    hid == null || hid === ""
      ? null
      : typeof hid === "number"
        ? hid
        : Number(hid);
  const housingTemplateId =
    n != null && Number.isFinite(n) && n > 0 ? n : null;
  const codeRaw = o.housingTemplateCode ?? o.housing_template_code;
  const nameRaw = o.housingTemplateName ?? o.housing_template_name;
  const housingTemplateCode =
    codeRaw == null || codeRaw === ""
      ? null
      : typeof codeRaw === "string"
        ? codeRaw.trim() || null
        : String(codeRaw).trim() || null;
  const housingTemplateName =
    nameRaw == null || nameRaw === ""
      ? null
      : typeof nameRaw === "string"
        ? nameRaw.trim() || null
        : String(nameRaw).trim() || null;
  return { housingTemplateId, housingTemplateCode, housingTemplateName };
}

/** 상세 내장 definitions[] · 후보 요약 등 */
export function mapDefinitionSummary(raw: unknown): ProductDefinition {
  const o = raw as Record<string, unknown>;
  const typeRaw =
    o.purchaseOrderTypeCode ?? o.orderType ?? o.orderTypeCode ?? null;
  const purchaseOrderTypeCode =
    typeRaw == null || typeRaw === ""
      ? null
      : typeof typeRaw === "string"
        ? typeRaw
        : String(typeRaw);
  const name =
    typeof o.definitionName === "string"
      ? o.definitionName
      : typeof o.name === "string"
        ? o.name
        : undefined;
  const code =
    typeof o.definitionCode === "string"
      ? o.definitionCode
      : typeof o.code === "string"
        ? o.code
        : undefined;
  const versionRaw = o.versionNo ?? o.version;
  const version =
    versionRaw != null && String(versionRaw).trim() !== ""
      ? String(versionRaw)
      : null;
  const statusStr =
    typeof o.status === "string" ? o.status.trim().toUpperCase() : "";
  const isActive =
    typeof o.isActive === "boolean"
      ? o.isActive
      : mapStatusToIsActive(statusStr);
  const projectRaw = o.projectCode;
  const projectCode =
    projectRaw == null || projectRaw === ""
      ? null
      : String(projectRaw);
  const remark =
    o.remark == null
      ? null
      : typeof o.remark === "string"
        ? o.remark
        : String(o.remark);
  const ef = o.effectiveFrom;
  const et = o.effectiveTo;
  return {
    id: Number(o.id ?? 0),
    productId: o.productId != null ? Number(o.productId) : undefined,
    name,
    code,
    version,
    isActive,
    definitionStatus: statusStr || null,
    purchaseOrderTypeCode,
    projectCode,
    remark,
    effectiveFrom:
      typeof ef === "string" ? ef : ef != null ? String(ef) : null,
    effectiveTo: typeof et === "string" ? et : et != null ? String(et) : null,
    isDefault: typeof o.isDefault === "boolean" ? o.isDefault : undefined,
    ...housingTemplateRefsFromRaw(o),
  };
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
  const base = mapProduct(raw);
  const o = raw as Record<string, unknown>;
  const definitionCount =
    typeof o.definitionCount === "number" ? o.definitionCount : 0;
  const ddi = o.defaultDefinitionId;
  const defaultDefinitionId =
    ddi == null ? null : typeof ddi === "number" ? ddi : Number(ddi) || null;
  return { ...base, definitionCount, defaultDefinitionId };
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
  const base = mapProduct(raw);
  const o = raw as Record<string, unknown>;
  const defsRaw = o.definitions;
  const definitions = Array.isArray(defsRaw)
    ? defsRaw.map(mapDefinitionSummary)
    : [];
  return { ...base, definitions };
}

function mapDefinition(raw: unknown): ProductDefinition {
  const o = raw as Record<string, unknown>;
  const productRaw = o.product;
  const typeRaw =
    o.purchaseOrderTypeCode ??
    o.orderTypeCode ??
    o.orderType ??
    o.poTypeCode ??
    null;
  const purchaseOrderTypeCode =
    typeRaw == null || typeRaw === ""
      ? null
      : typeof typeRaw === "string"
        ? typeRaw
        : String(typeRaw);

  const name =
    typeof o.definitionName === "string"
      ? o.definitionName
      : typeof o.name === "string"
        ? o.name
        : undefined;
  const code =
    typeof o.definitionCode === "string"
      ? o.definitionCode
      : typeof o.code === "string"
        ? o.code
        : undefined;
  const versionRaw = o.versionNo ?? o.version;
  const version =
    versionRaw != null && String(versionRaw).trim() !== ""
      ? String(versionRaw)
      : null;

  const statusStr =
    typeof o.status === "string" ? o.status.trim().toUpperCase() : "";

  let isActive: boolean | undefined;
  if (typeof o.isActive === "boolean") {
    isActive = o.isActive;
  } else {
    const fromStatus = mapStatusToIsActive(statusStr);
    if (fromStatus !== undefined) isActive = fromStatus;
  }

  const projectRaw = o.projectCode;
  const projectCode =
    projectRaw == null || projectRaw === ""
      ? null
      : String(projectRaw);
  const remark =
    o.remark == null
      ? null
      : typeof o.remark === "string"
        ? o.remark
        : String(o.remark);
  const ef = o.effectiveFrom;
  const et = o.effectiveTo;

  return {
    id: Number(o.id ?? 0),
    productId:
      o.productId != null
        ? Number(o.productId)
        : productRaw && typeof productRaw === "object"
          ? Number((productRaw as Record<string, unknown>).id)
          : undefined,
    name,
    code,
    version,
    isActive,
    definitionStatus: statusStr || null,
    purchaseOrderTypeCode,
    projectCode,
    remark,
    effectiveFrom:
      typeof ef === "string" ? ef : ef != null ? String(ef) : null,
    effectiveTo: typeof et === "string" ? et : et != null ? String(et) : null,
    isDefault: typeof o.isDefault === "boolean" ? o.isDefault : undefined,
    product:
      productRaw && typeof productRaw === "object"
        ? mapProduct(productRaw)
        : undefined,
    ...housingTemplateRefsFromRaw(o),
  };
}

function lineNum(o: unknown): number {
  const n = Number(o);
  return Number.isFinite(n) ? n : 0;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function mapDefinitionItemRevisionLine(
  raw: unknown
): DefinitionItemRevisionLineDto {
  const o = raw as Record<string, unknown>;
  const ir =
    o.itemRevision && typeof o.itemRevision === "object"
      ? (o.itemRevision as Record<string, unknown>)
      : o.item_revision && typeof o.item_revision === "object"
        ? (o.item_revision as Record<string, unknown>)
        : undefined;
  const itemFromIr =
    ir?.item && typeof ir.item === "object"
      ? (ir.item as Record<string, unknown>)
      : undefined;
  const itemFlat =
    o.item && typeof o.item === "object"
      ? (o.item as Record<string, unknown>)
      : undefined;

  const qty = o.quantity;
  const sortRaw = o.sortOrder ?? o.sort_order;

  return {
    id: lineNum(o.id ?? o.lineId ?? o.line_id),
    itemRevisionId: lineNum(o.itemRevisionId ?? o.item_revision_id),
    itemRole: strOrNull(o.itemRole ?? o.item_role),
    quantity:
      qty == null || qty === ""
        ? null
        : typeof qty === "number"
          ? qty
          : String(qty),
    sortOrder:
      sortRaw == null || sortRaw === "" ? null : lineNum(sortRaw),
    isRequired:
      o.isRequired === false || o.is_required === false ? false : true,
    remark: strOrNull(o.remark),
    itemCode: strOrNull(
      o.itemCode ??
        o.item_code ??
        itemFromIr?.itemCode ??
        itemFromIr?.code ??
        itemFlat?.itemCode ??
        itemFlat?.code
    ),
    itemName: strOrNull(
      o.itemName ??
        o.item_name ??
        itemFromIr?.itemName ??
        itemFromIr?.name ??
        itemFlat?.itemName ??
        itemFlat?.name
    ),
    revisionCode: strOrNull(
      o.revisionCode ?? o.revision_code ?? ir?.revisionCode ?? ir?.revision_code
    ),
    revisionName: strOrNull(
      o.revisionName ?? o.revision_name ?? ir?.revisionName ?? ir?.revision_name
    ),
  };
}

function mapProductDefinitionDetail(raw: unknown): ProductDefinitionDetailDto {
  const base = mapDefinition(raw);
  const o = raw as Record<string, unknown>;
  const linesRaw =
    o.lines ??
    o.itemRevisions ??
    o.item_revisions ??
    o.definitionItemRevisions;
  const lines = Array.isArray(linesRaw)
    ? linesRaw.map(mapDefinitionItemRevisionLine)
    : [];
  return { ...base, lines };
}

function buildCreateDefinitionJson(
  body: CreateProductDefinitionPayload
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    definitionCode: body.definitionCode.trim(),
    definitionName: body.definitionName.trim(),
    status: (body.status?.trim() || "DRAFT").toUpperCase(),
  };
  if (body.versionNo != null && String(body.versionNo).trim() !== "") {
    payload.versionNo = String(body.versionNo).trim();
  }
  if (body.orderType != null && body.orderType.trim() !== "") {
    payload.orderType = body.orderType.trim();
  }
  if (body.projectCode != null && body.projectCode.trim() !== "") {
    payload.projectCode = body.projectCode.trim();
  }
  if (body.isDefault === true) payload.isDefault = true;
  if (body.effectiveFrom != null && body.effectiveFrom.trim() !== "") {
    payload.effectiveFrom = body.effectiveFrom.trim();
  }
  if (body.effectiveTo != null && body.effectiveTo.trim() !== "") {
    payload.effectiveTo = body.effectiveTo.trim();
  }
  if (body.remark != null && body.remark.trim() !== "") {
    payload.remark = body.remark.trim();
  }
  if (
    body.housingTemplateId != null &&
    Number.isFinite(body.housingTemplateId) &&
    body.housingTemplateId > 0
  ) {
    payload.housingTemplateId = body.housingTemplateId;
  }
  return payload;
}

function buildPatchDefinitionJson(
  body: UpdateProductDefinitionPayload
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (body.definitionCode !== undefined) {
    payload.definitionCode = body.definitionCode.trim();
  }
  if (body.definitionName !== undefined) {
    payload.definitionName = body.definitionName.trim();
  }
  if (body.versionNo !== undefined) {
    payload.versionNo =
      body.versionNo == null || String(body.versionNo).trim() === ""
        ? null
        : String(body.versionNo).trim();
  }
  if (body.orderType !== undefined) {
    payload.orderType =
      body.orderType == null || body.orderType.trim() === ""
        ? null
        : body.orderType.trim();
  }
  if (body.projectCode !== undefined) {
    payload.projectCode =
      body.projectCode == null || body.projectCode.trim() === ""
        ? null
        : body.projectCode.trim();
  }
  if (body.status !== undefined && body.status != null) {
    const s = body.status.trim();
    if (s) payload.status = s.toUpperCase();
  }
  if (body.isDefault !== undefined) {
    payload.isDefault = body.isDefault === true;
  }
  if (body.effectiveFrom !== undefined) {
    payload.effectiveFrom =
      body.effectiveFrom == null || body.effectiveFrom.trim() === ""
        ? null
        : body.effectiveFrom.trim();
  }
  if (body.effectiveTo !== undefined) {
    payload.effectiveTo =
      body.effectiveTo == null || body.effectiveTo.trim() === ""
        ? null
        : body.effectiveTo.trim();
  }
  if (body.remark !== undefined) {
    payload.remark =
      body.remark == null || body.remark.trim() === "" ? null : body.remark.trim();
  }
  if (body.housingTemplateId !== undefined) {
    if (
      body.housingTemplateId != null &&
      Number.isFinite(body.housingTemplateId) &&
      body.housingTemplateId > 0
    ) {
      payload.housingTemplateId = body.housingTemplateId;
    } else {
      payload.housingTemplateId = null;
    }
  }
  return payload;
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

/** GET /api/products/:id — 정의 요약 포함 (product.read) */
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

/** PATCH /api/products/:id/default-definition (product.manage) */
export async function setProductDefaultDefinition(
  productId: number,
  accessToken: string,
  definitionId: number
): Promise<ProductDefinition> {
  const res = await fetchAuthorized(
    `${API_BASE}/products/${productId}/default-definition`,
    {
      method: "PATCH",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ definitionId }),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(
      res,
      "기본 제품 정의를 설정하지 못했습니다."
    );
  }
  return mapDefinition(await res.json());
}

export interface GetDefinitionCandidatesParams {
  orderType: string;
  projectCode?: string | null;
}

/** GET /api/products/:id/definition-candidates (product.read) */
export async function getProductDefinitionCandidates(
  productId: number,
  accessToken: string,
  params: GetDefinitionCandidatesParams
): Promise<ProductDefinitionCandidatesResultDto> {
  const ot = params.orderType.trim();
  if (!ot) {
    throw new Error("orderType이 필요합니다.");
  }
  const q = new URLSearchParams();
  q.set("orderType", ot);
  if (params.projectCode != null && params.projectCode.trim() !== "") {
    q.set("projectCode", params.projectCode.trim());
  }
  const res = await fetchAuthorized(
    `${API_BASE}/products/${productId}/definition-candidates?${q.toString()}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(
      res,
      "제품 정의 후보를 불러오지 못했습니다."
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  const candRaw = data.candidates;
  const candidates = Array.isArray(candRaw)
    ? candRaw.map(mapDefinitionSummary)
    : [];
  const rec = data.recommendedDefinitionId;
  const recommendedDefinitionId =
    rec == null || rec === ""
      ? null
      : typeof rec === "number"
        ? rec
        : Number(rec) || null;
  return { candidates, recommendedDefinitionId };
}

/** GET /api/products/:id/definitions — 전체 상태, product 포함 */
export async function getProductDefinitions(
  productId: number,
  accessToken: string
): Promise<ProductDefinition[]> {
  const res = await fetchAuthorized(`${API_BASE}/products/${productId}/definitions`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "제품 정의 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return normalizeList<unknown>(data).map(mapDefinition);
}

/** GET /api/product-definitions/:id — 헤더 + lines[] */
export async function getProductDefinition(
  id: number,
  accessToken: string
): Promise<ProductDefinitionDetailDto> {
  const res = await fetchAuthorized(`${API_BASE}/product-definitions/${id}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "제품 정의를 불러오지 못했습니다.");
  }
  return mapProductDefinitionDetail(await res.json());
}

/** POST /api/products/:productId/definitions */
export async function createProductDefinition(
  productId: number,
  accessToken: string,
  body: CreateProductDefinitionPayload
): Promise<ProductDefinitionDetailDto> {
  const res = await fetchAuthorized(`${API_BASE}/products/${productId}/definitions`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(buildCreateDefinitionJson(body)),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "제품 정의를 등록하지 못했습니다.");
  }
  return mapProductDefinitionDetail(await res.json());
}

/** PATCH /api/product-definitions/:id */
export async function updateProductDefinition(
  id: number,
  accessToken: string,
  body: UpdateProductDefinitionPayload
): Promise<ProductDefinitionDetailDto> {
  const patchBody = buildPatchDefinitionJson(body);
  const res = await fetchAuthorized(`${API_BASE}/product-definitions/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patchBody),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "제품 정의를 수정하지 못했습니다.");
  }
  return mapProductDefinitionDetail(await res.json());
}

/** GET /api/product-definitions/:id/item-revisions */
export async function getProductDefinitionItemRevisions(
  definitionId: number,
  accessToken: string
): Promise<DefinitionItemRevisionLineDto[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/product-definitions/${definitionId}/item-revisions`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "구성 품목 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = Array.isArray(data)
    ? data
    : (data as { items?: unknown[] })?.items ?? [];
  return list.map(mapDefinitionItemRevisionLine);
}

/** POST /api/product-definitions/:id/item-revisions */
export async function addProductDefinitionItemRevision(
  definitionId: number,
  accessToken: string,
  body: CreateDefinitionItemRevisionPayload
): Promise<DefinitionItemRevisionLineDto | ProductDefinitionDetailDto> {
  const payload: Record<string, unknown> = {
    itemRevisionId: body.itemRevisionId,
  };
  if (body.itemRole != null && body.itemRole.trim() !== "") {
    payload.itemRole = body.itemRole.trim();
  }
  if (body.quantity != null && String(body.quantity).trim() !== "") {
    const q = body.quantity;
    payload.quantity = typeof q === "number" ? q : String(q).trim();
  }
  if (body.sortOrder != null && Number.isFinite(body.sortOrder)) {
    payload.sortOrder = body.sortOrder;
  }
  if (body.isRequired === false) payload.isRequired = false;
  if (body.remark != null && body.remark.trim() !== "") {
    payload.remark = body.remark.trim();
  }

  const res = await fetchAuthorized(
    `${API_BASE}/product-definitions/${definitionId}/item-revisions`,
    {
      method: "POST",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "구성 품목을 추가하지 못했습니다.");
  }
  const json = await res.json();
  if (json && typeof json === "object" && Array.isArray((json as { lines?: unknown }).lines)) {
    return mapProductDefinitionDetail(json);
  }
  return mapDefinitionItemRevisionLine(json);
}

/** DELETE /api/product-definitions/:definitionId/item-revisions/:lineId — 204 */
export async function deleteProductDefinitionItemRevision(
  definitionId: number,
  lineId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/product-definitions/${definitionId}/item-revisions/${lineId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "구성 품목을 삭제하지 못했습니다.");
  }
}
