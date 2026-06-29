import { useMemo } from "react";
import { normalizeCurrencyCode } from "../../../lib/format/formatCurrency";
import type { PurchaseOrderDetail, PurchaseOrderItem } from "../../../api/purchaseOrder";
import type { EmployeeDirectoryItem, UserItem } from "../../../api/user";
import type { OrganizationUnitNode } from "../../../api/organization";
import type { RepresentativeProduct } from "../../../api/products";
import type { AuthUser } from "../../../types/authUser";
import { useOrderFormHeaderState } from "./useOrderFormHeaderState";
import { useOrderFormLineState } from "./useOrderFormLineState";
import {
  useCanEditExistingOrder,
  useOrderFormEditGuard,
} from "../utils/orderFormPermissions";

type UseOrderFormStateParams = {
  isNew: boolean;
  orderId: string;
  order: PurchaseOrderDetail | undefined;
  resolvedOrderLineItems: PurchaseOrderItem[];
  employeeDirectory: EmployeeDirectoryItem[];
  usersForRequester: UserItem[];
  organizationTree: OrganizationUnitNode[];
  productList: RepresentativeProduct[];
  firstUnitValue: string;
  purchaseOrderTypeCodes: { code: string; name?: string }[];
  purchaseOrderStatusCodes: { code: string; name?: string }[];
  user: AuthUser | null | undefined;
};

export function useOrderFormState(params: UseOrderFormStateParams) {
  const canEditExistingOrder = useCanEditExistingOrder(
    params.isNew,
    params.order,
    params.user
  );

  useOrderFormEditGuard({
    isNew: params.isNew,
    orderId: params.orderId,
    order: params.order,
    canEditExistingOrder,
  });

  const persistedCurrency = normalizeCurrencyCode(params.order?.currencyCode) || "KRW";

  const line = useOrderFormLineState({
    isNew: params.isNew,
    order: params.order,
    resolvedOrderLineItems: params.resolvedOrderLineItems,
    productList: params.productList,
    firstUnitValue: params.firstUnitValue,
    orderCurrencyCode: persistedCurrency,
    exchangeRateCurrencyCode: persistedCurrency,
    canEditExistingOrder,
  });

  const header = useOrderFormHeaderState({
    isNew: params.isNew,
    order: params.order,
    items: line.items,
    employeeDirectory: params.employeeDirectory,
    usersForRequester: params.usersForRequester,
    organizationTree: params.organizationTree,
    productList: params.productList,
    purchaseOrderTypeCodes: params.purchaseOrderTypeCodes,
    purchaseOrderStatusCodes: params.purchaseOrderStatusCodes,
    user: params.user,
  });

  const isDirty = useMemo(
    () => header.isHeaderDirty || line.isLineDirty,
    [header.isHeaderDirty, line.isLineDirty]
  );

  return {
    ...header,
    ...line,
    orderCurrencyCode: header.orderCurrencyCode,
    exchangeRateCurrencyCode: header.exchangeRateCurrencyCode,
    canEditExistingOrder,
    isDirty,
  };
}
