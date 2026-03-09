"use client";

import type React from "react";
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import {
  login as apiLogin,
  refresh as apiRefresh,
  logout as apiLogout,
  type LoginResponse,
  type RefreshResponse,
} from "../api/auth";

type AuthUser = {
  employeeNo: number;
  name?: string;
  [key: string]: unknown;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
};

type AuthContextType = AuthState & {
  login: (
    employeeNo: number,
    password: string,
    remember?: boolean
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시: 백엔드가 설정한 refresh_token 쿠키로 access_token 재발급 (credentials: 'include'로 쿠키 자동 전송)
  useEffect(() => {
    let cancelled = false;

    async function tryRefresh() {
      try {
        const res = (await apiRefresh()) as RefreshResponse;
        if (cancelled) return;
        const newAccess =
          res.accessToken ?? (res.access_token as string | undefined);
        if (newAccess) setAccessToken(newAccess);
        // refresh 응답에 user가 있으면 사용, 없거나 name이 없으면 이전에 저장해 둔 user 복원 (로그인 시 이름 유지)
        const responseUser = res.user as AuthUser | undefined;
        if (responseUser?.name) {
          setUser(responseUser);
          setStoredUser(responseUser);
        } else if (responseUser?.employeeNo) {
          const merged = { ...getStoredUser(), ...responseUser } as AuthUser;
          setUser(merged);
          setStoredUser(merged);
        } else {
          const stored = getStoredUser();
          if (stored) setUser(stored);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
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
    async (employeeNo: number, password: string, _remember = true) => {
      const res = (await apiLogin({ employeeNo, password })) as LoginResponse;
      const access =
        res.accessToken ??
        (res.access_token as string | undefined) ??
        (res.token as string | undefined) ??
        "logged-in";
      const userData = res.user ?? { employeeNo };

      const u = userData as AuthUser;
      setUser(u);
      setAccessToken(access);
      setStoredUser(u); // 새로고침 후 refresh 응답에 user가 없어도 이름 표시 유지용
      // refresh_token은 백엔드가 Set-Cookie로 설정함 (credentials: 'include' 사용 중)
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout(); // 서버에서 refresh_token 쿠키 삭제
    } finally {
      setUser(null);
      setAccessToken(null);
      setStoredUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoggedIn: !!accessToken,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
