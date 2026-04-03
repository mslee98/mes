/**
 * 메모리상 현재 액세스 JWT (리프레시는 HttpOnly 쿠키만).
 * React `AuthContext`와 동기화해, 401 재시도 시 최신 토큰을 읽을 수 있게 한다.
 */

type TokenListener = (token: string | null) => void;

const listeners = new Set<TokenListener>();
let cached: string | null = null;

export function getAuthAccessToken(): string | null {
  return cached;
}

export function setAuthAccessToken(token: string | null): void {
  cached = token;
  listeners.forEach((fn) => fn(token));
}

export function subscribeAuthAccessToken(fn: TokenListener): () => void {
  listeners.add(fn);
  fn(cached);
  return () => listeners.delete(fn);
}
