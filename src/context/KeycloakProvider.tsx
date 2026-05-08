import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ReactKeycloakProvider, useKeycloak } from "@react-keycloak/web";
import { getAuthMe } from "../api/auth";
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

function displayLabelFromCodePair(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.split("_")[0]?.trim() || undefined;
}

function mergeAuthUserWithTokenUser(
  backendUser: AuthUser,
  tokenUser: AuthUser | null
): AuthUser {
  const resolvedName =
    (typeof backendUser.name === "string" && backendUser.name.trim().length > 0
      ? backendUser.name.trim()
      : undefined) ?? tokenUser?.name;
  const resolvedJobCategory =
    displayLabelFromCodePair(backendUser.jobCategory) ?? tokenUser?.jobCategory;
  const resolvedJobPosition =
    displayLabelFromCodePair(backendUser.jobPosition) ?? tokenUser?.jobPosition;

  return {
    ...(tokenUser ?? {}),
    ...backendUser,
    name: resolvedName,
    jobCategory: resolvedJobCategory,
    jobPosition: resolvedJobPosition,
  };
}

function KeycloakStateBridge({ children }: { children: ReactNode }) {
  const { keycloak, initialized } = useKeycloak();
  const { employeeNoClaim } = useMemo(() => readKeycloakEnv(), []);
  const [synced, setSynced] = useState<{ token: string; user: AuthUser | null } | null>(null);

  // useEffect(() => {
  //   console.groupCollapsed("[Keycloak] state snapshot");
  //   console.log("initialized:", initialized);
  //   console.log("authenticated:", keycloak.authenticated);
  //   console.log("hasAccessToken:", Boolean(keycloak.token));
  //   console.log("hasIdToken:", Boolean(keycloak.idToken));
  //   console.log("hasRefreshToken:", Boolean(keycloak.refreshToken));
  //   console.groupEnd();
  // }, [initialized, keycloak.authenticated, keycloak.token, keycloak.idToken, keycloak.refreshToken]);

  useEffect(() => {
    setAuthAccessToken(keycloak.token ?? null);
  }, [initialized, keycloak.authenticated, keycloak.token]);

  const tokenUser = useMemo(() => {
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
    if (!initialized || !keycloak.authenticated || !keycloak.token) return;

    let cancelled = false;
    const activeToken = keycloak.token;
    void (async () => {
      try {
        const me = await getAuthMe(activeToken);
        if (cancelled) return;

        const backendUser = me.user;
        if (backendUser && backendUser.employeeNo != null) {
          setSynced({
            token: activeToken,
            user: mergeAuthUserWithTokenUser(backendUser as AuthUser, tokenUser),
          });
        } else {
          // /auth/me 응답에 user가 없으면 토큰 매핑 사용자로 폴백한다.
          setSynced({ token: activeToken, user: tokenUser });
        }
      } catch {
        if (cancelled) return;
        // 동기화 실패 시에도 토큰 기반 최소 사용자 정보는 유지한다.
        setSynced({ token: activeToken, user: tokenUser });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialized, keycloak.authenticated, keycloak.token, tokenUser]);

  const syncedUser = useMemo(() => {
    if (!keycloak.token) return null;
    if (!synced || synced.token !== keycloak.token) return null;
    return synced.user;
  }, [keycloak.token, synced]);

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
    const redirectUri = loginRedirectUri();
    // console.log("[Keycloak] login redirectUri", redirectUri);
    await keycloak.login({ redirectUri });
  }, [keycloak]);

  const logout = useCallback(async () => {
    const redirectUri = postLogoutRedirectUri();
    // console.log("[Keycloak] logout redirectUri", redirectUri);
    await keycloak.logout({ redirectUri });
    setAuthAccessToken(null);
  }, [keycloak]);

  const value = useMemo<KeycloakAuthContextValue>(
    () => ({
      enabled: true,
      initialized,
      isAuthenticated: Boolean(keycloak.authenticated && keycloak.token),
      accessToken: keycloak.token ?? null,
      user: syncedUser ?? tokenUser,
      login,
      logout,
    }),
    [
      initialized,
      keycloak.authenticated,
      keycloak.token,
      login,
      logout,
      tokenUser,
      syncedUser,
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
      onEvent={() => {}}
      onTokens={(tokens) => {
        const accessToken = tokens?.token ?? null;
        setAuthAccessToken(accessToken);
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
