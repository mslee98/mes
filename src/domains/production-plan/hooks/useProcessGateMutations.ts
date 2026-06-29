import { useMutation } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { CommonCodeItem } from "../../../api/commonCode";
import {
  UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING,
} from "../../../api/commonCode";
import {
  processProductionPlanUnitFail,
  processProductionPlanUnitPass,
  uploadProductionPlanUnitProcessRecordFiles,
  type ProductionPlanUnit,
} from "../../../api/purchaseOrder";
import { labelForProcessCode } from "../../../domains/production-plan/labels/processLabels";
import { notify } from "../../../lib/notify";
import type { ProcessGateSubmitting } from "../../../components/production-plan/ProcessPipelineStepper";
import { invalidateProductionPlanUnitListQueries } from "../queries/invalidateUnitListQueries";

export type ProcessGatePassResult = {
  unitId: string;
  unit: ProductionPlanUnit;
  codeUpper: string;
  attachmentUploadError: string | null;
  purchaseOrderItemId?: number | null;
};

export type ProcessGateFailResult = {
  unitId: string;
  unit: ProductionPlanUnit;
  attachmentUploadError: string | null;
};

type UseProcessGateMutationsParams = {
  accessToken: string | null | undefined;
  processEntryUnit: ProductionPlanUnit | null | undefined;
  unitProcessStepCodes: CommonCodeItem[];
  gateDetectorSerial: string;
  gateFailReason: string;
  gatePendingAttachmentFiles: File[];
  /** PASS API 호출 전 시리얼 확정 등 페이지 전용 준비 */
  preparePass?: () => Promise<void>;
  invalidateAfterMutation: (unitId?: string | null) => Promise<void>;
  onPassSuccess?: (result: ProcessGatePassResult) => void | Promise<void>;
  onFailSuccess?: (result: ProcessGateFailResult) => void | Promise<void>;
  /** PlanDetail: flatRow에서 PO item id 전달 */
  resolvePurchaseOrderItemId?: (unitId: string) => number | null | undefined;
};

async function uploadPendingGateFiles({
  unitId,
  recordId,
  files,
  accessToken,
}: {
  unitId: string;
  recordId: string | number | null | undefined;
  files: File[];
  accessToken: string;
}): Promise<string | null> {
  if (files.length === 0) return null;
  const rid = String(recordId ?? "").trim();
  if (!rid) {
    return "공정 처리 첨부를 연결할 이력 정보를 찾지 못했습니다.";
  }
  try {
    await uploadProductionPlanUnitProcessRecordFiles(
      unitId,
      rid,
      files,
      accessToken
    );
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "첨부 업로드에 실패했습니다.";
  }
}

