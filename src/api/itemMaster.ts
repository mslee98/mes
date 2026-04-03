/**
 * 품목(Item) 마스터 · 품목 리비전 API (설계/구성 요소).
 * 발주 기준은 제품 정의(product_definition)이며 본 모듈과 분리합니다.
 *
 * 권한: item.read / item.manage — 모든 호출에 Bearer JWT 필요.
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

// --- 목록 ---

export interface ItemMasterListItem {
  id: number;
  itemCode: string;
  itemName: string;
  itemType: string;
  parentItemId: number | null;
  parentItemCode?: string | null;
  parentItemName?: string | null;
  revisionCount: number;
  defaultRevisionId?: number | null;
  defaultRevisionCode?: string | null;
  description?: string | null;
  isActive: boolean;
  updatedAt?: string;
}

export interface ItemMasterListResult {
  items: ItemMasterListItem[];
  total: number;
  page: number;
  size: number;
}

export interface GetItemMasterListParams {
  keyword?: string;
  itemType?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

// --- 상세 · 리비전 · 사용처 ---

export interface ItemRevision {
  id: number;
  itemId?: number;
  revisionCode: string;
  revisionName: string;
  status: string;
  drawingNo?: string | null;
  description?: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemMasterDetail {
  id: number;
  itemCode: string;
  itemName: string;
  itemType: string;
  parentItemId: number | null;
  parentItemCode?: string | null;
  parentItemName?: string | null;
  description?: string | null;
  spec?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  revisions?: ItemRevision[];
}

export interface ItemUsageRow {
  productDefinitionCode?: string | null;
  productDefinitionName?: string | null;
  productName?: string | null;
  itemRole?: string | null;
  revisionCode?: string | null;
  status?: string | null;
  usageLocation?: string | null;
  [key: string]: unknown;
}

export interface ItemMasterCreatePayload {
  itemCode: string;
  itemName: string;
  itemType: string;
  parentItemId?: number | null;
  description?: string | null;
  isActive?: boolean;
}

export interface ItemMasterUpdatePayload {
  itemName: string;
  itemType: string;
  parentItemId?: number | null;
  description?: string | null;
  isActive: boolean;
}

export interface ItemRevisionCreatePayload {
  revisionCode: string;
  revisionName: string;
  status: string;
  drawingNo?: string | null;
  description?: string | null;
  isDefault?: boolean;
}

export interface ItemRevisionUpdatePayload {
  revisionName?: string;
  status?: string;
  drawingNo?: string | null;
  description?: string | null;
  isDefault?: boolean;
}

/** 리비전에 연결된 파일 링크 (`GET`/`POST` 응답 정규화) */
export interface ItemRevisionFileLink {
  /**
   * `file_links.id`. 목록 응답의 **fileLinkId**와 동일해야 하며,
   * 다운로드·삭제 URL에 쓰인다(배열 인덱스와 혼동 금지).
   */
  id: number;
  fileLinkId: number;
  revisionId?: number;
  fileId?: number;
  fileName: string | null;
  filePath: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedAt?: string;
  createdAt?: string;
}

function num(o: unknown, fallback = 0): number {
  const n = Number(o);
  return Number.isFinite(n) ? n : fallback;
}

function mapListItem(raw: unknown): ItemMasterListItem {
  const o = raw as Record<string, unknown>;
  const parentId = o.parentItemId ?? o.parent_id;
  return {
    id: num(o.id),
    itemCode: String(o.itemCode ?? o.code ?? ""),
    itemName: String(o.itemName ?? o.name ?? ""),
    itemType: String(o.itemType ?? o.item_type ?? "").toUpperCase(),
    parentItemId:
      parentId == null || parentId === "" ? null : Number(parentId) || null,
    parentItemCode:
      o.parentItemCode != null ? String(o.parentItemCode) : null,
    parentItemName:
      o.parentItemName != null ? String(o.parentItemName) : null,
    revisionCount: num(o.revisionCount ?? o.revision_count ?? 0),
    defaultRevisionId:
      o.defaultRevisionId != null
        ? num(o.defaultRevisionId)
        : o.default_revision_id != null
          ? num(o.default_revision_id)
          : null,
    defaultRevisionCode:
      o.defaultRevisionCode != null
        ? String(o.defaultRevisionCode)
        : o.default_revision_code != null
          ? String(o.default_revision_code)
          : null,
    description:
      o.description != null ? String(o.description) : null,
    isActive: o.isActive !== false && o.is_active !== false,
    updatedAt:
      typeof o.updatedAt === "string"
        ? o.updatedAt
        : typeof o.updated_at === "string"
          ? o.updated_at
          : undefined,
  };
}

