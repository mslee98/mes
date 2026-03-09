/**
 * refreshToken 쿠키 저장/조회/삭제
 * - 앱과 같은 도메인에만 저장 (새로고침 시 복구용)
 * - /auth/refresh 호출 시 쿠키에서 읽어서 body로 전달
 */

const COOKIE_NAME =
  import.meta.env.VITE_AUTH_REFRESH_COOKIE_NAME ?? "refreshToken";

const MAX_AGE_DAYS = 7;
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;

export function setRefreshTokenCookie(value: string): void {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function getRefreshTokenCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function clearRefreshTokenCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
