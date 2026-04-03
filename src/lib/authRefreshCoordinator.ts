/**
 * POST /api/auth/refresh — single-flight + 액세스 토큰 저장소 갱신.
 * @see 백엔드: credentials: 'include', 본문 없음, refresh_token HttpOnly 쿠키
 */
import { refresh as apiRefresh, type RefreshResponse } from "../api/auth";
import { setAuthAccessToken } from "./authAccessStore";

export type RefreshedUser = {
  employeeNo: number;
  name?: string;
  [key: string]: unknown;
};

type UserListener = (user: RefreshedUser | undefined) => void;

const userListeners = new Set<UserListener>();

export function onRefreshUserPayload(cb: UserListener): () => void {
  userListeners.add(cb);
  return () => userListeners.delete(cb);
}

let inFlight: Promise<string> | null = null;

export function refreshAccessTokenSingle(): Promise<string> {
  if (!inFlight) {
    inFlight = (async () => {
      const res = (await apiRefresh()) as RefreshResponse;
      const token = res.access_token ?? res.accessToken;
      if (!token || typeof token !== "string") {
        throw new Error("세션 갱신 응답이 올바르지 않습니다.");
      }
      setAuthAccessToken(token);
      const u = res.user as RefreshedUser | undefined;
      if (u && u.employeeNo != null) {
        userListeners.forEach((fn) => fn(u));
      }
      return token;
    })().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