function mapRevision(raw: unknown): ItemRevision {
  const o = raw as Record<string, unknown>;
  return {
    id: num(o.id),
    itemId: o.itemId != null ? num(o.itemId) : undefined,
    revisionCode: String(o.revisionCode ?? o.revision_code ?? ""),
    revisionName: String(o.revisionName ?? o.revision_name ?? ""),
    status: String(o.status ?? "DRAFT").toUpperCase(),
    drawingNo:
      o.drawingNo != null
        ? String(o.drawingNo)
        : o.drawing_no != null
          ? String(o.drawing_no)
          : null,
    description: o.description != null ? String(o.description) : null,
    isDefault: o.isDefault === true || o.is_default === true,
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

function mapDetail(raw: unknown): ItemMasterDetail {
  const o = raw as Record<string, unknown>;
  const parentId = o.parentItemId ?? o.parent_id;
  const revs = o.revisions;
  return {
    id: num(o.id),
    itemCode: String(o.itemCode ?? o.code ?? ""),
    itemName: String(o.itemName ?? o.name ?? ""),
    itemType: String(o.itemType ?? o.item_type ?? "").toUpperCase(),
    parentItemId:
      parentId == null || parentId === "" ? null : Number(parentId) || null,
    parentItemCode:
      o.parentItemCode != null ? String(o.parentItemCode) : null,
    parentItemName:
      o.parentItemName != null ? String(o.parentItemName) : null,
    description:
      o.description != null ? String(o.description) : null,
    spec: o.spec != null ? String(o.spec) : null,
    isActive: o.isActive !== false && o.is_active !== false,
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
    revisions: Array.isArray(revs) ? revs.map(mapRevision) : undefined,
  };
}

function parseListResult(data: unknown): ItemMasterListResult {
  if (Array.isArray(data)) {
    const items = data.map(mapListItem);
    return { items, total: items.length, page: 1, size: items.length };
  }
  const o = data as Record<string, unknown>;
  const itemsRaw = o.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(mapListItem)
    : [];
  return {
    items,
    total: typeof o.total === "number" ? o.total : items.length,
    page: typeof o.page === "number" ? o.page : 1,
    size: typeof o.size === "number" ? o.size : 20,
  };
}

/** GET /api/items */
export async function getItemMasterList(
  accessToken: string,
  params?: GetItemMasterListParams
): Promise<ItemMasterListResult> {
  const q = new URLSearchParams();
  if (params?.keyword?.trim()) q.set("keyword", params.keyword.trim());
  if (params?.itemType?.trim()) q.set("itemType", params.itemType.trim());
  if (params?.isActive !== undefined) {
    q.set("isActive", String(params.isActive));
  }
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.size != null) q.set("size", String(params.size));
  const query = q.toString();
  const url = query ? `${API_BASE}/items?${query}` : `${API_BASE}/items`;
  const res = await fetchAuthorized(url, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "품목 목록을 불러오지 못했습니다.");
  }
  return parseListResult(await res.json());
}

