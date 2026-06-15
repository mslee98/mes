import { createApiError } from "../lib/api/apiError";
import { API_BASE } from "./apiBase";
import { fetchAuthorized } from "./fetchAuthorized";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

function jsonHeaders(accessToken: string): HeadersInit {
  return {
    ...authHeaders(accessToken),
    "Content-Type": "application/json",
  };
}

export interface DevBoardListResponse<TItem> {
  items: TItem[];
  total: number;
  page: number;
  size: number;
}

export type BugPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT" | string;
export type BugBoardStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "FIXED"
  | "VERIFIED"
  | "CLOSED"
  | string;

export interface BugBoardListQuery {
  keyword?: string;
  status?: BugBoardStatus;
  priority?: BugPriority;
  page?: number;
  size?: number;
}

export interface BugBoardPost {
  id: number;
  title: string;
  content: string;
  priority: BugPriority;
  status: BugBoardStatus;
  reproductionSteps?: string | null;
  expectedResult?: string | null;
  actualResult?: string | null;
  createdById?: number | null;
  createdByName?: string | null;
  fixedById?: number | null;
  fixedByName?: string | null;
  fixedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CreateBugBoardPostPayload {
  title: string;
  content: string;
  priority: BugPriority;
  reproductionSteps?: string;
  expectedResult?: string;
  actualResult?: string;
  status?: BugBoardStatus;
}

export interface UpdateBugBoardPostPayload {
  title?: string;
  content?: string;
  priority?: BugPriority;
  reproductionSteps?: string;
  expectedResult?: string;
  actualResult?: string;
  status?: BugBoardStatus;
}

function buildBugBoardListQuery(params?: BugBoardListQuery): string {
  const q = new URLSearchParams();
  if (params?.keyword?.trim()) q.set("keyword", params.keyword.trim());
  if (params?.status?.trim()) q.set("status", params.status.trim());
  if (params?.priority?.trim()) q.set("priority", params.priority.trim());
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.size != null) q.set("size", String(params.size));
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

function parseListResponse<TItem>(data: unknown): DevBoardListResponse<TItem> {
  const o = data as Record<string, unknown>;
  const items = Array.isArray(o.items) ? (o.items as TItem[]) : [];
  return {
    items,
    total: typeof o.total === "number" ? o.total : items.length,
    page: typeof o.page === "number" ? o.page : 1,
    size: typeof o.size === "number" ? o.size : items.length,
  };
}

/** GET /dev-boards/bugs */
export async function getBugBoardPosts(
  accessToken: string,
  params?: BugBoardListQuery
): Promise<DevBoardListResponse<BugBoardPost>> {
  const res = await fetchAuthorized(
    `${API_BASE}/dev-boards/bugs${buildBugBoardListQuery(params)}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "버그 게시판 목록을 불러오지 못했습니다.");
  }
  return parseListResponse<BugBoardPost>(await res.json());
}

/** GET /dev-boards/bugs/:id */
export async function getBugBoardPost(
  id: number | string,
  accessToken: string
): Promise<BugBoardPost> {
  const res = await fetchAuthorized(
    `${API_BASE}/dev-boards/bugs/${id}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "버그 게시글을 불러오지 못했습니다.");
  }
  return (await res.json()) as BugBoardPost;
}

/** POST /dev-boards/bugs */
export async function createBugBoardPost(
  payload: CreateBugBoardPostPayload,
  accessToken: string
): Promise<BugBoardPost> {
  const res = await fetchAuthorized(
    `${API_BASE}/dev-boards/bugs`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify(payload),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "버그 게시글을 등록하지 못했습니다.");
  }
  return (await res.json()) as BugBoardPost;
}

/** PATCH /dev-boards/bugs/:id */
export async function updateBugBoardPost(
  id: number | string,
  payload: UpdateBugBoardPostPayload,
  accessToken: string
): Promise<BugBoardPost> {
  const res = await fetchAuthorized(
    `${API_BASE}/dev-boards/bugs/${id}`,
    {
      method: "PATCH",
      headers: jsonHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify(payload),
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "버그 게시글을 수정하지 못했습니다.");
  }
  return (await res.json()) as BugBoardPost;
}

/** DELETE /dev-boards/bugs/:id (soft delete) */
export async function deleteBugBoardPost(
  id: number | string,
  accessToken: string
): Promise<void> {
  const res = await fetchAuthorized(
    `${API_BASE}/dev-boards/bugs/${id}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "버그 게시글을 삭제하지 못했습니다.");
  }
}
