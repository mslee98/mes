/**
 * Keycloak 연동용 Vite 환경 변수.
 * 클라이언트 JSON 기준: clientId `vms-front`, public client, PKCE S256, post logout → `/signin`
 */

const TRUTHY = new Set(["1", "true", "yes", "on"]);

export function isKeycloakAuthEnabled(): boolean {
  return TRUTHY.has(String(import.meta.env.VITE_KEYCLOAK_ENABLED ?? "").toLowerCase());
}

/** 서버 URL은 사용자가 입력한 값을 그대로 사용하고, 끝의 `/`만 제거 */
export function normalizeKeycloakServerUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

export type ResolvedKeycloakEnv = {
  url: string;
  realm: string;
  clientId: string;
  employeeNoClaim?: string;
};

export function readKeycloakEnv(): ResolvedKeycloakEnv {
  const urlRaw = String(import.meta.env.VITE_KEYCLOAK_URL ?? "").trim();
  const realm = String(import.meta.env.VITE_KEYCLOAK_REALM ?? "").trim();
  const clientId =
    String(import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "").trim() || "vms-front";
  const employeeNoClaim =
    String(import.meta.env.VITE_KEYCLOAK_EMPLOYEE_NO_CLAIM ?? "").trim() || undefined;

  if (!urlRaw) {
    throw new Error(
      "VITE_KEYCLOAK_ENABLED=true 인데 VITE_KEYCLOAK_URL 이 비어 있습니다. 예: http://localhost:8080"
    );
  }
  if (!realm) {
    throw new Error(
      "VITE_KEYCLOAK_ENABLED=true 인데 VITE_KEYCLOAK_REALM 이 비어 있습니다."
    );
  }

  return {
    url: normalizeKeycloakServerUrl(urlRaw),
    realm,
    clientId,
    employeeNoClaim,
  };
}

export function loginRedirectUri(): string {
  const fromEnv = String(import.meta.env.VITE_KEYCLOAK_LOGIN_REDIRECT_URI ?? "").trim();
  if (fromEnv) return fromEnv;
  return `${window.location.origin}/`;
}

export function postLogoutRedirectUri(): string {
  const fromEnv = String(
    import.meta.env.VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI ?? ""
  ).trim();
  if (fromEnv) return fromEnv;
  return `${window.location.origin}/signin`;
}

/**
 * Keycloak 사용자 정보(userinfo) 엔드포인트.
 * - 미설정 시 표준 경로: {url}/realms/{realm}/protocol/openid-connect/userinfo
 */
export function keycloakUserInfoEndpoint(): string {
  const fromEnv = String(import.meta.env.VITE_KEYCLOAK_USERINFO_URL ?? "").trim();
  if (fromEnv) return fromEnv;
  const { url, realm } = readKeycloakEnv();
  return `${url}/realms/${realm}/protocol/openid-connect/userinfo`;
}
