import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  startTransition,
  type ReactNode,
} from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import { OrderDetailLinesCard } from "../components/order/OrderDetailLinesCard";
// import { OrderDetailDeliveriesCard } from "../components/order/OrderDetailDeliveriesCard";
import { OrderDetailProductionPlansCard } from "../components/order/OrderDetailProductionPlansCard";
import { ProductionPlanOrderSummary } from "../components/order/ProductionPlanOrderSummary";
import { ProductionQuantityInputSection } from "../components/order/ProductionQuantityInputSection";
import { OrderDetailLinkUnitsModal } from "../components/order/OrderDetailLinkUnitsModal";
import { OrderReceiveConfirmModal } from "../components/order/OrderReceiveConfirmModal";
import { buttonClassName } from "../lib/ui/buttonStyles";
import LoadingLottie from "../components/common/LoadingLottie";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../hooks/useAuth";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  getPurchaseOrder,
  getPurchaseOrderFiles,
  getDeliveries,
  createDelivery,
  createProductionPlan,
  getProductionPlan,
  getPurchaseOrderLotPreview,
  issueProductionPlanLotUnits,
  getPurchaseOrderProductionPlans,
  getProductionPlanUnits,
  getPurchaseOrderSerialMaxSequence,
  aggregateDeliveredQtyByOrderItemId,
  type ProductionPlanUnitTab,
  getPurchaseOrderRequestDepartmentLabel,
  updatePurchaseOrder,
  type PurchaseOrderDetail,
  type PurchaseOrderFile,
  type PurchaseOrderItem,
  type Delivery,
  type DeliveryCreatePayload,
  type IssueLotUnitsPayload,
  type ProductionPlan,
  type ProductionPlanCreatePayload,
  type DeliveryCreateLinePayload,
  type Partner,
} from "../api/purchaseOrder";
import { API_BASE } from "../api/apiBase";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_LOT_YEAR_CODE,
} from "../api/commonCode";
import { partnerSelectLabel } from "../domains/partner/display/partnerDisplay";
import { partnerCountryFlagUrl } from "../domains/partner/helpers/partnerCountryOptions";
import Label from "../components/form/Label";
import DatePicker from "../components/form/date-picker";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import TextArea from "../components/form/input/TextArea";
import { formatCurrency } from "../lib/format/formatCurrency";
import { lineItemsToAmountSummaries } from "../domains/order/helpers/orderLineAmountSummary";
import { fileTypeIconSrc } from "../lib/ui/fileTypeIcon";
import { compactYmd, formatDateYmd } from "../lib/format/dateFormat";
import {
  dueDateDdayBadgeClassName,
  getDueDateRelative,
} from "../lib/format/dueDateDisplay";
import { buildApiFileUrl, downloadFileWithAuth } from "../lib/fileDownload";
import { ReactComponent as ArrowDownTrayIcon } from "../icons/arrow-down-tray.svg?react";
import {
  ListIcon,
  PencilIcon,
  PlusIcon,
  CalenderIcon,
  DollarLineIcon,
  // TruckIcon,
  CogIcon,
} from "../icons";
import IconTooltip from "../components/ui/tooltip/IconTooltip";
import { getUsers } from "../api/user";
import {
  getOrganizationTree,
  flattenOrganizationUnitsForSelect,
} from "../api/organization";
import { parsePositiveIntId } from "../lib/parseId";
import {
  LEGACY_USER_PREFIX,
  legacyDeptValue,
  tryDecodeLegacyDept,
  tryDecodeLegacyUser,
} from "../lib/legacySelectValue";
import {
  buildLtSerialNo,
  ltSerialExample,
  ltSerialSequenceKey,
  LT_SERIAL_PATTERN_DESCRIPTION,
} from "../lib/format/ltSerialFormat";
import {
  LOT_UNIT_CODE_PATTERN_DESCRIPTION,
  yearCodeFromOrderDate,
} from "../lib/format/lotUnitCodeFormat";
import {
  distributeProductionPlanItems,
  type ProductionPlanItemInput,
} from "../domains/production-plan/helpers/distributeItems";
import {
  aggregateProductionPlanQtyByOrderItemId,
  aggregateProductionUnitQtyByOrderItemId,
  mergeProductionRegisteredQtyByOrderItemId,
} from "../domains/production-plan/helpers/aggregateRegisteredQty";
import {
  resolveOrderLineDetectorElementInitial,
  resolveOrderLineDetectorId,
  resolveOrderLineWavelengthCode,
} from "../domains/production-plan/helpers/serialFromOrderLine";

function OrderDetailInfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start border-b border-gray-100 py-3 last:border-b-0 dark:border-white/[0.05]">
      <dt className="w-28 shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-32">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-gray-800 dark:text-white/90">
        {value}
      </dd>
    </div>
  );
}

function OrderDetailTextAreaRow({
  label,
  text,
}: {
  label: string;
  text: string | null | undefined;
}) {
  const trimmed = text?.trim() ?? "";
  return (
    <div className="border-b border-gray-100 py-3 last:border-b-0 dark:border-white/[0.05]">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div
        className="mt-2 min-h-[5.5rem] w-full rounded-lg border border-gray-300 bg-gray-50 p-3.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"
        role="textbox"
        aria-readonly="true"
        aria-label={label}
      >
        {trimmed ? (
          <p className="whitespace-pre-wrap">{trimmed}</p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">—</p>
        )}
      </div>
    </div>
  );
}

