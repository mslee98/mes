import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  startTransition,
} from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../context/AuthContext";
import {
  getPurchaseOrder,
  getPurchaseOrderFiles,
  getDeliveries,
  createDelivery,
  aggregateDeliveredQtyByOrderItemId,
  getPurchaseOrderRequestDepartmentLabel,
  submitPurchaseOrderApproval,
  approvePurchaseOrderApproval,
  type PurchaseOrderDetail,
  type PurchaseOrderFile,
  type PurchaseOrderItem,
  type Delivery,
  type DeliveryCreatePayload,
  type Partner,
} from "../api/purchaseOrder";
import { API_BASE } from "../api/apiBase";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
} from "../api/commonCode";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import DatePicker from "../components/form/date-picker";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import { formatCurrency } from "../lib/formatCurrency";
import {
  lineItemsToAmountSummaries,
  OrderLineAmountSummary,
} from "../lib/orderLineAmountSummary";
import { ReactComponent as ArrowDownOnSquareIcon } from "../icons/arrow-down-on-square.svg?react";
import { getUsers, findTeamLeaderUserForDepartment } from "../api/user";
import {
  getOrganizationTree,
  flattenOrganizationUnitsForSelect,
  getOrganizationUnitUsers,
} from "../api/organization";
function parsePositiveIntId(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim());
  return undefined;
}

/** 발주 폼(`OrderForm`)과 동일 — 조직 단위 선택값·레거시 부서 문자열 */
const LEGACY_DEPT_PREFIX = "legacy-dept:";
const LEGACY_USER_PREFIX = "legacy-user:";

function legacyDeptValue(path: string) {
  return `${LEGACY_DEPT_PREFIX}${encodeURIComponent(path)}`;
}

function tryDecodeLegacyDept(selectValue: string): string | null {
  if (!selectValue.startsWith(LEGACY_DEPT_PREFIX)) return null;
  try {
    return decodeURIComponent(selectValue.slice(LEGACY_DEPT_PREFIX.length));
  } catch {
    return null;
  }
}

function orgUnitIdFromDeptSelect(selectValue: string): number | null {
  if (!selectValue || selectValue.startsWith(LEGACY_DEPT_PREFIX)) return null;
  const n = Number(selectValue);
  return Number.isFinite(n) ? n : null;
}

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

/**
 * 결재(상신·승인) / 납품 — API 흐름 요약
 * -----------------------------------------------------------------
 * 1) 상신: POST `.../approval/submit` — `firstApproverUserId`는 참고용 저장, 에러 문구는 「결재 담당자」.
 *    이미 PO_CLOSED(종결)이면 400 — 재상신 불가.
 * 2) 승인: POST `.../approval/approve` — 승인과 동시에 status → PO_CLOSED(발주 종결), approvalApprovedAt 등 기록.
 *    발주 수정·열람 권한이 있으면 누구나 승인 가능(1차 결재자/관리자 구분 없음).
 * 3) 납품: POST `.../deliveries` — **approvalApprovedAt**(승인·종결) 이후만 허용. 상신만으로는 납품 불가.
 * 4) 상신 시 결재 담당자(팀장) 표시: GET /users + 조직 트리로 `findTeamLeaderUserForDepartment` 계산(프론트 안내용).
 */
type ApprovalModalAction = "submit" | "approve";

function formatDate(s: string | null | undefined): string {
  return s ?? "-";
}

/** 상신·승인 일시 등 — YYYY-MM-dd */
function formatDateYmd(s: string | null | undefined): string {
  const raw = String(s ?? "").trim();
  if (!raw) return "-";
  const head = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) return head[1];
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return raw;
}

function buildFileDownloadUrl(filePath: string): string {
  const raw = String(filePath ?? "").trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  const apiOrigin = new URL(API_BASE).origin;
  if (raw.startsWith("/")) return `${apiOrigin}${raw}`;
  return `${apiOrigin}/${raw}`;
}

