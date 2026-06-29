import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPurchaseOrder,
  getPurchaseOrderFiles,
  getDeliveries,
  getPurchaseOrderProductionPlans,
  getProductionPlanUnits,
  aggregateDeliveredQtyByOrderItemId,
  type ProductionPlanUnitTab,
  type PurchaseOrderDetail,
  type PurchaseOrderItem,
  type Delivery,
} from "../../../api/purchaseOrder";
import { COMMON_CODE_GROUP_LOT_YEAR_CODE } from "../../../api/commonCode";
import { getUsers } from "../../../api/user";
import {
  getOrganizationTree,
  flattenOrganizationUnitsForSelect,
} from "../../../api/organization";
import { useCountryCodes } from "../../../hooks/useCountryCodes";
import { useCommonCodesByGroup } from "../../../hooks/useCommonCodesByGroup";
import { parsePositiveIntId } from "../../../lib/parseId";
import { lineItemsToAmountSummaries } from "../../../domains/order/helpers/orderLineAmountSummary";
import {
  aggregateProductionPlanQtyByOrderItemId,
  aggregateProductionUnitQtyByOrderItemId,
  mergeProductionRegisteredQtyByOrderItemId,
} from "../../../domains/production-plan/helpers/aggregateRegisteredQty";
import type { AuthUser } from "../../../types/authUser";

const PRODUCTION_UNIT_QTY_FETCH_PAGE_SIZE = 500;
const PRODUCTION_UNIT_TABS_FOR_QTY = [
  "WAITING",
  "IN_PROGRESS",
  "COMPLETED",
  "DELAYED",
] as const satisfies readonly ProductionPlanUnitTab[];

type UseOrderDetailQueriesParams = {
  orderId: string;
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
  authUser: AuthUser | null | undefined;
  deliveryModalOpen: boolean;
};

export function useOrderDetailQueries({
  orderId,
  accessToken,
  isAuthLoading,
  authUser,
  deliveryModalOpen,
}: UseOrderDetailQueriesParams) {
  const id = orderId;

  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => getPurchaseOrder(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  const { data: files = [] } = useQuery({
    queryKey: ["purchaseOrderFiles", id],
    queryFn: () => getPurchaseOrderFiles(id, accessToken!),
    enabled: !!accessToken && id !== "",
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["purchaseOrderDeliveries", id],
    queryFn: () => getDeliveries(id, accessToken!),
    enabled: !!accessToken && id !== "",
  });

  const { data: poProductionPlans = [] } = useQuery({
    queryKey: ["purchaseOrderProductionPlans", id],
    queryFn: () => getPurchaseOrderProductionPlans(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  const nextProductionPlanSeq = useMemo(
    () => Math.max(0, ...poProductionPlans.map((p) => p.planSeq ?? 0)) + 1,
    [poProductionPlans]
  );

  const deliveredByOrderItemId = useMemo(
    () => aggregateDeliveredQtyByOrderItemId(deliveries as Delivery[]),
    [deliveries]
  );

  const { data: orderProductionUnitRows = [] } = useQuery({
    queryKey: ["productionPlanUnits", id, "byOrderForQty"],
    queryFn: async () => {
      const results = await Promise.all(
        PRODUCTION_UNIT_TABS_FOR_QTY.map((tab) =>
          getProductionPlanUnits(accessToken!, {
            tab,
            orderId: id,
            page: 1,
            pageSize: PRODUCTION_UNIT_QTY_FETCH_PAGE_SIZE,
          })
        )
      );
      return results.flatMap((r) => r.items);
    },
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  const registeredByOrderItemId = useMemo(
    () =>
      mergeProductionRegisteredQtyByOrderItemId(
        aggregateProductionPlanQtyByOrderItemId(poProductionPlans),
        aggregateProductionUnitQtyByOrderItemId(orderProductionUnitRows)
      ),
    [poProductionPlans, orderProductionUnitRows]
  );

  const { countryCodes } = useCountryCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const { data: lotYearCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_LOT_YEAR_CODE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && deliveryModalOpen }
  );

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const currentUserId = useMemo(() => {
    if (!authUser) return undefined;
    const fromAuth = parsePositiveIntId(
      (authUser as Record<string, unknown>).id
    );
    if (fromAuth !== undefined) return fromAuth;
    const row = users.find((u) => u.employeeNo === authUser.employeeNo);
    return row?.id;
  }, [authUser, users]);

  const { data: orgTree = [] } = useQuery({
    queryKey: ["organizationTree"],
    queryFn: () => getOrganizationTree(accessToken ?? undefined),
    enabled: !!accessToken && !isAuthLoading,
  });

  const departmentOptionsFromTree = useMemo(
    () => flattenOrganizationUnitsForSelect(orgTree),
    [orgTree]
  );

  const orderLineSummaries = useMemo(() => {
    if (!order) return [];
    const d = order as PurchaseOrderDetail;
    return lineItemsToAmountSummaries(
      d.orderItems ?? d.items ?? [],
      d.currencyCode ?? "KRW"
    );
  }, [order]);

  const orderLines = useMemo(
    () =>
      ((order as PurchaseOrderDetail | undefined)?.orderItems ??
        (order as PurchaseOrderDetail | undefined)?.items ??
        []) as PurchaseOrderItem[],
    [order]
  );

  return {
    order,
    orderLoading,
    orderError,
    files,
    deliveries,
    poProductionPlans,
    nextProductionPlanSeq,
    deliveredByOrderItemId,
    registeredByOrderItemId,
    countryCodes,
    lotYearCodes,
    users,
    currentUserId,
    orgTree,
    departmentOptionsFromTree,
    orderLineSummaries,
    orderLines,
  };
}
