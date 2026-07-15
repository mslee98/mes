import { API_BASE } from "../apiBase";
import { fetchAuthorized } from "../fetchAuthorized";
import { createApiError } from "../../lib/api/apiError";

export { API_BASE, fetchAuthorized, createApiError };

export type ListSortOrder = "asc" | "desc";

export function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function jsonHeaders(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(accessToken),
  };
}
