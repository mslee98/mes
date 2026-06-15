import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import DetailPageState from "../components/common/DetailPageState";
import LoadingLottie from "../components/common/LoadingLottie";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../hooks/useAuth";
import { useDeliveryPermissions } from "../hooks/useDeliveryPermissions";
import { useRmaPermissions } from "../hooks/useRmaPermissions";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { useProductSerialMasters } from "../hooks/useProductSerialMasters";
import {
  assignProductSerialsToPlan,
  createDelivery,
  getDeliveryPlan,
  getProductionPlanUnitById,
  getProductionPlanUnitProcessRecords,
  getPurchaseOrder,
  linkUnitsToDeliveryItem,
  processProductionPlanUnitFail,
  processProductionPlanUnitPass,
  uploadProductionPlanUnitProcessRecordFiles,
  type ProductionPlanUnit,
} from "../api/purchaseOrder";
import { getRmaRequests } from "../api/rma";
import { getUsers } from "../api/user";
import {
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
  UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING,
  UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER,
  UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING,
} from "../api/commonCode";
import { ProductionPlanUnitEditModal } from "../components/delivery/ProductionPlanUnitEditModal";
import { ProcessGateContextPanel } from "../components/delivery/ProcessGateContextPanel";
import { ProcessModalProductSummary } from "../components/delivery/ProcessModalProductSummary";
import { UnitProcessRecordsTimeline } from "../components/delivery/UnitProcessRecordsTimeline";
import type { ProcessGateSubmitting } from "../components/delivery/ProcessPipelineStepper";
import DatePicker from "../components/form/date-picker";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import Button from "../components/ui/button/Button";
import { UnitDetailHeaderCard } from "../components/unit/detail/UnitDetailHeaderCard";
import { UnitDetailBodyCard } from "../components/unit/detail/UnitDetailBodyCard";
import { UnitOverviewTab } from "../components/unit/detail/UnitOverviewTab";
import { UnitProcessHistoryTab } from "../components/unit/detail/UnitProcessHistoryTab";
import { UnitRmaTab } from "../components/unit/detail/UnitRmaTab";
import {
  buildUnitDetailTabOptions,
  parseUnitDetailTab,
  type UnitDetailTab,
} from "../components/unit/unitDetailTabTypes";
import {
  buildProcessStepCodesForPlanUnitRow,
  resolvePlanUnitDetectorFields,
} from "../domains/production-plan/helpers/detailHelpers";
import {
  customerCodeForUnitDetail,
  findPurchaseOrderItemForUnit,
  flatRowFromUnitDetail,
  planUnitForDeliveryPayload,
  productionPlanUnitFromDetail,
  unitDisplayLot,
} from "../domains/production-plan/mappers/unitMappers";
import {
  buildMinimalDeliveryCreatePayloadFromPlanUnit,
  findProductDeliveryItemId,
} from "../domains/production-plan/helpers/registerFromPlanUnit";
import { labelForProcessCode } from "../domains/production-plan/labels/processLabels";
import { formatDateYmd } from "../lib/format/dateFormat";
import {
  detectorElementCodeForApi,
  generateProductSerialDraftRows,
  lineCodeFromOrderLine,
  validateLegacyProductSerialNo,
} from "../domains/production-plan/serial/legacyProductSerialNumber";
import { DELIVERY_UNIT_DETAIL_PAGE_LABEL } from "../domains/delivery/labels/pageLabels";
import { invalidateProductionPlanUnitListQueries } from "../domains/production-plan/queries/invalidateUnitListQueries";
import { invalidateDeliveryPlanListQueries } from "../domains/delivery/queries/invalidateDeliveryPlanListQueries";
import {
  canOpenUnitDetailDeliver,
  canShowUnitDetailProcessGate,
  getUnitDetailDeliveryHint,
  isResidualUndeliveredFromCompletedPlan,
  type UnitDetailDeliveryContext,
} from "../domains/delivery/policy/unitDetailDeliveryPolicy";
import {
  isPlaceholderProductSerialNo,
  needsProductSerialAssignment,
} from "../domains/production-plan/serial/placeholderProductSerial";

