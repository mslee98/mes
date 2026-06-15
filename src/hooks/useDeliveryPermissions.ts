import { useMemo } from "react";
import { useAuth } from "./useAuth";

/**
 * JWT `permissions` 기준 납품·Unit 조회 권한 (`delivery.read`).
 * permissions/roles가 없으면 개발 편의상 허용.
 */
export function useDeliveryPermissions(): {
  canReadDelivery: boolean;
  canCreateDelivery: boolean;
} {
  const { user } = useAuth();

  return useMemo(() => {
    const raw = user as { permissions?: string[]; roles?: string[] } | null;
    const perms = raw?.permissions ?? [];
    const roles = raw?.roles ?? [];

    if (!perms.length && !roles.length) {
      return { canReadDelivery: true, canCreateDelivery: true };
    }

    const has = (p: string) => perms.includes(p) || roles.includes(p);
    const admin =
      has("ADMIN") || roles.some((r) => String(r).toUpperCase() === "ADMIN");

    const canRead =
      admin ||
      has("delivery.read") ||
      has("DELIVERY_READ") ||
      has("delivery.manage") ||
      has("DELIVERY_MANAGE");

    const canCreate =
      admin ||
      has("delivery.create") ||
      has("DELIVERY_CREATE") ||
      has("delivery.manage") ||
      has("DELIVERY_MANAGE");

    return { canReadDelivery: canRead, canCreateDelivery: canCreate };
  }, [user]);
}
