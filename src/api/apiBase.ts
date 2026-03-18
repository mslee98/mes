/**
 * 백엔드 API 공통 Base URL
 * - 모든 API 호출이 이 prefix 아래로 가도록 합니다.
 * - 예: http://localhost:3000/api/auth/login, /api/purchase-orders, /api/menus ...
 */
const HOST =
  import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:3000";

/** API Base (호스트 + /api). auth, menus, users, 발주 등 전체가 이 prefix 사용 */
export const API_BASE =
  HOST.endsWith("/api") ? HOST : `${HOST.replace(/\/$/, "")}/api`;
