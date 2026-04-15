/**
 * 하우징 템플릿 API (`/api/housing-templates`).
 * 권한: product.read / product.manage
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

export interface HousingTemplateLine {
  id: number;
  itemRevisionId: number;
  itemId?: number | null;
  itemCode?: string | null;
  revisionCode?: string | null;
  revisionName?: string | null;
  drawingNo?: string | null;
  quantity: number;
  sortOrder?: number | null;
  roleCode?: string | null;
}

export interface HousingTemplate {
  id: number;
  templateCode: string;
  templateName: string;
  /** UI 표시/호환용 상태 코드 (ACTIVE | INACTIVE) */
  status: string;
  /** 저장·전송 기준 활성 여부 */
  isActive: boolean;
  remark?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lines: HousingTemplateLine[];
}

export interface CreateHousingTemplatePayload {
  templateCode: string;
  templateName: string;
  isActive?: boolean;
  remark?: string | null;
}

export interface UpdateHousingTemplatePayload {
  templateCode?: string;
  templateName?: string;
  isActive?: boolean;
  remark?: string | null;
}

export interface AddHousingTemplateLinePayload {
  itemRevisionId: number;
  quantity?: number;
  sortOrder?: number;
  roleCode?: string | null;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function mapHousingTemplateLine(raw: unknown): HousingTemplateLine {
  const o = raw as Record<string, unknown>;
  const qty = o.quantity;
  const quantity =
    typeof qty === "number" && Number.isFinite(qty) ? qty : num(qty, 1);
  const sortRaw = o.sortOrder ?? o.sort_order;
  const sortParsed =
    sortRaw == null || sortRaw === ""
      ? null
      : num(sortRaw, NaN);
  const sortOrder =
    sortParsed != null && Number.isFinite(sortParsed) ? sortParsed : null;
  return {
    id: num(o.id ?? o.lineId),
    itemRevisionId: num(o.itemRevisionId ?? o.item_revision_id),
    itemId:
      o.itemId != null
        ? num(o.itemId)
        : o.item_id != null
          ? num(o.item_id)
          : null,
    itemCode: strOrNull(o.itemCode ?? o.item_code),
    revisionCode: strOrNull(o.revisionCode ?? o.revision_code),
    revisionName: strOrNull(o.revisionName ?? o.revision_name),
    drawingNo: strOrNull(o.drawingNo ?? o.drawing_no),
    quantity: quantity > 0 ? quantity : 1,
    sortOrder,
    roleCode: strOrNull(o.roleCode ?? o.role_code),
  };
}

function mapHousingTemplate(raw: unknown): HousingTemplate {
  const o = raw as Record<string, unknown>;
  const linesRaw = o.lines;
  const lines = Array.isArray(linesRaw)
    ? linesRaw.map(mapHousingTemplateLine)
    : [];
  const statusRaw =
    typeof o.status === "string" ? o.status.trim().toUpperCase() : "";
  const isActive =
    typeof o.isActive === "boolean"
      ? o.isActive
      : typeof o.is_active === "boolean"
        ? o.is_active
        : statusRaw === "ACTIVE";
  return {
    id: num(o.id),
    templateCode: String(o.templateCode ?? o.template_code ?? "").trim(),
    templateName: String(o.templateName ?? o.template_name ?? "").trim(),
    status: isActive ? "ACTIVE" : "INACTIVE",
    isActive,
    remark: strOrNull(o.remark),
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
    lines,
  };
}

function normalizeTemplateList(data: unknown): HousingTemplate[] {
  if (Array.isArray(data)) {
    return data.map(mapHousingTemplate);
  }
  const o = data as Record<string, unknown>;
  const items = o.items;
  if (Array.isArray(items)) {
    return items.map(mapHousingTemplate);
  }
  return [];
}

/** GET /api/housing-templates */
export async function getHousingTemplates(
  accessToken: string
): Promise<HousingTemplate[]> {
  const res = await fetchAuthorized(`${API_BASE}/housing-templates`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "하우징 템플릿 목록을 불러오지 못했습니다.");
  }
  return normalizeTemplateList(await res.json());
}

/** GET /api/housing-templates/:id */
export async function getHousingTemplate(
  id: number,
  accessToken: string
): Promise<HousingTemplate> {
  const res = await fetchAuthorized(`${API_BASE}/housing-templates/${id}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "하우징 템플릿을 불러오지 못했습니다.");
  }
  return mapHousingTemplate(await res.json());
}

/** POST /api/housing-templates */
export async function createHousingTemplate(
  accessToken: string,
  body: CreateHousingTemplatePayload
): Promise<HousingTemplate> {
  const payload: Record<string, unknown> = {
    templateCode: body.templateCode.trim(),
    templateName: body.templateName.trim(),
    isActive: body.isActive !== false,
  };
  if (body.remark != null && body.remark.trim() !== "") {
    payload.remark = body.remark.trim();
  }
  const res = await fetchAuthorized(`${API_BASE}/housing-templates`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify(payload),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "하우징 템플릿을 등록하지 못했습니다.");
  }
  return mapHousingTemplate(await res.json());
}

/** PATCH /api/housing-templates/:id */
export async function updateHousingTemplate(
  id: number,
  accessToken: string,
  body: UpdateHousingTemplatePayload
): Promise<HousingTemplate> {
  const payload: Record<string, unknown> = {};
  if (body.templateCode !== undefined) {
    payload.templateCode = body.templateCode.trim();
  }
  if (body.templateName !== undefined) {
    payload.templateName = body.templateName.trim();
  }
  if (body.isActive !== undefined) {
    payload.isActive = body.isActive === true;
  }
  if (body.remark !== undefined) {
    payload.remark =
      body.remark == null || body.remark.trim() === ""
        ? null
        : body.remark.trim();
  }
  const res = await fetchAuthorized(`${API_BASE}/housing-templates/${id}`, {
    method: "PATCH",
    headers: jsonHeaders(accessToken),
    credentials: "include",
    body: JSON.stringify(payload),
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "하우징 템플릿을 수정하지 못했습니다.");
  }
  return mapHousingTemplate(await res.json());
}

/** DELETE /api/housing-templates/:id */
export async function deleteHousingTemplate(
  id: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(`${API_BASE}/housing-templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  }, accessToken);
  if (!res.ok) {
    throw await createApiError(res, "하우징 템플릿을 삭제하지 못했습니다.");
  }
}

/** POST /api/housing-templates/:id/lines */
export async function addHousingTemplateLine(
  templateId: number,
  accessToken: string,
  body: AddHousingTemplateLinePayload
): Promise<HousingTemplate> {
  const payload: Record<string, unknown> = {
    itemRevisionId: body.itemRevisionId,
  };
  if (
    body.quantity != null &&
    Number.isFinite(body.quantity) &&
    body.quantity > 0
  ) {
    payload.quantity = body.quantity;
  }
  if (body.sortOrder != null && Number.isFinite(body.sortOrder)) {
    payload.sortOrder = body.sortOrder;
  }
  if (body.roleCode != null && body.roleCode.trim() !== "") {
    payload.roleCode = body.roleCode.trim();
  }
  const res = await fetchAuthorized(
    `${API_BASE}/housing-templates/${templateId}/lines`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify(payload),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "하우징 템플릿 라인을 추가하지 못했습니다.");
  }
  return mapHousingTemplate(await res.json());
}

/** DELETE /api/housing-templates/:id/lines/:lineId */
export async function deleteHousingTemplateLine(
  templateId: number,
  lineId: number,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/housing-templates/${templateId}/lines/${lineId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "하우징 템플릿 라인을 삭제하지 못했습니다.");
  }
}
