import { useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { notify } from "../../../lib/notify";
import { parsePositiveIntId } from "../../../lib/parseId";
import type { PurchaseOrderDetail } from "../../../api/purchaseOrder";
import type { AuthUser } from "../../../types/authUser";

export function computeCanEditExistingOrder(
  isNew: boolean,
  order: PurchaseOrderDetail | undefined,
  user: AuthUser | null | undefined
): boolean {
  if (isNew) return true;
  if (!order) return false;
  const authUserId = user
    ? parsePositiveIntId((user as Record<string, unknown>).id)
    : undefined;
  const createdBy = order.createdBy as Record<string, unknown> | undefined;
  const createdById = parsePositiveIntId(createdBy?.id);
  const createdByEmployeeNo = String(
    (createdBy?.employeeNo as string | undefined) ?? ""
  ).trim();
  const authEmployeeNo = String(user?.employeeNo ?? "").trim();
  const isOwnerById =
    createdById == null || (authUserId != null && authUserId === createdById);
  const isOwnerByEmployeeNo =
    createdByEmployeeNo === "" ||
    (authEmployeeNo !== "" && authEmployeeNo === createdByEmployeeNo);
  const isOwner = isOwnerById || isOwnerByEmployeeNo;
  const isPoClosed =
    String(order.status ?? order.orderStatus ?? "").trim() === "PO_CLOSED";
  return isOwner && !isPoClosed;
}

type UseOrderFormEditGuardParams = {
  isNew: boolean;
  orderId: string;
  order: PurchaseOrderDetail | undefined;
  canEditExistingOrder: boolean;
};

export function useOrderFormEditGuard({
  isNew,
  orderId,
  order,
  canEditExistingOrder,
}: UseOrderFormEditGuardParams) {
  const navigate = useNavigate();
  const blockedEditToastShownRef = useRef(false);

  useEffect(() => {
    if (isNew || !order) return;
    if (canEditExistingOrder) return;
    if (!blockedEditToastShownRef.current) {
      notify.error("작성자만 수정할 수 있으며, 종결된 발주는 수정할 수 없습니다.");
      blockedEditToastShownRef.current = true;
    }
    navigate(`/order/${orderId}`, { replace: true });
  }, [isNew, order, canEditExistingOrder, navigate, orderId]);
}

export function useCanEditExistingOrder(
  isNew: boolean,
  order: PurchaseOrderDetail | undefined,
  user: AuthUser | null | undefined
) {
  return useMemo(
    () => computeCanEditExistingOrder(isNew, order, user),
    [isNew, order, user]
  );
}
