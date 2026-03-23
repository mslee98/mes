/**
 * 인증: 로그인·토큰 갱신·로그아웃. 쿠키 기반 refresh와 연동 (`credentials: "include"`).
 *
 * @see docs/FRONTEND_API.md §2
 */
import { API_BASE } from "./apiBase";

export interface LoginRequest {
  employeeNo: number;
  password: string;
}

/** 로그인 성공 시: accessToken(메모리), refreshToken(쿠키) */
export interface LoginResponse {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  token?: string; // 하위 호환
  user?: { employeeNo: number; name?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/** /auth/refresh 성공 시: 새 access_token (refresh_token은 Set-Cookie로 다시 설정됨) */
export interface RefreshResponse {
  accessToken?: string;
  access_token?: string;
  expires_in_seconds?: number;
  user?: { employeeNo: number; name?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "로그인에 실패했습니다."
    );
  }

  return res.json();
}

/**
 * 토큰 재발급 (Refresh)
 * - Cookie: refresh_token (로그인 시 백엔드가 Set-Cookie로 설정한 쿠키가 credentials: 'include'로 자동 전송)
 * - body 없음. 응답: access_token, expires_in_seconds + 새 refresh_token은 Set-Cookie로 설정됨
 */
export async function refresh(): Promise<RefreshResponse> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "세션이 만료되었습니다."
    );
  }

  return res.json();
}

/**
 * 로그아웃 - 서버에서 Refresh Token 쿠키 삭제
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