function OrderSummaryMetric({
  icon,
  label,
  children,
  badge,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4 sm:px-5 sm:py-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-300 sm:size-12">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {badge ? (
          <div className="mt-0.5 flex flex-wrap items-end gap-2">
            <span className="text-sm font-semibold tabular-nums leading-snug text-gray-900 dark:text-white">
              {children}
            </span>
            {badge}
          </div>
        ) : (
          <div className="mt-0.5 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function deliveryManagerUserIdFromSelect(selectValue: string): number | null {
  const t = selectValue.trim();
  if (!t || t.startsWith(LEGACY_USER_PREFIX)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type DeliverySerialPreviewRow = {
  key: string;
  orderItemId: number;
  lineLabel: string;
  serialNo: string;
  sequenceKey: string;
  detectorElementCode: string;
  wavelengthCode: string;
  detectorId: number;
  serialSnapshot?: Record<string, unknown>;
};

type DeliveryLotPreviewRow = {
  key: string;
  orderItemId: number;
  lineLabel: string;
  offset: number;
  unitCode: string;
  operatorUserId: string;
};

const SERIAL_PREVIEW_DEBOUNCE_MS = 280;
const LOT_PREVIEW_DEBOUNCE_MS = 280;
const PRODUCTION_UNIT_QTY_FETCH_PAGE_SIZE = 500;
const PRODUCTION_UNIT_TABS_FOR_QTY = [
  "WAITING",
  "IN_PROGRESS",
  "COMPLETED",
  "DELAYED",
] as const satisfies readonly ProductionPlanUnitTab[];

function parseThisProductionQtyInput(raw: string): number {
  const trimmed = raw.trim();
  const n = Number(trimmed);
  if (!trimmed || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return 0;
  }
  return n;
}

function firstLineProductWithBusiness(
  line: PurchaseOrderItem | undefined
): string {
  if (!line) return "-";
  const baseLabel =
    line.itemName?.trim() ||
    line.productNameSnapshot?.trim() ||
    line.definitionNameSnapshot?.trim() ||
    (line.productId != null && String(line.productId).trim() !== ""
      ? `제품 #${line.productId}`
      : `라인 #${line.id}`);
  const lineCode =
    line.businessName?.trim() ||
    line.businessNameSnapshot?.trim() ||
    line.versionSnapshot?.trim() ||
    "";
  if (
    !lineCode ||
    baseLabel.includes(`(${lineCode})`) ||
    baseLabel.startsWith("제품 #") ||
    baseLabel.startsWith("라인 #")
  ) {
    return baseLabel;
  }
  return `${baseLabel} (${lineCode})`;
}

function buildProductionPlanAutoTitle(opts: {
  plannedDeliveryDate: string;
  deliveryDate: string;
  lines: PurchaseOrderItem[];
  nextPlanSeq: number;
}): string {
  const plannedOrDelivery =
    opts.plannedDeliveryDate.trim() || opts.deliveryDate.trim();
  const compact =
    compactYmd(plannedOrDelivery) ||
    compactYmd(new Date().toISOString()) ||
    "";
  const productSeg = firstLineProductWithBusiness(opts.lines[0]);
  const totalQty = opts.lines.reduce(
    (s, l) => s + (Number(l.qty) || 0),
    0
  );
  return `${compact}-${productSeg}-${totalQty} ${opts.nextPlanSeq}차 생산계획`;
}

/**
 * 접수 / 생산 계획 / 실제 생산
 * -----------------------------------------------------------------
 * - 접수: PUT `.../purchase-orders/:id` (status=PO_CLOSED) — 발주 즉시 종결.
 * - 생산 계획: POST `.../production-plans` — `ProductionPlanCreatePayload`, 종결 후 등록, 상세는 `/order/:id/plan/:planId`.
 * - 실제 생산: POST `.../deliveries` — `PO_CLOSED` 일 때만 허용; 저장 후 Unit 연결 모달에서 `delivery-items/:id/units`.
 *
 * UI: 과거 테이블형 상세(`?layout=classic`)는 제거됨 — 카드형 요약 레이아웃만 유지합니다.
 */
export default function OrderDetail() {
  const { orderId } = useParams();
  const id = String(orderId ?? "").trim();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser, accessToken, isLoading: isAuthLoading } = useAuth();

  /** 생산 모달: 실제 생산 vs 생산 계획 — 동일 폼 UI, 저장 API·payload 필드만 다름 */
  const [deliveryModalPurpose, setDeliveryModalPurpose] = useState<
    "actual" | "plan"
  >("actual");
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [linkUnitsModalOpen, setLinkUnitsModalOpen] = useState(false);
  const [linkUnitsDelivery, setLinkUnitsDelivery] = useState<Delivery | null>(
    null
  );
  const [deliveryTitle, setDeliveryTitle] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState("");
  const [deliveryRemark, setDeliveryRemark] = useState("");
  /** 생산 담당자 — 발주 등록과 동일: 조직 단위 id(문자열) + 사용자 id(문자열) */
  const [deliveryManagerDeptSelectValue, setDeliveryManagerDeptSelectValue] =
    useState("");
  const [deliveryManagerUserSelectValue, setDeliveryManagerUserSelectValue] =
    useState("");
  const [deliveryLotBulkOperatorUserValue, setDeliveryLotBulkOperatorUserValue] =
    useState("");
  const [deliverySerialQtyInput, setDeliverySerialQtyInput] = useState("");
  const [isSerialRulePopoverOpen, setIsSerialRulePopoverOpen] = useState(false);
  const [deliverySerialPreviewRows, setDeliverySerialPreviewRows] = useState<
    DeliverySerialPreviewRow[]
  >([]);
  const [deliveryLotPreviewRows, setDeliveryLotPreviewRows] = useState<
    DeliveryLotPreviewRow[]
  >([]);
  const [isLotBulkOperatorPopoverOpen, setIsLotBulkOperatorPopoverOpen] =
    useState(false);
  const [isLotRulePopoverOpen, setIsLotRulePopoverOpen] = useState(false);
  const serialPreviewGenRequestRef = useRef(0);
  const lotPreviewGenRequestRef = useRef(0);
  const lotBulkOperatorPopoverRef = useRef<HTMLDivElement | null>(null);
  const resetDeliveryModalForm = useCallback(() => {
    setDeliveryTitle("");
    setDeliveryDate("");
    setPlannedDeliveryDate("");
    setDeliveryRemark("");
    setDeliveryManagerDeptSelectValue("");
    setDeliveryManagerUserSelectValue("");
    setDeliveryLotBulkOperatorUserValue("");
    setDeliverySerialQtyInput("");
    setIsSerialRulePopoverOpen(false);
    setDeliverySerialPreviewRows([]);
    setIsLotBulkOperatorPopoverOpen(false);
    setIsLotRulePopoverOpen(false);
    setDeliveryLotPreviewRows([]);
  }, []);

  const updateDeliveryLotPreviewOperatorUser = useCallback(
    (index: number, nextOperatorUserId: string) => {
      setDeliveryLotPreviewRows((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const copy = [...prev];
        copy[index] = { ...copy[index], operatorUserId: nextOperatorUserId };
        return copy;
      });
    },
    []
  );

  const applyBulkOperatorUserToLotPreviewRows = useCallback(() => {
    const operatorUserId = deliveryManagerUserIdFromSelect(
      deliveryLotBulkOperatorUserValue
    );
    if (operatorUserId == null) return;
    setDeliveryLotPreviewRows((prev) =>
      prev.map((row) => ({ ...row, operatorUserId: String(operatorUserId) }))
    );
    setIsLotBulkOperatorPopoverOpen(false);
  }, [deliveryLotBulkOperatorUserValue]);

  useEffect(() => {
    if (!isLotBulkOperatorPopoverOpen) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (lotBulkOperatorPopoverRef.current?.contains(target)) return;
      setIsLotBulkOperatorPopoverOpen(false);
    };
    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLotBulkOperatorPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [isLotBulkOperatorPopoverOpen]);

  const updateDeliverySerialPreviewSerialNo = useCallback(
    (index: number, nextSerialNo: string) => {
      setDeliverySerialPreviewRows((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const copy = [...prev];
        const row = copy[index];
        const serialSnapshot =
          row.serialSnapshot && typeof row.serialSnapshot === "object"
            ? { ...row.serialSnapshot, serialNo: nextSerialNo }
            : row.serialSnapshot;
        copy[index] = { ...row, serialNo: nextSerialNo, serialSnapshot };
        return copy;
      });
    },
    []
  );

  /** 접수(종결) 확인 모달 */
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);

  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => getPurchaseOrder(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  const { data: files = [] } = useQuery({
    queryKey: ["purchaseOrderFiles", id],
    queryFn: () => getPurchaseOrderFiles(id, accessToken!),
    enabled: !!accessToken && id !== "",
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["purchaseOrderDeliveries", id],
    queryFn: () => getDeliveries(id, accessToken!),
    enabled: !!accessToken && id !== "",
  });

  const { data: poProductionPlans = [] } = useQuery({
    queryKey: ["purchaseOrderProductionPlans", id],
    queryFn: () => getPurchaseOrderProductionPlans(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  const nextProductionPlanSeq = useMemo(
    () =>
      Math.max(0, ...poProductionPlans.map((p) => p.planSeq ?? 0)) + 1,
    [poProductionPlans]
  );

  const deliveredByOrderItemId = useMemo(
    () => aggregateDeliveredQtyByOrderItemId(deliveries as Delivery[]),
    [deliveries]
  );

  const { data: orderProductionUnitRows = [] } = useQuery({
    queryKey: ["productionPlanUnits", id, "byOrderForQty"],
    queryFn: async () => {
      const results = await Promise.all(
        PRODUCTION_UNIT_TABS_FOR_QTY.map((tab) =>
          getProductionPlanUnits(accessToken!, {
            tab,
            orderId: id,
            page: 1,
            pageSize: PRODUCTION_UNIT_QTY_FETCH_PAGE_SIZE,
          })
        )
      );
      return results.flatMap((r) => r.items);
    },
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  const registeredByOrderItemId = useMemo(
    () =>
      mergeProductionRegisteredQtyByOrderItemId(
        aggregateProductionPlanQtyByOrderItemId(poProductionPlans),
        aggregateProductionUnitQtyByOrderItemId(orderProductionUnitRows)
      ),
    [poProductionPlans, orderProductionUnitRows]
  );

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: lotYearCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_LOT_YEAR_CODE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && deliveryModalOpen }
  );

  /* 생산 실적 카드 비표시 시 DELIVERY_STATUS 코드 불필요 — 카드 복구 시 함께 해제
  const { data: deliveryStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );
  */
  /** 로그인 사용자 id 매칭용 전 사용자 목록 */
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  /** JWT·로그인 user.id 우선, 없으면 GET /users 에서 employeeNo 로 매칭(작성자·접수 버튼 등) */
  const currentUserId = useMemo(() => {
    if (!authUser) return undefined;
    const fromAuth = parsePositiveIntId(
      (authUser as Record<string, unknown>).id
    );
    if (fromAuth !== undefined) return fromAuth;
    const row = users.find((u) => u.employeeNo === authUser.employeeNo);
    return row?.id;
  }, [authUser, users]);

  const {
    data: orgTree = [],
  } = useQuery({
    queryKey: ["organizationTree"],
    queryFn: () => getOrganizationTree(accessToken ?? undefined),
    enabled: !!accessToken && !isAuthLoading,
  });

  const departmentOptionsFromTree = useMemo(
    () => flattenOrganizationUnitsForSelect(orgTree),
    [orgTree]
  );

  const deliveryManagerUserOptions = useMemo(() => {
    const opts = users
      .filter((u) => u.isActive !== false)
      .map((u) => ({
        value: String(u.id),
        label: `${u.name} (${u.employeeNo})`,
      }));
    const sel = deliveryManagerUserSelectValue;
    if (!sel || opts.some((o) => o.value === sel)) return opts;
    const legacyName = tryDecodeLegacyUser(sel);
    if (legacyName) {
      opts.unshift({ value: sel, label: `${legacyName} (저장된 값)` });
      return opts;
    }
    opts.unshift({ value: sel, label: `사용자 #${sel}` });
    return opts;
  }, [users, deliveryManagerUserSelectValue]);

  const operatorUserOptions = useMemo(
    () =>
      users
        .filter((u) => u.isActive !== false)
        .map((u) => ({
          value: String(u.id),
          label: `${u.name} (${u.employeeNo})`,
        })),
    [users]
  );

  useEffect(() => {
    if (!deliveryModalOpen) return;
    const legacyPath = tryDecodeLegacyDept(deliveryManagerDeptSelectValue);
    if (legacyPath == null) return;
    const match = departmentOptionsFromTree.find((o) => o.label === legacyPath);
    if (match) {
      startTransition(() => setDeliveryManagerDeptSelectValue(match.value));
    }
  }, [
    deliveryModalOpen,
    departmentOptionsFromTree,
    deliveryManagerDeptSelectValue,
  ]);

  useEffect(() => {
    if (!deliveryModalOpen || !order) return;
    const poDetail = order as PurchaseOrderDetail;
    const name = (poDetail.requesterName ?? "").trim();
    if (!name) return;
    if (deliveryManagerUserSelectValue !== "") return;
    if (users.length === 0) return;
    const u = users.find((x) => x.name === name && x.isActive !== false);
    if (u) {
      startTransition(() =>
        setDeliveryManagerUserSelectValue(String(u.id))
      );
    }
  }, [
    deliveryModalOpen,
    order,
    users,
    deliveryManagerUserSelectValue,
  ]);

  /* 생산 실적 카드 전용 — 카드 복구 시 함께 해제
  const deliveryStatusDisplayName = useCallback(
    (statusCode: string | null | undefined) => {
      const code = String(statusCode ?? "").trim();
      if (!code) return "-";
      const hit = deliveryStatusCodes.find((item) => item.code === code);
      return hit?.name || code;
    },
    [deliveryStatusCodes]
  );
  */

  /** 접수 시 발주 상태를 즉시 종결(PO_CLOSED)로 변경 */
  const receiveMutation = useMutation({
    mutationFn: async () =>
      updatePurchaseOrder(
        id,
        {
          status: "PO_CLOSED",
          statusChangeComment: "발주 접수로 인한 종결 처리",
        },
        accessToken!
      ),
    onSuccess: () => {
      toast.success("접수되어 발주가 종결되었습니다.");
      setReceiveConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "접수 처리에 실패했습니다."),
  });

  const deliveryMutation = useMutation({
    mutationFn: async (vars: {
      deliveryPayload?: DeliveryCreatePayload;
      productionPlanPayload?: ProductionPlanCreatePayload;
      planDraftItems?: ProductionPlanItemInput[];
      lotPreviewRows?: DeliveryLotPreviewRow[];
      purpose: "actual" | "plan";
    }) => {
      if (vars.purpose === "plan") {
        const createdPlan = await createProductionPlan(
          id,
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
      return createDelivery(id, vars.deliveryPayload!, accessToken!);
    },
    onSuccess: (data, vars) => {
      if (vars.purpose === "plan") {
        const plan = data as ProductionPlan;
        toast.success("생산 계획이 등록되고 LOT가 발급되었습니다.");
        setDeliveryModalOpen(false);
        resetDeliveryModalForm();
        setDeliveryModalPurpose("actual");
        queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
        queryClient.invalidateQueries({
          queryKey: ["purchaseOrderProductionPlans", id],
        });
        queryClient.invalidateQueries({
          queryKey: ["productionPlanUnits", id, "byOrderForQty"],
        });
        navigate(`/order/${id}/plan/${plan.id}`);
        return;
      }
      const delivery = data as Delivery;
      toast.success("생산 및 시리얼이 등록되었습니다.");
      setDeliveryModalOpen(false);
      resetDeliveryModalForm();
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderDeliveries", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      setLinkUnitsDelivery(delivery);
      setLinkUnitsModalOpen(true);
    },
    onError: (e: Error, vars) =>
      toast.error(
        e.message ||
          (vars.purpose === "plan"
            ? "생산 계획·LOT 발급에 실패했습니다."
            : "생산/시리얼 등록에 실패했습니다.")
      ),
  });

  const orderLineSummaries = useMemo(() => {
    if (!order) return [];
    const d = order as PurchaseOrderDetail;
    return lineItemsToAmountSummaries(
      d.orderItems ?? d.items ?? [],
      d.currencyCode ?? "KRW"
    );
  }, [order]);

  const orderLines = useMemo(
    () =>
      ((order as PurchaseOrderDetail | undefined)?.orderItems ??
        (order as PurchaseOrderDetail | undefined)?.items ??
        []) as PurchaseOrderItem[],
    [order]
  );

  useEffect(() => {
    if (!deliveryModalOpen || deliveryModalPurpose !== "plan") return;
    startTransition(() => {
      setDeliveryTitle(
        buildProductionPlanAutoTitle({
          plannedDeliveryDate,
          deliveryDate,
          lines: orderLines,
          nextPlanSeq: nextProductionPlanSeq,
        })
      );
    });
  }, [
    deliveryModalOpen,
    deliveryModalPurpose,
    plannedDeliveryDate,
    deliveryDate,
    orderLines,
    nextProductionPlanSeq,
  ]);

  const generateSerialPreview = useCallback(async () => {
    if (
      !deliveryModalOpen ||
      deliveryModalPurpose !== "actual" ||
      !order ||
      !accessToken ||
      !id
    ) {
      return;
    }

    const requestId = ++serialPreviewGenRequestRef.current;
    const poDetail = order as PurchaseOrderDetail;
    const raw = deliverySerialQtyInput.trim();
    const qtyRequested = parseThisProductionQtyInput(raw);

    if (!raw || qtyRequested <= 0) {
      setDeliverySerialPreviewRows([]);
      return;
    }

    if (!deliveryDate.trim()) {
      setDeliverySerialPreviewRows([]);
      return;
    }

    const lines = ((poDetail.orderItems ?? poDetail.items ?? []) as PurchaseOrderItem[]);
    if (lines.length === 0) {
      setDeliverySerialPreviewRows([]);
      return;
    }

    const totalQty = lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
    const deliveredQty = lines.reduce(
      (sum, line) => sum + (deliveredByOrderItemId.get(line.id) ?? 0),
      0
    );
    const remainingQty = Math.max(0, totalQty - deliveredQty);
    const qty = Math.min(qtyRequested, remainingQty);

    if (qty <= 0) {
      setDeliverySerialPreviewRows([]);
      return;
    }

    const yearCode = yearCodeFromOrderDate(
      deliveryDate.trim(),
      lotYearCodes
    );
    if (!yearCode) {
      setDeliverySerialPreviewRows([]);
      return;
    }

    const partnerCode = String(poDetail.partner?.code ?? "").trim().toUpperCase();
    if (!partnerCode) {
      setDeliverySerialPreviewRows([]);
      return;
    }

    const qtyEps = 1e-9;

    const plannedRows: Array<{
      orderItemId: number;
      lineLabel: string;
      assignQty: number;
      detectorElementCode: string;
      wavelengthCode: string;
      detectorId: number;
    }> = [];

    let remainingToAssign = qty;
    for (const line of lines) {
      if (remainingToAssign <= qtyEps) break;
      const prev = deliveredByOrderItemId.get(line.id) ?? 0;
      const lineRemaining = Math.max(0, line.qty - prev);
      const assignQty = Math.min(
        Math.max(0, Math.floor(lineRemaining)),
        Math.floor(remainingToAssign)
      );
      if (assignQty > 0 && resolveOrderLineDetectorId(line) == null) {
        setDeliverySerialPreviewRows([]);
        return;
      }

      plannedRows.push({
        orderItemId: line.id,
        lineLabel: firstLineProductWithBusiness(line),
        assignQty,
        detectorElementCode: resolveOrderLineDetectorElementInitial(line),
        wavelengthCode: resolveOrderLineWavelengthCode(line),
        detectorId: resolveOrderLineDetectorId(line) ?? 0,
      });
      remainingToAssign -= assignQty;
    }

    const sequenceKey = ltSerialSequenceKey(
      deliveryDate.trim(),
      yearCode,
      partnerCode
    );

    let nextSequenceNo = 1;
    try {
      const sequenceResult = await getPurchaseOrderSerialMaxSequence(
        id,
        sequenceKey,
        accessToken
      );
      nextSequenceNo = sequenceResult.nextSequence;
    } catch {
      if (requestId !== serialPreviewGenRequestRef.current) return;
      setDeliverySerialPreviewRows([]);
      return;
    }

    if (requestId !== serialPreviewGenRequestRef.current) return;

    const nextSerialRows: DeliverySerialPreviewRow[] = [];
    let sequenceOffset = 0;
    plannedRows.forEach((row) => {
      for (let i = 0; i < row.assignQty; i += 1) {
        const seqNo = nextSequenceNo + sequenceOffset;
        sequenceOffset += 1;
        const serialNo = buildLtSerialNo({
          deliveryDate: deliveryDate.trim(),
          yearCode,
          partnerCode,
          sequenceNo: seqNo,
        });
        nextSerialRows.push({
          key: `oi-${row.orderItemId}-lt-${seqNo}`,
          orderItemId: row.orderItemId,
          lineLabel: row.lineLabel,
          serialNo,
          sequenceKey,
          detectorElementCode: row.detectorElementCode,
          wavelengthCode: row.wavelengthCode,
          detectorId: row.detectorId,
          serialSnapshot: {
            source: "frontend",
            format: "LT",
            detectorElementCode: row.detectorElementCode,
            wavelengthCode: row.wavelengthCode,
            detectorId: row.detectorId,
            sequenceKey,
            serialNo,
            deliveryDate: deliveryDate.trim(),
            yearCode,
            partnerCode,
            sequenceNo: seqNo,
          },
        });
      }
    });

    setDeliverySerialPreviewRows(nextSerialRows);
  }, [
    deliveryModalOpen,
    deliveryModalPurpose,
    order,
    accessToken,
    id,
    deliverySerialQtyInput,
    deliveryDate,
    deliveredByOrderItemId,
    lotYearCodes,
  ]);

  useEffect(() => {
    if (!deliveryModalOpen || deliveryModalPurpose !== "actual") return;
    const timer = window.setTimeout(() => {
      void generateSerialPreview();
    }, SERIAL_PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [deliveryModalOpen, deliveryModalPurpose, generateSerialPreview]);

  const generateLotPreview = useCallback(async () => {
    if (
      !deliveryModalOpen ||
      deliveryModalPurpose !== "plan" ||
      !accessToken ||
      !id
    ) {
      return;
    }

    const requestId = ++lotPreviewGenRequestRef.current;
    const raw = deliverySerialQtyInput.trim();
    const qtyRequested = parseThisProductionQtyInput(raw);

    if (!raw || qtyRequested <= 0 || !deliveryDate.trim()) {
      setDeliveryLotPreviewRows([]);
      return;
    }

    const totalQty = orderLines.reduce(
      (sum, line) => sum + (Number(line.qty) || 0),
      0
    );
    const registeredQty = orderLines.reduce(
      (sum, line) => sum + (registeredByOrderItemId.get(line.id) ?? 0),
      0
    );
    const remainingQty = Math.max(0, totalQty - registeredQty);
    const qty = Math.min(qtyRequested, remainingQty);

    if (qty <= 0) {
      setDeliveryLotPreviewRows([]);
      return;
    }

    const { items: plannedItems, error } = distributeProductionPlanItems(
      orderLines,
      qty,
      registeredByOrderItemId
    );
    if (error) {
      setDeliveryLotPreviewRows([]);
      return;
    }

    try {
      const result = await getPurchaseOrderLotPreview(
        id,
        { quantity: qty, issuedDate: deliveryDate.trim() },
        accessToken
      );
      if (requestId !== lotPreviewGenRequestRef.current) return;
      const previewRows = result.previews;
      if (previewRows.length < qty) {
        setDeliveryLotPreviewRows([]);
        return;
      }
      setDeliveryLotPreviewRows((prev) => {
        const previousOperatorByKey = new Map(
          prev.map((row) => [`${row.orderItemId}:${row.offset}`, row.operatorUserId])
        );
        const nextRows: DeliveryLotPreviewRow[] = [];
        let previewIndex = 0;
        plannedItems.forEach((item) => {
          const line = orderLines.find(
            (orderLine) => orderLine.id === item.purchaseOrderItemId
          );
          const lineLabel = firstLineProductWithBusiness(line);
          for (let offset = 0; offset < item.plannedQty; offset += 1) {
            const preview = previewRows[previewIndex];
            if (!preview) break;
            previewIndex += 1;
            nextRows.push({
              key:
                `lot-preview-${item.purchaseOrderItemId}-${offset}-` +
                `${preview.unitCode || previewIndex}`,
              orderItemId: item.purchaseOrderItemId,
              lineLabel,
              offset,
              unitCode: preview.unitCode,
              operatorUserId:
                previousOperatorByKey.get(
                  `${item.purchaseOrderItemId}:${offset}`
                ) ?? "",
            });
          }
        });
        return nextRows;
      });
    } catch {
      if (requestId !== lotPreviewGenRequestRef.current) return;
      setDeliveryLotPreviewRows([]);
    }
  }, [
    deliveryModalOpen,
    deliveryModalPurpose,
    accessToken,
    id,
    deliverySerialQtyInput,
    deliveryDate,
    orderLines,
    registeredByOrderItemId,
  ]);

  useEffect(() => {
    if (!deliveryModalOpen || deliveryModalPurpose !== "plan") return;
    const timer = window.setTimeout(() => {
      void generateLotPreview();
    }, LOT_PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [deliveryModalOpen, deliveryModalPurpose, generateLotPreview]);

  if (orderLoading || !order) {
    return (
      <>
        <PageMeta title="발주 상세" description="발주 상세" />
        <PageBreadcrumb pageTitle="발주 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          {orderLoading && <LoadingLottie />}
          {!orderLoading && orderError && (
            <p className="text-sm text-red-600 dark:text-red-400">발주를 불러오지 못했습니다.</p>
          )}
        </div>
      </>
    );
  }

  const po = order as PurchaseOrderDetail;
  /** 생산 모달 초기값 등에 쓰는 요청 부서 문자열(API 별칭 통합) */
  const requestDeptLabel = getPurchaseOrderRequestDepartmentLabel(po);
  const hasDeliveryTargets = orderLines.length > 0;
  const orderTotalQty = orderLines.reduce(
    (sum, line) => sum + (Number(line.qty) || 0),
    0
  );
  const orderRegisteredQty = orderLines.reduce(
    (sum, line) => sum + (registeredByOrderItemId.get(line.id) ?? 0),
    0
  );
  const orderDeliveredQty = orderLines.reduce(
    (sum, line) => sum + (deliveredByOrderItemId.get(line.id) ?? 0),
    0
  );
  const isPlanProductionModal = deliveryModalPurpose === "plan";
  const orderConsumedQty = isPlanProductionModal
    ? orderRegisteredQty
    : orderDeliveredQty;
  const orderRemainingQty = Math.max(0, orderTotalQty - orderConsumedQty);
  const thisProductionQty = parseThisProductionQtyInput(deliverySerialQtyInput);
  const displayedConsumedQty = orderConsumedQty + thisProductionQty;
  const displayedRemainingQty = orderTotalQty - displayedConsumedQty;

  const openDeliveryRegistrationModal = (purpose: "actual" | "plan") => {
    setDeliveryModalPurpose(purpose);
    setDeliverySerialQtyInput("");
    setIsSerialRulePopoverOpen(false);
    setDeliverySerialPreviewRows([]);
    setIsLotRulePopoverOpen(false);
    setDeliveryLotPreviewRows([]);
    const orderTitle = (po.title ?? "").trim() || po.orderNo || "발주";
    const initialDeliveryDate = new Date().toISOString().slice(0, 10);
    if (purpose === "plan") {
      setDeliveryTitle(
        buildProductionPlanAutoTitle({
          plannedDeliveryDate: "",
          deliveryDate: initialDeliveryDate,
          lines: orderLines,
          nextPlanSeq: nextProductionPlanSeq,
        })
      );
    } else {
      const phase = (deliveries as Delivery[]).length + 1;
      setDeliveryTitle(`${orderTitle} ${phase}차 생산`);
    }
    setDeliveryDate(initialDeliveryDate);
    setPlannedDeliveryDate("");
    setDeliveryRemark("");
    setDeliveryManagerUserSelectValue("");
    const deptLabel = requestDeptLabel.trim();
    if (deptLabel) {
      const match = departmentOptionsFromTree.find((o) => o.label === deptLabel);
      if (match) setDeliveryManagerDeptSelectValue(match.value);
      else setDeliveryManagerDeptSelectValue(legacyDeptValue(deptLabel));
    } else {
      setDeliveryManagerDeptSelectValue("");
    }
    setDeliveryModalOpen(true);
  };

  const createdById = po.createdBy?.id;
  const isPoClosed =
    String(po.status ?? po.orderStatus ?? "").trim() === "PO_CLOSED";
  /** `POST .../deliveries` — 백엔드: 발주 status 가 PO_CLOSED 일 때만 허용 */
  const canRegisterDelivery = isPoClosed;
  const isAuthor =
    createdById == null ||
    (currentUserId != null && createdById === currentUserId);
  const canEditOrder = !isPoClosed && isAuthor;
  /** 미종결·등록자만 접수(즉시 종결) 가능 */
  const canShowReceiveButton = !isPoClosed && isAuthor;
  const partnerName = partnerSelectLabel(
    po.partner as Partner | undefined,
    countryCodes
  );
  const partnerFlagUrl = partnerCountryFlagUrl(
    String((po.partner as Partner | undefined)?.countryCode ?? "")
  );
  const headerCurrency = po.currencyCode ?? "KRW";
  const supplyAmountValue =
    po.supplyAmount != null && Number.isFinite(Number(po.supplyAmount))
      ? Number(po.supplyAmount)
      : null;
  const subtotalForVat =
    supplyAmountValue ??
    (po.totalAmount != null && Number.isFinite(Number(po.totalAmount))
      ? Number(po.totalAmount)
      : null);
  const totalAmountWithVat =
    subtotalForVat != null ? subtotalForVat * 1.1 : null;
  const planCount = poProductionPlans.length;
  const deliveryOverviewText =
    orderTotalQty > 0
      ? `${orderRegisteredQty} / ${orderTotalQty} EA`
      : planCount === 0
        ? "생산 등록 없음"
        : `생산계획 ${planCount}건`;
  const dueDateDday = getDueDateRelative(po.dueDate);
  const totalAmountMainDisplay =
    totalAmountWithVat != null
      ? formatCurrency(totalAmountWithVat, headerCurrency)
      : "—";

  const partnerNameWithFlag = (
    <span className="inline-flex items-center gap-2">
      {partnerFlagUrl ? (
        <img
          src={partnerFlagUrl}
          alt=""
          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
          decoding="async"
        />
      ) : null}
      <span className="min-w-0">{partnerName}</span>
    </span>
  );

  return (
    <>
      <PageMeta title={`발주 ${po.orderNo}`} description={`발주 ${po.orderNo} 상세`} />
      <PageBreadcrumb pageTitle={`발주 상세 · ${po.orderNo}`} />

      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                {po.title?.trim() || po.orderNo}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {partnerNameWithFlag}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Link
              to="/order"
              className={buttonClassName({ actionRole: "navigate", size: "compact" })}
            >
              <ListIcon className="size-4 shrink-0" aria-hidden />
              목록
            </Link>
            {canShowReceiveButton ? (
              <button
                type="button"
                onClick={() => setReceiveConfirmOpen(true)}
                className={buttonClassName({ actionRole: "positive", size: "compact" })}
              >
                접수
              </button>
            ) : null}
            {canEditOrder ? (
              <Link
                to={`/order/${id}/edit`}
                className={buttonClassName({ actionRole: "edit", size: "compact" })}
              >
                <PencilIcon className="size-4 shrink-0" aria-hidden />
                발주 수정
              </Link>
            ) : null}
            <button
              type="button"
              disabled={!canRegisterDelivery}
              title={
                canRegisterDelivery
                  ? undefined
                  : "발주가 종결(PO_CLOSED)된 뒤에만 등록할 수 있습니다."
              }
              onClick={() => openDeliveryRegistrationModal("plan")}
              className={buttonClassName({
                actionRole: "primary",
                size: "compact",
                disabled: !canRegisterDelivery,
              })}
            >
              <PlusIcon className="size-4 shrink-0" aria-hidden />
              생산계획 등록
            </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-gray-100 dark:xl:divide-white/[0.06]">
            <OrderSummaryMetric
              icon={<CalenderIcon className="size-6" aria-hidden />}
              label="발주일"
            >
              {formatDateYmd(po.orderDate, { emptyFallback: "—" })}
            </OrderSummaryMetric>
            <OrderSummaryMetric
              icon={<CalenderIcon className="size-6" aria-hidden />}
              label="고객 요청 납기"
              badge={
                dueDateDday ? (
                  <span
                    className={dueDateDdayBadgeClassName(dueDateDday.diff)}
                    title={dueDateDday.koLabel}
                  >
                    {dueDateDday.ddayLabel}
                  </span>
                ) : null
              }
            >
              {formatDateYmd(po.dueDate, { emptyFallback: "—" })}
            </OrderSummaryMetric>
            <OrderSummaryMetric
              icon={<DollarLineIcon className="size-6" aria-hidden />}
              label="합계금액"
            >
              <span className="tabular-nums">{totalAmountMainDisplay}</span>
              {totalAmountWithVat != null ? (
                <p className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                  부가세 포함
                </p>
              ) : null}
            </OrderSummaryMetric>
            <OrderSummaryMetric
              icon={<CogIcon className="size-6" aria-hidden />}
              label="생산 진행"
            >
              {deliveryOverviewText}
            </OrderSummaryMetric>
          </div>
        </div>

        <ComponentCard
          title="발주 정보"
          desc="발주 요약 정보입니다."
          collapsible={false}
          className="[&>div:first-child]:px-4 [&>div:first-child]:py-3.5"
          bodyClassName="!p-3 sm:!p-4"
          contentClassName="!space-y-3"
        >
          {!canRegisterDelivery ? (
            <p className="mb-2 text-theme-xs text-amber-700 dark:text-amber-400/90">
              발주가 종결된 뒤에만 생산 계획을 등록할 수 있습니다.
            </p>
          ) : null}
          <div className="grid gap-x-8 md:grid-cols-2">
            <div>
              <OrderDetailInfoRow label="고객사" value={partnerNameWithFlag} />
              <OrderDetailInfoRow
                label="발주일"
                value={formatDateYmd(po.orderDate, { emptyFallback: "—" })}
              />
              <OrderDetailInfoRow
                label="고객 발주번호"
                value={po.vendorOrderNo?.trim() || "—"}
              />
              <OrderDetailInfoRow
                label="담당자"
                value={
                  po.requesterName?.trim() ||
                  po.createdBy?.name?.trim() ||
                  "—"
                }
              />
              <OrderDetailInfoRow
                label="첨부파일"
                value={
                  (files as PurchaseOrderFile[]).length === 0 ? (
                    <span className="text-gray-500">첨부파일이 없습니다.</span>
                  ) : (
                    <ul className="space-y-2">
                      {(files as PurchaseOrderFile[]).map((f) => (
                        <li key={f.id} className="flex items-center gap-2">
                          <img
                            src={fileTypeIconSrc(String(f.fileName ?? ""))}
                            alt=""
                            className="h-5 w-5 shrink-0"
                            decoding="async"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {f.fileName}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await downloadFileWithAuth({
                                  fileUrl: buildApiFileUrl(
                                    f.filePath ?? "",
                                    API_BASE
                                  ),
                                  fileName: f.fileName ?? "attachment",
                                  accessToken: accessToken!,
                                });
                              } catch (error) {
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : "첨부파일 다운로드에 실패했습니다.";
                                toast.error(message);
                              }
                            }}
                            title="첨부파일 다운로드"
                            aria-label="첨부파일 다운로드"
                            className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                          >
                            <ArrowDownTrayIcon className="size-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                }
              />
            </div>
            <div>
              <OrderDetailInfoRow
                label="제목"
                value={po.title?.trim() || "—"}
              />
              <OrderDetailInfoRow
                label="고객 요청 납기"
                value={formatDateYmd(po.dueDate, { emptyFallback: "—" })}
              />
            </div>
          </div>
          <OrderDetailTextAreaRow label="요청사항" text={po.vendorRequest} />
          <OrderDetailTextAreaRow label="특이사항" text={po.specialNote} />
        </ComponentCard>

        <OrderDetailLinesCard
          orderLines={orderLines}
          defaultCurrencyCode={po.currencyCode ?? "KRW"}
          orderLineSummaries={orderLineSummaries}
          registeredQtyByOrderItemId={registeredByOrderItemId}
          layoutMode="dashboard"
        />

        <OrderDetailProductionPlansCard
          purchaseOrderId={id}
          accessToken={accessToken ?? ""}
          isAuthLoading={isAuthLoading}
          canCreate={canRegisterDelivery}
          onOpenPlanModal={() => openDeliveryRegistrationModal("plan")}
          hideHeaderCreateButton
          visualVariant="dashboard"
        />
      </div>

      <OrderReceiveConfirmModal
        isOpen={receiveConfirmOpen}
        isConfirming={receiveMutation.isPending}
        onClose={() => setReceiveConfirmOpen(false)}
        onConfirm={() => receiveMutation.mutate()}
      />

      {/* 생산 등록 모달 */}
      <Modal
        isOpen={deliveryModalOpen}
        onClose={() => {
          setDeliveryModalOpen(false);
          resetDeliveryModalForm();
          setDeliveryModalPurpose("actual");
        }}
        className="mx-4 max-h-[90vh] max-w-3xl overflow-y-auto p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {deliveryModalPurpose === "plan"
                ? "생산 계획 등록"
                : "실제 생산 등록"}
            </h3>
            {deliveryModalPurpose === "plan" ? null : (
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                발주 종결 후 실제 생산 헤더·라인·시리얼을 등록합니다. 저장 후
                동일 발주의 생산 계획에서 출고 가능한 Unit을 생산 라인에 연결할
                수 있습니다.
              </p>
            )}
          </>
        }
      >
        <div className="mt-4 space-y-4">
          <ProductionPlanOrderSummary
            orderNo={po.orderNo ?? "-"}
            partnerLabel={partnerNameWithFlag}
            orderLines={orderLines}
            dueDate={po.dueDate}
            requesterName={po.requesterName}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="delivery-date" required>
                  IDCCA 인수일
                </Label>
                <IconTooltip
                  ariaLabel="IDCCA 인수일 안내"
                  content="IDCCA 인수일은 제조사업부로부터 IDCCA 인수를 받는 일자를 의미합니다."
                />
              </div>
              <DatePicker
                id="delivery-date"
                placeholder="년-월-일"
                value={deliveryDate}
                onValueChange={setDeliveryDate}
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                {deliveryModalPurpose === "plan" ? (
                  <Label htmlFor="delivery-planned-date" required>
                    생산 예정일
                  </Label>
                ) : (
                  <Label htmlFor="delivery-planned-date">생산 예정일 (선택)</Label>
                )}
                <IconTooltip
                  ariaLabel="생산 예정일 안내"
                  content="생산 예정일은 해당 생산계획 건에 대한 예정 생산일을 의미합니다."
                />
              </div>
              <DatePicker
                id="delivery-planned-date"
                placeholder="년-월-일"
                value={plannedDeliveryDate}
                onValueChange={setPlannedDeliveryDate}
              />
            </div>
            <div>
              <SearchableSelectWithCreate
                id="delivery-manager-user"
                label="관리 담당자"
                required
                value={deliveryManagerUserSelectValue}
                onChange={setDeliveryManagerUserSelectValue}
                options={deliveryManagerUserOptions}
                placeholder={
                  isAuthLoading
                    ? "담당자 불러오는 중…"
                    : "담당자 검색·선택"
                }
                noOptionsMessage="표시할 담당자가 없습니다."
                addTrigger="none"
                addButtonLabel=""
                onAddClick={() => {}}
                isDisabled={isAuthLoading}
              />
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="delivery-remark">비고 (선택)</Label>
              <TextArea
                id="delivery-remark"
                value={deliveryRemark}
                rows={3}
                onChange={setDeliveryRemark}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-3">
              <ProductionQuantityInputSection
                qtyInput={deliverySerialQtyInput}
                onQtyInputChange={setDeliverySerialQtyInput}
                orderTotalQty={orderTotalQty}
                orderConsumedQty={orderConsumedQty}
                thisProductionQty={thisProductionQty}
                orderRemainingQty={orderRemainingQty}
                displayedRemainingQty={displayedRemainingQty}
                exceedsRemaining={thisProductionQty > orderRemainingQty}
                purpose={deliveryModalPurpose}
              />
            </div>
          </div>

          {deliveryModalPurpose === "plan" ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                  LOT 번호 미리보기
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative" ref={lotBulkOperatorPopoverRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setIsLotBulkOperatorPopoverOpen((prev) => !prev)
                      }
                      disabled={deliveryLotPreviewRows.length === 0}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      생산 담당자 전체 적용
                    </button>
                    {isLotBulkOperatorPopoverOpen ? (
                      <div className="absolute top-9 right-0 z-20 w-[18rem] rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-5 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          생산 담당자 전체 적용
                        </p>
                        <p className="mt-1 text-gray-500 dark:text-gray-400">
                          선택한 생산 담당자를 현재 LOT 미리보기 모든 행에
                          반영합니다.
                        </p>
                        <div className="mt-3">
                          <SearchableSelectWithCreate
                            value={deliveryLotBulkOperatorUserValue}
                            onChange={setDeliveryLotBulkOperatorUserValue}
                            options={operatorUserOptions}
                            placeholder="생산 담당자 선택"
                            noOptionsMessage="표시할 담당자가 없습니다."
                            addTrigger="none"
                            addButtonLabel=""
                            onAddClick={() => {}}
                            isDisabled={isAuthLoading}
                            compact
                          />
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setIsLotBulkOperatorPopoverOpen(false)
                            }
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            닫기
                          </button>
                          <button
                            type="button"
                            onClick={applyBulkOperatorUserToLotPreviewRows}
                            disabled={
                              deliveryManagerUserIdFromSelect(
                                deliveryLotBulkOperatorUserValue
                              ) == null
                            }
                            className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            적용
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLotRulePopoverOpen((v) => !v)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    LOT 구성 설명
                  </button>
                  {isLotRulePopoverOpen ? (
                    <div className="absolute top-9 right-0 z-20 w-[20rem] rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-5 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                      <p className="font-semibold">LOT 패턴</p>
                      <p className="mt-1 break-all">
                        {LOT_UNIT_CODE_PATTERN_DESCRIPTION}
                      </p>
                      <p className="mt-2 text-gray-500 dark:text-gray-400">
                        미리보기는 표시용이며 DB에 예약되지 않습니다. 저장 시 서버가
                        다시 채번하므로 확정 번호는 달라질 수 있습니다. 생산
                        담당자는 행 순서(offset) 기준으로 함께 저장됩니다.
                      </p>
                    </div>
                  ) : null}
                  </div>
                </div>
              </div>
              {!hasDeliveryTargets ? (
                <p className="mt-2 text-theme-sm text-amber-700 dark:text-amber-400">
                  생산 등록 가능한 제품 라인이 없습니다.
                </p>
              ) : (
                <>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                    <table className="min-w-full divide-y divide-gray-200 text-theme-sm dark:divide-gray-600">
                      <thead className="bg-gray-50 dark:bg-gray-800/80">
                        <tr>
                          <th className="w-20 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                            순번
                          </th>
                          <th className="min-w-[16rem] px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                            LOT 번호
                          </th>
                          <th className="min-w-[15rem] px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                            생산 담당자
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {deliveryLotPreviewRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                            >
                              이번 생산 수량·IDCCA 인수일을 입력하면 LOT가
                              표시됩니다.
                            </td>
                          </tr>
                        ) : (
                          deliveryLotPreviewRows.map((row, index) => (
                            <tr key={row.key}>
                              <td className="px-2 py-2 text-left tabular-nums text-gray-700 dark:text-gray-300">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2">
                                <span className="block min-w-[14rem] rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900/60 dark:text-white">
                                  {row.unitCode}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <SearchableSelectWithCreate
                                  value={row.operatorUserId}
                                  onChange={(value) =>
                                    updateDeliveryLotPreviewOperatorUser(index, value)
                                  }
                                  options={operatorUserOptions}
                                  placeholder="생산 담당자 선택"
                                  noOptionsMessage="표시할 담당자가 없습니다."
                                  addTrigger="none"
                                  addButtonLabel=""
                                  onAddClick={() => {}}
                                  isDisabled={isAuthLoading}
                                  compact
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                    생산 담당자는 LOT 미리보기 행 순서 기준으로 저장됩니다. 일부
                    행만 선택하지 않아도 저장할 수 있습니다.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                  시리얼 번호 미리보기
                </p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSerialRulePopoverOpen((v) => !v)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    시리얼 구성 설명
                  </button>
                  {isSerialRulePopoverOpen ? (
                    <div className="absolute top-9 right-0 z-20 w-[20rem] rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-5 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                      <p className="font-semibold">시리얼 패턴</p>
                      <p className="mt-1 break-all">
                        {LT_SERIAL_PATTERN_DESCRIPTION}
                      </p>
                      <p className="mt-2 break-all font-mono text-gray-600 dark:text-gray-300">
                        예:{" "}
                        {ltSerialExample(
                          deliveryDate.trim() ||
                            new Date().toISOString().slice(0, 10),
                          yearCodeFromOrderDate(deliveryDate, lotYearCodes) ||
                            "P",
                          String(po.partner?.code ?? "EO").trim().toUpperCase()
                        )}
                      </p>
                      <p className="mt-2 text-gray-500 dark:text-gray-400">
                        yyyyMMdd·년도코드(1자)는 IDCCA 인수일 기준, 일련번호는
                        발주·업체 단위로 증가합니다.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
              {!hasDeliveryTargets ? (
                <p className="mt-2 text-theme-sm text-amber-700 dark:text-amber-400">
                  생산 등록 가능한 제품 라인이 없습니다.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                  <table className="min-w-full divide-y divide-gray-200 text-theme-sm dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                      <tr>
                        <th className="w-20 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                          순번
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                          라인
                        </th>
                        <th className="min-w-[16rem] px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                          시리얼 번호
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {deliverySerialPreviewRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                          >
                            이번 생산 수량을 입력하면 시리얼이 자동으로 표시됩니다.
                          </td>
                        </tr>
                      ) : (
                        deliverySerialPreviewRows.map((row, index) => (
                          <tr key={row.key}>
                            <td className="px-2 py-2 text-left tabular-nums text-gray-700 dark:text-gray-300">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              {row.lineLabel}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                aria-label={`시리얼 번호 ${index + 1}`}
                                value={row.serialNo}
                                onChange={(e) =>
                                  updateDeliverySerialPreviewSerialNo(
                                    index,
                                    e.target.value
                                  )
                                }
                                className="w-full min-w-[14rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDeliveryModalOpen(false);
              resetDeliveryModalForm();
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (!deliveryDate.trim()) {
                toast.error("IDCCA 인수일을 입력하세요.");
                return;
              }
              if (
                deliveryModalPurpose === "plan" &&
                !plannedDeliveryDate.trim()
              ) {
                toast.error("생산 예정일을 입력하세요.");
                return;
              }
              if (!hasDeliveryTargets) {
                toast.error("등록할 제품 라인이 없습니다.");
                return;
              }

              const managerId = deliveryManagerUserIdFromSelect(
                deliveryManagerUserSelectValue
              );

              if (deliveryModalPurpose === "plan") {
                const qty = parseThisProductionQtyInput(deliverySerialQtyInput);
                if (qty <= 0) {
                  toast.error("이번 생산 수량을 1 이상 입력하세요.");
                  return;
                }
                if (deliveryLotPreviewRows.length === 0) {
                  toast.error("LOT 미리보기를 먼저 불러오세요.");
                  return;
                }
                const { items, error } = distributeProductionPlanItems(
                  orderLines,
                  qty,
                  registeredByOrderItemId
                );
                if (error) {
                  toast.error(error);
                  return;
                }
                const expectedPreviewCount = items.reduce(
                  (sum, item) => sum + item.plannedQty,
                  0
                );
                if (deliveryLotPreviewRows.length !== expectedPreviewCount) {
                  toast.error(
                    "LOT 미리보기가 현재 생산 수량과 맞지 않습니다. 잠시 후 다시 확인해 주세요."
                  );
                  return;
                }
                deliveryMutation.mutate({
                  productionPlanPayload: {
                    deliveryDate: deliveryDate.trim(),
                    items,
                    title: deliveryTitle.trim() || null,
                    plannedDeliveryDate: plannedDeliveryDate.trim() || null,
                    remark: deliveryRemark.trim() || null,
                    productionManagerId: managerId,
                  },
                  planDraftItems: items,
                  lotPreviewRows: deliveryLotPreviewRows,
                  purpose: "plan",
                });
                return;
              }

              if (deliverySerialPreviewRows.length === 0) {
                toast.error("시리얼을 먼저 생성하세요.");
                return;
              }
              for (let i = 0; i < deliverySerialPreviewRows.length; i += 1) {
                if (!deliverySerialPreviewRows[i].serialNo.trim()) {
                  toast.error(`시리얼 번호를 입력하세요. (${i + 1}번 행)`);
                  return;
                }
              }
              const trimmedSerials = deliverySerialPreviewRows.map((r) =>
                r.serialNo.trim()
              );
              if (new Set(trimmedSerials).size !== trimmedSerials.length) {
                toast.error("시리얼 번호에 중복이 있습니다. 서로 다르게 수정하세요.");
                return;
              }
              const QTY_EPS = 1e-9;
              const linesByOrderItemId = new Map<
                number,
                {
                  quantity: number;
                  sequenceKey: string;
                  serials: Array<{
                    serialNo: string;
                    detectorElementCode: string;
                    wavelengthCode: string;
                    detectorId: number;
                    serialSnapshot?: Record<string, unknown>;
                  }>;
                }
              >();
              for (const row of deliverySerialPreviewRows) {
                const serialNoTrimmed = row.serialNo.trim();
                const serialSnapshotTrimmed =
                  row.serialSnapshot && typeof row.serialSnapshot === "object"
                    ? { ...row.serialSnapshot, serialNo: serialNoTrimmed }
                    : row.serialSnapshot;
                const current = linesByOrderItemId.get(row.orderItemId);
                if (!current) {
                  linesByOrderItemId.set(row.orderItemId, {
                    quantity: 1,
                    sequenceKey: row.sequenceKey,
                    serials: [
                      {
                        serialNo: serialNoTrimmed,
                        detectorElementCode: row.detectorElementCode,
                        wavelengthCode: row.wavelengthCode,
                        detectorId: row.detectorId,
                        serialSnapshot: serialSnapshotTrimmed,
                      },
                    ],
                  });
                  continue;
                }
                current.quantity += 1;
                current.serials.push({
                  serialNo: serialNoTrimmed,
                  detectorElementCode: row.detectorElementCode,
                  wavelengthCode: row.wavelengthCode,
                  detectorId: row.detectorId,
                  serialSnapshot: serialSnapshotTrimmed,
                });
              }
              const linesPayload: DeliveryCreateLinePayload[] = [];
              for (const line of orderLines) {
                const bundled = linesByOrderItemId.get(line.id);
                if (!bundled) continue;
                const prev = deliveredByOrderItemId.get(line.id) ?? 0;
                const remaining = Math.max(0, line.qty - prev);
                if (bundled.quantity - remaining > QTY_EPS) {
                  toast.error(
                    `잔량을 초과했습니다. (${line.itemName ?? "품목"} · 잔여 ${remaining})`
                  );
                  return;
                }
                linesPayload.push({
                  lineType: "PRODUCT",
                  lineId: line.id,
                  quantity: bundled.quantity,
                  sequenceKey: bundled.sequenceKey,
                  serials: bundled.serials.map((serial) => ({
                    serialNo: serial.serialNo,
                    detectorElementCode: serial.detectorElementCode,
                    wavelengthCode: serial.wavelengthCode,
                    detectorId: serial.detectorId,
                    serialSnapshot:
                      serial.serialSnapshot ?? {
                        source: "frontend",
                        format: "LT",
                        detectorElementCode: serial.detectorElementCode,
                        wavelengthCode: serial.wavelengthCode,
                        detectorId: serial.detectorId,
                      },
                  })),
                });
              }
              if (linesPayload.length === 0) {
                toast.error("이번 생산 수량을 1건 이상 입력하세요.");
                return;
              }
              const payload: DeliveryCreatePayload = {
                deliveryDate: deliveryDate.trim(),
                lines: linesPayload,
                title: deliveryTitle.trim() || null,
                plannedDeliveryDate: plannedDeliveryDate.trim() || null,
                remark: deliveryRemark.trim() || null,
                deliveryManagerId: managerId,
              };
              deliveryMutation.mutate({
                deliveryPayload: payload,
                purpose: "actual",
              });
            }}
            disabled={
              deliveryMutation.isPending ||
              !hasDeliveryTargets ||
              (deliveryModalPurpose === "plan"
                ? thisProductionQty <= 0 ||
                  !deliveryDate.trim() ||
                  !plannedDeliveryDate.trim() ||
                  deliveryLotPreviewRows.length === 0
                : deliverySerialPreviewRows.length === 0)
            }
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {deliveryMutation.isPending
              ? "등록 중..."
              : deliveryModalPurpose === "plan"
                ? "생산 계획 저장 및 LOT 발급"
                : "실제 생산 등록"}
          </button>
        </div>
      </Modal>

      <OrderDetailLinkUnitsModal
        isOpen={linkUnitsModalOpen}
        onClose={() => {
          setLinkUnitsModalOpen(false);
          setLinkUnitsDelivery(null);
        }}
        delivery={linkUnitsDelivery}
        purchaseOrderId={id}
        accessToken={accessToken ?? ""}
      />

    </>
  );
}
