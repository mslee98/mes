import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router";
import { isKeycloakAuthEnabled } from "../config/keycloakEnv";
import { useKeycloakAuth } from "../context/KeycloakProvider";
import { useAuth } from "../hooks/useAuth";
import SignIn from "./AutpPages/SignIn";

function AuthLoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

function LegacySignInGate() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen message="인증 정보를 확인하는 중..." />;
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <SignIn />;
}

function KeycloakSignInBridge() {
  const { initialized, isAuthenticated, login } = useKeycloakAuth();
  const location = useLocation();
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    if (!initialized || isAuthenticated) return;
    if (autoLoginStarted.current) return;
    autoLoginStarted.current = true;
    void login();
  }, [initialized, isAuthenticated, login]);

  if (!initialized) {
    return <AuthLoadingScreen message="인증 정보를 불러오는 중..." />;
  }

  if (isAuthenticated) {
    const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    const safeFrom =
      fromPath && fromPath !== "/signin" && fromPath !== "/signup" ? fromPath : "/";
    return <Navigate to={safeFrom} replace />;
  }

  return <AuthLoadingScreen message="Keycloak 로그인으로 이동하는 중..." />;
}

/**
 * `/signin` 단일 진입점.
 * - Keycloak 사용 시: 미인증이면 `login()`으로 IdP로 이동, 인증됐으면 이전 경로 또는 홈으로 이동.
 * - Keycloak 미사용 시: 레거시 사번 로그인 화면(`SignIn`).
 */
export default function AuthEntry() {
  if (!isKeycloakAuthEnabled()) {
    return <LegacySignInGate />;
  }

  return <KeycloakSignInBridge />;
}
