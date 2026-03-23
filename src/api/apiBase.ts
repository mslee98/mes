/**
 * 백엔드 API 공통 Base URL.
 *
 * - `src/api/*.ts`의 `fetch`는 모두 `{API_BASE}/…` 형태로 호출합니다.
 * - 환경: `import.meta.env.VITE_AUTH_BASE_URL` (없으면 `http://localhost:3000`).
 * - 호스트가 이미 `/api`로 끝나면 그대로 쓰고, 아니면 끝에 `/api`를 붙입니다.
 *
 * 예: `http://localhost:3000/api/auth/login`, `…/api/purchase-orders`
 *
 * @see docs/FRONTEND_API.md
 */
const HOST =
  import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:3000";

/** API Base (호스트 + `/api`). 인증·메뉴·사용자·발주 등 전 모듈이 동일 prefix 사용 */
export const API_BASE =
  HOST.endsWith("/api") ? HOST : `${HOST.replace(/\/$/, "")}/api`;
