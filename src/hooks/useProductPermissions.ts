import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * JWT `permissions` 기준. 없으면 조회·관리 모두 허용으로 간주.
 */
export function useProductPermissions(): {
  canReadProducts: boolean;
  canManageProducts: boolean;
} {
  const { user } = useAuth();

  return useMemo(() => {
    const raw = user as { permissions?: string[]; roles?: string[] } | null;
    const perms = raw?.permissions ?? [];
    const roles = raw?.roles ?? [];

    if (!perms.length && !roles.length) {
      return { canReadProducts: true, canManageProducts: true };
    }

    const has = (p: string) => perms.includes(p) || roles.includes(p);
    const admin =
      has("ADMIN") || roles.some((r) => String(r).toUpperCase() === "ADMIN");

    const canManage =
      admin || has("product.manage") || has("PRODUCT_MANAGE");
    const canRead =
      canManage ||
      has("product.read") ||
      has("PRODUCT_READ");

    return {
      canReadProducts: canRead,
      canManageProducts: canManage,
    };
  }, [user]);
}
