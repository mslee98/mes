import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import LoadingLottie from "../components/common/LoadingLottie";
import SegmentedControl from "../components/common/SegmentedControl";
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import DatePicker from "../components/form/date-picker";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import { useAuth } from "../hooks/useAuth";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { getUsers } from "../api/user";
import {
  assignProductSerialsToPlan,
  createDelivery,
  getProductionPlan,
  getProductionPlanUnitProcessRecords,
  linkUnitsToDeliveryItem,
  processProductionPlanUnitFail,
  processProductionPlanUnitPass,
  splitProductionPlan,
  uploadProductionPlanUnitProcessRecordFiles,
  type ProductionPlanUnit,
  type Partner,
  type SplitProductionPlanPayload,
} from "../api/purchaseOrder";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
  UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING,
  UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER,
  UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING,
} from "../api/commonCode";
import {
  partnerFromSummary,
  partnerSelectLabel,
  partnerSummaryHasDisplayableFields,
} from "../lib/partnerDisplay";
import { partnerCountryFlagUrl } from "../lib/partnerCountryOptions";
import {
  flattenPlanUnits,
  type FlatPlanUnitRow,
} from "../lib/productionPlanDetailHelpers";
import { labelForProcessCode } from "../lib/productionPlanProcessLabels";
import { formatDateYmd } from "../lib/dateFormat";
import {
  buildMinimalDeliveryCreatePayloadFromPlanUnit,
  findProductDeliveryItemId,
} from "../lib/productionRegisterFromPlanUnit";
import type { ProcessGateSubmitting } from "../components/delivery/ProcessPipelineStepper";
import {
  PRODUCTION_PLAN_DETAIL_TAB_OPTIONS,
  type ProductionPlanDetailTab,
} from "../components/delivery/productionPlanDetailTabTypes";
import { ProductionPlanDetailOverviewTab } from "../components/delivery/ProductionPlanDetailOverviewTab";
import { ProductionPlanDetailLinesTab } from "../components/delivery/ProductionPlanDetailLinesTab";
import { ProductionPlanDetailSummaryTab } from "../components/delivery/ProductionPlanDetailSummaryTab";
import { ProcessGateContextPanel } from "../components/delivery/ProcessGateContextPanel";
import { ProcessModalProductSummary } from "../components/delivery/ProcessModalProductSummary";
import { UnitProcessRecordsTimeline } from "../components/delivery/UnitProcessRecordsTimeline";
import Button from "../components/ui/button/Button";
import {
  LEGACY_USER_PREFIX,
  tryDecodeLegacyUser,
} from "../lib/legacySelectValue";
import {
  detectorElementCodeForApi,
  generateProductSerialDraftRows,
  lineCodeFromOrderLine,
  validateLegacyProductSerialNo,
} from "../lib/legacyProductSerialNumber";
import { useProductSerialMasters } from "../hooks/useProductSerialMasters";

function ymdForSplitInput(raw: unknown): string {
  const y = formatDateYmd(
    raw as string | null | undefined,
    { emptyFallback: "" }
  );
  return y && y !== "-" ? y : "";
}