/**
 * 제품 1대(Unit) 상세 — 공정·납품·RMA.
 *
 * 공정/시리얼·납품은 `flatRow`(발주 품목 + `resolvePlanUnitDetectorFields`)에 의존합니다.
 * Unit API(`processUnit`)만으로는 소자·파장·productId가 비어 있을 수 있습니다.
 *
 * @see docs/process-handling-frontend-temp.md
 */
const IN_PROGRESS_RMA_STATUSES = [
  "RECEIVED",
  "INSPECTING",
  "REPAIRING",
  "RETESTING",
] as const;

function processRecordUploadKey(
  unitId: string | null | undefined,
  recordId: string | number | null | undefined
): string {
  const uid = String(unitId ?? "").trim();
  const rid = String(recordId ?? "").trim();
  return uid && rid ? `${uid}:${rid}` : "";
}

export default function UnitDetail() {
  const { unitId: unitIdParam } = useParams();
  const unitId = String(unitIdParam ?? "").trim();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseUnitDetailTab(searchParams.get("tab"));
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadDelivery, canCreateDelivery } = useDeliveryPermissions();
  const { canReadRma, canCreateRma } = useRmaPermissions();

  const setActiveTab = useCallback(
    (tab: UnitDetailTab) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      if (tab !== "rma") next.delete("rmaId");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

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

  const { data: unitProcessStepCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const orderId = String(unit?.order?.orderId ?? "").trim();
  const planId = String(unit?.plan?.planId ?? "").trim();
  const purchaseOrderItemId = unit?.item?.purchaseOrderItemId;
  const deliveryPlanId = String(unit?.deliveryPlanId ?? "").trim();

  const { data: linkedDeliveryPlan } = useQuery({
    queryKey: ["deliveryPlan", deliveryPlanId, "unitDetail"],
    queryFn: () => getDeliveryPlan(deliveryPlanId, accessToken!),
    enabled:
      Boolean(
        accessToken &&
          !isAuthLoading &&
          unit?.isInDeliveryPlan === true &&
          deliveryPlanId
      ),
  });

  const deliveryPlanStatus = linkedDeliveryPlan?.status ?? null;

  const deliveryCtx = useMemo((): UnitDetailDeliveryContext => {
    if (!unit) {
      return {};
    }
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

  const showProcessGateButton = useMemo(
    () => canShowUnitDetailProcessGate(deliveryCtx),
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

  const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverDate, setDeliverDate] = useState("");
  const [deliverRemark, setDeliverRemark] = useState("");
  const [uploadingProcessRecordKey, setUploadingProcessRecordKey] = useState<
    string | null
  >(null);

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
      !isPlaceholderProductSerialNo(processEntryUnit.serialNo)
  );

  const processEntryFlatRow = useMemo(() => {
    if (!flatRow) return null;
    if (!processEntryUnit) return flatRow;
    return { ...flatRow, unit: processEntryUnit };
  }, [flatRow, processEntryUnit]);

  const planDeliveryDate = useMemo(() => {
    if (!unit) return new Date().toISOString().slice(0, 10);
    return (
      [
        unit.plan?.deliveryDate,
        unit.plan?.plannedDate,
        unit.dueDate,
        purchaseOrder?.requestDeliveryDate,
        purchaseOrder?.dueDate,
      ]
        .map((x) => formatDateYmd(x, { emptyFallback: "" }))
        .find((s) => s && s !== "-") ?? new Date().toISOString().slice(0, 10)
    );
  }, [unit, purchaseOrder]);

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
      toast.error("시리얼 생성에 필요한 정보가 없습니다.");
      return;
    }
    const customerCode = unitCustomerCode;
    if (!customerCode) {
      toast.error("거래처 코드가 없어 시리얼을 생성할 수 없습니다.");
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
        toast.error(result.error);
        return;
      }
      const first = result[0];
      if (first?.serialNo) {
        setGateProductSerialNo(first.serialNo);
        toast.success("시리얼 번호를 발급했습니다.");
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

  const invalidateUnit = async (historyUnitId?: string) => {
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
  };

  const uploadPendingGateFiles = async ({
    recordId,
    files,
  }: {
    recordId: string | number | null | undefined;
    files: File[];
  }): Promise<string | null> => {
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
        accessToken!
      );
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "첨부 업로드에 실패했습니다.";
    }
  };

  const passMutation = useMutation({
    mutationFn: async () => {
      if (!processEntryUnit?.id || !accessToken || !processEntryFlatRow) {
        throw new Error("제품 정보가 없습니다.");
      }
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

      const result = await processProductionPlanUnitPass(
        processEntryUnit.id,
        {
          processCode: code,
          processName: name,
          detectorSerialNo: detectorSerialNo || undefined,
        },
        accessToken
      );
      const attachmentUploadError = await uploadPendingGateFiles({
        recordId: result.processRecord?.id,
        files: gatePendingAttachmentFiles,
      });
      return {
        unit: result.unit,
        codeUpper,
        attachmentUploadError,
      };
    },
    onSuccess: async ({ unit: nextUnit, codeUpper, attachmentUploadError }) => {
      toast.success("PASS 처리되었습니다.");
      setGatePendingAttachmentFiles([]);
      setGateFailFormOpen(false);
      if (
        !nextUnit.isDelivered &&
        (nextUnit.isDeliveryReady === true ||
          codeUpper === UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER)
      ) {
        closeProcessGate();
      } else {
        setProcessEntryUnit(nextUnit);
        setGateDetectorSerial(String(nextUnit.detectorSerialNo ?? "").trim());
        setGateProductSerialNo(String(nextUnit.serialNo ?? "").trim());
      }
      if (attachmentUploadError) toast.error(attachmentUploadError);
      await invalidateUnit(unitId);
    },
    onError: (e: Error) => {
      void invalidateUnit(unitId);
      toast.error(e.message || "PASS 처리에 실패했습니다.");
    },
  });

  const failMutation = useMutation({
    mutationFn: async () => {
      if (!processEntryUnit?.id || !accessToken) {
        throw new Error("제품 정보가 없습니다.");
      }
      const code = processEntryUnit.currentProcessCode?.trim() ?? "";
      const name =
        labelForProcessCode(processEntryUnit.currentProcessCode, unitProcessStepCodes) ||
        code;
      const reason = gateFailReason.trim();
      if (!code || !name) throw new Error("현재 공정 정보가 없습니다.");
      if (!reason) throw new Error("불합격 사유를 입력하세요.");

      const result = await processProductionPlanUnitFail(
        processEntryUnit.id,
        { processCode: code, processName: name, failReason: reason },
        accessToken
      );
      const attachmentUploadError = await uploadPendingGateFiles({
        recordId: result.processRecord?.id,
        files: gatePendingAttachmentFiles,
      });
      return { unit: result.unit, attachmentUploadError };
    },
    onSuccess: async ({ unit: nextUnit, attachmentUploadError }) => {
      toast.success("FAIL 처리되었습니다.");
      setGateFailFormOpen(false);
      setGateFailReason("");
      setGatePendingAttachmentFiles([]);
      setProcessEntryUnit(nextUnit);
      if (attachmentUploadError) toast.error(attachmentUploadError);
      await invalidateUnit(unitId);
    },
    onError: (e: Error) => {
      void invalidateUnit(unitId);
      toast.error(e.message || "FAIL 처리에 실패했습니다.");
    },
  });

  const gateSubmitting: ProcessGateSubmitting = passMutation.isPending
    ? "pass"
    : failMutation.isPending
      ? "fail"
      : null;

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
      toast.success("납품이 등록되었습니다.");
      setDeliverModalOpen(false);
      setDeliverRemark("");
      await invalidateUnit(unitId);
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
    onError: (e: Error) => toast.error(e.message || "납품 등록에 실패했습니다."),
  });

  const { data: deliverRecords = [], isLoading: deliverRecordsLoading } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", unitId, "deliver"],
    queryFn: () => getProductionPlanUnitProcessRecords(unitId, accessToken!),
    enabled:
      deliverModalOpen && !!accessToken && !isAuthLoading && !!unitId,
  });

  const sortedDeliverRecords = useMemo(() => {
    return [...deliverRecords].sort((a, b) => (a.processSeq ?? 0) - (b.processSeq ?? 0));
  }, [deliverRecords]);

  const handleUploadProcessRecordFiles = async (
    recordUnitId: string,
    recordId: string,
    files: File[]
  ) => {
    const key = processRecordUploadKey(recordUnitId, recordId);
    setUploadingProcessRecordKey(key);
    try {
      await uploadProductionPlanUnitProcessRecordFiles(
        recordUnitId,
        recordId,
        files,
        accessToken!
      );
      toast.success("첨부를 업로드했습니다.");
      await invalidateUnit(recordUnitId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "첨부 업로드에 실패했습니다.");
    } finally {
      setUploadingProcessRecordKey(null);
    }
  };

  if (!canReadDelivery) {
    return (
      <DetailPageState
        title={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        description={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        pageTitle={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        invalidMessage={`${DELIVERY_UNIT_DETAIL_PAGE_LABEL} 조회 권한(delivery.read)이 없습니다.`}
      />
    );
  }

  if (!unitId) {
    return (
      <DetailPageState
        title={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        description={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        pageTitle={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        invalidMessage="잘못된 Unit ID입니다."
      />
    );
  }

  if (isAuthLoading || isLoading) {
    return (
      <>
        <PageMeta
          title={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
          description={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        />
        <PageBreadcrumb pageTitle={DELIVERY_UNIT_DETAIL_PAGE_LABEL} />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="Unit 정보를 불러오는 중입니다." />
        </div>
      </>
    );
  }

  if (isError || !unit || !processUnit || !flatRow) {
    return (
      <DetailPageState
        title={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        description={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        pageTitle={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        errorMessage={
          error instanceof Error
            ? error.message
            : "Unit 정보를 불러오지 못했습니다."
        }
      />
    );
  }

  const lotLabel = unitDisplayLot(unit);
  const pageTitle = `${DELIVERY_UNIT_DETAIL_PAGE_LABEL} · ${lotLabel}`;
  const isDelivered = unit.isDelivered === true;
  const showRmaRegister =
    isDelivered && canCreateRma && !hasActiveRma;

  const openDeliverModal = () => {
    setDeliverModalOpen(true);
    setDeliverDate(planDeliveryDate);
  };

  return (
    <>
      <PageMeta title={pageTitle} description={DELIVERY_UNIT_DETAIL_PAGE_LABEL} />
      <PageBreadcrumb pageTitle={pageTitle} />

      <div className="space-y-4">
        <UnitDetailHeaderCard
          unit={unit}
          stepCodes={unitProcessStepCodes}
          purchaseOrder={purchaseOrder}
          orderId={orderId}
          planId={planId}
          unitId={unitId}
          canDeliver={canDeliver}
          showResidualUndeliveredBadge={showResidualUndeliveredBadge}
          showRmaRegister={showRmaRegister}
          onOpenProcessGate={openProcessGate}
          onOpenDeliver={openDeliverModal}
          onOpenEdit={() => setEditUnitModalOpen(true)}
        />

        <UnitDetailBodyCard
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabOptions={tabOptions}
        >
          {activeTab === "overview" ? (
            <UnitOverviewTab
              unit={unit}
              stepCodes={unitProcessStepCodes}
              purchaseOrder={purchaseOrder}
              purchaseOrderItem={purchaseOrderItem}
              flatRow={flatRow}
              orderId={orderId}
              planId={planId}
              onNavigateTab={setActiveTab}
              deliveryHint={deliveryHint}
              showResidualUndeliveredBadge={showResidualUndeliveredBadge}
            />
          ) : null}
          {activeTab === "process" ? (
            <UnitProcessHistoryTab
              unit={unit}
              stepCodes={visibleStepCodes}
              showProcessActions={showProcessGateButton}
              onOpenProcessGate={openProcessGate}
              onUploadAttachments={(recordId, files) =>
                handleUploadProcessRecordFiles(unitId, recordId, files)
              }
              uploadingRecordKey={uploadingProcessRecordKey}
            />
          ) : null}
          {activeTab === "rma" ? <UnitRmaTab unit={unit} /> : null}
        </UnitDetailBodyCard>
      </div>

      <Modal
        isOpen={deliverModalOpen}
        onClose={() => {
          setDeliverModalOpen(false);
          setDeliverRemark("");
        }}
        strictClose
        className="mx-4 max-w-lg p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              납품 등록
            </h3>
            <p className="mt-0.5 font-mono text-theme-sm text-gray-600 dark:text-gray-400">
              {unitDisplayLot(unit)}
            </p>
          </>
        }
      >
        <div className="mt-4">
          <UnitProcessRecordsTimeline
            records={sortedDeliverRecords}
            isLoading={deliverRecordsLoading}
            unit={processUnit}
            accessToken={accessToken}
            onUploadAttachments={(recordId, files) =>
              handleUploadProcessRecordFiles(unitId, recordId, files)
            }
            uploadingRecordKey={uploadingProcessRecordKey}
          />
        </div>
        <div className="mt-4 space-y-3">
          <DatePicker
            id="unit-deliver-date"
            label="제품 납품일"
            value={deliverDate}
            onValueChange={setDeliverDate}
            placeholder="년-월-일"
            required
          />
          <div>
            <Label htmlFor="unit-deliver-remark">비고 (선택)</Label>
            <TextArea
              id="unit-deliver-remark"
              rows={2}
              value={deliverRemark}
              onChange={setDeliverRemark}
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDeliverModalOpen(false);
              setDeliverRemark("");
            }}
          >
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={deliverMutation.isPending || !deliverDate.trim()}
            onClick={() => deliverMutation.mutate()}
          >
            {deliverMutation.isPending ? "등록 중…" : "납품 등록"}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!processEntryUnit}
        onClose={closeProcessGate}
        strictClose
        className="mx-4 flex max-h-[min(92vh,780px)] max-w-lg flex-col overflow-hidden p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              공정 처리
            </h3>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              현재 공정에서 PASS·FAIL을 선택하면 바로 반영됩니다.
            </p>
          </>
        }
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
          <ProcessModalProductSummary
            variant="minimal"
            flatRow={processEntryFlatRow}
            unit={processEntryUnit}
            stepCodes={visibleStepCodes}
          />
          <ProcessGateContextPanel
            unit={processEntryUnit}
            flatRow={processEntryFlatRow}
            stepCodes={visibleStepCodes}
            interactive
            submitting={gateSubmitting}
            failFormOpen={gateFailFormOpen}
            onFailFormOpenChange={setGateFailFormOpen}
            onPass={() => passMutation.mutate()}
            detectorSerialNo={gateDetectorSerial}
            onDetectorSerialNoChange={setGateDetectorSerial}
            productSerialNo={gateProductSerialNo}
            onProductSerialNoChange={setGateProductSerialNo}
            onGenerateProductSerial={() => void handleGateGenerateProductSerial()}
            productSerialGenerating={
              gateProductSerialGenerating || gateMastersLoading
            }
            productSerialAlreadyAssigned={gateProductSerialAlreadyAssigned}
            failReason={gateFailReason}
            onFailReasonChange={setGateFailReason}
            onSubmitFail={() => failMutation.mutate()}
            pendingAttachmentFiles={gatePendingAttachmentFiles}
            onSelectAttachmentFiles={(files) =>
              setGatePendingAttachmentFiles((prev) =>
                [...prev, ...files].slice(0, 20)
              )
            }
            onRemoveAttachmentFile={(index) =>
              setGatePendingAttachmentFiles((prev) =>
                prev.filter((_, i) => i !== index)
              )
            }
            onAttachmentError={(message) => toast.error(message)}
          />
        </div>
        <div className="mt-4 shrink-0 border-t border-gray-100 pt-4 dark:border-white/10">
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
              onClick={closeProcessGate}
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>

      {accessToken ? (
        <ProductionPlanUnitEditModal
          isOpen={editUnitModalOpen}
          onClose={() => setEditUnitModalOpen(false)}
          unit={processUnit}
          lineLabel={flatRow.lineLabel}
          flatRow={flatRow}
          accessToken={accessToken}
          operatorUserOptions={operatorUserOptions}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: ["productionPlanUnit", unitId],
            });
            if (planId) {
              queryClient.invalidateQueries({
                queryKey: ["productionPlan", planId],
              });
            }
          }}
        />
      ) : null}
    </>
  );
}
