import { useEffect, useMemo, useRef, useState } from "react";
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
import FileUploadDropzone from "../components/form/FileUploadDropzone";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import DatePicker from "../components/form/date-picker";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import TimePickerInput from "../components/form/TimePickerInput";
import { useAuth } from "../hooks/useAuth";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { getUsers } from "../api/user";
import {
  createDelivery,
  getDeliveryPlan,
  getDeliveryPlanUnitProcessRecords,
  linkUnitsToDeliveryItem,
  processDeliveryPlanUnitFail,
  processDeliveryPlanUnitPass,
  resolveProcessRecordIdForUpload,
  splitDeliveryPlan,
  uploadDeliveryPlanUnitProcessRecordFiles,
  type DeliveryPlanUnit,
  type Partner,
  type SplitDeliveryPlanPayload,
} from "../api/purchaseOrder";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_DETECTOR_ELEMENT,
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
  COMMON_CODE_GROUP_WAVELENGTH,
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
} from "../lib/deliveryPlanDetailHelpers";
import { labelForProcessCode } from "../lib/deliveryPlanProcessLabels";
import { dateTimeLocalToIso } from "../lib/processFormDatetime";
import { formatDateYmd } from "../lib/dateFormat";
import {
  buildMinimalDeliveryCreatePayloadFromPlanUnit,
  findProductDeliveryItemId,
} from "../lib/deliveryRegisterFromPlanUnit";
import { fileTypeIconSrc } from "../lib/fileTypeIcon";
import { ReactComponent as TrashBinIcon } from "../icons/trash.svg?react";
import {
  DELIVERY_PLAN_DETAIL_TAB_OPTIONS,
  type DeliveryPlanDetailTab,
} from "../components/delivery/deliveryPlanDetailTabTypes";
import { DeliveryPlanDetailOverviewTab } from "../components/delivery/DeliveryPlanDetailOverviewTab";
import { DeliveryPlanDetailLinesTab } from "../components/delivery/DeliveryPlanDetailLinesTab";
import { DeliveryPlanDetailSummaryTab } from "../components/delivery/DeliveryPlanDetailSummaryTab";
import { ProcessGateContextPanel } from "../components/delivery/ProcessGateContextPanel";
import { ProcessModalProductSummary } from "../components/delivery/ProcessModalProductSummary";
import { UnitProcessRecordsTimeline } from "../components/delivery/UnitProcessRecordsTimeline";
import Button from "../components/ui/button/Button";

