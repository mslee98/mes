import { useMemo } from "react";
import { useAuth } from "./useAuth";

/**
 * JWT `permissions` 기준 사용자 관리 권한 (`user.update` 등).
 * permissions/roles가 없으면 개발 편의상 허용.
 */
export function useUserPermissions(): {
  canUpdateUser: boolean;
} {
  const { user } = useAuth();

  return useMemo(() => {
    const raw = user as { permissions?: string[]; roles?: string[] } | null;
    const perms = raw?.permissions ?? [];
    const roles = raw?.roles ?? [];

    if (!perms.length && !roles.length) {
      return { canUpdateUser: true };
    }

    const has = (p: string) => perms.includes(p) || roles.includes(p);
    const admin =
      has("ADMIN") || roles.some((r) => String(r).toUpperCase() === "ADMIN");

    const canUpdate =
      admin ||
      has("user.update") ||
      has("USER_UPDATE") ||
      has("user.manage") ||
      has("USER_MANAGE");

    return { canUpdateUser: canUpdate };
  }, [user]);
}
