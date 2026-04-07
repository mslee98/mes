import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  startTransition,
} from "react";
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageNotice from "../components/common/PageNotice";
import ConfirmModal from "../components/common/ConfirmModal";
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
  rejectPurchaseOrderApproval,
  type PurchaseOrderApprovalLineInput,
  type PurchaseOrderDetail,
  type PurchaseOrderFile,
  type PurchaseOrderItem,
  type Delivery,
  type DeliveryCreatePayload,
  type DeliveryCreateLinePayload,
  type Partner,
} from "../api/purchaseOrder";
import {
  getProductDefinitions,
  productDefinitionSelectLabel,
} from "../api/products";
import { productDetailHrefForDeliveryReturn } from "../lib/orderReturnNavigation";
import { rejectApprovalRequest } from "../api/approvalRequests";
import { API_BASE } from "../api/apiBase";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  COMMON_CODE_GROUP_DELIVERY_STATUS,
  COMMON_CODE_GROUP_COUNTRY,
} from "../api/commonCode";
import { partnerSelectLabel } from "../lib/partnerDisplay";
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
import ApprovalDetailContent, {
  type ApprovalDocumentMock,
} from "../components/approval/ApprovalDetailContent";
import PurchaseOrderApprovalSubmitPanel from "../components/approval/PurchaseOrderApprovalSubmitPanel";
import ApprovalModalAlternateAction from "../components/approval/ApprovalModalAlternateAction";
import CurrentApprovalRequestSection, {
  ApprovalRequestCompactSummary,
  ApprovalRequestDetailBody,
} from "../components/approval/CurrentApprovalRequestSection";
import {
  approvalCurrentStepSummary,
  approvalRequestStatusLabel,
} from "../components/approval/approvalRequestDisplayUtils";
import { ReactComponent as ArrowDownOnSquareIcon } from "../icons/arrow-down-on-square.svg?react";
import {
  newApprovalDraftRowId,
  buildApprovalLinesFromDraft,
  type ApprovalLineDraftRow,
} from "../lib/purchaseOrderApprovalDraft";
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
 * 1) 상신: POST `.../approval/submit` — `lines[]`는 `stepOrder`·`approverUserId`(선택 `status`).
 *    이미 PO_CLOSED이면 400.
 * 2) 승인: POST `.../approval/approve` — 발주 종결(PO_CLOSED).
 * 3) 납품: POST `.../deliveries` — **order.status === PO_CLOSED** 일 때만 백엔드에서 허용.
 * 4) 발주 헤더의 결재 시각·1차 결재자 필드는 제거됨 → `currentApprovalRequest` 로 표시.
 */
type ApprovalModalAction = "submit" | "approve";