export function useProcessGateMutations({
  accessToken,
  processEntryUnit,
  unitProcessStepCodes,
  gateDetectorSerial,
  gateFailReason,
  gatePendingAttachmentFiles,
  preparePass,
  invalidateAfterMutation,
  onPassSuccess,
  onFailSuccess,
  resolvePurchaseOrderItemId,
}: UseProcessGateMutationsParams) {
  const passMutation = useMutation({
    mutationFn: async (): Promise<ProcessGatePassResult> => {
      if (!processEntryUnit?.id) throw new Error("제품 정보가 없습니다.");
      if (!accessToken) {
        throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      }
      const unitId = processEntryUnit.id;
      const code = processEntryUnit.currentProcessCode?.trim() ?? "";
      const name =
        labelForProcessCode(processEntryUnit.currentProcessCode, unitProcessStepCodes) ||
        code;
      if (!code || !name) throw new Error("현재 공정 정보가 없습니다.");

      const codeUpper = code.toUpperCase();
      const detectorSerialNo = gateDetectorSerial.trim();
      if (
        codeUpper === UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING &&
        !detectorSerialNo
      ) {
        throw new Error("검출기 시리얼 넘버를 입력하세요.");
      }

      if (preparePass) {
        await preparePass();
      }

      const result = await processProductionPlanUnitPass(
        unitId,
        {
          processCode: code,
          processName: name,
          detectorSerialNo: detectorSerialNo || undefined,
        },
        accessToken
      );
      const attachmentUploadError = await uploadPendingGateFiles({
        unitId,
        recordId: result.processRecord?.id,
        files: gatePendingAttachmentFiles,
        accessToken,
      });
      return {
        unitId,
        unit: result.unit,
        codeUpper,
        attachmentUploadError,
        purchaseOrderItemId: resolvePurchaseOrderItemId?.(unitId),
      };
    },
    onSuccess: async (result) => {
      notify.success("PASS 처리되었습니다.");
      if (result.attachmentUploadError) {
        notify.error(result.attachmentUploadError);
      }
      await onPassSuccess?.(result);
      await invalidateAfterMutation(result.unitId);
    },
    onError: (e: Error) => {
      void invalidateAfterMutation(processEntryUnit?.id ?? null);
      notify.error(e.message || "PASS 처리에 실패했습니다.");
    },
  });

  const failMutation = useMutation({
    mutationFn: async (): Promise<ProcessGateFailResult> => {
      if (!processEntryUnit?.id) throw new Error("제품 정보가 없습니다.");
      if (!accessToken) {
        throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      }
      const unitId = processEntryUnit.id;
      const code = processEntryUnit.currentProcessCode?.trim() ?? "";
      const name =
        labelForProcessCode(processEntryUnit.currentProcessCode, unitProcessStepCodes) ||
        code;
      const reason = gateFailReason.trim();
      if (!code || !name) throw new Error("현재 공정 정보가 없습니다.");
      if (!reason) throw new Error("불합격 사유를 입력하세요.");

      const result = await processProductionPlanUnitFail(
        unitId,
        { processCode: code, processName: name, failReason: reason },
        accessToken
      );
      const attachmentUploadError = await uploadPendingGateFiles({
        unitId,
        recordId: result.processRecord?.id,
        files: gatePendingAttachmentFiles,
        accessToken,
      });
      return {
        unitId,
        unit: result.unit,
        attachmentUploadError,
      };
    },
    onSuccess: async (result) => {
      notify.success("FAIL 처리되었습니다.");
      if (result.attachmentUploadError) {
        notify.error(result.attachmentUploadError);
      }
      await onFailSuccess?.(result);
      await invalidateAfterMutation(result.unitId);
    },
    onError: (e: Error) => {
      void invalidateAfterMutation(processEntryUnit?.id ?? null);
      notify.error(e.message || "FAIL 처리에 실패했습니다.");
    },
  });

  const gateSubmitting: ProcessGateSubmitting = passMutation.isPending
    ? "pass"
    : failMutation.isPending
      ? "fail"
      : null;

  return {
    passMutation,
    failMutation,
    gateSubmitting,
  };
}

/** UnitDetail 전용 invalidate */
export async function invalidateUnitDetailProcessQueries(
  queryClient: QueryClient,
  unitId: string,
  historyUnitId?: string | null
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnit", unitId] }),
    queryClient.invalidateQueries({ queryKey: ["rmaRequests", "byUnit", unitId] }),
    invalidateProductionPlanUnitListQueries(queryClient),
  ]);
  const u = historyUnitId?.trim();
  if (u) {
    await queryClient.invalidateQueries({
      queryKey: ["productionPlanUnitProcessRecords", u],
      refetchType: "all",
    });
  }
}

/** ProductionPlanDetail 전용 invalidate */
export async function invalidatePlanDetailProcessQueries(
  queryClient: QueryClient,
  planId: string,
  orderId: string,
  historyUnitId?: string | null
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["productionPlan", planId] }),
    queryClient.invalidateQueries({
      queryKey: ["purchaseOrderProductionPlans", orderId],
    }),
    invalidateProductionPlanUnitListQueries(queryClient),
  ]);
  const u = historyUnitId?.trim();
  if (!u) return;
  await queryClient.invalidateQueries({
    queryKey: ["productionPlanUnitProcessRecords", u],
    refetchType: "all",
  });
}
