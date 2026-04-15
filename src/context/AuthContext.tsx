"use client";

/* eslint-disable react-refresh/only-export-components -- 레거시 AuthContext·Provider 동일 파일 유지 */

import type React from "react";
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo
} from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  type LoginResponse
} from "../api/auth";
import { setAuthAccessToken, subscribeAuthAccessToken } from "../lib/authAccessStore";
import {
  refreshAccessTokenSingle,
  onRefreshUserPayload,
  type RefreshedUser
} from "../lib/authRefreshCoordinator";
import type { AuthUser } from "../types/authUser";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
};

export type AuthContextType = AuthState & {
  login: (
    employeeNo: number,
    password: string,
    remember?: boolean
  ) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = "auth_user";

function getStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function setStoredUser(u: AuthUser | null) {
  if (u) sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
  else sessionStorage.removeItem(AUTH_USER_KEY);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return subscribeAuthAccessToken((t) => setAccessToken(t));
  }, []);

  useEffect(() => {
    return onRefreshUserPayload((u: RefreshedUser | undefined) => {
      if (!u || u.employeeNo == null) return;
      setUser((prev) => {
        const merged = { ...(prev ?? {}), ...u } as AuthUser;
        if (u.name) setStoredUser(merged);
        return merged;
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function tryRefresh() {
      try {
        await refreshAccessTokenSingle();
        if (cancelled) return;
        setUser((prev) => {
          if (prev?.employeeNo != null) return prev;
          return getStoredUser();
        });
      } catch {
        if (!cancelled) {
          setUser(null);
          setAuthAccessToken(null);
          setStoredUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    tryRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (employeeNo: number, password: string, remember = true) => {
      void remember;
      const res = (await apiLogin({ employeeNo, password })) as LoginResponse;
      const access =
        res.accessToken ??
        (res.access_token as string | undefined) ??
        (res.token as string | undefined) ??
        "logged-in";
      const userData = res.user ?? { employeeNo };

      const u = userData as AuthUser;
      setUser(u);
      setAuthAccessToken(access);
      setStoredUser(u);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setAuthAccessToken(null);
      setStoredUser(null);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      isLoggedIn: !!accessToken,
      isLoading,
      login,
      logout
    }),
    [accessToken, isLoading, login, logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
