import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getDeliveryPlan,
  getProductionPlanUnitById,
  getProductionPlanUnitProcessRecords,
  getPurchaseOrder,
} from "../../../api/purchaseOrder";
import { getRmaRequests } from "../../../api/rma";
import { getUsers } from "../../../api/user";
import { buildProcessStepCodesForPlanUnitRow } from "../helpers/detailHelpers";
import {
  customerCodeForUnitDetail,
  findPurchaseOrderItemForUnit,
  flatRowFromUnitDetail,
  planUnitForDeliveryPayload,
  productionPlanUnitFromDetail,
} from "../mappers/unitMappers";
import {
  canOpenUnitDetailDeliver,
  getUnitDetailDeliveryHint,
  isResidualUndeliveredFromCompletedPlan,
  type UnitDetailDeliveryContext,
} from "../../delivery/policy/unitDetailDeliveryPolicy";
import type { CommonCodeItem } from "../../../api/commonCode";
import { buildUnitDetailTabOptions } from "../../../components/unit/unitDetailTabTypes";

const IN_PROGRESS_RMA_STATUSES = [
  "RECEIVED",
  "INSPECTING",
  "REPAIRING",
  "RETESTING",
] as const;

type UseUnitDetailQueriesParams = {
  unitId: string;
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
  canReadDelivery: boolean;
  canReadRma: boolean;
  canCreateDelivery: boolean;
  unitProcessStepCodes: CommonCodeItem[];
};

export function useUnitDetailQueries({
  unitId,
  accessToken,
  isAuthLoading,
  canReadDelivery,
  canReadRma,
  canCreateDelivery,
  unitProcessStepCodes,
}: UseUnitDetailQueriesParams) {
  const {
    data: unit,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["productionPlanUnit", unitId],
    queryFn: () => getProductionPlanUnitById(accessToken!, unitId),
    enabled: !!accessToken && !isAuthLoading && !!unitId && canReadDelivery,
  });

  const { data: usersForOperator = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const operatorUserOptions = useMemo(
    () =>
      usersForOperator
        .filter((u) => u.isActive !== false)
        .map((u) => ({
          value: String(u.id),
          label: `${u.name} (${u.employeeNo})`,
        })),
    [usersForOperator]
  );

  const orderId = String(unit?.order?.orderId ?? "").trim();
  const planId = String(unit?.plan?.planId ?? "").trim();
  const purchaseOrderItemId = unit?.item?.purchaseOrderItemId;
  const deliveryPlanId = String(unit?.deliveryPlanId ?? "").trim();

  const { data: linkedDeliveryPlan } = useQuery({
    queryKey: ["deliveryPlan", deliveryPlanId, "unitDetail"],
    queryFn: () => getDeliveryPlan(deliveryPlanId, accessToken!),
    enabled: Boolean(
      accessToken &&
        !isAuthLoading &&
        unit?.isInDeliveryPlan === true &&
        deliveryPlanId
    ),
  });

  const deliveryPlanStatus = linkedDeliveryPlan?.status ?? null;

  const deliveryCtx = useMemo((): UnitDetailDeliveryContext => {
    if (!unit) return {};
    return {
      isInDeliveryPlan: unit.isInDeliveryPlan === true,
      isDelivered: unit.isDelivered === true,
      isDeliveryReady: unit.isDeliveryReady === true,
      deliveryPlanStatus,
    };
  }, [unit, deliveryPlanStatus]);

  const { data: purchaseOrder } = useQuery({
    queryKey: ["purchaseOrder", orderId, "unitDetail"],
    queryFn: () => getPurchaseOrder(orderId, accessToken!),
    enabled: Boolean(accessToken && !isAuthLoading && orderId),
  });

  const purchaseOrderItem = useMemo(
    () => findPurchaseOrderItemForUnit(purchaseOrder, purchaseOrderItemId),
    [purchaseOrder, purchaseOrderItemId]
  );

  const flatRow = useMemo(
    () => (unit ? flatRowFromUnitDetail(unit, purchaseOrderItem) : null),
    [unit, purchaseOrderItem]
  );

  const processUnit = useMemo(
    () => (unit ? productionPlanUnitFromDetail(unit) : null),
    [unit]
  );

  const deliveryPayloadUnit = useMemo(
    () =>
      processUnit && flatRow
        ? planUnitForDeliveryPayload(processUnit, flatRow)
        : null,
    [processUnit, flatRow]
  );

  const canDeliver = useMemo(
    () =>
      deliveryPayloadUnit
        ? canOpenUnitDetailDeliver({
            canCreateDelivery,
            ctx: deliveryCtx,
            unit: deliveryPayloadUnit,
          })
        : false,
    [canCreateDelivery, deliveryCtx, deliveryPayloadUnit]
  );

  const deliveryHint = useMemo(
    () => getUnitDetailDeliveryHint(deliveryCtx),
    [deliveryCtx]
  );

  const showResidualUndeliveredBadge = useMemo(
    () => isResidualUndeliveredFromCompletedPlan(deliveryCtx),
    [deliveryCtx]
  );

  const visibleStepCodes = useMemo(
    () =>
      flatRow ? buildProcessStepCodesForPlanUnitRow(unitProcessStepCodes, flatRow) : [],
    [flatRow, unitProcessStepCodes]
  );

  const unitCustomerCode = useMemo(
    () => (unit ? customerCodeForUnitDetail(unit, purchaseOrder) : ""),
    [unit, purchaseOrder]
  );

  const { data: processRecords = [] } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", unitId],
    queryFn: () => getProductionPlanUnitProcessRecords(unitId, accessToken!),
    enabled: !!accessToken && !isAuthLoading && !!unitId && canReadDelivery,
  });

  const { data: unitRmaList } = useQuery({
    queryKey: ["rmaRequests", "byUnit", unitId, "summary"],
    queryFn: () =>
      getRmaRequests(accessToken!, {
        productionPlanUnitId: unitId,
        page: 1,
        pageSize: 50,
      }),
    enabled: !!accessToken && !isAuthLoading && !!unitId && canReadRma,
  });

  const hasActiveRma = useMemo(
    () =>
      (unitRmaList?.items ?? []).some((row) =>
        IN_PROGRESS_RMA_STATUSES.includes(
          row.status as (typeof IN_PROGRESS_RMA_STATUSES)[number]
        )
      ),
    [unitRmaList]
  );

  const tabOptions = useMemo(
    () =>
      buildUnitDetailTabOptions({
        processRecordCount: processRecords.length,
        rmaCount: unit?.rmaCount ?? unitRmaList?.items?.length ?? 0,
      }),
    [processRecords.length, unit?.rmaCount, unitRmaList?.items?.length]
  );

  return {
    unit,
    isLoading,
    error,
    isError,
    operatorUserOptions,
    orderId,
    planId,
    purchaseOrderItemId,
    deliveryPlanId,
    deliveryCtx,
    purchaseOrder,
    purchaseOrderItem,
    flatRow,
    processUnit,
    deliveryPayloadUnit,
    canDeliver,
    deliveryHint,
    showResidualUndeliveredBadge,
    visibleStepCodes,
    unitCustomerCode,
    processRecords,
    hasActiveRma,
    tabOptions,
  };
}
