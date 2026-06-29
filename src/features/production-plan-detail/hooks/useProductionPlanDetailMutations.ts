import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  createDelivery,
  linkUnitsToDeliveryItem,
  splitProductionPlan,
  uploadProductionPlanUnitProcessRecordFiles,
  type ProductionPlanUnit,
  type SplitProductionPlanPayload,
} from "../../../api/purchaseOrder";
import { notify } from "../../../lib/notify";
import { deliveryManagerUserIdFromSelect } from "../helpers/splitHelpers";
import type { SplitModalContext } from "../helpers/splitHelpers";
import {
  buildMinimalDeliveryCreatePayloadFromPlanUnit,
  findProductDeliveryItemId,
} from "../../../domains/production-plan/helpers/registerFromPlanUnit";

type DeliverModalState = {
  unit: ProductionPlanUnit;
  purchaseOrderItemId: number;
} | null;

type UseProductionPlanDetailMutationsParams = {
  orderId: string;
  planId: string;
  accessToken: string | null | undefined;
  deliverModal: DeliverModalState;
  deliverDate: string;
  deliverRemark: string;
  onDeliverSuccess: () => void;
  splitModalContext: SplitModalContext | null;
  splitDeliveryDate: string;
  splitPlannedDeliveryDate: string;
  splitDeliveryManagerUserSelectValue: string;
  splitTitle: string;
  splitRemark: string;
  onSplitSuccess: (newPlanId?: string) => void;
};

export function useProductionPlanDetailMutations({
  orderId,
  planId,
  accessToken,
  deliverModal,
  deliverDate,
  deliverRemark,
  onDeliverSuccess,
  splitModalContext,
  splitDeliveryDate,
  splitPlannedDeliveryDate,
  splitDeliveryManagerUserSelectValue,
  splitTitle,
  splitRemark,
  onSplitSuccess,
}: UseProductionPlanDetailMutationsParams) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deliverMutation = useMutation({
    mutationFn: async () => {
      if (!deliverModal || !accessToken) {
        throw new Error("로그인 또는 납품 정보가 없습니다.");
      }
      if (!orderId) throw new Error("발주 경로가 올바르지 않습니다.");
      const payload = buildMinimalDeliveryCreatePayloadFromPlanUnit({
        deliveryDate: deliverDate,
        remark: deliverRemark,
        purchaseOrderItemId: deliverModal.purchaseOrderItemId,
        unit: deliverModal.unit,
      });
      const delivery = await createDelivery(orderId, payload, accessToken);
      const deliveryItemId = findProductDeliveryItemId(
        delivery,
        deliverModal.purchaseOrderItemId
      );
      if (deliveryItemId == null) {
        throw new Error(
          "납품은 등록되었으나 응답에서 품목 라인 id를 찾지 못했습니다. 발주 상세에서 제품 연결을 시도해 주세요."
        );
      }
      await linkUnitsToDeliveryItem(
        deliveryItemId,
        { unitIds: [deliverModal.unit.id] },
        accessToken
      );
    },
    onSuccess: () => {
      notify.success("납품이 등록되었고 계획 제품이 연결되었습니다.");
      onDeliverSuccess();
      void queryClient.invalidateQueries({ queryKey: ["productionPlan", planId] });
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderProductionPlans", orderId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderDeliveries", orderId],
      });
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrder", orderId] });
    },
    onError: (e: Error) =>
      notify.error(e.message || "납품 등록에 실패했습니다."),
  });

  const splitMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      if (!splitModalContext) throw new Error("분할 정보가 없습니다.");
      const unitIds = splitModalContext.unitIds;
      if (unitIds.length === 0) {
        throw new Error("옮길 제품을 선택하세요.");
      }

      const body: SplitProductionPlanPayload = { unitIds };
      const d = splitDeliveryDate.trim();
      if (d) body.deliveryDate = d;
      const p = splitPlannedDeliveryDate.trim();
      if (p) body.plannedDeliveryDate = p;

      const mgrId = deliveryManagerUserIdFromSelect(
        splitDeliveryManagerUserSelectValue
      );
      if (mgrId != null) {
        body.productionManagerId = mgrId;
      }
      const t = splitTitle.trim();
      if (t) body.title = t;
      const r = splitRemark.trim();
      if (r) body.remark = r;

      return splitProductionPlan(orderId, body, accessToken);
    },
    onSuccess: (data) => {
      notify.success("새 생산 계획으로 분할되었습니다.");
      const newPlanId = data.plan?.id?.trim();
      onSplitSuccess(newPlanId);
      void queryClient.invalidateQueries({ queryKey: ["productionPlan", planId] });
      if (newPlanId) {
        void queryClient.invalidateQueries({
          queryKey: ["productionPlan", newPlanId],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderProductionPlans", orderId],
      });
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrder", orderId] });
      if (newPlanId) {
        navigate(`/order/${orderId}/plan/${newPlanId}`);
      }
    },
    onError: (e: Error) =>
      notify.error(e.message || "생산 계획 분할에 실패했습니다."),
  });

  const uploadProcessRecordFilesMutation = useMutation({
    mutationFn: async ({
      unitId,
      recordId,
      files,
    }: {
      unitId: string;
      recordId: string;
      files: File[];
    }) => {
      await uploadProductionPlanUnitProcessRecordFiles(
        unitId,
        recordId,
        files,
        accessToken!
      );
      return { unitId, recordId };
    },
    onSuccess: async ({ unitId }) => {
      notify.success("공정 이력 첨부를 업로드했습니다.");
      await queryClient.invalidateQueries({
        queryKey: ["productionPlanUnitProcessRecords", unitId],
        refetchType: "all",
      });
    },
    onError: (e: Error) => {
      notify.error(e.message || "공정 이력 첨부 업로드에 실패했습니다.");
    },
  });

  return {
    deliverMutation,
    splitMutation,
    uploadProcessRecordFilesMutation,
  };
}
