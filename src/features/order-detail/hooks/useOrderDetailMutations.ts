import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDelivery,
  createProductionPlan,
  getProductionPlan,
  issueProductionPlanLotUnits,
  receivePurchaseOrder,
  type Delivery,
  type DeliveryCreatePayload,
  type IssueLotUnitsPayload,
  type ProductionPlan,
  type ProductionPlanCreatePayload,
} from "../../../api/purchaseOrder";
import type { ProductionPlanItemInput } from "../../../domains/production-plan/helpers/distributeItems";
import { invalidateProductionPlanUnitListQueries } from "../../../domains/production-plan/queries/invalidateUnitListQueries";
import { mutationErrorNotify } from "../../../lib/api/mutationOnError";
import { notify } from "../../../lib/notify";

export type OrderDetailDeliveryLotPreviewRow = {
  key: string;
  orderItemId: number;
  lineLabel: string;
  offset: number;
  unitCode: string;
  operatorUserId: string;
};

export type OrderDetailDeliveryMutationVars = {
  deliveryPayload?: DeliveryCreatePayload;
  productionPlanPayload?: ProductionPlanCreatePayload;
  planDraftItems?: ProductionPlanItemInput[];
  lotPreviewRows?: OrderDetailDeliveryLotPreviewRow[];
  purpose: "actual" | "plan";
};

function deliveryManagerUserIdFromSelect(selectValue: string): number | null {
  const raw = String(selectValue ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type UseOrderDetailMutationsParams = {
  orderId: string;
  accessToken: string | null | undefined;
  onReceiveSuccess?: () => void;
  onDeliverySuccess?: (
    data: ProductionPlan | Delivery,
    vars: OrderDetailDeliveryMutationVars
  ) => void;
};

export function useOrderDetailMutations({
  orderId,
  accessToken,
  onReceiveSuccess,
  onDeliverySuccess,
}: UseOrderDetailMutationsParams) {
  const queryClient = useQueryClient();

  const receiveMutation = useMutation({
    mutationFn: async () =>
      receivePurchaseOrder(
        orderId,
        { comment: "발주 접수로 인한 종결 처리" },
        accessToken!
      ),
    onSuccess: (updated) => {
      notify.success("접수되어 발주가 종결되었습니다.");
      queryClient.setQueryData(["purchaseOrder", orderId], updated);
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", orderId] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      onReceiveSuccess?.();
    },
    onError: (e) =>
      mutationErrorNotify(e, {
        forbiddenMessage: "발주 접수 권한이 없습니다.",
        fallbackMessage: "접수 처리에 실패했습니다.",
      }),
  });

  const deliveryMutation = useMutation({
    mutationFn: async (vars: OrderDetailDeliveryMutationVars) => {
      if (vars.purpose === "plan") {
        const createdPlan = await createProductionPlan(
          orderId,
          vars.productionPlanPayload!,
          accessToken!
        );
        const plan = await getProductionPlan(createdPlan.id, accessToken!);
        const planDraftItems = vars.planDraftItems ?? [];
        const createdPlanItems = plan.items ?? [];
        const lotIssuePayload: IssueLotUnitsPayload = {
          issuedDate: vars.productionPlanPayload?.deliveryDate?.trim() || undefined,
          items: planDraftItems.map((draftItem) => {
            const createdItem = createdPlanItems.find(
              (item) =>
                Number(item.purchaseOrderItemId ?? NaN) ===
                draftItem.purchaseOrderItemId
            );
            if (createdItem?.id == null) {
              throw new Error(
                `생산 계획 품목을 찾지 못했습니다. (품목 ${draftItem.purchaseOrderItemId})`
              );
            }
            const unitAssignments = (vars.lotPreviewRows ?? [])
              .filter(
                (row) =>
                  row.orderItemId === draftItem.purchaseOrderItemId &&
                  row.operatorUserId.trim() !== ""
              )
              .map((row) => {
                const operatorUserId = deliveryManagerUserIdFromSelect(
                  row.operatorUserId
                );
                return operatorUserId == null
                  ? null
                  : {
                      offset: row.offset,
                      operatorUserId,
                    };
              })
              .filter((row): row is { offset: number; operatorUserId: number } =>
                row != null
              );
            return {
              planItemId: createdItem.id,
              quantity: draftItem.plannedQty,
              ...(unitAssignments.length > 0 ? { unitAssignments } : {}),
            };
          }),
        };
        return issueProductionPlanLotUnits(
          plan.id,
          lotIssuePayload,
          accessToken!
        );
      }
      return createDelivery(orderId, vars.deliveryPayload!, accessToken!);
    },
    onSuccess: (data, vars) => {
      if (vars.purpose === "plan") {
        const plan = data as ProductionPlan;
        notify.success("생산 계획이 등록되고 LOT가 발급되었습니다.");
        const planId = String(plan.id ?? "").trim();
        if (planId) {
          queryClient.setQueryData(["productionPlan", planId], plan);
        }
        void queryClient.invalidateQueries({ queryKey: ["purchaseOrder", orderId] });
        void queryClient.invalidateQueries({
          queryKey: ["purchaseOrderProductionPlans", orderId],
        });
        void invalidateProductionPlanUnitListQueries(queryClient);
        void queryClient.invalidateQueries({ queryKey: ["productionPlans"] });
        void queryClient.invalidateQueries({ queryKey: ["productionPlanTabCounts"] });
        void queryClient.invalidateQueries({
          queryKey: ["productionPlanUnitOverview"],
        });
        onDeliverySuccess?.(plan, vars);
        return;
      }
      const delivery = data as Delivery;
      notify.success("생산 및 시리얼이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderDeliveries", orderId] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", orderId] });
      onDeliverySuccess?.(delivery, vars);
    },
    onError: (e, vars) =>
      mutationErrorNotify(e, {
        forbiddenMessage:
          vars.purpose === "plan"
            ? "생산 계획 등록 권한이 없습니다."
            : "생산/시리얼 등록 권한이 없습니다.",
        fallbackMessage:
          vars.purpose === "plan"
            ? "생산 계획·LOT 발급에 실패했습니다."
            : "생산/시리얼 등록에 실패했습니다.",
      }),
  });

  return {
    receiveMutation,
    deliveryMutation,
  };
}
