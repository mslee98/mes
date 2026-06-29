import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { FlatPlanUnitRow } from "../../../domains/production-plan/helpers/detailHelpers";
import {
  invalidatePlanDetailProcessQueries,
  useProcessGateMutations,
} from "../../../domains/production-plan/hooks/useProcessGateMutations";
import {
  detectorElementCodeForApi,
  generateProductSerialDraftRows,
  lineCodeFromOrderLine,
  validateLegacyProductSerialNo,
} from "../../../domains/production-plan/serial/legacyProductSerialNumber";
import { useProductSerialMasters } from "../../../hooks/useProductSerialMasters";
import { notify } from "../../../lib/notify";

type UseProductionPlanDetailProcessGateParams = {
  orderId: string;
  planId: string;
  accessToken: string | null | undefined;
  flatUnits: FlatPlanUnitRow[];
  unitProcessStepCodes: CommonCodeItem[];
  planPartnerCode: string;
  planDeliveryDate: string;
  queryClient: QueryClient;
  onOpenDeliverModal: (
    unit: ProductionPlanUnit,
    purchaseOrderItemId?: number | null
  ) => boolean;
};

export function useProductionPlanDetailProcessGate({
  orderId,
  planId,
  accessToken,
  flatUnits,
  unitProcessStepCodes,
  planPartnerCode,
  planDeliveryDate,
  queryClient,
  onOpenDeliverModal,
}: UseProductionPlanDetailProcessGateParams) {
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

  const openProcessGate = (unit: ProductionPlanUnit) => {
    setGateFailFormOpen(false);
    setGateFailReason("");
    setGateDetectorSerial(String(unit.detectorSerialNo ?? "").trim());
    setGateProductSerialNo(String(unit.serialNo ?? "").trim());
    setGatePendingAttachmentFiles([]);
    setProcessEntryUnit(unit);
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
    processEntryUnit?.serialNo?.trim()
  );

  const gateNeedsProductSerial =
    Boolean(processEntryUnit) &&
    !processEntryUnit?.serialNo?.trim() &&
    processEntryUnit?.currentProcessCode?.trim().toUpperCase() ===
      UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING;

  const { productMetaById, detectorById, isLoading: gateMastersLoading } =
    useProductSerialMasters(
      accessToken ?? undefined,
      gateNeedsProductSerial && !!orderId
    );

  const handleGateGenerateProductSerial = async () => {
    if (!processEntryUnit || !orderId || !accessToken) return;
    const flatRow = flatUnits.find((r) => r.unit.id === processEntryUnit.id);
    if (!flatRow) {
      notify.error("제품 정보를 찾을 수 없습니다.");
      return;
    }
    const customerCode = planPartnerCode.trim();
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
            unitId: flatRow.unit.id,
            lotCode:
              String(flatRow.unit.unitCode ?? "").trim() || flatRow.unit.id,
            lineLabel: flatRow.lineLabel,
            orderLine: flatRow.orderLine,
            detectorElementCode: flatRow.detectorElementCode,
            wavelengthCode: String(flatRow.wavelengthCode ?? "").trim(),
            detectorId: flatRow.detectorId ?? null,
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
    void handleGateGenerateProductSerial();
  }, [
    gateNeedsProductSerial,
    gateMastersLoading,
    processEntryUnit?.id,
    productMetaById.size,
    detectorById.size,
  ]);

  const processEntryFlatRow = useMemo(
    () =>
      processEntryUnit
        ? flatUnits.find((r) => r.unit.id === processEntryUnit.id) ?? null
        : null,
    [flatUnits, processEntryUnit]
  );

  const preparePass = useCallback(async () => {
    if (!processEntryUnit?.id || !accessToken) {
      throw new Error("제품 정보가 없습니다.");
    }
    const unitId = processEntryUnit.id;
    const codeUpper =
      processEntryUnit.currentProcessCode?.trim().toUpperCase() ?? "";
    const flatRow = flatUnits.find((r) => r.unit.id === unitId);
    const hasProductSerial = Boolean(processEntryUnit.serialNo?.trim());
    if (
      codeUpper === UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING &&
      !hasProductSerial
    ) {
      const detectorElementCode = String(
        processEntryUnit.detectorElementCode ?? flatRow?.detectorElementCode ?? ""
      ).trim();
      const wavelengthCode = String(
        processEntryUnit.wavelengthCode ?? flatRow?.wavelengthCode ?? ""
      ).trim();
      if (!detectorElementCode || !wavelengthCode) {
        throw new Error(
          "검출기 소자·파장 정보가 없어 제품 시리얼을 확정할 수 없습니다."
        );
      }
      const serialErr = validateLegacyProductSerialNo(gateProductSerialNo);
      if (serialErr) throw new Error(serialErr);
      const fullSerialNo = gateProductSerialNo.trim();
      const lineCode = flatRow ? lineCodeFromOrderLine(flatRow.orderLine) : "";
      await assignProductSerialsToPlan(
        planId,
        {
          units: [
            {
              unitId,
              serialNo: fullSerialNo,
              detectorElementCode: detectorElementCodeForApi(
                detectorElementCode,
                lineCode
              ),
              wavelengthCode,
              detectorId:
                processEntryUnit.detectorId ?? flatRow?.detectorId ?? null,
            },
          ],
          markPlanCompleted: false,
        },
        accessToken
      );
    }
  }, [
    accessToken,
    flatUnits,
    gateProductSerialNo,
    planId,
    processEntryUnit,
  ]);

  const { passMutation, failMutation, gateSubmitting } = useProcessGateMutations({
    accessToken,
    processEntryUnit,
    unitProcessStepCodes,
    gateDetectorSerial,
    gateFailReason,
    gatePendingAttachmentFiles,
    preparePass,
    resolvePurchaseOrderItemId: (unitId) =>
      flatUnits.find((r) => r.unit.id === unitId)?.purchaseOrderItemId,
    invalidateAfterMutation: (historyUnitId) =>
      invalidatePlanDetailProcessQueries(queryClient, planId, orderId, historyUnitId),
    onPassSuccess: async ({ unit, codeUpper, purchaseOrderItemId }) => {
      setGateFailFormOpen(false);
      setGatePendingAttachmentFiles([]);
      if (
        !unit.isDelivered &&
        (unit.isDeliveryReady === true ||
          codeUpper === UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER)
      ) {
        closeProcessGate();
        onOpenDeliverModal(unit, purchaseOrderItemId);
      } else {
        setProcessEntryUnit(unit);
        setGateDetectorSerial(String(unit.detectorSerialNo ?? "").trim());
        setGateProductSerialNo(String(unit.serialNo ?? "").trim());
      }
    },
    onFailSuccess: async ({ unit }) => {
      setGateFailFormOpen(false);
      setGateFailReason("");
      setGatePendingAttachmentFiles([]);
      setProcessEntryUnit(unit);
      setGateDetectorSerial(String(unit.detectorSerialNo ?? "").trim());
      setGateProductSerialNo(String(unit.serialNo ?? "").trim());
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
