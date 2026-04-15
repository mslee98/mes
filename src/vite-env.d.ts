/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `true`이면 Keycloak JS(@react-keycloak/web)로 인증 */
  readonly VITE_KEYCLOAK_ENABLED?: string;
  /** Keycloak 베이스 URL (예: `http://localhost:8080` 또는 `https://auth.example.com` — `/auth`는 자동 보정) */
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_KEYCLOAK_REALM?: string;
  /** 클라이언트 ID (Keycloak 클라이언트 설정의 clientId, 예: vms-front) */
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
  /** 로그인 후 리다이렉트 전체 URL (미설정 시 `window.location.origin + '/'`) */
  readonly VITE_KEYCLOAK_LOGIN_REDIRECT_URI?: string;
  /** 로그아웃 후 리다이렉트 전체 URL (미설정 시 `window.location.origin + '/signin'`) */
  readonly VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI?: string;
  /** Keycloak userinfo URL (미설정 시 표준 OIDC 경로 자동 구성) */
  readonly VITE_KEYCLOAK_USERINFO_URL?: string;
  /** JWT에서 사번으로 쓸 클레임 이름 (미설정 시 employee_no / employeeNo 순으로 시도) */
  readonly VITE_KEYCLOAK_EMPLOYEE_NO_CLAIM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
