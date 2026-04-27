/**
 * 액세스 토큰 갱신 single-flight 유틸.
 * - Keycloak 모드: keycloak.updateToken() 사용
 * - 레거시 모드: POST /api/auth/refresh 사용
 */
import { refresh as apiRefresh, type RefreshResponse } from "../api/auth";
import { isKeycloakAuthEnabled } from "../config/keycloakEnv";
import { setAuthAccessToken } from "./authAccessStore";
import { getOrCreateKeycloakClient } from "./keycloakClient";

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

async function refreshAccessTokenByKeycloak(): Promise<string> {
  const keycloak = getOrCreateKeycloakClient();
  await keycloak.updateToken(30);
  const token = keycloak.token;
  if (!token || typeof token !== "string") {
    throw new Error("Keycloak 세션 갱신 응답이 올바르지 않습니다.");
  }
  setAuthAccessToken(token);
  return token;
}

async function refreshAccessTokenByLegacyApi(): Promise<string> {
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
}

export function refreshAccessTokenSingle(): Promise<string> {
  if (!inFlight) {
    inFlight = (async () => {
      if (isKeycloakAuthEnabled()) {
        return refreshAccessTokenByKeycloak();
      }
      return refreshAccessTokenByLegacyApi();
    })().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
