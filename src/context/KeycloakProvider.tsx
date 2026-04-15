import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { ReactKeycloakProvider, useKeycloak } from "@react-keycloak/web";
import { getAuthInfo } from "../api/auth";
import { setAuthAccessToken } from "../lib/authAccessStore";
import { mapKeycloakTokenToAuthUser } from "../lib/mapKeycloakTokenToAuthUser";
import type { AuthUser } from "../types/authUser";
import {
  isKeycloakAuthEnabled,
  loginRedirectUri,
  postLogoutRedirectUri,
  readKeycloakEnv,
} from "../config/keycloakEnv";
import { buildKeycloakInitOptions, getOrCreateKeycloakClient } from "../lib/keycloakClient";

type KeycloakAuthContextValue = {
  enabled: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const defaultContextValue: KeycloakAuthContextValue = {
  enabled: false,
  initialized: true,
  isAuthenticated: false,
  accessToken: null,
  user: null,
  login: async () => {},
  logout: async () => {},
};

const KeycloakAuthContext = createContext<KeycloakAuthContextValue>(defaultContextValue);

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function firstNonEmptyString(
  payload: Record<string, unknown> | null,
  keys: string[],
  fallback = "-"
): string {
  if (!payload) return fallback;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
}

function displayKoreanName(payload: Record<string, unknown> | null): string {
  if (!payload) return "-";
  const family = firstNonEmptyString(payload, ["family_name"], "");
  const given = firstNonEmptyString(payload, ["given_name"], "");
  const fullName = `${family} ${given}`.trim();
  if (fullName) return fullName;
  return firstNonEmptyString(payload, ["name", "preferred_username"], "-");
}

function KeycloakStateBridge({ children }: { children: ReactNode }) {
  const { keycloak, initialized } = useKeycloak();
  const { employeeNoClaim } = useMemo(() => readKeycloakEnv(), []);

  useEffect(() => {
    setAuthAccessToken(keycloak.token ?? null);
  }, [initialized, keycloak.authenticated, keycloak.token]);

  const user = useMemo(() => {
    if (!initialized || !keycloak.authenticated || !keycloak.token) {
      return null;
    }
    return mapKeycloakTokenToAuthUser(keycloak.tokenParsed, employeeNoClaim);
  }, [
    employeeNoClaim,
    initialized,
    keycloak.authenticated,
    keycloak.token,
    keycloak.tokenParsed,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!initialized || !keycloak.authenticated || !keycloak.token) return;

    let cancelled = false;
    void (async () => {
      try {
        const info = await getAuthInfo(keycloak.token!);
        if (cancelled) return;
        console.groupCollapsed("[Auth API] /auth/info");
        console.log(info);
        console.groupEnd();
      } catch (error) {
        if (cancelled) return;
        console.groupCollapsed("[Auth API] /auth/info error");
        console.error(error);
        console.groupEnd();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialized, keycloak.authenticated, keycloak.token]);

  // useEffect(() => {
  //   if (!import.meta.env.DEV) return;
  //   if (!initialized || !keycloak.authenticated || !keycloak.token) return;

  //   const kc = keycloak;
  //   console.groupCollapsed("[Keycloak] 전체 데이터 (개발 모드, 민감 정보 포함)");
  //   console.log("authenticated", kc.authenticated);
  //   console.log("subject", kc.subject);
  //   console.log("tokenParsed (액세스 JWT payload)", kc.tokenParsed);
  //   console.log("idTokenParsed", kc.idTokenParsed);
  //   console.log("realmAccess (파싱 헬퍼)", kc.realmAccess);
  //   console.log("resourceAccess (파싱 헬퍼)", kc.resourceAccess);
  //   console.log("access_token (원문)", kc.token);
  //   console.log("id_token (원문)", kc.idToken);
  //   console.log("refresh_token (원문)", kc.refreshToken);
  //   console.log("앱에 매핑된 user", user);
  //   console.groupEnd();
  // }, [initialized, keycloak, keycloak.authenticated, keycloak.token, keycloak.tokenParsed, user]);

  const login = useCallback(async () => {
    await keycloak.login({ redirectUri: loginRedirectUri() });
  }, [keycloak]);

  const logout = useCallback(async () => {
    await keycloak.logout({ redirectUri: postLogoutRedirectUri() });
    setAuthAccessToken(null);
  }, [keycloak]);

  const value = useMemo<KeycloakAuthContextValue>(
    () => ({
      enabled: true,
      initialized,
      isAuthenticated: Boolean(keycloak.authenticated && keycloak.token),
      accessToken: keycloak.token ?? null,
      user,
      login,
      logout,
    }),
    [
      initialized,
      keycloak.authenticated,
      keycloak.token,
      login,
      logout,
      user,
    ]
  );

  return <KeycloakAuthContext.Provider value={value}>{children}</KeycloakAuthContext.Provider>;
}

export function KeycloakProvider({ children }: { children: ReactNode }) {
  const enabled = isKeycloakAuthEnabled();
  const keycloak = useMemo(() => (enabled ? getOrCreateKeycloakClient() : null), [enabled]);
  const initOptions = useMemo(() => (enabled ? buildKeycloakInitOptions() : undefined), [enabled]);
  

  if (!enabled || !keycloak || !initOptions) {
    return (
      <KeycloakAuthContext.Provider value={defaultContextValue}>
        {children}
      </KeycloakAuthContext.Provider>
    );
  }

  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={initOptions}
      onTokens={(tokens) => {
        const accessToken = tokens?.token ?? null;
        setAuthAccessToken(accessToken);

        if (!import.meta.env.DEV || !accessToken) return;
        const parsed = parseJwtPayload(accessToken);
        const employeeNo = firstNonEmptyString(parsed, [
          "user_employee_no",
        ]);
        const jobFamily = firstNonEmptyString(parsed, [
          "user_job_category",
        ]);
        const jobTitle = firstNonEmptyString(parsed, [
          "user_position",
        ]);
        const koreanName = displayKoreanName(parsed);
        console.groupCollapsed("[Keycloak] 사번 | 직군 | 직급 | 한글 이름");
        console.log(`${employeeNo} | ${jobFamily} | ${jobTitle} | ${koreanName}`);
        console.log(parsed);
        console.groupEnd();
      }}
    >
      <KeycloakStateBridge>{children}</KeycloakStateBridge>
    </ReactKeycloakProvider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKeycloakAuth() {
  return useContext(KeycloakAuthContext);
}
