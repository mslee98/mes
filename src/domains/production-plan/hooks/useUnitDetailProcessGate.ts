import { useEffect, useMemo, useState, useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { CommonCodeItem } from "../../../api/commonCode";
import {
  UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING,
  UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER,
} from "../../../api/commonCode";
import {
  assignProductSerialsToPlan,
  type ProductionPlanUnit,
} from "../../../api/purchaseOrder";
import type { FlatPlanUnitRow } from "../helpers/detailHelpers";
import { resolvePlanUnitDetectorFields } from "../helpers/detailHelpers";
import {
  invalidateUnitDetailProcessQueries,
  useProcessGateMutations,
} from "./useProcessGateMutations";
import {
  detectorElementCodeForApi,
  generateProductSerialDraftRows,
  lineCodeFromOrderLine,
  validateLegacyProductSerialNo,
} from "../serial/legacyProductSerialNumber";
import { needsProductSerialAssignment } from "../serial/placeholderProductSerial";
import { useProductSerialMasters } from "../../../hooks/useProductSerialMasters";
import { notify } from "../../../lib/notify";

type UseUnitDetailProcessGateParams = {
  unitId: string;
  orderId: string;
  planId: string;
  accessToken: string | null | undefined;
  processUnit: ProductionPlanUnit | null;
  flatRow: FlatPlanUnitRow | null;
  visibleStepCodes: CommonCodeItem[];
  unitCustomerCode: string;
  planDeliveryDate: string;
  queryClient: QueryClient;
  onPassReadyForDeliver: () => void;
};

export function useUnitDetailProcessGate({
  unitId,
  orderId,
  planId,
  accessToken,
  processUnit,
  flatRow,
  visibleStepCodes,
  unitCustomerCode,
  planDeliveryDate,
  queryClient,
  onPassReadyForDeliver,
}: UseUnitDetailProcessGateParams) {
  const [processEntryUnit, setProcessEntryUnit] =
    useState<ProductionPlanUnit | null>(null);
  const [gateDetectorSerial, setGateDetectorSerial] = useState("");
  const [gateProductSerialNo, setGateProductSerialNo] = useState("");
  const [gateProductSerialGenerating, setGateProductSerialGenerating] =
    useState(false);
  const [gateFailReason, setGateFailReason] = useState("");
  const [gateFailFormOpen, setGateFailFormOpen] = useState(false);
  const [gatePendingAttachmentFiles, setGatePendingAttachmentFiles] = useState<
    File[]
  >([]);

  const openProcessGate = () => {
    if (!processUnit) return;
    setGateFailFormOpen(false);
    setGateFailReason("");
    setGateDetectorSerial(String(processUnit.detectorSerialNo ?? "").trim());
    setGateProductSerialNo(String(processUnit.serialNo ?? "").trim());
    setGatePendingAttachmentFiles([]);
    setProcessEntryUnit(processUnit);
  };

  const closeProcessGate = () => {
    setProcessEntryUnit(null);
    setGateFailFormOpen(false);
    setGateFailReason("");
    setGateDetectorSerial("");
    setGateProductSerialNo("");
    setGateProductSerialGenerating(false);
    setGatePendingAttachmentFiles([]);
  };

  const gateProductSerialAlreadyAssigned = Boolean(
    processEntryUnit?.serialNo?.trim() &&
      !needsProductSerialAssignment(processEntryUnit.serialNo)
  );

  const processEntryFlatRow = useMemo(() => {
    if (!flatRow) return null;
    if (!processEntryUnit) return flatRow;
    return { ...flatRow, unit: processEntryUnit };
  }, [flatRow, processEntryUnit]);

  const gateNeedsProductSerial =
    Boolean(processEntryUnit) &&
    needsProductSerialAssignment(processEntryUnit?.serialNo) &&
    processEntryUnit?.currentProcessCode?.trim().toUpperCase() ===
      UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING;

  const { productMetaById, detectorById, isLoading: gateMastersLoading } =
    useProductSerialMasters(
      accessToken ?? undefined,
      gateNeedsProductSerial && Boolean(orderId)
    );

  const handleGateGenerateProductSerial = async () => {
    if (!accessToken || !processEntryFlatRow || !orderId) {
      notify.error("시리얼 생성에 필요한 정보가 없습니다.");
      return;
    }
    const customerCode = unitCustomerCode;
    if (!customerCode) {
      notify.error("거래처 코드가 없어 시리얼을 생성할 수 없습니다.");
      return;
    }
    setGateProductSerialGenerating(true);
    try {
      const result = await generateProductSerialDraftRows({
        purchaseOrderId: orderId,
        accessToken,
        units: [
          {
            unitId: processEntryFlatRow.unit.id,
            lotCode:
              String(processEntryFlatRow.unit.unitCode ?? "").trim() ||
              processEntryFlatRow.unit.id,
            lineLabel: processEntryFlatRow.lineLabel,
            orderLine: processEntryFlatRow.orderLine,
            detectorElementCode: processEntryFlatRow.detectorElementCode,
            wavelengthCode: String(processEntryFlatRow.wavelengthCode ?? "").trim(),
            detectorId: processEntryFlatRow.detectorId ?? null,
          },
        ],
        productMetaById,
        detectorById,
        deliveryDate: planDeliveryDate,
        customerCode,
      });
      if (!Array.isArray(result)) {
        notify.error(result.error);
        return;
      }
      const first = result[0];
      if (first?.serialNo) {
        setGateProductSerialNo(first.serialNo);
        notify.success("시리얼 번호를 발급했습니다.");
      }
    } finally {
      setGateProductSerialGenerating(false);
    }
  };

  useEffect(() => {
    if (!gateNeedsProductSerial || gateMastersLoading) return;
    if (gateProductSerialNo.trim()) return;
    if (productMetaById.size === 0 || detectorById.size === 0) return;
    if (!processEntryFlatRow?.orderLine?.productId) return;
    if (processEntryFlatRow.detectorId == null) return;
    if (!unitCustomerCode) return;
    void handleGateGenerateProductSerial();
  }, [
    gateNeedsProductSerial,
    gateMastersLoading,
    processEntryUnit?.id,
    productMetaById.size,
    detectorById.size,
    processEntryFlatRow?.orderLine?.productId,
    processEntryFlatRow?.detectorId,
    unitCustomerCode,
  ]);

  const preparePass = useCallback(async () => {
    if (!processEntryUnit?.id || !accessToken || !processEntryFlatRow) {
      throw new Error("제품 정보가 없습니다.");
    }
    const codeUpper = processEntryUnit.currentProcessCode?.trim().toUpperCase() ?? "";
    if (
      codeUpper === UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING &&
      needsProductSerialAssignment(processEntryUnit.serialNo)
    ) {
      const { detectorElementCode, wavelengthCode, detectorId } =
        resolvePlanUnitDetectorFields({
          unit: processEntryUnit,
          orderLine: processEntryFlatRow.orderLine,
          rowOverrides: processEntryFlatRow,
        });
      if (!detectorElementCode || !wavelengthCode) {
        throw new Error("검출기 소자·파장 정보가 없어 제품 시리얼을 확정할 수 없습니다.");
      }
      const serialErr = validateLegacyProductSerialNo(gateProductSerialNo);
      if (serialErr) throw new Error(serialErr);
      if (!planId) throw new Error("생산 계획 정보가 없습니다.");
      await assignProductSerialsToPlan(
        planId,
        {
          units: [
            {
              unitId: processEntryUnit.id,
              serialNo: gateProductSerialNo.trim(),
              detectorElementCode: detectorElementCodeForApi(
                detectorElementCode,
                lineCodeFromOrderLine(processEntryFlatRow.orderLine)
              ),
              wavelengthCode,
              detectorId,
            },
          ],
          markPlanCompleted: false,
        },
        accessToken
      );
    }
  }, [
    accessToken,
    gateProductSerialNo,
    planId,
    processEntryFlatRow,
    processEntryUnit,
  ]);

  const { passMutation, failMutation, gateSubmitting } = useProcessGateMutations({
    accessToken,
    processEntryUnit,
    unitProcessStepCodes: visibleStepCodes,
    gateDetectorSerial,
    gateFailReason,
    gatePendingAttachmentFiles,
    preparePass,
    invalidateAfterMutation: (historyUnitId) =>
      invalidateUnitDetailProcessQueries(queryClient, unitId, historyUnitId),
    onPassSuccess: async ({ unit: nextUnit, codeUpper }) => {
      setGatePendingAttachmentFiles([]);
      setGateFailFormOpen(false);
      if (
        !nextUnit.isDelivered &&
        (nextUnit.isDeliveryReady === true ||
          codeUpper === UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER)
      ) {
        closeProcessGate();
        onPassReadyForDeliver();
      } else {
        setProcessEntryUnit(nextUnit);
        setGateDetectorSerial(String(nextUnit.detectorSerialNo ?? "").trim());
        setGateProductSerialNo(String(nextUnit.serialNo ?? "").trim());
      }
    },
    onFailSuccess: async ({ unit: nextUnit }) => {
      setGateFailFormOpen(false);
      setGateFailReason("");
      setGatePendingAttachmentFiles([]);
      setProcessEntryUnit(nextUnit);
    },
  });

  return {
    processEntryUnit,
    processEntryFlatRow,
    openProcessGate,
    closeProcessGate,
    gateDetectorSerial,
    setGateDetectorSerial,
    gateProductSerialNo,
    setGateProductSerialNo,
    gateProductSerialGenerating,
    gateMastersLoading,
    gateProductSerialAlreadyAssigned,
    gateFailReason,
    setGateFailReason,
    gateFailFormOpen,
    setGateFailFormOpen,
    gatePendingAttachmentFiles,
    setGatePendingAttachmentFiles,
    handleGateGenerateProductSerial,
    passMutation,
    failMutation,
    gateSubmitting,
  };
}