/** GET /api/items/:id */
export async function getItemMaster(
  id: number,
  accessToken: string
): Promise<ItemMasterDetail> {
  const res = await fetchAuthorized(`${API_BASE}/items/${id}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "품목을 불러오지 못했습니다.");
  }
  return mapDetail(await res.json());
}

/** POST /api/items */
export async function createItemMaster(
  accessToken: string,
  body: ItemMasterCreatePayload
): Promise<ItemMasterDetail> {
  const res = await fetchAuthorized(`${API_BASE}/items`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify({
      itemCode: body.itemCode.trim(),
      itemName: body.itemName.trim(),
      itemType: body.itemType.trim().toUpperCase(),
      parentItemId: body.parentItemId ?? null,
      description: body.description?.trim() || null,
      isActive: body.isActive !== false,
    }),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "품목을 등록하지 못했습니다.");
  }
  return mapDetail(await res.json());
}

/** PUT /api/items/:id */
export async function updateItemMaster(
  id: number,
  accessToken: string,
  body: ItemMasterUpdatePayload
): Promise<ItemMasterDetail> {
  const res = await fetchAuthorized(`${API_BASE}/items/${id}`, {
    method: "PUT",
    headers: jsonHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify({
      itemName: body.itemName.trim(),
      itemType: body.itemType.trim().toUpperCase(),
      parentItemId: body.parentItemId ?? null,
      description: body.description?.trim() || null,
      isActive: body.isActive,
    }),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "품목을 수정하지 못했습니다.");
  }
  return mapDetail(await res.json());
}

/** GET /api/items/:itemId/revisions */
export async function getItemRevisions(
  itemId: number,
  accessToken: string
): Promise<ItemRevision[]> {
  const res = await fetchAuthorized(`${API_BASE}/items/${itemId}/revisions`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "품목 리비전 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  const list = Array.isArray(data)
    ? data
    : (data as { items?: unknown[] })?.items ?? [];
  return list.map(mapRevision);
}

/** POST /api/items/:itemId/revisions */
export async function createItemRevision(
  itemId: number,
  accessToken: string,
  body: ItemRevisionCreatePayload
): Promise<ItemRevision> {
  const res = await fetchAuthorized(`${API_BASE}/items/${itemId}/revisions`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify({
      revisionCode: body.revisionCode.trim(),
      revisionName: body.revisionName.trim(),
      status: body.status.trim().toUpperCase(),
      drawingNo: body.drawingNo?.trim() || null,
      description: body.description?.trim() || null,
      isDefault: body.isDefault === true,
    }),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "리비전을 등록하지 못했습니다.");
  }
  return mapRevision(await res.json());
}

/** PATCH /api/item-revisions/:id */
export async function updateItemRevision(
  revisionId: number,
  accessToken: string,
  body: ItemRevisionUpdatePayload
): Promise<ItemRevision> {
  const res = await fetchAuthorized(`${API_BASE}/item-revisions/${revisionId}`, {
    method: "PATCH",
    headers: jsonHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify({
      ...(body.revisionName !== undefined && {
        revisionName: body.revisionName.trim(),
      }),
      ...(body.status !== undefined && {
        status: body.status.trim().toUpperCase(),
      }),
      ...(body.drawingNo !== undefined && {
        drawingNo: body.drawingNo?.trim() || null,
      }),
      ...(body.description !== undefined && {
        description: body.description?.trim() || null,
      }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
    }),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "리비전을 수정하지 못했습니다.");
  }
  return mapRevision(await res.json());
}

/** DELETE /api/item-revisions/:id — 409 시 제품 정의 연결 */
export async function deleteItemRevision(
  revisionId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(`${API_BASE}/item-revisions/${revisionId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(
      res,
      res.status === 409
        ? "이 리비전은 이미 제품 정의에 연결되어 있어 삭제할 수 없습니다."
        : "리비전을 삭제하지 못했습니다."
    );
  }
}

function firstNonEmptyStr(...candidates: unknown[]): string | null {
  for (const v of candidates) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function mapItemRevisionFileLink(raw: unknown): ItemRevisionFileLink {
  const o = raw as Record<string, unknown>;
  const nested =
    o.file && typeof o.file === "object"
      ? (o.file as Record<string, unknown>)
      : undefined;

  const fileName = firstNonEmptyStr(
    o.fileName,
    o.file_name,
    o.originalName,
    o.original_name,
    nested?.originalName,
    nested?.original_name,
    nested?.name
  );
  const filePath = firstNonEmptyStr(
    o.filePath,
    o.file_path,
    nested?.path,
    nested?.url
  );

  const uploadedAt =
    typeof o.uploadedAt === "string"
      ? o.uploadedAt
      : typeof o.uploaded_at === "string"
        ? o.uploaded_at
        : typeof o.createdAt === "string"
          ? o.createdAt
          : typeof o.created_at === "string"
            ? o.created_at
            : undefined;

  const linkId = num(o.fileLinkId ?? o.file_link_id ?? o.id);

  return {
    id: linkId,
    fileLinkId: linkId,
    revisionId:
      o.revisionId != null
        ? num(o.revisionId)
        : o.revision_id != null
          ? num(o.revision_id)
          : undefined,
    fileId:
      o.fileId != null
        ? num(o.fileId)
        : o.file_id != null
          ? num(o.file_id)
          : nested?.id != null
            ? num(nested.id)
            : undefined,
    fileName,
    filePath,
    fileType: firstNonEmptyStr(
      o.fileType,
      o.file_type,
      nested?.mimeType,
      nested?.mime_type
    ),
    fileSize:
      typeof o.fileSize === "number"
        ? o.fileSize
        : typeof o.file_size === "number"
          ? o.file_size
          : typeof nested?.size === "number"
            ? nested.size
            : null,
    uploadedAt,
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : typeof o.created_at === "string"
          ? o.created_at
          : undefined,
  };
}

/** `GET /item-revisions/:revisionId/files` — 리비전 첨부(파일 링크) 목록 */
export async function getItemRevisionFiles(
  revisionId: number,
  accessToken: string
): Promise<ItemRevisionFileLink[]> {
  const res = await fetchAuthorized(
    `${API_BASE}/item-revisions/${revisionId}/files`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(
      res,
      "리비전 첨부 목록을 불러오지 못했습니다."
    );
  }
  const data = await res.json();
  const list = Array.isArray(data)
    ? data
    : (data as { items?: unknown[]; data?: unknown[] })?.items ??
      (data as { data?: unknown[] })?.data ??
      [];
  return list.map(mapItemRevisionFileLink);
}

/**
 * `GET /item-revisions/:revisionId/files/:fileLinkId` — 첨부 바이너리 스트림 (`item.read`).
 * `fileLinkId`는 목록 응답의 링크 ID(1 이상)를 그대로 사용한다.
 */
export async function fetchItemRevisionFileBlob(
  revisionId: number,
  fileLinkId: number,
  accessToken: string
): Promise<Blob> {
  if (!Number.isFinite(fileLinkId) || fileLinkId < 1) {
    throw new Error("목록에 표시된 fileLinkId를 사용하세요.");
  }
  const res = await fetchAuthorized(
    `${API_BASE}/item-revisions/${revisionId}/files/${fileLinkId}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "첨부파일을 받지 못했습니다.");
  }
  return res.blob();
}

/** `POST /item-revisions/:revisionId/files` — multipart, 필드명 `file` */
export async function uploadItemRevisionFile(
  revisionId: number,
  file: File,
  accessToken: string
): Promise<ItemRevisionFileLink> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetchAuthorized(
    `${API_BASE}/item-revisions/${revisionId}/files`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: form,
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "파일을 업로드하지 못했습니다.");
  }
  return mapItemRevisionFileLink(await res.json());
}

/** `DELETE /item-revisions/:revisionId/files/:fileLinkId` — 204 */
export async function deleteItemRevisionFile(
  revisionId: number,
  fileLinkId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/item-revisions/${revisionId}/files/${fileLinkId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "첨부파일을 삭제하지 못했습니다.");
  }
}

/** GET /api/items/:itemId/usage */
export async function getItemUsage(
  itemId: number,
  accessToken: string
): Promise<ItemUsageRow[]> {
  const res = await fetchAuthorized(`${API_BASE}/items/${itemId}/usage`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "품목 사용처를 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data)
    ? (data as ItemUsageRow[])
    : ((data as { items?: ItemUsageRow[] })?.items ?? []);
}

export const ITEM_TYPE_FILTER_ALL = "__all__";

/** 공통코드 `ITEM_TYPE` 조회 실패·빈 목록 시 셀렉트 폴백 */
export const ITEM_TYPE_OPTIONS_FALLBACK: { value: string; label: string }[] = [
  { value: "ENGINE", label: "ENGINE" },
  { value: "CAMERA", label: "CAMERA" },
  { value: "PRODUCT", label: "PRODUCT" },
];

/** `ITEM_REVISION_STATUS` 미구축 시 리비전 상태 셀렉트·표시 폴백 */
export const REVISION_STATUS_OPTIONS = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "OBSOLETE", label: "OBSOLETE" },
] as const;
