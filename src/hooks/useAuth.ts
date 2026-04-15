"use client";

import { useContext, useMemo } from "react";
import { AuthContext, type AuthContextType } from "../context/AuthContext";
import { useKeycloakAuth } from "../context/KeycloakProvider";

/**
 * 인증 상태 훅.
 * - `AuthProvider`가 있으면 레거시(사번·쿠키 리프레시) 컨텍스트 값을 반환합니다.
 * - 없고 Keycloak이 켜져 있으면 `KeycloakProvider` 값을 동일한 형태로 매핑해 반환합니다.
 */
export function useAuth(): AuthContextType {
  const legacy = useContext(AuthContext);
  const keycloak = useKeycloakAuth();

  return useMemo(() => {
    if (legacy) return legacy;

    if (keycloak.enabled) {
      return {
        user: keycloak.user,
        accessToken: keycloak.accessToken,
        isLoggedIn: keycloak.isAuthenticated,
        isLoading: !keycloak.initialized,
        login: async (_employeeNo: number, _password: string, _remember?: boolean) => {
          void _employeeNo;
          void _password;
          void _remember;
          await keycloak.login();
        },
        logout: () => {
          void keycloak.logout();
        },
      } satisfies AuthContextType;
    }

    return {
      user: null,
      accessToken: null,
      isLoggedIn: false,
      isLoading: false,
      login: async (_employeeNo: number, _password: string, _remember?: boolean) => {
        void _employeeNo;
        void _password;
        void _remember;
        throw new Error("AuthProvider가 비활성화되어 로그인할 수 없습니다.");
      },
      logout: () => {},
    } satisfies AuthContextType;
  }, [legacy, keycloak]);
}
