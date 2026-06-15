import { useMemo } from "react";
import { useAuth } from "./useAuth";

/**
 * JWT `permissions` 기준 RMA 권한.
 * permissions/roles가 없으면 개발 편의상 모두 허용.
 */
export function useRmaPermissions(): {
  canReadRma: boolean;
  canCreateRma: boolean;
  canUpdateRma: boolean;
} {
  const { user } = useAuth();

  return useMemo(() => {
    const raw = user as { permissions?: string[]; roles?: string[] } | null;
    const perms = raw?.permissions ?? [];
    const roles = raw?.roles ?? [];

    if (!perms.length && !roles.length) {
      return { canReadRma: true, canCreateRma: true, canUpdateRma: true };
    }

    const has = (p: string) => perms.includes(p) || roles.includes(p);
    const admin =
      has("ADMIN") || roles.some((r) => String(r).toUpperCase() === "ADMIN");

    const canUpdate = admin || has("rma.update") || has("RMA_UPDATE");
    const canCreate = admin || canUpdate || has("rma.create") || has("RMA_CREATE");
    const canRead =
      canCreate ||
      canUpdate ||
      admin ||
      has("rma.read") ||
      has("RMA_READ");

    return {
      canReadRma: canRead,
      canCreateRma: canCreate,
      canUpdateRma: canUpdate,
    };
  }, [user]);
}
