import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * JWT/사용자 객체의 permissions 배열 기준.
 * permissions가 없으면(로컬·구버전) 조회·관리 모두 허용으로 간주.
 */
export function useItemPermissions(): {
  canReadItems: boolean;
  canManageItems: boolean;
} {
  const { user } = useAuth();

  return useMemo(() => {
    const raw = user as { permissions?: string[]; roles?: string[] } | null;
    const perms = raw?.permissions ?? [];
    const roles = raw?.roles ?? [];

    if (!perms.length && !roles.length) {
      return { canReadItems: true, canManageItems: true };
    }

    const has = (p: string) => perms.includes(p) || roles.includes(p);
    const admin =
      has("ADMIN") || roles.some((r) => String(r).toUpperCase() === "ADMIN");

    const canManage =
      admin || has("item.manage") || has("ITEM_MANAGE");
    const canRead =
      canManage ||
      has("item.read") ||
      has("ITEM_READ");

    return {
      canReadItems: canRead,
      canManageItems: canManage,
    };
  }, [user]);
}
