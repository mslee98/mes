import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDelivery,
  linkUnitsToDeliveryItem,
  uploadProductionPlanUnitProcessRecordFiles,
  type ProductionPlanUnit,
} from "../../../api/purchaseOrder";
import type { FlatPlanUnitRow } from "../helpers/detailHelpers";
import {
  buildMinimalDeliveryCreatePayloadFromPlanUnit,
  findProductDeliveryItemId,
} from "../helpers/registerFromPlanUnit";
import { planUnitForDeliveryPayload } from "../mappers/unitMappers";
import { invalidateUnitDetailProcessQueries } from "./useProcessGateMutations";
import { invalidateDeliveryPlanListQueries } from "../../../domains/delivery/queries/invalidateDeliveryPlanListQueries";
import { notify } from "../../../lib/notify";
import { processRecordUploadKey } from "../../../features/production-plan-detail/helpers/processRecordUploadKey";

type UseUnitDetailMutationsParams = {
  unitId: string;
  orderId: string;
  deliveryPlanId: string;
  accessToken: string | null | undefined;
  processUnit: ProductionPlanUnit | null;
  flatRow: FlatPlanUnitRow | null;
  purchaseOrderItemId: number | null | undefined;
  deliverDate: string;
  deliverRemark: string;
  onDeliverSuccess: () => void;
};

export function useUnitDetailMutations({
  unitId,
  orderId,
  deliveryPlanId,
  accessToken,
  processUnit,
  flatRow,
  purchaseOrderItemId,
  deliverDate,
  deliverRemark,
  onDeliverSuccess,
}: UseUnitDetailMutationsParams) {
  const queryClient = useQueryClient();

  const deliverMutation = useMutation({
    mutationFn: async () => {
      if (!processUnit || !accessToken || !orderId) {
        throw new Error("제품 정보가 없습니다.");
      }
      const poItemId = purchaseOrderItemId != null ? Number(purchaseOrderItemId) : NaN;
      if (!Number.isFinite(poItemId) || poItemId <= 0) {
        throw new Error("발주 품목 정보가 없어 납품을 등록할 수 없습니다.");
      }
      const payload = buildMinimalDeliveryCreatePayloadFromPlanUnit({
        deliveryDate: deliverDate,
        remark: deliverRemark,
        purchaseOrderItemId: poItemId,
        unit: planUnitForDeliveryPayload(processUnit, flatRow!),
      });
      const delivery = await createDelivery(orderId, payload, accessToken);
      const deliveryItemId = findProductDeliveryItemId(delivery, poItemId);
      if (deliveryItemId == null) {
        throw new Error("납품 품목 라인을 찾지 못했습니다.");
      }
      await linkUnitsToDeliveryItem(
        deliveryItemId,
        { unitIds: [processUnit.id] },
        accessToken
      );
    },
    onSuccess: async () => {
      notify.success("납품이 등록되었습니다.");
      onDeliverSuccess();
      await invalidateUnitDetailProcessQueries(queryClient, unitId, unitId);
      if (orderId) {
        void queryClient.invalidateQueries({ queryKey: ["purchaseOrder", orderId] });
        void invalidateDeliveryPlanListQueries(queryClient);
        void queryClient.invalidateQueries({ queryKey: ["deliveries"] });
        if (deliveryPlanId) {
          void queryClient.invalidateQueries({
            queryKey: ["deliveryPlan", deliveryPlanId],
          });
        }
      }
    },
    onError: (e: Error) => notify.error(e.message || "납품 등록에 실패했습니다."),
  });

  const handleUploadProcessRecordFiles = async (
    recordUnitId: string,
    recordId: string,
    files: File[],
    setUploadingKey: (key: string | null) => void
  ) => {
    const key = processRecordUploadKey(recordUnitId, recordId);
    setUploadingKey(key);
    try {
      await uploadProductionPlanUnitProcessRecordFiles(
        recordUnitId,
        recordId,
        files,
        accessToken!
      );
      notify.success("첨부를 업로드했습니다.");
      await invalidateUnitDetailProcessQueries(queryClient, recordUnitId, recordUnitId);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "첨부 업로드에 실패했습니다.");
    } finally {
      setUploadingKey(null);
    }
  };

  return {
    deliverMutation,
    handleUploadProcessRecordFiles,
  };
}