function fileKey(f: File): string {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

function ymdForSplitInput(raw: unknown): string {
  const y = formatDateYmd(
    raw as string | null | undefined,
    { emptyFallback: "" }
  );
  return y && y !== "-" ? y : "";
}

/** 발주 상세 납품 모달과 동일 — 레거시 사용자 선택값 */
const LEGACY_USER_PREFIX = "legacy-user:";
function tryDecodeLegacyUser(selectValue: string): string | null {
  if (!selectValue.startsWith(LEGACY_USER_PREFIX)) return null;
  try {
    return decodeURIComponent(selectValue.slice(LEGACY_USER_PREFIX.length));
  } catch {
    return null;
  }
}
function deliveryManagerUserIdFromSelect(selectValue: string): number | null {
  const t = selectValue.trim();
  if (!t || t.startsWith(LEGACY_USER_PREFIX)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function PendingProcessAttachmentList({
  files,
  keyPrefix,
  onRemove,
}: {
  files: File[];
  keyPrefix: string;
  onRemove: (file: File) => void;
}) {
  if (files.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-white/10 dark:bg-white/[0.03]">
      {files.map((f, idx) => (
        <li key={`${keyPrefix}-${fileKey(f)}-${idx}`} className="flex items-center gap-2">
          <img
            src={fileTypeIconSrc(f.name)}
            alt=""
            className="h-5 w-5 shrink-0"
            decoding="async"
          />
          <span className="min-w-0 flex-1 truncate text-theme-sm text-gray-900 dark:text-gray-100">
            {f.name}
          </span>
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            title="첨부 제거"
            aria-label="첨부 제거"
            onClick={() => onRemove(f)}
          >
            <TrashBinIcon className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
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

export default function DeliveryPlanDetail() {
  const { orderId, planId } = useParams();
  const navigate = useNavigate();
  const oid = String(orderId ?? "").trim();
  const pid = String(planId ?? "").trim();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<DeliveryPlanDetailTab>("overview");
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

  const [passModalUnit, setPassModalUnit] = useState<DeliveryPlanUnit | null>(
    null
  );
  const [failModalUnit, setFailModalUnit] = useState<DeliveryPlanUnit | null>(
    null
  );
  const [recordsModalUnitId, setRecordsModalUnitId] = useState<string | null>(
    null
  );
  /** 표에서 「공정 처리」 클릭 시 먼저 열리는 선택 모달 */
  const [processEntryUnit, setProcessEntryUnit] =
    useState<DeliveryPlanUnit | null>(null);
  /** 출고 준비 완료 제품 — 실제 납품 등록 */
  const [deliverModal, setDeliverModal] = useState<{
    unit: DeliveryPlanUnit;
    purchaseOrderItemId: number;
  } | null>(null);
  const [deliverDate, setDeliverDate] = useState("");
  const [deliverRemark, setDeliverRemark] = useState("");
  /** 공정 처리 첨부 파일(현재는 UI 선택/확인용) */
  const [processAttachments, setProcessAttachments] = useState<File[]>([]);

  const [processCode, setProcessCode] = useState("");
  const [processName, setProcessName] = useState("");
  const [startedDate, setStartedDate] = useState("");
  const [startedTime, setStartedTime] = useState("");
  const [endedDate, setEndedDate] = useState("");
  const [endedTime, setEndedTime] = useState("");
  /** 날짜 선택 직후 시간 패널 자동 오픈용(0이면 무시). PASS/FAIL 모달이 같은 폼을 공유 */
  const [processStartedTimeOpenSeq, setProcessStartedTimeOpenSeq] =
    useState(0);
  const [processEndedTimeOpenSeq, setProcessEndedTimeOpenSeq] = useState(0);
  const [detectorSerialNoInput, setDetectorSerialNoInput] = useState("");
  const [passRemark, setPassRemark] = useState("");
  const [failReason, setFailReason] = useState("");
  const [actionTaken, setActionTaken] = useState("");

  const resetProcessForm = () => {
    setProcessCode("");
    setProcessName("");
    setStartedDate("");
    setStartedTime("");
    setEndedDate("");
    setEndedTime("");
    setProcessStartedTimeOpenSeq(0);
    setProcessEndedTimeOpenSeq(0);
    setDetectorSerialNoInput("");
    setPassRemark("");
    setFailReason("");
    setActionTaken("");
  };

  const clearProcessAttachments = () => {
    setProcessAttachments([]);
  };

  const passAttachmentsScrollRef = useRef<HTMLDivElement | null>(null);
  const passAttachmentsLenRef = useRef(0);
  const failAttachmentsScrollRef = useRef<HTMLDivElement | null>(null);
  const failAttachmentsLenRef = useRef(0);

  useEffect(() => {
    if (!passModalUnit) {
      passAttachmentsLenRef.current = 0;
      return;
    }
    const n = processAttachments.length;
    if (n > passAttachmentsLenRef.current) {
      queueMicrotask(() => {
        passAttachmentsScrollRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    }
    passAttachmentsLenRef.current = n;
  }, [passModalUnit, processAttachments.length]);

  useEffect(() => {
    if (!failModalUnit) {
      failAttachmentsLenRef.current = 0;
      return;
    }
    const n = processAttachments.length;
    if (n > failAttachmentsLenRef.current) {
      queueMicrotask(() => {
        failAttachmentsScrollRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    }
    failAttachmentsLenRef.current = n;
  }, [failModalUnit, processAttachments.length]);

  const {
    data: plan,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["deliveryPlan", pid],
    queryFn: () => getDeliveryPlan(pid, accessToken!),
    enabled: !!accessToken && !isAuthLoading && pid !== "",
  });

  const { data: modalRecords = [], isLoading: modalRecordsLoading } = useQuery({
    queryKey: ["deliveryPlanUnitProcessRecords", recordsModalUnitId],
    queryFn: () =>
      getDeliveryPlanUnitProcessRecords(recordsModalUnitId!, accessToken!),
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
    queryKey: ["deliveryPlanUnitProcessRecords", deliverRecordsUnitId],
    queryFn: () =>
      getDeliveryPlanUnitProcessRecords(deliverRecordsUnitId!, accessToken!),
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

  const { data: wavelengthCommonCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_WAVELENGTH,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: detectorElementCommonCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DETECTOR_ELEMENT,
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
      void queryClient.invalidateQueries({ queryKey: ["deliveryPlan", pid] });
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderDeliveryPlans", oid],
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

      const body: SplitDeliveryPlanPayload = { unitIds };
      const d = splitDeliveryDate.trim();
      if (d) body.deliveryDate = d;
      const p = splitPlannedDeliveryDate.trim();
      if (p) body.plannedDeliveryDate = p;
      
      const mgrId = deliveryManagerUserIdFromSelect(
        splitDeliveryManagerUserSelectValue
      );
      if (mgrId != null) {
        body.deliveryManagerId = mgrId;
      }
      const t = splitTitle.trim();
      if (t) body.title = t;
      const r = splitRemark.trim();
      if (r) body.remark = r;

      return splitDeliveryPlan(oid, body, accessToken);
    },
    onSuccess: (data) => {
      toast.success("새 납품 계획으로 분할되었습니다.");
      setSplitModalOpen(false);
      setSplitModalContext(null);
      setSelectedUnitIds(new Set());
      const newPlanId = data.plan?.id?.trim();
      void queryClient.invalidateQueries({ queryKey: ["deliveryPlan", pid] });
      if (newPlanId) {
        void queryClient.invalidateQueries({
          queryKey: ["deliveryPlan", newPlanId],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderDeliveryPlans", oid],
      });
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrder", oid] });
      if (newPlanId) {
        navigate(`/order/${oid}/plan/${newPlanId}`);
      }
    },
    onError: (e: Error) =>
      toast.error(e.message || "납품 계획 분할에 실패했습니다."),
  });

  const invalidateAfterProcessMutation = async (
    unitIdForHistory?: string | null
  ) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["deliveryPlan", pid] }),
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrderDeliveryPlans", oid],
      }),
    ]);
    const u = unitIdForHistory?.trim();
    if (!u) return;
    /** 비활성 쿼리(이력 모달 닫힘)도 즉시 재조회 — 기본 invalidate는 active만 refetch */
    await queryClient.invalidateQueries({
      queryKey: ["deliveryPlanUnitProcessRecords", u],
      refetchType: "all",
    });
  };

  const passMutation = useMutation({
    mutationFn: async () => {
      if (!passModalUnit?.id) throw new Error("제품 정보가 없습니다.");
      if (!accessToken) {
        throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      }
      const unitId = passModalUnit.id;
      const filesToUpload = [...processAttachments];
      const code = processCode.trim();
      const name = processName.trim();
      const detectorSerialNo = detectorSerialNoInput.trim();
      if (!code || !name) {
        throw new Error("공정 코드와 공정명을 입력하세요.");
      }
      if (
        code.trim().toUpperCase() ===
          UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING &&
        !detectorSerialNo
      ) {
        throw new Error("검출기 시리얼 넘버를 입력하세요.");
      }
      const result = await processDeliveryPlanUnitPass(
        unitId,
        {
          processCode: code,
          processName: name,
          detectorSerialNo: detectorSerialNo || undefined,
          remark: passRemark.trim() || undefined,
          startedAt: dateTimeLocalToIso(startedDate, startedTime),
          endedAt: dateTimeLocalToIso(endedDate, endedTime),
        },
        accessToken
      );

      if (filesToUpload.length > 0) {
        const recordId = await resolveProcessRecordIdForUpload(
          result,
          unitId,
          code,
          accessToken
        );
        if (!recordId) {
          throw new Error(
            "PASS는 저장되었으나 첨부를 연결할 공정 이력 id를 찾지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
          );
        }
        await uploadDeliveryPlanUnitProcessRecordFiles(
          unitId,
          recordId,
          filesToUpload,
          accessToken
        );
      }

      return { unitId };
    },
    onSuccess: async ({ unitId }) => {
      toast.success("PASS 처리되었습니다.");
      setPassModalUnit(null);
      resetProcessForm();
      clearProcessAttachments();
      await invalidateAfterProcessMutation(unitId);
    },
    onError: (e: Error) => {
      void invalidateAfterProcessMutation(passModalUnit?.id ?? null);
      toast.error(e.message || "PASS 처리에 실패했습니다.");
    },
  });

  const failMutation = useMutation({
    mutationFn: async () => {
      if (!failModalUnit?.id) throw new Error("제품 정보가 없습니다.");
      if (!accessToken) {
        throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      }
      const unitId = failModalUnit.id;
      const filesToUpload = [...processAttachments];
      const code = processCode.trim();
      const name = processName.trim();
      const reason = failReason.trim();
      if (!code || !name) {
        throw new Error("공정 코드와 공정명을 입력하세요.");
      }
      if (!reason) {
        throw new Error("불합격 사유를 입력하세요.");
      }
      const result = await processDeliveryPlanUnitFail(
        unitId,
        {
          processCode: code,
          processName: name,
          failReason: reason,
          actionTaken: actionTaken.trim() || undefined,
          startedAt: dateTimeLocalToIso(startedDate, startedTime),
          endedAt: dateTimeLocalToIso(endedDate, endedTime),
        },
        accessToken
      );

      if (filesToUpload.length > 0) {
        const recordId = await resolveProcessRecordIdForUpload(
          result,
          unitId,
          code,
          accessToken
        );
        if (!recordId) {
          throw new Error(
            "FAIL은 저장되었으나 첨부를 연결할 공정 이력 id를 찾지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
          );
        }
        await uploadDeliveryPlanUnitProcessRecordFiles(
          unitId,
          recordId,
          filesToUpload,
          accessToken
        );
      }

      return { unitId };
    },
    onSuccess: async ({ unitId }) => {
      toast.success("FAIL 처리되었습니다.");
      setFailModalUnit(null);
      resetProcessForm();
      clearProcessAttachments();
      await invalidateAfterProcessMutation(unitId);
    },
    onError: (e: Error) => {
      void invalidateAfterProcessMutation(failModalUnit?.id ?? null);
      toast.error(e.message || "FAIL 처리에 실패했습니다.");
    },
  });

  const openPassFromProcessGate = () => {
    const u = processEntryUnit;
    setProcessEntryUnit(null);
    resetProcessForm();
    clearProcessAttachments();
    if (u) {
      setProcessCode(u.currentProcessCode?.trim() ?? "");
      setProcessName(
        labelForProcessCode(u.currentProcessCode, unitProcessStepCodes)
      );
      setDetectorSerialNoInput(String(u.detectorSerialNo ?? "").trim());
      setPassModalUnit(u);
    }
  };

  const openFailFromProcessGate = () => {
    const u = processEntryUnit;
    setProcessEntryUnit(null);
    resetProcessForm();
    clearProcessAttachments();
    if (u) {
      setProcessCode(u.currentProcessCode?.trim() ?? "");
      setProcessName(
        labelForProcessCode(u.currentProcessCode, unitProcessStepCodes)
      );
      setFailModalUnit(u);
    }
  };

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
      plan.deliveryManagerId != null &&
        Number.isFinite(Number(plan.deliveryManagerId))
        ? String(plan.deliveryManagerId)
        : ""
    );
    setSplitTitle(plan.title?.trim() ?? "");
    setSplitRemark("");
    setSplitModalOpen(true);
  };

  if (!oid || !pid) {
    return (
      <>
        <PageMeta title="납품 계획" description="납품 계획" />
        <p className="text-sm text-red-600 dark:text-red-400">
          잘못된 경로입니다.
        </p>
      </>
    );
  }

  if (isLoading || !plan) {
    return (
      <>
        <PageMeta title="납품 계획" description="납품 계획" />
        <PageBreadcrumb pageTitle="납품 계획" />
        <div className="flex min-h-[320px] items-center justify-center">
          {isLoading && <LoadingLottie />}
          {!isLoading && isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "납품 계획을 불러오지 못했습니다."}
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
    plan.title?.trim() || plan.planNo?.trim() || "납품 계획";

  return (
    <>
      <PageMeta
        title={`납품 계획 ${plan.title?.trim() || plan.planNo || plan.id}`}
        description="납품 계획 상세"
      />
      <PageBreadcrumb pageTitle={`납품 계획 · ${breadcrumbTitle}`} />

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
            <SegmentedControl<DeliveryPlanDetailTab>
              value={activeTab}
              onChange={setActiveTab}
              options={DELIVERY_PLAN_DETAIL_TAB_OPTIONS}
              ariaLabel="납품 계획 상세 탭"
              equalWidth
              className="w-full"
            />
          </div>

          <div className="space-y-6 p-4 sm:p-6">
            {activeTab === "overview" ? (
              <DeliveryPlanDetailOverviewTab
                plan={plan}
                orderId={oid}
                orderNo={orderNoFromPlan}
                partnerLabel={partnerLabel}
                flatUnits={flatUnits}
                wavelengthCommonCodes={wavelengthCommonCodes}
                detectorElementCommonCodes={detectorElementCommonCodes}
                unitProcessStepCodes={unitProcessStepCodes}
                selectedUnitIds={selectedUnitIds}
                onSelectedUnitIdsChange={setSelectedUnitIds}
                splitDisabledReason={splitDisabledReason}
                onSplitClick={openSplitModalFromToolbar}
                onProcess={(u) => {
                  resetProcessForm();
                  clearProcessAttachments();
                  setProcessEntryUnit(u);
                }}
                onDeliver={({ unit, purchaseOrderItemId }) => {
                  if (
                    purchaseOrderItemId == null ||
                    !Number.isFinite(Number(purchaseOrderItemId)) ||
                    Number(purchaseOrderItemId) <= 0
                  ) {
                    toast.error(
                      "발주 품목 정보가 없어 납품을 등록할 수 없습니다."
                    );
                    return;
                  }
                  setDeliverModal({
                    unit,
                    purchaseOrderItemId: Number(purchaseOrderItemId),
                  });
                  setDeliverDate(defaultDeliveryDateYmd);
                  setDeliverRemark("");
                }}
                onRecords={(unitId) => setRecordsModalUnitId(unitId)}
                onNavigateTab={setActiveTab}
              />
            ) : null}
            {activeTab === "lines" ? (
              <DeliveryPlanDetailLinesTab items={plan.items ?? []} />
            ) : null}
            {activeTab === "summary" ? (
              <DeliveryPlanDetailSummaryTab plan={plan} />
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
              새 납품 계획으로 분할
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
        onClose={() => {
          setProcessEntryUnit(null);
          clearProcessAttachments();
        }}
        strictClose
        className="mx-4 flex max-h-[min(92vh,780px)] max-w-lg flex-col overflow-hidden p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              공정 현황
            </h3>
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
          <ProcessGateContextPanel unit={processEntryUnit} stepCodes={unitProcessStepCodes} />
        </div>

        <div className="mt-4 shrink-0 border-t border-gray-100 pt-4 dark:border-white/10">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              className="w-full rounded-lg border border-red-200 bg-white py-3 text-sm font-semibold text-red-700 shadow-theme-xs hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={() => openFailFromProcessGate()}
            >
              FAIL 입력 화면으로
            </button>
            <button
              type="button"
              className="w-full rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
              onClick={() => openPassFromProcessGate()}
            >
              PASS 입력 화면으로
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!passModalUnit}
        onClose={() => {
          setPassModalUnit(null);
          resetProcessForm();
          clearProcessAttachments();
        }}
        strictClose
        className="mx-4 flex min-h-0 max-h-[min(90vh,800px)] max-w-lg flex-col overflow-hidden p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              공정 PASS · 입력
            </h3>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              현황 확인 후 이 화면에서 일시·비고를 입력하고 PASS를 저장합니다.
            </p>
          </>
        }
      >
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/10 dark:bg-gray-800/50">
            <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              이번에 기록할 공정
            </p>
            <p className="mt-1 text-theme-sm text-gray-900 dark:text-white">
              {labelForProcessCode(processCode, unitProcessStepCodes) ||
                processName ||
                "—"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>시작 일시 (선택)</Label>
            </div>
            <DatePicker
              id="pass-started-date"
              placeholder="시작 날짜"
              value={startedDate}
              onValueChange={(v) => {
                setStartedDate(v);
                const d = v.trim();
                if (d && !startedTime.trim()) {
                  setProcessStartedTimeOpenSeq((n) => n + 1);
                }
              }}
              compact
            />
            <TimePickerInput
              id="pass-started-time"
              value={startedTime}
              onChange={setStartedTime}
              compact
              autoOpenSignal={processStartedTimeOpenSeq}
            />
            <div className="sm:col-span-2">
              <Label>종료 일시 (선택)</Label>
            </div>
            <DatePicker
              id="pass-ended-date"
              placeholder="종료 날짜"
              value={endedDate}
              onValueChange={(v) => {
                setEndedDate(v);
                const d = v.trim();
                if (d && !endedTime.trim()) {
                  setProcessEndedTimeOpenSeq((n) => n + 1);
                }
              }}
              compact
            />
            <TimePickerInput
              id="pass-ended-time"
              value={endedTime}
              onChange={setEndedTime}
              compact
              autoOpenSignal={processEndedTimeOpenSeq}
            />
          </div>
          {processCode.trim().toUpperCase() ===
          UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING ? (
            <div>
              <Label htmlFor="pass-detector-serial-no" required>
                검출기 시리얼 넘버
              </Label>
              <input
                id="pass-detector-serial-no"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-theme-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-4 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                value={detectorSerialNoInput}
                onChange={(e) => setDetectorSerialNoInput(e.target.value)}
                placeholder="예: EIA1DV15WNCA-2505-005"
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor="pass-remark">비고 (선택)</Label>
            <TextArea
              id="pass-remark"
              rows={2}
              value={passRemark}
              onChange={setPassRemark}
              className="mt-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div
            ref={passAttachmentsScrollRef}
            className={
              processAttachments.length > 0
                ? "scroll-mt-3 rounded-lg p-1 ring-1 ring-brand-500/25 dark:ring-brand-400/30"
                : "scroll-mt-3"
            }
          >
            <Label>첨부 파일 (선택)</Label>
            <FileUploadDropzone
              multiple
              uploadGuideText="공정 관련 파일을 첨부할 수 있습니다."
              buttonLabel="파일 선택"
              onSelectFiles={(files) => {
                setProcessAttachments((prev) => {
                  const next = [...prev];
                  for (const f of files) {
                    const key = `${f.name}-${f.size}-${f.lastModified}`;
                    const exists = next.some(
                      (x) => `${x.name}-${x.size}-${x.lastModified}` === key
                    );
                    if (!exists) next.push(f);
                  }
                  return next.slice(0, 20);
                });
              }}
              onError={(message) => toast.error(message)}
              className="mt-1"
            />
            {processAttachments.length > 0 ? (
              <p className="mt-2 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
                선택된 파일 {processAttachments.length}개
              </p>
            ) : (
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                PASS 저장이 끝나면 선택한 파일이 해당 공정 이력에 연결되어 업로드됩니다.
              </p>
            )}
            <PendingProcessAttachmentList
              files={processAttachments}
              keyPrefix="pass"
              onRemove={(f) =>
                setProcessAttachments((prev) =>
                  prev.filter(
                    (x) =>
                      !(
                        x.name === f.name &&
                        x.size === f.size &&
                        x.lastModified === f.lastModified
                      )
                  )
                )
              }
            />
          </div>
        </div>
        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-gray-100 pt-4 dark:border-white/10">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
            onClick={() => {
              setPassModalUnit(null);
              resetProcessForm();
              clearProcessAttachments();
            }}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={passMutation.isPending}
            onClick={() => passMutation.mutate()}
          >
            {passMutation.isPending ? "처리 중…" : "PASS 저장"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!failModalUnit}
        onClose={() => {
          setFailModalUnit(null);
          resetProcessForm();
          clearProcessAttachments();
        }}
        strictClose
        className="mx-4 flex min-h-0 max-h-[min(90vh,800px)] max-w-lg flex-col overflow-hidden p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              공정 FAIL · 입력
            </h3>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              현황 확인 후 이 화면에서 불합격 사유(필수) 등을 입력하고 FAIL을
              저장합니다.
            </p>
          </>
        }
      >
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/10 dark:bg-gray-800/50">
            <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              이번에 기록할 공정
            </p>
            <p className="mt-1 text-theme-sm text-gray-900 dark:text-white">
              {labelForProcessCode(processCode, unitProcessStepCodes) ||
                processName ||
                "—"}
            </p>
          </div>
          <div>
            <Label htmlFor="fail-reason" required>
              불합격 사유
            </Label>
            <TextArea
              id="fail-reason"
              rows={2}
              value={failReason}
              onChange={setFailReason}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fail-action">조치 내용 (선택)</Label>
            <TextArea
              id="fail-action"
              rows={2}
              value={actionTaken}
              onChange={setActionTaken}
              className="mt-1"
            />
          </div>
          <div
            ref={failAttachmentsScrollRef}
            className={
              processAttachments.length > 0
                ? "scroll-mt-3 rounded-lg p-1 ring-1 ring-brand-500/25 dark:ring-brand-400/30"
                : "scroll-mt-3"
            }
          >
            <Label>첨부 파일 (선택)</Label>
            <FileUploadDropzone
              multiple
              uploadGuideText="공정 관련 파일을 첨부할 수 있습니다."
              buttonLabel="파일 선택"
              onSelectFiles={(files) => {
                setProcessAttachments((prev) => {
                  const next = [...prev];
                  for (const f of files) {
                    const key = `${f.name}-${f.size}-${f.lastModified}`;
                    const exists = next.some(
                      (x) => `${x.name}-${x.size}-${x.lastModified}` === key
                    );
                    if (!exists) next.push(f);
                  }
                  return next.slice(0, 20);
                });
              }}
              onError={(message) => toast.error(message)}
              className="mt-1"
            />
            {processAttachments.length > 0 ? (
              <p className="mt-2 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
                선택된 파일 {processAttachments.length}개
              </p>
            ) : (
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                FAIL 저장이 끝나면 선택한 파일이 해당 공정 이력에 연결되어 업로드됩니다.
              </p>
            )}
            <PendingProcessAttachmentList
              files={processAttachments}
              keyPrefix="fail"
              onRemove={(f) =>
                setProcessAttachments((prev) =>
                  prev.filter(
                    (x) =>
                      !(
                        x.name === f.name &&
                        x.size === f.size &&
                        x.lastModified === f.lastModified
                      )
                  )
                )
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>시작 일시 (선택)</Label>
            </div>
            <DatePicker
              id="fail-started-date"
              placeholder="시작 날짜"
              value={startedDate}
              onValueChange={(v) => {
                setStartedDate(v);
                const d = v.trim();
                if (d && !startedTime.trim()) {
                  setProcessStartedTimeOpenSeq((n) => n + 1);
                }
              }}
              compact
            />
            <TimePickerInput
              id="fail-started-time"
              value={startedTime}
              onChange={setStartedTime}
              compact
              autoOpenSignal={processStartedTimeOpenSeq}
            />
            <div className="sm:col-span-2">
              <Label>종료 일시 (선택)</Label>
            </div>
            <DatePicker
              id="fail-ended-date"
              placeholder="종료 날짜"
              value={endedDate}
              onValueChange={(v) => {
                setEndedDate(v);
                const d = v.trim();
                if (d && !endedTime.trim()) {
                  setProcessEndedTimeOpenSeq((n) => n + 1);
                }
              }}
              compact
            />
            <TimePickerInput
              id="fail-ended-time"
              value={endedTime}
              onChange={setEndedTime}
              compact
              autoOpenSignal={processEndedTimeOpenSeq}
            />
          </div>
        </div>
        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-gray-100 pt-4 dark:border-white/10">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
            onClick={() => {
              setFailModalUnit(null);
              resetProcessForm();
              clearProcessAttachments();
            }}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={failMutation.isPending}
            onClick={() => failMutation.mutate()}
          >
            {failMutation.isPending ? "처리 중…" : "FAIL 저장"}
          </button>
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