function deliveryManagerUserIdFromSelect(selectValue: string): number | null {
  const t = selectValue.trim();
  if (!t || t.startsWith(LEGACY_USER_PREFIX)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type SplitModalContext = {
  unitIds: string[];
  lineLabel: string;
};

type SplitSelectionValidation =
  | { eligible: false; reason?: string }
  | {
      eligible: true;
      purchaseOrderItemId: number;
      rows: FlatPlanUnitRow[];
    };

function processRecordUploadKey(
  unitId: string | null | undefined,
  recordId: string | number | null | undefined
): string {
  const uid = String(unitId ?? "").trim();
  const rid = String(recordId ?? "").trim();
  return uid && rid ? `${uid}:${rid}` : "";
}

export default function ProductionPlanDetail() {
  const { orderId, planId } = useParams();
  const navigate = useNavigate();
  const oid = String(orderId ?? "").trim();
  const pid = String(planId ?? "").trim();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ProductionPlanDetailTab>("overview");
  const [selectedUnitIds, setSelectedUnitIds] = useState(
    () => new Set<string>()
  );
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitModalContext, setSplitModalContext] =
    useState<SplitModalContext | null>(null);
  const [splitDeliveryDate, setSplitDeliveryDate] = useState("");
  const [splitPlannedDeliveryDate, setSplitPlannedDeliveryDate] =
    useState("");
  const [splitDeliveryManagerUserSelectValue, setSplitDeliveryManagerUserSelectValue] =
    useState("");
  const [splitTitle, setSplitTitle] = useState("");
  const [splitRemark, setSplitRemark] = useState("");

  const [recordsModalUnitId, setRecordsModalUnitId] = useState<string | null>(
    null
  );
  const [uploadingProcessRecordKey, setUploadingProcessRecordKey] = useState<
    string | null
  >(null);
  /** 표에서 「공정 처리」 — PASS/FAIL 인라인 모달 */
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
  /** 출고 준비 완료 제품 — 실제 납품 등록 */
  const [deliverModal, setDeliverModal] = useState<{
    unit: ProductionPlanUnit;
    purchaseOrderItemId: number;
  } | null>(null);
  const [deliverDate, setDeliverDate] = useState("");
  const [deliverRemark, setDeliverRemark] = useState("");

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

  const {
    data: plan,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["productionPlan", pid],
    queryFn: () => getProductionPlan(pid, accessToken!),
    enabled: !!accessToken && !isAuthLoading && pid !== "",
  });

  const { data: modalRecords = [], isLoading: modalRecordsLoading } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", recordsModalUnitId],
    queryFn: () =>
      getProductionPlanUnitProcessRecords(recordsModalUnitId!, accessToken!),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      !!recordsModalUnitId &&
      recordsModalUnitId !== "",
    /** 공정 처리 직후 목록과 맞추기 — 전역 staleTime(60s) 무력화 */
    staleTime: 0,
  });

  const deliverRecordsUnitId = deliverModal?.unit.id ?? null;
  const { data: deliverRecords = [], isLoading: deliverRecordsLoading } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", deliverRecordsUnitId],
    queryFn: () =>
      getProductionPlanUnitProcessRecords(deliverRecordsUnitId!, accessToken!),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      !!deliverRecordsUnitId &&
      deliverRecordsUnitId !== "",
  });

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: unitProcessStepCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: usersForDeliveryManager = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const splitDeliveryManagerUserOptions = useMemo(() => {
    const opts = usersForDeliveryManager
      .filter((u) => u.isActive !== false)
      .map((u) => ({
        value: String(u.id),
        label: `${u.name} (${u.employeeNo})`,
      }));
    const sel = splitDeliveryManagerUserSelectValue;
    if (!sel || opts.some((o) => o.value === sel)) return opts;
    const legacyName = tryDecodeLegacyUser(sel);
    if (legacyName) {
      opts.unshift({ value: sel, label: `${legacyName} (저장된 값)` });
      return opts;
    }
    opts.unshift({ value: sel, label: `사용자 #${sel}` });
    return opts;
  }, [usersForDeliveryManager, splitDeliveryManagerUserSelectValue]);

  const flatUnits = useMemo(
    () => flattenPlanUnits(plan?.items),
    [plan?.items]
  );

  const planPartnerCode =
    plan?.purchaseOrder?.partner?.code?.trim() ||
    plan?.purchaseOrder?.partnerSummary?.code?.trim() ||
    "";

  const planDeliveryDate =
    plan?.deliveryDate?.trim() ||
    plan?.plannedDeliveryDate?.trim() ||
    plan?.purchaseOrder?.deliveryDate?.trim() ||
    "";

  const gateNeedsProductSerial =
    Boolean(processEntryUnit) &&
    !processEntryUnit?.serialNo?.trim() &&
    processEntryUnit?.currentProcessCode?.trim().toUpperCase() ===
      UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING;

  const { productMetaById, detectorById, isLoading: gateMastersLoading } =
    useProductSerialMasters(accessToken, gateNeedsProductSerial && !!oid);

  const handleGateGenerateProductSerial = async () => {
    if (!processEntryUnit || !oid || !accessToken) return;
    const flatRow = flatUnits.find((r) => r.unit.id === processEntryUnit.id);
    if (!flatRow) {
      toast.error("제품 정보를 찾을 수 없습니다.");
      return;
    }
    const customerCode = planPartnerCode.trim();
    if (!customerCode) {
      toast.error("거래처 코드가 없어 시리얼을 생성할 수 없습니다.");
      return;
    }
    setGateProductSerialGenerating(true);
    try {
      const result = await generateProductSerialDraftRows({
        purchaseOrderId: oid,
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
    void handleGateGenerateProductSerial();
  }, [
    gateNeedsProductSerial,
    gateMastersLoading,
    processEntryUnit?.id,
    productMetaById.size,
    detectorById.size,
  ]);

  const splitValidation: SplitSelectionValidation = useMemo(() => {
    if (selectedUnitIds.size === 0) {
      return { eligible: false };
    }
    const rows = flatUnits.filter((r) => selectedUnitIds.has(r.unit.id));
    if (rows.length !== selectedUnitIds.size) {
      return {
        eligible: false,
        reason: "선택한 제품을 찾을 수 없습니다.",
      };
    }
    if (rows.some((r) => r.unit.isDelivered)) {
      return {
        eligible: false,
        reason: "납품 완료된 제품은 새 계획으로 분할할 수 없습니다.",
      };
    }
    const poItemIds = new Set<number>();
    for (const r of rows) {
      const id = r.purchaseOrderItemId;
      if (id != null && Number.isFinite(Number(id)) && Number(id) > 0) {
        poItemIds.add(Number(id));
      }
    }
    if (poItemIds.size !== 1) {
      return {
        eligible: false,
        reason: "같은 발주 품목의 제품만 함께 옮길 수 있습니다.",
      };
    }
    return {
      eligible: true,
      purchaseOrderItemId: [...poItemIds][0],
      rows,
    };
  }, [selectedUnitIds, flatUnits]);

  const splitDisabledReason =
    selectedUnitIds.size === 0
      ? null
      : splitValidation.eligible
        ? null
        : (splitValidation.reason ?? "분할할 수 없는 선택입니다.");

  const selectedHistoryUnit = useMemo(
    () => flatUnits.find((row) => row.unit.id === recordsModalUnitId)?.unit ?? null,
    [flatUnits, recordsModalUnitId]
  );

  const processEntryFlatRow = useMemo(
    () =>
      processEntryUnit
        ? flatUnits.find((r) => r.unit.id === processEntryUnit.id) ?? null
        : null,
    [flatUnits, processEntryUnit]
  );
  const recordsModalFlatRow = useMemo(
    () =>
      recordsModalUnitId
        ? flatUnits.find((r) => r.unit.id === recordsModalUnitId) ?? null
        : null,
    [flatUnits, recordsModalUnitId]
  );

  const defaultDeliveryDateYmd = useMemo(() => {
    if (!plan) return new Date().toISOString().slice(0, 10);
    return (
      [plan.plannedDeliveryDate, plan.plannedDate, plan.deliveryDate]
        .map((x) => formatDateYmd(x, { emptyFallback: "" }))
        .find((s) => s && s !== "-") ?? new Date().toISOString().slice(0, 10)
    );
  }, [plan]);

  const openDeliverModalForUnit = (
    unit: ProductionPlanUnit,
    purchaseOrderItemId?: number | null
  ) => {
    if (
      purchaseOrderItemId == null ||
      !Number.isFinite(Number(purchaseOrderItemId)) ||
      Number(purchaseOrderItemId) <= 0
    ) {
      toast.error("발주 품목 정보가 없어 납품을 등록할 수 없습니다.");
      return false;
    }
    setDeliverModal({
      unit,
      purchaseOrderItemId: Number(purchaseOrderItemId),
    });
    setDeliverDate(defaultDeliveryDateYmd);
    setDeliverRemark("");
    return true;
  };

  const deliverMutation = useMutation({
    mutationFn: async () => {
      if (!deliverModal || !accessToken) {
        throw new Error("로그인 또는 납품 정보가 없습니다.");
      }
      if (!oid) throw new Error("발주 경로가 올바르지 않습니다.");
      const payload = buildMinimalDeliveryCreatePayloadFromPlanUnit({
        deliveryDate: deliverDate,
        remark: deliverRemark,
        purchaseOrderItemId: deliverModal.purchaseOrderItemId,
        unit: deliverModal.unit,
      });
      const delivery = await createDelivery(oid, payload, accessToken);
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
      toast.success("납품이 등록되었고 계획 제품이 연결되었습니다.");
      setDeliverModal(null);
      setDeliverRemark("");
      void queryClient.invalidateQueries({ queryKey: ["productionPlan", pid] });
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderProductionPlans", oid],
      });
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderDeliveries", oid],
      });
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrder", oid] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "납품 등록에 실패했습니다."),
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

      return splitProductionPlan(oid, body, accessToken);
    },
    onSuccess: (data) => {
      toast.success("새 생산 계획으로 분할되었습니다.");
      setSplitModalOpen(false);
      setSplitModalContext(null);
      setSelectedUnitIds(new Set());
      const newPlanId = data.plan?.id?.trim();
      void queryClient.invalidateQueries({ queryKey: ["productionPlan", pid] });
      if (newPlanId) {
        void queryClient.invalidateQueries({
          queryKey: ["productionPlan", newPlanId],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderProductionPlans", oid],
      });
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrder", oid] });
      if (newPlanId) {
        navigate(`/order/${oid}/plan/${newPlanId}`);
      }
    },
    onError: (e: Error) =>
      toast.error(e.message || "생산 계획 분할에 실패했습니다."),
  });

  const invalidateAfterProcessMutation = async (
    unitIdForHistory?: string | null
  ) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["productionPlan", pid] }),
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrderProductionPlans", oid],
      }),
    ]);
    const u = unitIdForHistory?.trim();
    if (!u) return;
    /** 비활성 쿼리(이력 모달 닫힘)도 즉시 재조회 — 기본 invalidate는 active만 refetch */
    await queryClient.invalidateQueries({
      queryKey: ["productionPlanUnitProcessRecords", u],
      refetchType: "all",
    });
  };

  const uploadPendingGateFiles = async ({
    unitId,
    recordId,
    files,
  }: {
    unitId: string;
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
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "공정 처리 첨부 업로드에 실패했습니다.";
    }
  };

  const passMutation = useMutation({
    mutationFn: async () => {
      if (!processEntryUnit?.id) throw new Error("제품 정보가 없습니다.");
      if (!accessToken) {
        throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      }
      const unitId = processEntryUnit.id;
      const code = processEntryUnit.currentProcessCode?.trim() ?? "";
      const flatRow = flatUnits.find((r) => r.unit.id === unitId);
      const name =
        labelForProcessCode(
          processEntryUnit.currentProcessCode,
          unitProcessStepCodes
        ) || code;
      if (!code || !name) {
        throw new Error("현재 공정 정보가 없습니다.");
      }
      const codeUpper = code.toUpperCase();
      const detectorSerialNo = gateDetectorSerial.trim();
      if (
        codeUpper === UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING &&
        !detectorSerialNo
      ) {
        throw new Error("검출기 시리얼 넘버를 입력하세요.");
      }

      const hasProductSerial = Boolean(processEntryUnit.serialNo?.trim());
      if (
        codeUpper === UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING &&
        !hasProductSerial
      ) {
        const detectorElementCode = String(
          processEntryUnit.detectorElementCode ??
            flatRow?.detectorElementCode ??
            ""
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
        if (serialErr) {
          throw new Error(serialErr);
        }
        const fullSerialNo = gateProductSerialNo.trim();
        const lineCode = flatRow
          ? lineCodeFromOrderLine(flatRow.orderLine)
          : "";
        await assignProductSerialsToPlan(
          pid,
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
      });
      return {
        unitId,
        unit: result.unit,
        purchaseOrderItemId: flatRow?.purchaseOrderItemId,
        processCodeUpper: codeUpper,
        attachmentUploadError,
      };
    },
    onSuccess: async ({
      unitId,
      unit,
      purchaseOrderItemId,
      processCodeUpper,
      attachmentUploadError,
    }) => {
      toast.success("PASS 처리되었습니다.");
      setGateFailFormOpen(false);
      setGatePendingAttachmentFiles([]);
      if (
        !unit.isDelivered &&
        (unit.isDeliveryReady === true ||
          processCodeUpper === UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER)
      ) {
        closeProcessGate();
        openDeliverModalForUnit(unit, purchaseOrderItemId);
      } else {
        setProcessEntryUnit(unit);
        setGateDetectorSerial(String(unit.detectorSerialNo ?? "").trim());
        setGateProductSerialNo(String(unit.serialNo ?? "").trim());
      }
      if (attachmentUploadError) {
        toast.error(attachmentUploadError);
      }
      await invalidateAfterProcessMutation(unitId);
    },
    onError: (e: Error) => {
      void invalidateAfterProcessMutation(processEntryUnit?.id ?? null);
      toast.error(e.message || "PASS 처리에 실패했습니다.");
    },
  });

  const failMutation = useMutation({
    mutationFn: async () => {
      if (!processEntryUnit?.id) throw new Error("제품 정보가 없습니다.");
      if (!accessToken) {
        throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      }
      const unitId = processEntryUnit.id;
      const code = processEntryUnit.currentProcessCode?.trim() ?? "";
      const name =
        labelForProcessCode(
          processEntryUnit.currentProcessCode,
          unitProcessStepCodes
        ) || code;
      const reason = gateFailReason.trim();
      if (!code || !name) {
        throw new Error("현재 공정 정보가 없습니다.");
      }
      if (!reason) {
        throw new Error("불합격 사유를 입력하세요.");
      }
      const result = await processProductionPlanUnitFail(
        unitId,
        {
          processCode: code,
          processName: name,
          failReason: reason,
        },
        accessToken
      );
      const attachmentUploadError = await uploadPendingGateFiles({
        unitId,
        recordId: result.processRecord?.id,
        files: gatePendingAttachmentFiles,
      });
      return { unitId, unit: result.unit, attachmentUploadError };
    },
    onSuccess: async ({ unitId, unit, attachmentUploadError }) => {
      toast.success("FAIL 처리되었습니다.");
      setGateFailFormOpen(false);
      setGateFailReason("");
      setGatePendingAttachmentFiles([]);
      setProcessEntryUnit(unit);
      setGateDetectorSerial(String(unit.detectorSerialNo ?? "").trim());
      setGateProductSerialNo(String(unit.serialNo ?? "").trim());
      if (attachmentUploadError) {
        toast.error(attachmentUploadError);
      }
      await invalidateAfterProcessMutation(unitId);
    },
    onError: (e: Error) => {
      void invalidateAfterProcessMutation(processEntryUnit?.id ?? null);
      toast.error(e.message || "FAIL 처리에 실패했습니다.");
    },
  });

  const gateSubmitting: ProcessGateSubmitting = passMutation.isPending
    ? "pass"
    : failMutation.isPending
      ? "fail"
      : null;

  const sortedModalRecords = useMemo(() => {
    const list = [...modalRecords];
    list.sort((a, b) => (a.processSeq ?? 0) - (b.processSeq ?? 0));
    return list;
  }, [modalRecords]);

  const sortedDeliverRecords = useMemo(() => {
    const list = [...deliverRecords];
    list.sort((a, b) => (a.processSeq ?? 0) - (b.processSeq ?? 0));
    return list;
  }, [deliverRecords]);

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
      toast.success("공정 이력 첨부를 업로드했습니다.");
      await queryClient.invalidateQueries({
        queryKey: ["productionPlanUnitProcessRecords", unitId],
        refetchType: "all",
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || "공정 이력 첨부 업로드에 실패했습니다.");
    },
  });

  const handleUploadProcessRecordFiles = async (
    unitId: string,
    recordId: string,
    files: File[]
  ) => {
    const uploadKey = processRecordUploadKey(unitId, recordId);
    setUploadingProcessRecordKey(uploadKey);
    try {
      await uploadProcessRecordFilesMutation.mutateAsync({
        unitId,
        recordId,
        files,
      });
    } finally {
      setUploadingProcessRecordKey((prev) =>
        prev === uploadKey ? null : prev
      );
    }
  };

  const openSplitModalFromToolbar = () => {
    if (!splitValidation.eligible || !plan) return;
    setSplitModalContext({
      unitIds: [...selectedUnitIds].filter((id) => id.trim() !== ""),
      lineLabel:
        splitValidation.rows[0]?.lineLabel ??
        `발주 품목 #${splitValidation.purchaseOrderItemId}`,
    });
    setSplitDeliveryDate(ymdForSplitInput(plan.deliveryDate));
    setSplitPlannedDeliveryDate(
      ymdForSplitInput(plan.plannedDeliveryDate ?? plan.plannedDate)
    );
    setSplitDeliveryManagerUserSelectValue(
      plan.productionManagerId != null &&
        Number.isFinite(Number(plan.productionManagerId))
        ? String(plan.productionManagerId)
        : ""
    );
    setSplitTitle(plan.title?.trim() ?? "");
    setSplitRemark("");
    setSplitModalOpen(true);
  };

  if (!oid || !pid) {
    return (
      <>
        <PageMeta title="생산 계획" description="생산 계획" />
        <p className="text-sm text-red-600 dark:text-red-400">
          잘못된 경로입니다.
        </p>
      </>
    );
  }

  if (isLoading || !plan) {
    return (
      <>
        <PageMeta title="생산 계획" description="생산 계획" />
        <PageBreadcrumb pageTitle="생산 계획" />
        <div className="flex min-h-[320px] items-center justify-center">
          {isLoading && <LoadingLottie />}
          {!isLoading && isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "생산 계획을 불러오지 못했습니다."}
            </p>
          )}
        </div>
      </>
    );
  }

  const purchaseOrderRaw = plan.purchaseOrder ?? undefined;
  const partner = purchaseOrderRaw?.partner ?? undefined;
  const partnerSummary = purchaseOrderRaw?.partnerSummary;
  const partnerForDisplay: Partner | undefined =
    partnerSummary != null &&
    partnerSummaryHasDisplayableFields(partnerSummary)
      ? partnerFromSummary(partnerSummary)
      : partner;
  const orderNoFromPlan = purchaseOrderRaw?.orderNo?.trim();
  const partnerLabelText = partnerForDisplay
    ? partnerSelectLabel(partnerForDisplay, countryCodes)
    : "—";
  const partnerFlagUrl = partnerCountryFlagUrl(
    String(partnerForDisplay?.countryCode ?? "")
  );
  const partnerLabel = (
    <div className="flex items-center gap-2">
      {partnerFlagUrl ? (
        <img
          src={partnerFlagUrl}
          alt=""
          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
          decoding="async"
        />
      ) : null}
      <span>{partnerLabelText}</span>
    </div>
  );

  const breadcrumbTitle =
    plan.title?.trim() || plan.planNo?.trim() || "생산 계획";

  return (
    <>
      <PageMeta
        title={`생산 계획 ${plan.title?.trim() || plan.planNo || plan.id}`}
        description="생산 계획 상세"
      />
      <PageBreadcrumb pageTitle={`생산 계획 · ${breadcrumbTitle}`} />

      {/* <div className="mb-4 flex flex-wrap items-center gap-2 text-theme-sm">
        <Link
          to={`/order/${oid}`}
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          발주 상세로 돌아가기
        </Link>
      </div> */}

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-800">
            <SegmentedControl<ProductionPlanDetailTab>
              value={activeTab}
              onChange={setActiveTab}
              options={PRODUCTION_PLAN_DETAIL_TAB_OPTIONS}
              ariaLabel="생산 계획 상세 탭"
              equalWidth
              className="w-full"
            />
          </div>

          <div className="space-y-6 p-4 sm:p-6">
            {activeTab === "overview" ? (
              <ProductionPlanDetailOverviewTab
                plan={plan}
                orderId={oid}
                orderNo={orderNoFromPlan}
                partnerLabel={partnerLabel}
                flatUnits={flatUnits}
                unitProcessStepCodes={unitProcessStepCodes}
                selectedUnitIds={selectedUnitIds}
                onSelectedUnitIdsChange={setSelectedUnitIds}
                splitDisabledReason={splitDisabledReason}
                onSplitClick={openSplitModalFromToolbar}
                onProcess={openProcessGate}
                onDeliver={({ unit, purchaseOrderItemId }) => {
                  openDeliverModalForUnit(unit, purchaseOrderItemId);
                }}
                onRecords={(unitId) => setRecordsModalUnitId(unitId)}
                onNavigateTab={setActiveTab}
              />
            ) : null}
            {activeTab === "lines" ? (
              <ProductionPlanDetailLinesTab items={plan.items ?? []} />
            ) : null}
            {activeTab === "summary" ? (
              <ProductionPlanDetailSummaryTab plan={plan} />
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        isOpen={splitModalOpen}
        onClose={() => {
          setSplitModalOpen(false);
          setSplitModalContext(null);
        }}
        strictClose
        className="mx-4 max-h-[90vh] max-w-2xl overflow-y-auto p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              새 생산 계획으로 분할
            </h3>
            {splitModalContext ? (
              <p className="mt-0.5 text-theme-sm text-gray-600 dark:text-gray-400">
                {splitModalContext.lineLabel} · {splitModalContext.unitIds.length}
                대
              </p>
            ) : null}
          </>
        }
      >
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">
          새 계획이 만들어지고 선택한 제품만 옮겨집니다. (권한·발주 상태·실납품
          연결 여부 등은 서버에서 검증합니다.)
        </p>
        <div className="mt-4 space-y-3">
          <DatePicker
            id="split-delivery-date"
            label="제품 인계일"
            value={splitDeliveryDate}
            onValueChange={setSplitDeliveryDate}
            placeholder="년-월-일 (선택)"
          />
          <DatePicker
            id="split-planned-delivery"
            label="납품 예정일"
            value={splitPlannedDeliveryDate}
            onValueChange={setSplitPlannedDeliveryDate}
            placeholder="년-월-일 (선택)"
          />
          <SearchableSelectWithCreate
            id="split-delivery-manager-user"
            label="담당자 (선택)"
            value={splitDeliveryManagerUserSelectValue}
            onChange={setSplitDeliveryManagerUserSelectValue}
            options={splitDeliveryManagerUserOptions}
            placeholder={
              isAuthLoading ? "담당자 불러오는 중…" : "담당자 검색·선택"
            }
            noOptionsMessage="표시할 담당자가 없습니다."
            addTrigger="none"
            addButtonLabel=""
            onAddClick={() => {}}
            isDisabled={isAuthLoading}
            isClearable
          />
          <div>
            <Label htmlFor="split-title">계획 제목 (선택)</Label>
            <Input
              id="split-title"
              type="text"
              value={splitTitle}
              onChange={(e) => setSplitTitle(e.target.value)}
              className="mt-1"
              placeholder="현재 계획 제목이 채워집니다."
            />
          </div>
          <div>
            <Label htmlFor="split-remark">비고 (선택)</Label>
            <TextArea
              id="split-remark"
              rows={2}
              value={splitRemark}
              onChange={setSplitRemark}
              className="mt-1"
              placeholder="비고"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSplitModalOpen(false);
              setSplitModalContext(null);
            }}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={splitMutation.isPending || !splitModalContext}
            onClick={() => splitMutation.mutate()}
          >
            {splitMutation.isPending ? "처리 중…" : "분할 실행"}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!deliverModal}
        onClose={() => {
          setDeliverModal(null);
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
              {deliverModal?.unit.unitCode ?? deliverModal?.unit.id}
            </p>
          </>
        }
      >
        {deliverModal ? (
          <div className="mt-4">
            <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              공정 처리 이력
            </p>
            <UnitProcessRecordsTimeline
              records={sortedDeliverRecords}
              isLoading={deliverRecordsLoading}
              unit={deliverModal.unit}
              accessToken={accessToken}
              viewportClassName="max-h-[min(22rem,48vh)] sm:max-h-[min(28rem,46vh)]"
              onUploadAttachments={(recordId, files) =>
                handleUploadProcessRecordFiles(deliverModal.unit.id, recordId, files)
              }
              uploadingRecordKey={uploadingProcessRecordKey}
            />
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          <DatePicker
            id="deliver-date"
            label="제품 납품일"
            value={deliverDate}
            onValueChange={setDeliverDate}
            placeholder="년-월-일"
            required
          />
          <div>
            <Label htmlFor="deliver-remark">비고 (선택)</Label>
            <TextArea
              id="deliver-remark"
              rows={2}
              value={deliverRemark}
              onChange={setDeliverRemark}
              className="mt-1"
              placeholder="납품 비고"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
            onClick={() => {
              setDeliverModal(null);
              setDeliverRemark("");
            }}
          >
            취소
          </button>
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
            stepCodes={unitProcessStepCodes}
          />
          <ProcessGateContextPanel
            unit={processEntryUnit}
            flatRow={processEntryFlatRow}
            stepCodes={unitProcessStepCodes}
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
                prev.filter((_, fileIndex) => fileIndex !== index)
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

      <Modal
        isOpen={!!recordsModalUnitId}
        onClose={() => setRecordsModalUnitId(null)}
        className="mx-4 max-h-[85vh] max-w-lg overflow-y-auto p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              공정 이력
            </h3>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              선택한 제품의 공정 PASS/FAIL 기록입니다.
            </p>
          </>
        }
      >
        <div>
          <ProcessModalProductSummary
            variant="minimal"
            flatRow={recordsModalFlatRow}
            unit={selectedHistoryUnit}
            stepCodes={unitProcessStepCodes}
          />
        </div>
        {recordsModalUnitId ? (
          <p className="mt-2 break-all font-mono text-theme-xs text-gray-400 dark:text-gray-500">
            내부 ID: {recordsModalUnitId}
          </p>
        ) : null}
        {modalRecordsLoading ? (
          <div className="mt-6 flex justify-center py-8">
            <LoadingLottie />
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              공정 처리 이력
            </p>
            <UnitProcessRecordsTimeline
              records={sortedModalRecords}
              isLoading={false}
              unit={selectedHistoryUnit}
              accessToken={accessToken}
              viewportClassName="max-h-[min(50vh,26rem)] sm:max-h-[min(52vh,30rem)]"
              onUploadAttachments={(recordId, files) => {
                if (!selectedHistoryUnit?.id) {
                  throw new Error("제품 정보를 찾을 수 없습니다.");
                }
                return handleUploadProcessRecordFiles(
                  selectedHistoryUnit.id,
                  recordId,
                  files
                );
              }}
              uploadingRecordKey={uploadingProcessRecordKey}
            />
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
            onClick={() => setRecordsModalUnitId(null)}
          >
            닫기
          </button>
        </div>
      </Modal>
    </>
  );
}
