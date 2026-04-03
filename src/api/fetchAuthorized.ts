/**
 * Bearer API 호출: 401 시 한 번 `POST /auth/refresh` (credentials include) 후 재시도.
 * 리프레시는 HttpOnly 쿠키 — JS에서는 읽지 않고 자동 전송만 신뢰.
 */
import { getAuthAccessToken, setAuthAccessToken } from "../lib/authAccessStore";
import { refreshAccessTokenSingle } from "../lib/authRefreshCoordinator";

const AUTH_PATH_SKIP_RETRY = ["/auth/login", "/auth/refresh", "/auth/logout"];

function shouldRetryRefresh(url: string): boolean {
  return !AUTH_PATH_SKIP_RETRY.some((p) => url.includes(p));
}

function applyBearer(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");
  return {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  };
}

/**
 * @param accessTokenFromCaller React 렌더 시점 토큰; 없으면 스토어 값 사용. 401 후 재시도는 항상 갱신된 스토어 값.
 */
export async function fetchAuthorized(
  url: string,
  init: RequestInit = {},
  accessTokenFromCaller?: string | null | undefined
): Promise<Response> {
  const tokenFirst =
    accessTokenFromCaller ?? getAuthAccessToken() ?? null;

  const exec = (token: string | null) =>
    fetch(url, applyBearer(init, token));

  let res = await exec(tokenFirst);

  if (res.status === 401 && shouldRetryRefresh(url)) {
    try {
      const newToken = await refreshAccessTokenSingle();
      res = await exec(newToken);
    } catch (e) {
      setAuthAccessToken(null);
      throw e instanceof Error ? e : new Error("세션이 만료되었습니다.");
    }
  }

  return res;
}