async function forceDownloadFile(
  fileUrl: string,
  fileName: string,
  accessToken: string
) {
  const res = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("첨부파일 다운로드에 실패했습니다.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const id = Number(orderId);
  const queryClient = useQueryClient();
  const { user: authUser, accessToken, isLoading: isAuthLoading } = useAuth();

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryTitle, setDeliveryTitle] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState("");
  const [deliveryRemark, setDeliveryRemark] = useState("");
  /** 납품 담당자 — 발주 등록과 동일: 조직 단위 id(문자열) + 사용자 id(문자열) */
  const [deliveryManagerDeptSelectValue, setDeliveryManagerDeptSelectValue] =
    useState("");
  const [deliveryManagerUserSelectValue, setDeliveryManagerUserSelectValue] =
    useState("");
  /** 품목 행 id → 이번 납품 수량 입력 문자열 */
  const [deliveryLineQtyInput, setDeliveryLineQtyInput] = useState<
    Record<number, string>
  >({});

  const resetDeliveryModalForm = useCallback(() => {
    setDeliveryTitle("");
    setDeliveryDate("");
    setPlannedDeliveryDate("");
    setDeliveryRemark("");
    setDeliveryManagerDeptSelectValue("");
    setDeliveryManagerUserSelectValue("");
    setDeliveryLineQtyInput({});
  }, []);

  /** 결재 모달: 상신 | 승인 */
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<ApprovalModalAction>("submit");
  /** 상신·승인 시 서버로 같이 보내는 의견(선택) */
  const [approvalComment, setApprovalComment] = useState("");

  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => getPurchaseOrder(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && Number.isFinite(id),
  });

  const { data: files = [] } = useQuery({
    queryKey: ["purchaseOrderFiles", id],
    queryFn: () => getPurchaseOrderFiles(id, accessToken!),
    enabled: !!accessToken && Number.isFinite(id),
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["purchaseOrderDeliveries", id],
    queryFn: () => getDeliveries(id, accessToken!),
    enabled: !!accessToken && Number.isFinite(id),
  });

  const deliveredByOrderItemId = useMemo(
    () => aggregateDeliveredQtyByOrderItemId(deliveries as Delivery[]),
    [deliveries]
  );

  const { data: purchaseOrderTypeCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
        accessToken!
      ),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: purchaseOrderStatusCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
        accessToken!
      ),
    enabled: !!accessToken && !isAuthLoading,
  });

  /** 팀장 후보: 전 사용자 + nested `userOrganizations` (다른 화면과 동일 키로 캐시 공유) */
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  /** JWT·로그인 user.id 우선, 없으면 GET /users 에서 employeeNo 로 매칭(상신 버튼 작성자 여부 등) */
  const currentUserId = useMemo(() => {
    if (!authUser) return undefined;
    const fromAuth = parsePositiveIntId(
      (authUser as Record<string, unknown>).id
    );
    if (fromAuth !== undefined) return fromAuth;
    const row = users.find((u) => u.employeeNo === authUser.employeeNo);
    return row?.id;
  }, [authUser, users]);

  /**
   * 조직 전체 트리 — `findTeamLeaderUserForDepartment`에 넘겨 소속 unit의 **전체 경로 세그먼트**를 id/parentId로 복원.
   * GET /users 의 organizationUnit.parent 가 2단 eager만 있을 때와의 불일치 완화.
   */
  const {
    data: orgTree = [],
    isLoading: orgTreeLoading,
    isError: orgTreeError,
  } = useQuery({
    queryKey: ["organizationTree"],
    queryFn: () => getOrganizationTree(accessToken ?? undefined),
    enabled: !!accessToken && !isAuthLoading,
  });

  const departmentOptionsFromTree = useMemo(
    () => flattenOrganizationUnitsForSelect(orgTree),
    [orgTree]
  );

  const deliveryMgrOrgUnitId = useMemo(
    () => orgUnitIdFromDeptSelect(deliveryManagerDeptSelectValue),
    [deliveryManagerDeptSelectValue]
  );

  const {
    data: deliveryMgrOrgUsers = [],
    isLoading: deliveryMgrOrgUsersLoading,
    isError: deliveryMgrOrgUsersError,
  } = useQuery({
    queryKey: ["organizationUnitUsers", deliveryMgrOrgUnitId],
    queryFn: () =>
      getOrganizationUnitUsers(deliveryMgrOrgUnitId!, accessToken!),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      deliveryMgrOrgUnitId != null &&
      deliveryModalOpen,
  });

  const deliveryManagerDepartmentOptions = useMemo(() => {
    const opts = [...departmentOptionsFromTree];
    const sel = deliveryManagerDeptSelectValue;
    if (!sel) return opts;
    const legacyPath = tryDecodeLegacyDept(sel);
    if (legacyPath && !opts.some((o) => o.value === sel)) {
      opts.unshift({
        value: sel,
        label: `${legacyPath} (저장된 값)`,
      });
    }
    return opts;
  }, [departmentOptionsFromTree, deliveryManagerDeptSelectValue]);

  const deliveryManagerUserOptions = useMemo(() => {
    const opts = deliveryMgrOrgUsers.map((u) => ({
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
  }, [deliveryMgrOrgUsers, deliveryManagerUserSelectValue]);

  const handleDeliveryManagerDeptChange = useCallback((v: string) => {
    setDeliveryManagerDeptSelectValue(v);
    setDeliveryManagerUserSelectValue("");
  }, []);

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
    const orgId = orgUnitIdFromDeptSelect(deliveryManagerDeptSelectValue);
    if (orgId == null) return;
    if (deliveryMgrOrgUsers.length === 0) return;
    const u = deliveryMgrOrgUsers.find((x) => x.name === name);
    if (u) {
      startTransition(() =>
        setDeliveryManagerUserSelectValue(String(u.id))
      );
    }
  }, [
    deliveryModalOpen,
    order,
    deliveryManagerDeptSelectValue,
    deliveryMgrOrgUsers,
    deliveryManagerUserSelectValue,
  ]);

  const orderTypeDisplayName = useMemo(() => {
    if (!order) return "-";
    const d = order as PurchaseOrderDetail;
    const code = String(d.orderType ?? "").trim();
    const hit = purchaseOrderTypeCodes.find((c) => c.code === code);
    return hit?.name || code || "-";
  }, [order, purchaseOrderTypeCodes]);

  const orderStatusDisplayName = useMemo(() => {
    if (!order) return "-";
    const d = order as PurchaseOrderDetail;
    const code = String(d.status ?? d.orderStatus ?? "").trim();
    const hit = purchaseOrderStatusCodes.find((c) => c.code === code);
    return hit?.name || code || "-";
  }, [order, purchaseOrderStatusCodes]);

  /** 헤더 `approvalSubmittedAt`·`approvalApprovedAt` 기준(공통코드 APPROVAL_STATUS와 별개) */
  const approvalPhaseLabel = useMemo(() => {
    if (!order) return "-";
    const d = order as PurchaseOrderDetail;
    const approvedAt = String(d.approvalApprovedAt ?? "").trim();
    if (approvedAt) return "승인·종결 완료";
    const submittedAt = String(d.approvalSubmittedAt ?? "").trim();
    if (submittedAt) return "결재 대기(승인 전)";
    return "미상신";
  }, [order]);

  /**
   * 상신 시 결재 담당자(팀장) 참고값 — 클라이언트 전용 계산. 서버는 참고용으로만 저장.
   */
  const resolvedTeamLeaderForSubmit = useMemo(() => {
    if (!order) return null;
    const dept = getPurchaseOrderRequestDepartmentLabel(
      order as PurchaseOrderDetail
    );
    return findTeamLeaderUserForDepartment(users, dept, {
      organizationTree: orgTree.length > 0 ? orgTree : undefined,
    });
  }, [order, users, orgTree]);

  /**
   * POST `/purchase-orders/:id/approval/submit|approve`
   * - submit: `firstApproverUserId` 참고용 저장
   * - approve: 승인과 동시에 발주 종결(PO_CLOSED)
   */
  const approvalMutation = useMutation({
    mutationFn: async (vars: {
      action: ApprovalModalAction;
      comment: string;
      firstApproverUserId?: number | null;
    }) => {
      const trimmed = vars.comment.trim();
      if (vars.action === "submit") {
        return submitPurchaseOrderApproval(
          id,
          {
            comment: trimmed || null,
            firstApproverUserId: vars.firstApproverUserId ?? null,
          },
          accessToken!
        );
      }
      return approvePurchaseOrderApproval(
        id,
        { comment: trimmed || null },
        accessToken!
      );
    },
    onSuccess: (_, vars) => {
      const msg =
        vars.action === "submit"
          ? "결재 상신이 완료되었습니다."
          : "승인·종결이 완료되었습니다.";
      toast.success(msg);
      setApprovalModalOpen(false);
      setApprovalComment("");
      setApprovalAction("submit");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "결재 처리에 실패했습니다."),
  });

  const deliveryMutation = useMutation({
    mutationFn: (payload: DeliveryCreatePayload) =>
      createDelivery(id, payload, accessToken!),
    onSuccess: () => {
      toast.success("납품이 등록되었습니다.");
      setDeliveryModalOpen(false);
      resetDeliveryModalForm();
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderDeliveries", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
    },
    onError: (e: Error) => toast.error(e.message || "납품 등록에 실패했습니다."),
  });

  const orderLineSummaries = useMemo(() => {
    if (!order) return [];
    const d = order as PurchaseOrderDetail;
    return lineItemsToAmountSummaries(
      d.orderItems ?? d.items ?? [],
      d.currencyCode ?? "KRW"
    );
  }, [order]);

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
  /** 팀장 매칭·모달 표시에 쓰는 요청 부서 문자열(API 별칭 통합). 빈 문자열이면 상신 불가 */
  const requestDeptLabel = getPurchaseOrderRequestDepartmentLabel(po);
  /** GET 상세의 orderItems(매퍼가 items와 동일 배열로 정규화) */
  const orderLines = (po.orderItems ?? po.items ?? []) as PurchaseOrderItem[];

  const openDeliveryRegistrationModal = () => {
    const init: Record<number, string> = {};
    for (const line of orderLines) {
      init[line.id] = "";
    }
    setDeliveryLineQtyInput(init);
    const phase = (deliveries as Delivery[]).length + 1;
    const orderTitle = (po.title ?? "").trim() || po.orderNo || "발주";
    setDeliveryTitle(`${orderTitle} ${phase}차 납품`);
    setDeliveryDate(new Date().toISOString().slice(0, 10));
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

  /** `POST .../deliveries` 는 승인(종결) 후 `approvalApprovedAt` 있을 때만 허용 */
  const canRegisterDelivery = Boolean(
    String(po.approvalApprovedAt ?? "").trim()
  );
  const hasSubmittedApproval = Boolean(
    String(po.approvalSubmittedAt ?? "").trim()
  );
  const hasApproved = Boolean(String(po.approvalApprovedAt ?? "").trim());
  const isWaitingFirstApproval = hasSubmittedApproval && !hasApproved;
  /** 상신됐으나 아직 승인 전 — 서버 정책상 열람·수정 권한이 있으면 누구나 승인 API 호출 가능 */
  const canPressApprove = isWaitingFirstApproval;
  const createdById = po.createdBy?.id;
  const isPoClosed =
    String(po.status ?? po.orderStatus ?? "").trim() === "PO_CLOSED";
  const canShowSubmitButton =
    !isPoClosed &&
    !hasSubmittedApproval &&
    (createdById == null ||
      (currentUserId != null && createdById === currentUserId));
  const showSubmitTabInModal = canShowSubmitButton;
  /** 이미 상신된 뒤에는 상신 탭이 없으므로, 상태가 submit으로 남아 있어도 승인으로 취급 */
  const modalApprovalAction: ApprovalModalAction =
    approvalAction === "submit" && !showSubmitTabInModal
      ? "approve"
      : approvalAction;
  const partnerName = (po.partner as Partner)?.name ?? (po.partner as Partner)?.code ?? "-";
  const headerCurrency = po.currencyCode ?? "KRW";
  const orderSummaryTh =
    "w-[11%] min-w-[5.5rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 text-left text-theme-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-400";
  const orderSummaryTd = "px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100";

  /** 상신 탭일 때만: 사용자 목록 로딩 중 / 요청 부서 없음 / 팀장 매칭 실패 → 버튼 비활성 */
  const isApprovalSubmitBlocked =
    modalApprovalAction === "submit" &&
    (isUsersLoading ||
      !requestDeptLabel ||
      resolvedTeamLeaderForSubmit == null);

  return (
    <>
      <PageMeta title={`발주 ${po.orderNo}`} description={`발주 ${po.orderNo} 상세`} />
      <PageBreadcrumb pageTitle={`발주 상세 · ${po.orderNo}`} />

      <div className="space-y-6">
        <ComponentCard title="발주 정보">
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/90 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
              <dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-theme-xs">
                <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">발주 상태</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    {orderStatusDisplayName}
                  </dd>
                </div>
                <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">결재 진행</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    {approvalPhaseLabel}
                  </dd>
                </div>
                {po.firstApprover?.name?.trim() ||
                po.firstApproverUserId != null ? (
                  <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                      결재 담당자(참고)
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {po.firstApprover?.name?.trim() || "—"}
                    </dd>
                  </div>
                ) : null}
                {po.approvalSubmittedAt ? (
                  <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">상신 일시</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDateYmd(po.approvalSubmittedAt)}
                    </dd>
                  </div>
                ) : null}
                {po.approvalApprovedAt ? (
                  <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">승인 일시</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDateYmd(po.approvalApprovedAt)}
                    </dd>
                  </div>
                ) : null}
                {po.approvalApprovedBy?.name ? (
                  <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">승인자</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {po.approvalApprovedBy.name}
                    </dd>
                  </div>
                ) : null}
                <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">부서</dt>
                  <dd className="max-w-md break-words font-medium text-gray-900 dark:text-gray-100">
                    {requestDeptLabel || "-"}
                  </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">담당</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {po.requesterName?.trim() || "-"}
                  </dd>
                </div>
                {po.createdBy?.name ? (
                  <div className="flex items-baseline gap-1.5">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">등록</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {po.createdBy.name}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                {canPressApprove ? (
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalAction("approve");
                      setApprovalComment("");
                      setApprovalModalOpen(true);
                    }}
                    className="inline-flex rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    승인
                  </button>
                ) : null}
                {canShowSubmitButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalAction("submit");
                      setApprovalComment("");
                      setApprovalModalOpen(true);
                    }}
                    className="inline-flex rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 dark:border-brand-600 dark:hover:bg-brand-600"
                  >
                    상신
                  </button>
                ) : null}
                <Link
                  to={`/order/${id}/edit`}
                  className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  수정
                </Link>
                <Link
                  to="/order"
                  className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  목록
                </Link>
              </div>
            </div>
            {canPressApprove ? (
              <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-theme-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100">
                상신된 발주입니다. <strong>승인</strong> 시 발주가 종결(PO_CLOSED)되며, 그
                이후부터 납품을 등록할 수 있습니다. 발주 열람·수정 권한이 있는 사용자는
                승인할 수 있습니다.
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    발주번호
                  </th>
                  <td className={orderSummaryTd}>{po.orderNo}</td>
                  <th scope="row" className={orderSummaryTh}>
                    제목
                  </th>
                  <td className={orderSummaryTd}>{po.title?.trim() || "-"}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    거래처
                  </th>
                  <td className={orderSummaryTd}>{partnerName}</td>
                  <th scope="row" className={orderSummaryTh}>
                    발주일
                  </th>
                  <td className={orderSummaryTd}>{formatDate(po.orderDate)}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    발주 유형
                  </th>
                  <td className={orderSummaryTd}>{orderTypeDisplayName}</td>
                  <th scope="row" className={orderSummaryTh}>
                    우선순위
                  </th>
                  <td className={orderSummaryTd}>{po.priority ?? "-"}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    요청 납기
                  </th>
                  <td className={orderSummaryTd}>{formatDate(po.dueDate)}</td>
                  <th scope="row" className={orderSummaryTh}>
                    납품 요청일
                  </th>
                  <td className={orderSummaryTd}>{formatDate(po.requestDeliveryDate)}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    업체 발주번호
                  </th>
                  <td className={orderSummaryTd} colSpan={3}>
                    {po.vendorOrderNo?.trim() || "—"}
                  </td>
                </tr>
                {po.vendorRequest ? (
                  <tr>
                    <th
                      scope="row"
                      className={`${orderSummaryTh} align-top`}
                    >
                      업체 요청사항
                    </th>
                    <td className={orderSummaryTd} colSpan={3}>
                      <span className="whitespace-pre-wrap">{po.vendorRequest}</span>
                    </td>
                  </tr>
                ) : null}
                {po.specialNote ? (
                  <tr>
                    <th
                      scope="row"
                      className={`${orderSummaryTh} align-top`}
                    >
                      특이사항
                    </th>
                    <td className={orderSummaryTd} colSpan={3}>
                      <span className="whitespace-pre-wrap">{po.specialNote}</span>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    공급가액
                  </th>
                  <td
                    className={`${orderSummaryTd} font-medium tabular-nums`}
                    colSpan={3}
                  >
                    {po.supplyAmount != null ? (
                      <>
                        {formatCurrency(po.supplyAmount, headerCurrency)}
                        <span className="ml-1.5 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                          ({headerCurrency})
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    합계
                  </th>
                  <td
                    className={`${orderSummaryTd} font-medium tabular-nums`}
                    colSpan={3}
                  >
                    {po.totalAmountVatIncluded != null ? (
                      <>
                        {formatCurrency(po.totalAmountVatIncluded, headerCurrency)}
                        <span className="ml-1.5 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                          ({headerCurrency})
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                {po.memo != null && String(po.memo).trim() !== "" ? (
                  <tr>
                    <th
                      scope="row"
                      className={`${orderSummaryTh} align-top`}
                    >
                      메모
                    </th>
                    <td className={orderSummaryTd} colSpan={3}>
                      <span className="whitespace-pre-wrap">{String(po.memo)}</span>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row" className={`${orderSummaryTh} align-top`}>
                    첨부파일
                  </th>
                  <td className={orderSummaryTd} colSpan={3}>
                    {(files as PurchaseOrderFile[]).length === 0 ? (
                      <span className="text-gray-500">첨부파일이 없습니다.</span>
                    ) : (
                      <ul className="space-y-2">
                        {(files as PurchaseOrderFile[]).map((f) => (
                          <li key={f.id} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                              {f.fileName}
                            </span>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-theme-xs text-gray-500">
                                {f.uploadedAt ?? ""}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await forceDownloadFile(
                                      buildFileDownloadUrl(f.filePath ?? ""),
                                      f.fileName ?? "attachment",
                                      accessToken!
                                    );
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
                                <ArrowDownOnSquareIcon className="size-4" aria-hidden />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="발주 제품">
          <div className="space-y-4 dark:border-gray-700">
            <div className="relative overflow-x-auto border-b dark:border-gray-800">
              <Table className="w-full text-center text-sm text-gray-900 dark:text-white md:table-fixed">
                <TableHeader className="border-b border-gray-100 dark:border-white/5">
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      isHeader
                      className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[22%]"
                    >
                      제품
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[15%]"
                    >
                      단위 · 수량
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[18%]"
                    >
                      통화 · 단가
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[14%]"
                    >
                      금액
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[13%]"
                    >
                      납품 요청일
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[12%]"
                    >
                      비고
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[6%]"
                    >
                      납품
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {orderLines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="px-3 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                      >
                        등록된 제품이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orderLines.map((item) => {
                      const lineCc =
                        item.currencyCode ?? po.currencyCode ?? "KRW";
                      return (
                        <TableRow
                          key={item.id}
                          className="align-middle hover:bg-transparent"
                        >
                          <TableCell className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-900 dark:text-white">
                            {item.itemName ?? item.item?.name ?? "-"}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                            <span>{item.unit ?? "-"}</span>
                            <span className="mx-1 text-gray-300 dark:text-gray-600">
                              ·
                            </span>
                            <span>{item.qty}</span>
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                            <span className="text-gray-500 dark:text-gray-400">
                              {lineCc}
                            </span>
                            <span className="mx-1 text-gray-300 dark:text-gray-600">
                              ·
                            </span>
                            <span>
                              {item.unitPrice != null
                                ? formatCurrency(item.unitPrice, lineCc)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center align-middle font-medium tabular-nums text-gray-900 dark:text-white">
                            {item.amount != null
                              ? formatCurrency(item.amount, lineCc)
                              : "-"}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center align-middle text-gray-600 dark:text-gray-400">
                            {item.requestDeliveryDate ?? "-"}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center align-middle text-gray-600 dark:text-gray-400">
                            {item.remark ?? "-"}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center align-middle tabular-nums text-gray-800 dark:text-gray-200">
                            {item.deliveredQty ?? 0}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 space-y-6">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                주문 요약
              </h3>
              <OrderLineAmountSummary
                summaries={
                  orderLineSummaries.length > 0
                    ? orderLineSummaries
                    : [
                        {
                          currencyCode: po.currencyCode || "KRW",
                          subtotal: 0,
                          vat: 0,
                          total: 0,
                        },
                      ]
                }
              />
            </div>
          </div>
        </ComponentCard>

        <ComponentCard 
          title="납품 목록"
          headerEnd={
            <button
              type="button"
              title={
                canRegisterDelivery
                  ? undefined
                  : "승인(종결)된 발주만 납품을 등록할 수 있습니다."
                }
                disabled={!canRegisterDelivery}
                onClick={openDeliveryRegistrationModal}
                className="rounded-lg border border-brand-500 bg-white px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-brand-600 dark:bg-gray-800 dark:text-brand-400"
              >
                납품 등록
              </button>
            }
          >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[12rem]">
              {!canRegisterDelivery ? (
                <p className="text-theme-xs text-amber-700 dark:text-amber-400/90">
                  승인(종결)된 발주만 납품을 등록할 수 있습니다. 상신만 된 상태에서는 납품
                  등록이 불가합니다.
                </p>
              ) : null}
            </div>
          </div>
          
          {(deliveries as Delivery[]).length === 0 ? (
            <p className="text-theme-sm text-gray-500">납품 이력이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {(deliveries as Delivery[]).map((d) => (
                <li
                  key={d.id}
                  className="rounded-lg border border-gray-100 p-3 dark:border-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/delivery/${d.id}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {d.title?.trim() || d.deliveryNo || d.id}
                    </Link>
                    <span className="text-theme-sm text-gray-600 dark:text-gray-400">
                      {formatDate(d.deliveryDate)}
                    </span>
                    {d.status && (
                      <Badge size="sm" color="primary">
                        {d.status}
                      </Badge>
                    )}
                  </div>
                  {d.remark && (
                    <p className="mt-1 text-theme-xs text-gray-500">{d.remark}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ComponentCard>
      </div>

      {/*
        결재 모달
        - 팀장 안내 블록: 실제 HTTP는 상신 버튼 클릭 시에만 submit API 호출. 여기까지는 GET 캐시(users, orgTree)로만 계산.
      */}
      <Modal
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false);
          setApprovalComment("");
          setApprovalAction("submit");
        }}
        className="mx-4 max-w-xl p-6"
      >
        <h3 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">
          발주 결재
        </h3>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {po.orderNo} · 상신 요청 또는 승인(종결)을 진행합니다.
        </p>
        {modalApprovalAction === "submit" ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/90 px-3 py-3 text-theme-sm dark:border-gray-600 dark:bg-white/[0.04]">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              상신 시 <code className="rounded bg-gray-200/80 px-1 dark:bg-gray-700">requestDepartment</code>
              / <code className="rounded bg-gray-200/80 px-1 dark:bg-gray-700">requesterDepartment</code> 문자열을
              정규화해, <strong className="text-gray-700 dark:text-gray-200">GET /users</strong>의{" "}
              <code className="rounded bg-gray-200/80 px-1 dark:bg-gray-700">isTeamLeader</code> 소속과
              맞추고 경로는 <strong className="text-gray-700 dark:text-gray-200">GET /organization-unit/tree</strong>로
              보완합니다. (임시·결재선 ERD 전)
            </p>
            <dl className="mt-2 space-y-1 text-theme-sm text-gray-800 dark:text-gray-200">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-gray-500 dark:text-gray-400">요청 부서</dt>
                <dd className="font-medium">
                  {requestDeptLabel || "—"}
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-gray-500 dark:text-gray-400">결재 담당자(참고)</dt>
                <dd className="font-medium">
                  {isUsersLoading
                    ? "사용자 목록 로드 중…"
                    : resolvedTeamLeaderForSubmit
                      ? `${resolvedTeamLeaderForSubmit.name} (사용자 ID ${resolvedTeamLeaderForSubmit.userId})`
                      : requestDeptLabel
                        ? "일치하는 팀장 없음"
                        : "요청 부서 없음"}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
        <div className="mt-4">
          <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
            처리 유형
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {(showSubmitTabInModal
              ? [
                  { key: "submit" as const, label: "상신 요청" },
                  { key: "approve" as const, label: "결재 승인" },
                ]
              : [{ key: "approve" as const, label: "결재 승인" }]
            ).map(({ key, label }) => {
              const selected = modalApprovalAction === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setApprovalAction(key)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selected
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-300"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="approval-comment">의견 (선택)</Label>
          <div className="mt-1">
            <TextArea
              id="approval-comment"
              rows={4}
              value={approvalComment}
              onChange={setApprovalComment}
              placeholder="상신·승인 시 전달할 메모가 있으면 입력하세요."
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setApprovalModalOpen(false);
              setApprovalComment("");
              setApprovalAction("submit");
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (modalApprovalAction === "submit") {
                const dept = requestDeptLabel;
                if (!dept) {
                  toast.error(
                    "요청 부서가 없어 결재 담당자를 지정할 수 없습니다. 발주 수정에서 부서를 입력하세요."
                  );
                  return;
                }
                if (isUsersLoading) {
                  toast.error("사용자 목록을 불러오는 중입니다. 잠시 후 다시 시도하세요.");
                  return;
                }
                if (!resolvedTeamLeaderForSubmit) {
                  toast.error(
                    `요청 부서「${dept}」에 해당하는 결재 담당자(팀장)를 찾을 수 없습니다. 조직·팀장 설정을 확인하세요.`
                  );
                  return;
                }
                // POST .../approval/submit — Body: { comment, firstApproverUserId } (담당자 id는 참고용)
                approvalMutation.mutate({
                  action: "submit",
                  comment: approvalComment,
                  firstApproverUserId: resolvedTeamLeaderForSubmit.userId,
                });
                return;
              }
              approvalMutation.mutate({
                action: modalApprovalAction,
                comment: approvalComment,
              });
            }}
            disabled={approvalMutation.isPending || isApprovalSubmitBlocked}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {approvalMutation.isPending
              ? "처리 중..."
              : modalApprovalAction === "submit"
                ? "상신하기"
                : "승인하기"}
          </button>
        </div>
      </Modal>

      {/* 납품 등록 모달 */}
      <Modal
        isOpen={deliveryModalOpen}
        onClose={() => {
          setDeliveryModalOpen(false);
          resetDeliveryModalForm();
        }}
        className="mx-4 max-h-[90vh] max-w-3xl overflow-y-auto p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">납품 등록</h3>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          품목별로 이번 납품 수량을 입력합니다. 누적 납품이 발주 수량을 넘지 않도록 서버에서
          검증합니다.
        </p>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="delivery-title">납품 제목</Label>
              <Input
                id="delivery-title"
                value={deliveryTitle}
                onChange={(e) => setDeliveryTitle(e.target.value)}
                className="mt-1"
                placeholder="예: 발주제목 1차 납품"
              />
            </div>
            <DatePicker
              id="delivery-date"
              label="납품일 *"
              placeholder="년-월-일"
              value={deliveryDate}
              onValueChange={setDeliveryDate}
            />
            <DatePicker
              id="delivery-planned-date"
              label="납품 예정일 (선택)"
              placeholder="년-월-일"
              value={plannedDeliveryDate}
              onValueChange={setPlannedDeliveryDate}
            />
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div>
                <SearchableSelectWithCreate
                  id="delivery-manager-department"
                  label="납품 담당 부서 (선택)"
                  value={deliveryManagerDeptSelectValue}
                  onChange={handleDeliveryManagerDeptChange}
                  options={deliveryManagerDepartmentOptions}
                  placeholder={
                    orgTreeLoading
                      ? "조직도 불러오는 중…"
                      : "조직도에서 부서 검색·선택"
                  }
                  noOptionsMessage="조직도에 등록된 부서가 없습니다."
                  addTrigger="none"
                  addButtonLabel=""
                  onAddClick={() => {}}
                  isDisabled={orgTreeLoading}
                />
                {orgTreeError ? (
                  <p className="mt-1 text-theme-xs text-red-600 dark:text-red-400">
                    조직도를 불러오지 못했습니다. 저장된 값만 표시될 수 있습니다.
                  </p>
                ) : null}
              </div>
              <div>
                <SearchableSelectWithCreate
                  id="delivery-manager-user"
                  label="납품 담당자 (선택)"
                  value={deliveryManagerUserSelectValue}
                  onChange={setDeliveryManagerUserSelectValue}
                  options={deliveryManagerUserOptions}
                  placeholder={
                    deliveryMgrOrgUnitId == null
                      ? "먼저 부서를 선택하세요"
                      : deliveryMgrOrgUsersLoading
                        ? "소속 사용자 불러오는 중…"
                        : "담당자 검색·선택"
                  }
                  noOptionsMessage="이 부서에 표시할 활성 사용자가 없습니다."
                  addTrigger="none"
                  addButtonLabel=""
                  onAddClick={() => {}}
                  isDisabled={
                    deliveryMgrOrgUnitId == null || deliveryMgrOrgUsersLoading
                  }
                />
                {deliveryMgrOrgUsersError ? (
                  <p className="mt-1 text-theme-xs text-red-600 dark:text-red-400">
                    담당자 목록을 불러오지 못했습니다.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="delivery-remark">비고 (선택)</Label>
              <Input
                id="delivery-remark"
                value={deliveryRemark}
                onChange={(e) => setDeliveryRemark(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <p className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
              품목별 납품 수량
            </p>
            {orderLines.length === 0 ? (
              <p className="mt-2 text-theme-sm text-amber-700 dark:text-amber-400">
                발주 품목이 없어 납품을 등록할 수 없습니다.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table className="min-w-full divide-y divide-gray-200 text-theme-sm dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        품목
                      </th>
                      <th className="w-24 px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                        발주
                      </th>
                      <th className="w-24 px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                        기납
                      </th>
                      <th className="w-24 px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                        잔여
                      </th>
                      <th className="w-28 px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                        이번 납품
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {orderLines.map((line) => {
                      const prev = deliveredByOrderItemId.get(line.id) ?? 0;
                      const remaining = Math.max(0, line.qty - prev);
                      const label =
                        line.itemName?.trim() ||
                        line.item?.name ||
                        `품목 #${line.itemId}`;
                      return (
                        <tr key={line.id}>
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                            {label}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {line.qty}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">
                            {prev}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                            {remaining}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={deliveryLineQtyInput[line.id] ?? ""}
                              onChange={(e) =>
                                setDeliveryLineQtyInput((prev) => ({
                                  ...prev,
                                  [line.id]: e.target.value,
                                }))
                              }
                              className="w-full min-w-[4rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-right tabular-nums text-theme-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                toast.error("납품일을 입력하세요.");
                return;
              }
              if (orderLines.length === 0) {
                toast.error("등록할 품목이 없습니다.");
                return;
              }
              const QTY_EPS = 1e-9;
              const linesPayload: { orderItemId: number; quantity: number }[] = [];
              for (const line of orderLines) {
                const raw = (deliveryLineQtyInput[line.id] ?? "").trim();
                if (!raw) continue;
                const n = Number(raw);
                if (!Number.isFinite(n) || n <= 0) {
                  toast.error("수량은 0보다 큰 숫자로 입력하세요.");
                  return;
                }
                const prev = deliveredByOrderItemId.get(line.id) ?? 0;
                const remaining = Math.max(0, line.qty - prev);
                if (n - remaining > QTY_EPS) {
                  toast.error(
                    `잔량을 초과했습니다. (${line.itemName ?? "품목"} · 잔여 ${remaining})`
                  );
                  return;
                }
                linesPayload.push({ orderItemId: line.id, quantity: n });
              }
              if (linesPayload.length === 0) {
                toast.error("이번 납품 수량을 1건 이상 입력하세요.");
                return;
              }
              const payload: DeliveryCreatePayload = {
                deliveryDate: deliveryDate.trim(),
                lines: linesPayload,
                title: deliveryTitle.trim() || null,
                plannedDeliveryDate: plannedDeliveryDate.trim() || null,
                remark: deliveryRemark.trim() || null,
                deliveryManagerId: deliveryManagerUserIdFromSelect(
                  deliveryManagerUserSelectValue
                ),
              };
              deliveryMutation.mutate(payload);
            }}
            disabled={
              deliveryMutation.isPending || orderLines.length === 0
            }
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {deliveryMutation.isPending ? "등록 중..." : "납품 등록"}
          </button>
        </div>
      </Modal>
    </>
  );
}