function formatDate(s: string | null | undefined): string {
  return s ?? "-";
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
  /** 발주 라인에 정의가 없을 때 — 납품 시점에 선택한 product_definition id */
  const [deliveryLineDefinitionSelect, setDeliveryLineDefinitionSelect] =
    useState<Record<number, string>>({});

  const resetDeliveryModalForm = useCallback(() => {
    setDeliveryTitle("");
    setDeliveryDate("");
    setPlannedDeliveryDate("");
    setDeliveryRemark("");
    setDeliveryManagerDeptSelectValue("");
    setDeliveryManagerUserSelectValue("");
    setDeliveryLineQtyInput({});
    setDeliveryLineDefinitionSelect({});
  }, []);

  /** 결재 모달: 상신 | 승인 */
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<ApprovalModalAction>("submit");
  /** 상신·승인 시 서버로 같이 보내는 의견(선택) */
  const [approvalComment, setApprovalComment] = useState("");
  /** 상신 전용 — 결재선 단계별 결재자(미상신 상태에서만 편집) */
  const [approvalLineDraftRows, setApprovalLineDraftRows] = useState<
    ApprovalLineDraftRow[]
  >([]);
  const [approvalSubmitTitle, setApprovalSubmitTitle] = useState("발주 결재 요청");
  const [approvalSubmitRemark, setApprovalSubmitRemark] = useState("");
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const approvalDraftSeededForOrderRef = useRef<number | null>(null);

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

  /** 납품 모달: 정의 미지정 라인의 대표 제품별 정의 목록용 (중복 productId 제거) */
  const productIdsForDeliveryDefs = useMemo(() => {
    if (!order) return [];
    const po = order as PurchaseOrderDetail;
    const lines = (po.orderItems ?? po.items ?? []) as PurchaseOrderItem[];
    const s = new Set<number>();
    for (const line of lines) {
      if ((line.productDefinitionId ?? 0) > 0) continue;
      const pid = line.productId ?? 0;
      if (pid > 0) s.add(pid);
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [order]);

  const deliveryDefinitionQueries = useQueries({
    queries: productIdsForDeliveryDefs.map((productId) => ({
      queryKey: ["productDefinitions", productId],
      queryFn: () => getProductDefinitions(productId, accessToken!),
      enabled:
        deliveryModalOpen &&
        !!accessToken &&
        productId > 0 &&
        Number.isFinite(id),
      staleTime: 60_000,
    })),
  });

  const deliveryDefsByProductId = useMemo(() => {
    const m = new Map<
      number,
      Awaited<ReturnType<typeof getProductDefinitions>>
    >();
    productIdsForDeliveryDefs.forEach((pid, idx) => {
      const data = deliveryDefinitionQueries[idx]?.data;
      if (data && Array.isArray(data)) m.set(pid, data);
    });
    return m;
  }, [productIdsForDeliveryDefs, deliveryDefinitionQueries]);

  /** 정의 후보가 1개뿐이면 사용자 선택 없이 자동 지정 (여러 개면 빈 값 → 수동 선택) */
  useEffect(() => {
    if (!deliveryModalOpen || !order) return;
    const lines = ((order as PurchaseOrderDetail).orderItems ??
      (order as PurchaseOrderDetail).items ??
      []) as PurchaseOrderItem[];

    setDeliveryLineDefinitionSelect((prev) => {
      let next: Record<number, string> | null = null;
      for (const line of lines) {
        if ((line.productDefinitionId ?? 0) > 0) continue;
        const pid = line.productId ?? 0;
        if (pid <= 0) continue;
        const defs = deliveryDefsByProductId.get(pid) ?? [];
        if (defs.length !== 1) continue;
        if ((prev[line.id] ?? "").trim() !== "") continue;
        const only = String(defs[0]!.id);
        if (next == null) next = { ...prev };
        next[line.id] = only;
      }
      return next ?? prev;
    });
  }, [deliveryModalOpen, order, deliveryDefsByProductId]);

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

  const { data: countryCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_COUNTRY],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_COUNTRY, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: deliveryStatusCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_DELIVERY_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_DELIVERY_STATUS, accessToken!),
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

  const deliveryStatusDisplayName = useCallback(
    (statusCode: string | null | undefined) => {
      const code = String(statusCode ?? "").trim();
      if (!code) return "-";
      const hit = deliveryStatusCodes.find((item) => item.code === code);
      return hit?.name || code;
    },
    [deliveryStatusCodes]
  );

  /** `currentApprovalRequest`·발주 status(PO_CLOSED) 기준 */
  const approvalPhaseLabel = useMemo(() => {
    if (!order) return "-";
    const d = order as PurchaseOrderDetail;
    const closed =
      String(d.status ?? d.orderStatus ?? "").trim() === "PO_CLOSED";
    if (closed) return "승인·종결 완료";
    const ar = d.currentApprovalRequest;
    const st = String(ar?.status ?? "").trim().toUpperCase();
    if (st === "REJECTED") return "반려";
    if (ar && st && st !== "DRAFT") {
      const hint = approvalCurrentStepSummary(ar);
      return hint !== "—" ? hint : "결재 진행 중";
    }
    return "미상신";
  }, [order]);

  const currentApprovalAssigneeLabel = useMemo(() => {
    if (!order) return "-";
    const d = order as PurchaseOrderDetail;
    const req = d.currentApprovalRequest;
    if (!req) return "-";
    const lines = Array.isArray(req.lines) ? req.lines : [];
    const pending = lines.find(
      (line) =>
        String(line.status ?? line.lineStatus ?? "")
          .trim()
          .toUpperCase() === "PENDING"
    );
    return pending?.approver?.name?.trim() || "-";
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

  useEffect(() => {
    setApprovalLineDraftRows([]);
    setApprovalSubmitTitle("발주 결재 요청");
    setApprovalSubmitRemark("");
    approvalDraftSeededForOrderRef.current = null;
  }, [id]);

  useEffect(() => {
    if (!order) return;
    const po = order as PurchaseOrderDetail;
    const closed = String(po.status ?? po.orderStatus ?? "").trim() === "PO_CLOSED";
    const ar = po.currentApprovalRequest;
    const arSt = String(ar?.status ?? "").trim().toUpperCase();
    const hasActiveSubmitted =
      ar != null &&
      arSt !== "" &&
      arSt !== "DRAFT" &&
      arSt !== "REJECTED";
    const createdById = po.createdBy?.id;
    const canUser =
      createdById == null ||
      (currentUserId != null && createdById === currentUserId);
    if (hasActiveSubmitted || closed || !canUser) return;
    if (approvalDraftSeededForOrderRef.current === id) return;
    approvalDraftSeededForOrderRef.current = id;
    setApprovalLineDraftRows(
      resolvedTeamLeaderForSubmit
        ? [
            {
              id: newApprovalDraftRowId(),
              approverUserId: resolvedTeamLeaderForSubmit.userId,
            },
          ]
        : [{ id: newApprovalDraftRowId(), approverUserId: null }]
    );
  }, [order, id, currentUserId, resolvedTeamLeaderForSubmit]);

  const approverUserSelectOptions = useMemo(() => {
    return users
      .filter((u) => u.isActive !== false)
      .filter((u) => currentUserId == null || u.id !== currentUserId)
      .map((u) => ({
        value: String(u.id),
        label: `${u.name} (사번 ${u.employeeNo})`,
      }));
  }, [users, currentUserId]);

  /** 상신 API에 실릴 결재선(미지정 행 제외) — 모달 하단 요약·검증에 공통 사용 */
  const resolvedSubmitApprovalLines = useMemo(
    () => buildApprovalLinesFromDraft(approvalLineDraftRows),
    [approvalLineDraftRows]
  );

  /** 발주 상신 시 전자결재 모달에 넣을 문서 목업 (실데이터 기반) */
  const approvalPreviewDocument = useMemo((): ApprovalDocumentMock | null => {
    if (!order) return null;
    const p = order as PurchaseOrderDetail;
    const dept = getPurchaseOrderRequestDepartmentLabel(p);
    const partnerN = partnerSelectLabel(
      p.partner as Partner | undefined,
      countryCodes
    );
    const linesItems = (p.orderItems ?? p.items ?? []) as PurchaseOrderItem[];
    const drafter =
      p.requesterName?.trim() ||
      p.createdBy?.name?.trim() ||
      authUser?.name?.trim() ||
      "—";
    const currency = (p.currencyCode ?? "KRW").trim() || "KRW";
    const bodySummary: string[] = [
      `거래처: ${partnerN}`,
      `발주일: ${p.orderDate ?? "—"}`,
      `통화: ${currency}`,
    ];
    if (p.supplyAmount != null && Number.isFinite(Number(p.supplyAmount))) {
      bodySummary.push(
        `공급가액(부가세별도): ${formatCurrency(Number(p.supplyAmount), currency)}`
      );
    }
    if (
      p.totalAmountVatIncluded != null &&
      Number.isFinite(Number(p.totalAmountVatIncluded))
    ) {
      bodySummary.push(
        `합계(부가세포함): ${formatCurrency(
          Number(p.totalAmountVatIncluded),
          currency
        )}`
      );
    }
    bodySummary.push(`품목 ${linesItems.length}건`);

    const approvalLines: ApprovalDocumentMock["lines"] = [
      {
        order: 0,
        role: "기안",
        name: drafter,
        dept: dept || "—",
        status: "기안",
        actedAt: "—",
        opinion: "상신 예정",
      },
    ];
    approvalLineDraftRows.forEach((row, idx) => {
      const step = idx + 1;
      if (row.approverUserId == null) {
        approvalLines.push({
          order: step,
          role: `${step}차 결재`,
          name: "(미지정)",
          dept: "—",
          status: "예정",
          actedAt: "—",
          opinion: "—",
        });
        return;
      }
      const u = users.find((x) => x.id === row.approverUserId);
      approvalLines.push({
        order: step,
        role: `${step}차 결재`,
        name: u?.name ?? `#${row.approverUserId}`,
        dept: u?.userOrganizations?.[0]?.organizationUnit?.name ?? "—",
        status: idx === 0 ? "대기" : "예정",
        actedAt: "—",
        opinion: "—",
      });
    });

    return {
      headerBadge: { label: "상신 대기", color: "primary" },
      documentNo: p.orderNo,
      title: approvalSubmitTitle.trim() || p.title?.trim() || "발주 결재",
      docType: "발주 승인",
      drafter,
      department: dept || "—",
      draftAt: p.orderDate ? `${p.orderDate} (발주일)` : "—",
      bodySummary,
      lines: approvalLines,
    };
  }, [
    order,
    authUser?.name,
    approvalLineDraftRows,
    users,
    approvalSubmitTitle,
    countryCodes,
  ]);

  const closeApprovalModal = useCallback(() => {
    setApprovalModalOpen(false);
    setApprovalComment("");
    setApprovalAction("submit");
    setRejectConfirmOpen(false);
  }, []);

  /**
   * POST `/purchase-orders/:id/approval/submit|approve`
   * - submit: `lines`(stepOrder·approverUserId)·`title`·`remark`·`comment`
   * - approve: 승인과 동시에 발주 종결(PO_CLOSED)
   */
  const approvalMutation = useMutation({
    mutationFn: async (vars: {
      action: ApprovalModalAction;
      comment: string;
      firstApproverUserId?: number | null;
      title?: string | null;
      remark?: string | null;
      lines?: PurchaseOrderApprovalLineInput[] | null;
    }) => {
      const trimmed = vars.comment.trim();
      if (vars.action === "submit") {
        return submitPurchaseOrderApproval(
          id,
          {
            comment: trimmed || null,
            firstApproverUserId: vars.firstApproverUserId ?? null,
            title: vars.title ?? null,
            remark: vars.remark ?? null,
            lines: vars.lines ?? null,
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
      closeApprovalModal();
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "결재 처리에 실패했습니다."),
  });

  const rejectApprovalMutation = useMutation({
    mutationFn: async ({
      comment,
      approvalRequestId,
    }: {
      comment: string;
      approvalRequestId: number | null | undefined;
    }) => {
      const trimmed = comment.trim();
      if (
        approvalRequestId != null &&
        Number.isFinite(Number(approvalRequestId))
      ) {
        return rejectApprovalRequest(
          Number(approvalRequestId),
          { comment: trimmed || null },
          accessToken!
        );
      }
      return rejectPurchaseOrderApproval(
        id,
        { comment: trimmed || null },
        accessToken!
      );
    },
    onSuccess: () => {
      setRejectConfirmOpen(false);
      toast.success("반려 처리되었습니다.");
      closeApprovalModal();
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (e: Error) => {
      setRejectConfirmOpen(false);
      toast.error(e.message || "반려 처리에 실패했습니다.");
    },
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
    const defSel: Record<number, string> = {};
    for (const line of orderLines) {
      init[line.id] = "";
      defSel[line.id] = "";
    }
    setDeliveryLineQtyInput(init);
    setDeliveryLineDefinitionSelect(defSel);
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

  const createdById = po.createdBy?.id;
  const isPoClosed =
    String(po.status ?? po.orderStatus ?? "").trim() === "PO_CLOSED";
  /** `POST .../deliveries` — 백엔드: 발주 status 가 PO_CLOSED 일 때만 허용 */
  const canRegisterDelivery = isPoClosed;
  const arStatus = String(po.currentApprovalRequest?.status ?? "")
    .trim()
    .toUpperCase();
  const hasSubmittedApproval = Boolean(
    po.currentApprovalRequest &&
      arStatus !== "" &&
      arStatus !== "DRAFT" &&
      arStatus !== "REJECTED"
  );
  const hasApproved = isPoClosed;
  const isWaitingFirstApproval = hasSubmittedApproval && !hasApproved;
  /** 상신됐으나 아직 승인 전 — 서버 정책상 열람·수정 권한이 있으면 누구나 승인 API 호출 가능 */
  const canPressApprove = isWaitingFirstApproval;
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
  const partnerName = partnerSelectLabel(
    po.partner as Partner | undefined,
    countryCodes
  );
  const headerCurrency = po.currencyCode ?? "KRW";
  const orderSummaryTh =
    "w-[11%] min-w-[5.5rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 text-left text-theme-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-400";
  const orderSummaryTd = "px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100";

  const canSubmitApprovalLines = resolvedSubmitApprovalLines.length > 0;

  /** 상신 탭: 결재선에 1명 이상 지정 + 사용자 목록 준비됨 */
  const isApprovalSubmitBlocked =
    modalApprovalAction === "submit" &&
    (isUsersLoading || !canSubmitApprovalLines);

  return (
    <>
      <PageMeta title={`발주 ${po.orderNo}`} description={`발주 ${po.orderNo} 상세`} />
      <PageBreadcrumb pageTitle={`발주 상세 · ${po.orderNo}`} />

      <div className="space-y-6">
        <ComponentCard title="발주 정보" collapsible>
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
                {po.currentApprovalRequest ? (
                  <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                      현재 결재 요청
                    </dt>
                    <dd className="min-w-0 font-medium text-gray-900 dark:text-gray-100">
                      {approvalRequestStatusLabel(
                        po.currentApprovalRequest.status
                      )}
                      {po.currentApprovalRequest.currentStep != null ? (
                        <span className="text-theme-xs font-normal text-gray-600 dark:text-gray-400">
                          {" "}
                          · {po.currentApprovalRequest.currentStep}차 처리 구간
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                {po.currentApprovalRequest ? (
                  <div className="flex items-baseline gap-1.5">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                      현재 결재자
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {currentApprovalAssigneeLabel}
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
                      setApprovalComment(approvalSubmitRemark);
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
                결재 요청이 진행 중입니다.{" "}
                {po.currentApprovalRequest?.currentStep != null ? (
                  <>
                    현재 <strong>{po.currentApprovalRequest.currentStep}차</strong> 결재
                    단계입니다.{" "}
                  </>
                ) : null}
                <strong>승인</strong> 시 단계가 진행되며, 최종 단계까지 완료되면 발주가
                종결되어 납품을 등록할 수 있습니다.
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

    

        <ComponentCard title="발주 라인" collapsible defaultCollapsed={true}>
          <div className="space-y-4 dark:border-gray-700">
            <div className="relative overflow-x-auto border-b dark:border-gray-800">
              <Table className="w-full text-center text-sm text-gray-900 dark:text-white md:table-fixed">
                <TableHeader className="border-b border-gray-100 dark:border-white/5">
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      isHeader
                      className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[22%]"
                    >
                      제품 정의·표시명
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
                        등록된 발주 라인이 없습니다.
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
                            {item.itemName?.trim() ||
                              item.productNameSnapshot?.trim() ||
                              item.definitionNameSnapshot?.trim() ||
                              item.item?.name ||
                              (item.productDefinitionId > 0
                                ? `정의 #${item.productDefinitionId}`
                                : item.itemId != null && item.itemId > 0
                                  ? `품목 #${item.itemId}`
                                  : "-")}
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
            <div className="relative inline-flex w-full items-center justify-center">
              <hr className="my-8 h-px w-64 max-w-full border-0 bg-gray-200 dark:bg-gray-700" />
              <span className="absolute left-1/2 -translate-x-1/2 bg-white px-3 text-sm font-medium text-gray-600 dark:bg-[#171F2F] dark:text-gray-400">
                주문 요약
              </span>
            </div>
              
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
        </ComponentCard>

        <ComponentCard 
          title="납품 목록"
          collapsible
          defaultCollapsed={true}
          headerEnd={
            <button
              type="button"
              title={
                canRegisterDelivery
                  ? undefined
                  : "발주 상태가 종결(PO_CLOSED)일 때만 납품을 등록할 수 있습니다."
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
                  발주가 종결(PO_CLOSED)된 뒤에만 납품을 등록할 수 있습니다.
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
                        {deliveryStatusDisplayName(d.status)}
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

        {po.currentApprovalRequest ? (
          <CurrentApprovalRequestSection
            request={po.currentApprovalRequest}
            orderId={id}
            orderNo={po.orderNo}
          />
        ) : (
          <ComponentCard title="결재 요청">
            <PageNotice variant="neutral" className="text-theme-sm">
              아직 결재 요청이 없습니다. 헤더의 <strong>상신</strong> 버튼에서 결재선을 지정해 결재를 시작할 수
              있습니다.
            </PageNotice>
          </ComponentCard>
        )}

        {canShowSubmitButton ? (
          <ComponentCard
            title="결재"
            desc="발주 정보 저장과 결재 상신은 별도 단계로 진행됩니다."
            collapsible
            defaultCollapsed={true}
          >
            <PageNotice variant="neutral" className="mb-0 text-theme-sm">
              <strong>결재선</strong>·결재 제목·상신 메모는 헤더의 <strong>상신</strong>으로 열리는
              모달 오른쪽 패널에서 지정합니다. 반려 후에는 발주를 수정한 뒤{" "}
              <strong>다시 상신</strong>할 수 있습니다.
            </PageNotice>
          </ComponentCard>
        ) : null}
      </div>

      {/*
        결재 모달
        - 상신 탭: 전자결재 퍼블 모달(넓은 레이아웃) + 하단에서 API 상신
        - 승인 탭·승인 전용: 기존 컴팩트 모달
      */}
      <Modal
        isOpen={approvalModalOpen}
        onClose={closeApprovalModal}
        className={
          approvalModalOpen && modalApprovalAction === "submit"
            ? "mx-2 flex max-h-[min(92vh,100dvh)] w-[calc(100%-1rem)] max-w-7xl flex-col overflow-hidden p-0 sm:mx-4"
            : "mx-4 flex max-h-[min(88vh,100dvh)] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden p-0"
        }
      >
        {approvalModalOpen && modalApprovalAction === "submit" ? (
          <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col border-gray-200 dark:border-gray-800 lg:border-r">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-14 sm:pt-[3.25rem]">
                  {approvalPreviewDocument ? (
                    <ApprovalDetailContent
                      documentId={`po-${id}`}
                      variant="modal"
                      onClose={closeApprovalModal}
                      documentOverride={approvalPreviewDocument}
                      showInternalOpinion={false}
                      embedMode="purchaseOrder"
                    />
                  ) : (
                    <p className="text-theme-sm text-gray-500">
                      문서 정보를 불러오는 중…
                    </p>
                  )}
                </div>
              </div>
              <aside
                aria-label="상신 정보"
                className="flex max-h-[min(40vh,22rem)] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-gray-200 bg-gray-50/90 dark:border-gray-700 dark:bg-gray-950/70 lg:max-h-none lg:w-[min(100%,24rem)] lg:border-l lg:border-t-0"
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5 sm:py-5">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    상신 정보
                  </h4>
                  <p className="mt-1 mb-4 text-theme-xs text-gray-500 dark:text-gray-400">
                    제목·결재선·메모를 입력한 뒤 하단에서 상신합니다.
                  </p>
                  <PurchaseOrderApprovalSubmitPanel
                    title={approvalSubmitTitle}
                    onTitleChange={setApprovalSubmitTitle}
                    remark={approvalSubmitRemark}
                    onRemarkChange={setApprovalSubmitRemark}
                    lineRows={approvalLineDraftRows}
                    setLineRows={setApprovalLineDraftRows}
                    approverSelectOptions={approverUserSelectOptions}
                    isUsersLoading={isUsersLoading}
                  />
                </div>
              </aside>
            </div>
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6 sm:py-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                상신 확인
              </h3>
              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {po.orderNo} — 왼쪽 요약과 오른쪽 결재선을 확인한 뒤 상신하기를 누르세요.
              </p>
              <ApprovalModalAlternateAction
                show={showSubmitTabInModal}
                actionLabel="결재 승인으로 바꾸기"
                onAction={() => setApprovalAction("approve")}
              />
              <div className="mt-4">
                <Label htmlFor="approval-comment">의견 (선택)</Label>
                <div className="mt-1">
                  <TextArea
                    id="approval-comment"
                    rows={3}
                    value={approvalComment}
                    onChange={setApprovalComment}
                    placeholder="상신 시 전달할 메모가 있으면 입력하세요."
                  />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeApprovalModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isUsersLoading) {
                      toast.error("사용자 목록을 불러오는 중입니다. 잠시 후 다시 시도하세요.");
                      return;
                    }
                    const lines = buildApprovalLinesFromDraft(approvalLineDraftRows);
                    if (lines.length === 0) {
                      toast.error("상신할 결재자를 한 명 이상 선택하세요.");
                      return;
                    }
                    approvalMutation.mutate({
                      action: "submit",
                      comment: approvalComment,
                      firstApproverUserId: lines[0]!.approverUserId,
                      title: approvalSubmitTitle.trim() || null,
                      remark: approvalSubmitRemark.trim() || null,
                      lines,
                    });
                  }}
                  disabled={approvalMutation.isPending || isApprovalSubmitBlocked}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {approvalMutation.isPending ? "처리 중..." : "상신하기"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {po.currentApprovalRequest ? (
                <div className="mb-4 flex max-h-[min(62vh,36rem)] flex-col overflow-hidden rounded-lg bg-gray-50/90 dark:bg-gray-950/65">
                  <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white py-2.5">
                      <ApprovalRequestCompactSummary
                        request={po.currentApprovalRequest}
                      />
                    </h2>
                  </div>
                  <div className="min-h-0 flex-1 border border-gray-200 dark:border-gray-700 overflow-y-auto overscroll-y-contain">
                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                      <ApprovalRequestDetailBody
                        request={po.currentApprovalRequest}
                        orderId={id}
                        orderNo={po.orderNo}
                        compact
                        omitCompactSummary
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              <h3 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">
                발주 결재
              </h3>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {po.orderNo} · 현재 처리 대기인 단계를 승인하면 다음 단계로 진행됩니다. 반려 시 요청이 종료되며,
                발주를 수정한 뒤 다시 상신할 수 있습니다. 최종 승인까지 완료되면 발주가 종결됩니다.
              </p>
              <ApprovalModalAlternateAction
                show={showSubmitTabInModal}
                actionLabel="상신 요청으로 바꾸기"
                onAction={() => setApprovalAction("submit")}
              />
              <div className="mt-4">
                <Label htmlFor="approval-comment-approve">의견 (선택)</Label>
                <div className="mt-1">
                  <TextArea
                    id="approval-comment-approve"
                    rows={4}
                    value={approvalComment}
                    onChange={setApprovalComment}
                    placeholder="승인·반려 시 전달할 메모가 있으면 입력하세요."
                  />
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6 sm:py-5">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeApprovalModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  취소
                </button>
                {modalApprovalAction === "approve" ? (
                  <button
                    type="button"
                    onClick={() => setRejectConfirmOpen(true)}
                    disabled={
                      rejectConfirmOpen ||
                      rejectApprovalMutation.isPending ||
                      approvalMutation.isPending ||
                      isApprovalSubmitBlocked
                    }
                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    반려하기
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (modalApprovalAction === "submit") {
                      if (isUsersLoading) {
                        toast.error("사용자 목록을 불러오는 중입니다. 잠시 후 다시 시도하세요.");
                        return;
                      }
                      const lines = buildApprovalLinesFromDraft(approvalLineDraftRows);
                      if (lines.length === 0) {
                        toast.error("상신할 결재자를 한 명 이상 선택하세요.");
                        return;
                      }
                      approvalMutation.mutate({
                        action: "submit",
                        comment: approvalComment,
                        firstApproverUserId: lines[0]!.approverUserId,
                        title: approvalSubmitTitle.trim() || null,
                        remark: approvalSubmitRemark.trim() || null,
                        lines,
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
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        isOpen={rejectConfirmOpen}
        title="결재 반려"
        message="이 결재 요청을 반려하시겠습니까? 반려 후에는 발주를 수정한 뒤 재상신해야 합니다."
        confirmText="반려하기"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={rejectApprovalMutation.isPending}
        onClose={() => setRejectConfirmOpen(false)}
        onConfirm={() => {
          rejectApprovalMutation.mutate({
            comment: approvalComment,
            approvalRequestId: po.currentApprovalRequest?.id,
          });
        }}
      />

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
          품목별로 이번 납품 수량을 입력합니다. 발주 시 제품 정의를 넣지 않은 행은{" "}
          <strong className="font-medium text-gray-700 dark:text-gray-300">
            대표 제품 기준 정의 목록
          </strong>
          에서 선택합니다. 해당 제품에 정의가{" "}
          <strong className="font-medium text-gray-700 dark:text-gray-300">
            하나뿐
          </strong>
          이면 자동으로 골라 두고,{" "}
          <strong className="font-medium text-gray-700 dark:text-gray-300">
            여러 개
          </strong>
          면 직접 선택해야 합니다. 정의가 아직 없는 행은 아래{" "}
          <strong className="font-medium text-gray-700 dark:text-gray-300">
            제품 화면에서 정의 등록
          </strong>
          링크를 쓰면{" "}
          <strong className="font-medium text-gray-700 dark:text-gray-300">
            새 탭
          </strong>
          으로 열려 이 창의 납품 입력은 유지됩니다. 수량을 입력한 행은 정의가
          확정되어 있어야 합니다. 이미 발주에 정의가 박힌 행은 표시만 됩니다. 누적
          납품은 서버에서 검증합니다.
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
                      <th className="min-w-[12rem] px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        제품 정의
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
                        line.productNameSnapshot?.trim() ||
                        line.definitionNameSnapshot?.trim() ||
                        line.item?.name ||
                        (line.productDefinitionId > 0
                          ? `정의 #${line.productDefinitionId}`
                          : line.itemId != null && line.itemId > 0
                            ? `품목 #${line.itemId}`
                            : "품목");
                      const hasServerDef = (line.productDefinitionId ?? 0) > 0;
                      const lineProductId = line.productId ?? 0;
                      const legacyNoProduct =
                        !hasServerDef && lineProductId <= 0;
                      const defListIdx =
                        lineProductId > 0
                          ? productIdsForDeliveryDefs.indexOf(lineProductId)
                          : -1;
                      const defQuery =
                        defListIdx >= 0
                          ? deliveryDefinitionQueries[defListIdx]
                          : undefined;
                      const defsForLine =
                        deliveryDefsByProductId.get(lineProductId) ?? [];
                      const noDefinitionsAvailable =
                        !hasServerDef &&
                        lineProductId > 0 &&
                        !defQuery?.isLoading &&
                        !defQuery?.isError &&
                        defsForLine.length === 0;
                      const blockLineQty =
                        legacyNoProduct || noDefinitionsAvailable;
                      return (
                        <tr key={line.id}>
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                            {label}
                          </td>
                          <td className="max-w-[16rem] px-3 py-2 align-middle">
                            {hasServerDef ? (
                              <span className="text-theme-sm text-gray-800 dark:text-gray-200">
                                {(
                                  line.productDefinition?.name ??
                                  line.definitionNameSnapshot ??
                                  ""
                                ).trim() ||
                                  `정의 #${line.productDefinitionId}`}
                              </span>
                            ) : legacyNoProduct ? (
                              <span className="text-theme-xs text-amber-700 dark:text-amber-400">
                                대표 제품 없음. 발주 라인에 productId를 보완한 뒤
                                납품하세요.
                              </span>
                            ) : defQuery?.isLoading ? (
                              <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                                정의 목록 불러오는 중…
                              </span>
                            ) : defQuery?.isError ? (
                              <span className="text-theme-xs text-red-600 dark:text-red-400">
                                정의 목록을 불러오지 못했습니다.
                              </span>
                            ) : noDefinitionsAvailable ? (
                              <div className="space-y-2">
                                <p className="text-theme-xs text-amber-800 dark:text-amber-300">
                                  이 제품에 등록된 정의가 없습니다. 먼저 정의를
                                  만든 뒤 이 모달에서 수량을 입력하세요.
                                </p>
                                <a
                                  href={productDetailHrefForDeliveryReturn(
                                    lineProductId,
                                    id
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex w-full max-w-full items-center justify-center rounded-md border border-brand-500 bg-brand-50 px-2.5 py-1.5 text-center text-theme-xs font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
                                >
                                  제품 화면에서 정의 등록 (새 탭)
                                </a>
                              </div>
                            ) : (
                              <select
                                id={`delivery-def-${line.id}`}
                                aria-label={`${label} 제품 정의`}
                                value={
                                  deliveryLineDefinitionSelect[line.id] ?? ""
                                }
                                onChange={(e) =>
                                  setDeliveryLineDefinitionSelect((p) => ({
                                    ...p,
                                    [line.id]: e.target.value,
                                  }))
                                }
                                className="w-full max-w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-left text-theme-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                              >
                                <option value="">선택 (필수)</option>
                                {defsForLine.map((d) => (
                                  <option key={d.id} value={String(d.id)}>
                                    {productDefinitionSelectLabel(d)}
                                  </option>
                                ))}
                              </select>
                            )}
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
                              disabled={blockLineQty}
                              title={
                                legacyNoProduct
                                  ? "대표 제품이 없어 납품 수량을 입력할 수 없습니다."
                                  : noDefinitionsAvailable
                                    ? "납품할 제품 정의가 없습니다."
                                    : undefined
                              }
                              value={deliveryLineQtyInput[line.id] ?? ""}
                              onChange={(e) =>
                                setDeliveryLineQtyInput((prev) => ({
                                  ...prev,
                                  [line.id]: e.target.value,
                                }))
                              }
                              className="w-full min-w-[4rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-right tabular-nums text-theme-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
              const linesPayload: DeliveryCreateLinePayload[] = [];
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
                const lineLabel =
                  line.itemName?.trim() ||
                  line.productNameSnapshot?.trim() ||
                  line.definitionNameSnapshot?.trim() ||
                  line.item?.name ||
                  "품목";
                const hasServerDef = (line.productDefinitionId ?? 0) > 0;
                const lineProductId = line.productId ?? 0;
                if (!hasServerDef) {
                  if (lineProductId <= 0) {
                    toast.error(
                      `대표 제품이 없는 행은 납품할 수 없습니다. (${lineLabel})`
                    );
                    return;
                  }
                  const defsCheck =
                    deliveryDefsByProductId.get(lineProductId) ?? [];
                  if (defsCheck.length === 0) {
                    toast.error(
                      `제품 정의가 없어 납품할 수 없습니다. (${lineLabel})`
                    );
                    return;
                  }
                  const sel = (
                    deliveryLineDefinitionSelect[line.id] ?? ""
                  ).trim();
                  const defId = Number(sel);
                  if (!Number.isFinite(defId) || defId <= 0) {
                    toast.error(
                      `제품 정의를 선택하세요. (${lineLabel})`
                    );
                    return;
                  }
                  linesPayload.push({
                    orderItemId: line.id,
                    quantity: n,
                    productDefinitionId: defId,
                  });
                } else {
                  linesPayload.push({
                    orderItemId: line.id,
                    quantity: n,
                  });
                }
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
