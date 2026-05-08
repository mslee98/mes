import { useState, useMemo, useCallback, useEffect, startTransition } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import { OrderDetailLinesCard } from "../components/order/OrderDetailLinesCard";
import { OrderDetailDeliveriesCard } from "../components/order/OrderDetailDeliveriesCard";
import ConfirmModal from "../components/common/ConfirmModal";
import LoadingLottie from "../components/common/LoadingLottie";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../hooks/useAuth";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  getPurchaseOrder,
  getPurchaseOrderFiles,
  getDeliveries,
  createDelivery,
  getPurchaseOrderSerialMaxSequence,
  aggregateDeliveredQtyByOrderItemId,
  getPurchaseOrderRequestDepartmentLabel,
  updatePurchaseOrder,
  type PurchaseOrderDetail,
  type PurchaseOrderFile,
  type PurchaseOrderItem,
  type Delivery,
  type DeliveryCreatePayload,
  type DeliveryCreateLinePayload,
  type Partner,
} from "../api/purchaseOrder";
import { API_BASE } from "../api/apiBase";
import {
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  COMMON_CODE_GROUP_DELIVERY_STATUS,
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_WAVELENGTH,
} from "../api/commonCode";
import { getDetectors } from "../api/detectors";
import { getProductList } from "../api/products";
import { partnerSelectLabel } from "../lib/partnerDisplay";
import { partnerCountryFlagUrl } from "../lib/partnerCountryOptions";
import Label from "../components/form/Label";
import DatePicker from "../components/form/date-picker";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import TextArea from "../components/form/input/TextArea";
import { formatCurrency } from "../lib/formatCurrency";
import { lineItemsToAmountSummaries } from "../lib/orderLineAmountSummary";
import { fileTypeIconSrc } from "../lib/fileTypeIcon";
import { ReactComponent as ArrowDownTrayIcon } from "../icons/arrow-down-tray.svg?react";
import { ArrowTopRightOnSquareIcon } from "../icons";
import IconTooltip from "../components/ui/tooltip/IconTooltip";
import { getUsers } from "../api/user";
import {
  getOrganizationTree,
  flattenOrganizationUnitsForSelect,
} from "../api/organization";
function parsePositiveIntId(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim());
  return undefined;
}

const DETECTOR_TYPE_GUIDE_URL = "/iddca-type-table";

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

function deliveryQtyKey(orderItemId: number): string {
  return `oi:${orderItemId}`;
}

const SERIAL_MAKER_CODE = "I";
const PIXEL_PITCH_CODE_MAP: Record<string, string> = {
  "7.5": "S",
  "10.0": "T",
  "15.0": "F",
  "20.0": "W",
  "30.0": "H",
};


const YEAR_CODE_MAP: Record<string, string> = {
  "2025": "O",
  "2026": "P",
  "2027": "Q",
  "2028": "R",
  "2029": "S",
  "2030": "T",
  "2031": "U",
  "2032": "V",
  "2033": "W",
  "2034": "X",
  "2035": "Y",
};

function itemTypeCodeFromLine(line: PurchaseOrderItem): string {
  const joined = [
    line.itemName,
    line.productNameSnapshot,
    line.definitionNameSnapshot,
    line.spec,
  ]
    .map((v) => String(v ?? "").toUpperCase())
    .join(" ");
  if (joined.includes("CAMERA") || joined.includes("카메라".toUpperCase())) return "C";
  return "E";
}

function detectorTypeSuffixCode(rawType: string): string {
  const t = String(rawType ?? "").trim().toUpperCase();
  if (!t) return "";
  const parts = t.split("-").map((p) => p.trim()).filter(Boolean);
  return (parts[parts.length - 1] ?? "").replace(/[^A-Z0-9]/g, "");
}

function pitchCodeFromRaw(rawPitch: string): string {
  const trimmed = String(rawPitch ?? "").trim().replace(/UM$/i, "");
  if (!trimmed) return "";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return "";
  const normalized = parsed.toFixed(1);
  return PIXEL_PITCH_CODE_MAP[normalized] ?? "";
}

function yearCodeFromDate(deliveryDate: string): string {
  const year = String(deliveryDate ?? "").trim().slice(0, 4);
  return YEAR_CODE_MAP[year] ?? "";
}

function sequenceText(n: number): string {
  return String(n).padStart(4, "0");
}

/**
 * 발주 라인 사업명에서 소자 공통코드에 해당하는 토큰을 추출합니다.
 * 예: `ICC640_T2SL` 또는 표시명 `… (ICC640_T2SL)` → `T2SL` (`_` 기준 마지막 구간)
 */
function detectorElementCodeFromBusinessName(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const parenMatch = trimmed.match(/\(([^)]+)\)\s*$/);
  const core = (parenMatch ? parenMatch[1] : trimmed).trim();
  const parts = core.split("_").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

function detectorElementInitial(code: string): string {
  const normalized = String(code ?? "").trim().toUpperCase();
  if (!normalized) return "";
  return normalized.slice(0, 1);
}

/**
 * 접수/납품 — 현재 UX
 * -----------------------------------------------------------------
 * - 접수: PUT `.../purchase-orders/:id` (status=PO_CLOSED) — 발주 즉시 종결.
 * - 납품: POST `.../deliveries` — `order.status === PO_CLOSED` 일 때만 백엔드에서 허용.
 */
function formatDate(s: string | null | undefined): string {
  return s ?? "-";
}

function formatAttachmentDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR");
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
  const id = String(orderId ?? "").trim();
  const queryClient = useQueryClient();
  const { user: authUser, accessToken, isLoading: isAuthLoading } = useAuth();

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryTitle, setDeliveryTitle] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState("");
  const [deliveryRemark, setDeliveryRemark] = useState("");
  const [wavelengthCode, setWavelengthCode] = useState("");
  const [detectorId, setDetectorId] = useState("");
  /** 납품 담당자 — 발주 등록과 동일: 조직 단위 id(문자열) + 사용자 id(문자열) */
  const [deliveryManagerDeptSelectValue, setDeliveryManagerDeptSelectValue] =
    useState("");
  const [deliveryManagerUserSelectValue, setDeliveryManagerUserSelectValue] =
    useState("");
  /** 납품 라인 key(`oi:{orderItemId}`) → 이번 납품 수량 입력 문자열 */
  const [deliveryLineQtyInput, setDeliveryLineQtyInput] = useState<
    Record<string, string>
  >({});
  const [deliverySerialQtyInput, setDeliverySerialQtyInput] = useState("");
  const [isSerialRulePopoverOpen, setIsSerialRulePopoverOpen] = useState(false);
  const [deliverySerialPreviewRows, setDeliverySerialPreviewRows] = useState<
    Array<{
      key: string;
      orderItemId: number;
      lineLabel: string;
      serialNo: string;
      sequenceKey: string;
      detectorElementCode: string;
      wavelengthCode: string;
      detectorId: number;
      serialSnapshot?: Record<string, unknown>;
    }>
  >([]);
  const resetDeliveryModalForm = useCallback(() => {
    setDeliveryTitle("");
    setDeliveryDate("");
    setPlannedDeliveryDate("");
    setDeliveryRemark("");
    setWavelengthCode("");
    setDetectorId("");
    setDeliveryManagerDeptSelectValue("");
    setDeliveryManagerUserSelectValue("");
    setDeliveryLineQtyInput({});
    setDeliverySerialQtyInput("");
    setIsSerialRulePopoverOpen(false);
    setDeliverySerialPreviewRows([]);
  }, []);

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

  const deliveredByOrderItemId = useMemo(
    () => aggregateDeliveredQtyByOrderItemId(deliveries as Delivery[]),
    [deliveries]
  );

  const { data: purchaseOrderStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: deliveryStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );
  const { data: wavelengthCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_WAVELENGTH,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );
  const { data: detectorMasterList = [] } = useQuery({
    queryKey: ["detectorMasterForDeliveryTypeSelect"],
    queryFn: () => getDetectors(accessToken as string, { isActive: true }),
    enabled: !!accessToken && !isAuthLoading,
  });
  const { data: productMasterList = [] } = useQuery({
    queryKey: ["productMasterForSerialPrefix"],
    queryFn: async () => {
      const result = await getProductList(accessToken as string, { page: 1, size: 1000 });
      return result.items;
    },
    enabled: !!accessToken && !isAuthLoading,
  });

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

  const wavelengthOptions = useMemo(
    () =>
      wavelengthCodes
        .filter((item) => item.isActive !== false)
        .map((item) => ({ value: item.code, label: item.name || item.code })),
    [wavelengthCodes]
  );
  const detectorTypeOptions = useMemo(
    () =>
      detectorMasterList
        .filter((item) => item.isActive !== false)
        .map((item) => {
          const detectorType = String(item.detectorType ?? "").trim();
          const arrayWidth = Number(item.arrayWidth);
          const arrayHeight = Number(item.arrayHeight);
          const pitch = String(item.pitch ?? "").trim();
          const roicType = String(item.roicType ?? "").trim();
          const resolution =
            Number.isFinite(arrayWidth) && Number.isFinite(arrayHeight)
              ? `${arrayWidth}*${arrayHeight}`
              : "-";
          const pitchLabel = pitch ? `${pitch}` : "-";
          const roicLabel = roicType || "-";
          const label = `${detectorType} | ${resolution} | ${pitchLabel} | ${roicLabel}`;
          return {
            value: String(item.id),
            label,
          };
        })
        .filter((item) => item.value.length > 0),
    [detectorMasterList]
  );
  const productSerialMetaById = useMemo(() => {
    const m = new Map<string, { businessCode: string; pixelPitch: string }>();
    productMasterList.forEach((product) => {
      const id = String(product.id ?? "").trim();
      if (!id) return;
      const businessCode = String(product.businessCode ?? "").trim().toUpperCase();
      const pixelPitch = String(product.pixelPitch ?? "").trim();
      if (!businessCode) return;
      m.set(id, { businessCode, pixelPitch });
    });
    return m;
  }, [productMasterList]);
  const selectedDetector = useMemo(() => {
    const selectedId = Number(detectorId);
    if (!Number.isFinite(selectedId) || selectedId <= 0) return null;
    return (
      detectorMasterList.find((item) => Number(item.id) === selectedId) ?? null
    );
  }, [detectorMasterList, detectorId]);

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
      notify.success("접수되어 발주가 종결되었습니다.");
      setReceiveConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (e: Error) =>
      notify.error(e.message || "접수 처리에 실패했습니다."),
  });

  const deliveryMutation = useMutation({
    mutationFn: async (vars: { deliveryPayload: DeliveryCreatePayload }) => {
      return createDelivery(id, vars.deliveryPayload, accessToken!);
    },
    onSuccess: () => {
      notify.success("납품 및 시리얼이 등록되었습니다.");
      setDeliveryModalOpen(false);
      resetDeliveryModalForm();
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderDeliveries", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
    },
    onError: (e: Error) =>
      notify.error(e.message || "납품/시리얼 등록에 실패했습니다."),
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
  /** 납품 모달 초기값 등에 쓰는 요청 부서 문자열(API 별칭 통합) */
  const requestDeptLabel = getPurchaseOrderRequestDepartmentLabel(po);
  const hasDeliveryTargets = orderLines.length > 0;
  const firstOrderLine = orderLines[0];
  const deliveryHeaderProductName =
    firstOrderLine?.itemName?.trim() ||
    firstOrderLine?.productNameSnapshot?.trim() ||
    firstOrderLine?.definitionNameSnapshot?.trim() ||
    "-";
  const deliveryHeaderLensName =
    firstOrderLine?.lens?.lensName?.trim() ||
    firstOrderLine?.lensNameSnapshot?.trim() ||
    "-";

  const openDeliveryRegistrationModal = () => {
    const init: Record<string, string> = {};
    for (const line of orderLines) {
      init[deliveryQtyKey(line.id)] = "";
    }
    setDeliveryLineQtyInput(init);
    setDeliverySerialQtyInput("");
    setIsSerialRulePopoverOpen(false);
    setDeliverySerialPreviewRows([]);
    const phase = (deliveries as Delivery[]).length + 1;
    const orderTitle = (po.title ?? "").trim() || po.orderNo || "발주";
    setDeliveryTitle(`${orderTitle} ${phase}차 납품`);
    setDeliveryDate(new Date().toISOString().slice(0, 10));
    setPlannedDeliveryDate("");
    setDeliveryRemark("");
    setWavelengthCode("");
    setDetectorId("");
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
  const handleGenerateSerialClick = async () => {
    if (!hasDeliveryTargets) {
      notify.error("등록할 제품 라인이 없습니다.");
      return;
    }
    const raw = deliverySerialQtyInput.trim();
    const qty = Number(raw);
    if (!raw || !Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      notify.error("납품 수량은 1 이상의 정수로 입력하세요.");
      return;
    }
    if (!wavelengthCode.trim()) {
      notify.error("파장정보를 선택하세요.");
      return;
    }
    if (!detectorId.trim()) {
      notify.error("검출기 타입을 선택하세요.");
      return;
    }
    if (!selectedDetector) {
      notify.error("검출기 정보를 찾을 수 없습니다. 다시 선택하세요.");
      return;
    }
    const normalizedWavelengthCode = wavelengthCode.trim().toUpperCase();
    const arrayWidth = Number(selectedDetector.arrayWidth);
    if (!Number.isFinite(arrayWidth) || arrayWidth <= 0) {
      notify.error("검출기 해상도(가로) 정보가 없습니다.");
      return;
    }
    const resolutionCode = String(Math.trunc(arrayWidth)).padStart(4, "0");
    const detectorTypeCode = detectorTypeSuffixCode(
      String(selectedDetector.detectorType ?? "")
    );
    if (!detectorTypeCode) {
      notify.error("검출기 타입 코드(A/A2 등)를 파싱하지 못했습니다.");
      return;
    }
    const yearCode = yearCodeFromDate(deliveryDate.trim());
    if (!yearCode) {
      notify.error("제작년도 코드 매핑이 없습니다. (예: 2025→O, 2026→P)");
      return;
    }
    const customerCode = String(po.partner?.code ?? "").trim().toUpperCase();
    if (!customerCode) {
      notify.error("고객사 업체코드를 찾을 수 없습니다.");
      return;
    }
    const qtyEps = 1e-9;
    const nextInput = { ...deliveryLineQtyInput };
    const nextSerialRows: Array<{
      key: string;
      orderItemId: number;
      lineLabel: string;
      serialNo: string;
      sequenceKey: string;
      detectorElementCode: string;
      wavelengthCode: string;
      detectorId: number;
      serialSnapshot?: Record<string, unknown>;
    }> = [];
    let remainingToAssign = qty;
    const plannedRows: Array<{
      orderItemId: number;
      lineLabel: string;
      assignQty: number;
      sequenceKey: string;
      detectorElementCode: string;
    }> = [];
    for (const line of orderLines) {
      if (remainingToAssign <= qtyEps) break;
      const prev = deliveredByOrderItemId.get(line.id) ?? 0;
      const lineRemaining = Math.max(0, line.qty - prev);
      const assignQty = Math.min(
        Math.max(0, Math.floor(lineRemaining)),
        Math.floor(remainingToAssign)
      );
      nextInput[deliveryQtyKey(line.id)] = assignQty > 0 ? String(assignQty) : "";
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
      const serialMeta = productSerialMetaById.get(String(line.productId ?? "").trim());
      const businessCode = serialMeta?.businessCode ?? "";
      if (!businessCode) {
        notify.error(
          `제품 business_code를 찾을 수 없습니다. (${line.itemName ?? "품목"})`
        );
        return;
      }
      const pitchCode = pitchCodeFromRaw(serialMeta?.pixelPitch ?? "");

      if (!pitchCode) {
        notify.error(
          `제품 Pixel Pitch 코드 매핑이 없습니다. (${line.itemName ?? "품목"})`
        );
        return;
      }
      const detectorElementCode = detectorElementCodeFromBusinessName(lineCode);
      if (!detectorElementCode) {
        notify.error(
          `소자정보를 찾을 수 없습니다. (${line.itemName ?? "품목"})`
        );
        return;
      }
      const itemTypeCode = itemTypeCodeFromLine(line);
      const sequenceKey = `${businessCode}${detectorElementInitial(detectorElementCode)}${normalizedWavelengthCode}-${itemTypeCode}${SERIAL_MAKER_CODE}${resolutionCode}${pitchCode}${detectorTypeCode}-${yearCode}${customerCode}`;
      const lineLabel =
        !lineCode ||
        baseLabel.includes(`(${lineCode})`) ||
        baseLabel.startsWith("제품 #") ||
        baseLabel.startsWith("라인 #")
          ? baseLabel
          : `${baseLabel} (${lineCode})`;
      plannedRows.push({
        orderItemId: line.id,
        lineLabel,
        assignQty,
        sequenceKey,
        detectorElementCode: detectorElementInitial(detectorElementCode),
      });
      remainingToAssign -= assignQty;
    }
    if (remainingToAssign > qtyEps) {
      const totalRemaining = orderLines.reduce((sum, line) => {
        const prev = deliveredByOrderItemId.get(line.id) ?? 0;
        return sum + Math.max(0, line.qty - prev);
      }, 0);
      notify.error(`잔여 수량(${totalRemaining})을 초과했습니다.`);
      return;
    }
    const uniqueSequenceKeys = [...new Set(plannedRows.map((row) => row.sequenceKey))];
    const nextSequenceBaseByKey = new Map<string, number>();
    try {
      const sequenceResults = await Promise.all(
        uniqueSequenceKeys.map((sequenceKey) =>
          getPurchaseOrderSerialMaxSequence(id, sequenceKey, accessToken!)
        )
      );
      sequenceResults.forEach((result) => {
        nextSequenceBaseByKey.set(result.sequenceKey, result.nextSequence);
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "시리얼 시퀀스 조회 중 오류가 발생했습니다.";
      notify.error(message);
      return;
    }
    const sequenceCounterByKey = new Map<string, number>();
    plannedRows.forEach((row) => {
      const startNo = nextSequenceBaseByKey.get(row.sequenceKey) ?? 1;
      const serialPrefix = row.sequenceKey;
      for (let i = 0; i < row.assignQty; i += 1) {
        const offset = sequenceCounterByKey.get(row.sequenceKey) ?? 0;
        const nextSequenceNo = startNo + offset;
        sequenceCounterByKey.set(row.sequenceKey, offset + 1);
        const serialNo = `${serialPrefix}${sequenceText(nextSequenceNo)}`;
        nextSerialRows.push({
          key: `oi-${row.orderItemId}-seq-${row.sequenceKey}-${nextSequenceNo}`,
          orderItemId: row.orderItemId,
          lineLabel: row.lineLabel,
          serialNo,
          sequenceKey: row.sequenceKey,
          detectorElementCode: row.detectorElementCode,
          wavelengthCode: normalizedWavelengthCode,
          detectorId: Number(selectedDetector.id),
          serialSnapshot: {
            source: "frontend",
            detectorElementCode: row.detectorElementCode,
            wavelengthCode: normalizedWavelengthCode,
            detectorId: Number(selectedDetector.id),
            sequenceKey: row.sequenceKey,
            serialNo,
            deliveryDate: deliveryDate.trim(),
            yearCode,
            detectorTypeCode,
            customerCode,
          },
        });
      }
    });
    setDeliveryLineQtyInput(nextInput);
    setDeliverySerialPreviewRows(nextSerialRows);
    notify.success("시리얼 넘버를 발급했습니다.");
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
  const normalizedHeaderCurrency = headerCurrency.trim().toUpperCase() || "KRW";
  const isForeignHeaderCurrency = normalizedHeaderCurrency !== "KRW";
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
  const exchangeRateValue = Number(po.exchangeRate ?? NaN);
  const hasExchangeRate =
    Number.isFinite(exchangeRateValue) && exchangeRateValue > 0;
  const exchangeRateDateLabel = formatDate(po.exchangeRateDate ?? po.orderDate);
  const supplyAmountKrw =
    supplyAmountValue != null && isForeignHeaderCurrency && hasExchangeRate
      ? supplyAmountValue * exchangeRateValue
      : null;
  const totalAmountKrw =
    totalAmountWithVat != null && isForeignHeaderCurrency && hasExchangeRate
      ? totalAmountWithVat * exchangeRateValue
      : null;
  const orderSummaryTh =
    "w-[11%] min-w-[5.5rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 text-left text-theme-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-400";
  const orderSummaryTd = "px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100";

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
                {/* <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">부서</dt>
                  <dd className="max-w-md break-words font-medium text-gray-900 dark:text-gray-100">
                    {requestDeptLabel || "-"}
                  </dd>
                </div> */}
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
                {canShowReceiveButton ? (
                  <button
                    type="button"
                    onClick={() => setReceiveConfirmOpen(true)}
                    className="inline-flex rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 dark:border-brand-600 dark:hover:bg-brand-600"
                  >
                    접수
                  </button>
                ) : null}
                {canEditOrder ? (
                  <Link
                    to={`/order/${id}/edit`}
                    className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    수정
                  </Link>
                ) : null}
                <Link
                  to="/order"
                  className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  목록
                </Link>
              </div>
            </div>
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
                  <td className={orderSummaryTd}>
                    <div className="flex items-center gap-2">
                      {partnerFlagUrl ? (
                        <img
                          src={partnerFlagUrl}
                          alt=""
                          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
                          decoding="async"
                        />
                      ) : null}
                      <span>{partnerName}</span>
                    </div>
                  </td>
                  <th scope="row" className={orderSummaryTh}>
                    발주일
                  </th>
                  <td className={orderSummaryTd}>{formatDate(po.orderDate)}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    업체 발주번호
                  </th>
                  <td className={orderSummaryTd}>
                    {po.vendorOrderNo?.trim() || "—"}
                  </td>
                  <th scope="row" className={orderSummaryTh}>
                    고객요청납기일
                  </th>
                  <td className={orderSummaryTd}>{formatDate(po.dueDate)}</td>
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
                    {supplyAmountValue != null ? (
                      <>
                        {formatCurrency(supplyAmountValue, headerCurrency)}
                        <span className="ml-1.5 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                          ({headerCurrency})
                        </span>
                        {isForeignHeaderCurrency ? (
                          <span className="mt-1 block text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                            {supplyAmountKrw != null ? (
                              <>
                                환산(기준환율{" "}
                                {formatCurrency(exchangeRateValue, "KRW", {
                                  withSymbol: false,
                                })}
                                원, {exchangeRateDateLabel}){" "}
                                {formatCurrency(supplyAmountKrw, "KRW")}
                              </>
                            ) : (
                              "환산값 없음 (환율 미등록)"
                            )}
                          </span>
                        ) : null}
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
                    {totalAmountWithVat != null ? (
                      <>
                        {formatCurrency(totalAmountWithVat, headerCurrency)}
                        <span className="ml-1.5 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                          ({headerCurrency})
                        </span>
                        {isForeignHeaderCurrency ? (
                          <span className="mt-1 block text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                            {totalAmountKrw != null ? (
                              <>
                                환산(기준환율{" "}
                                {formatCurrency(exchangeRateValue, "KRW", {
                                  withSymbol: false,
                                })}
                                원, {exchangeRateDateLabel}){" "}
                                {formatCurrency(totalAmountKrw, "KRW")}
                              </>
                            ) : (
                              "환산값 없음 (환율 미등록)"
                            )}
                          </span>
                        ) : null}
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
                          <li key={f.id} className="flex items-center gap-2">
                            <img
                              src={fileTypeIconSrc(String(f.fileName ?? ""))}
                              alt=""
                              className="h-5 w-5 shrink-0"
                              decoding="async"
                            />
                            <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                              {f.fileName}
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-theme-xs text-gray-500">
                                {formatAttachmentDateTime(f.uploadedAt ?? f.createdAt ?? "")}
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
                                    notify.error(message);
                                  }
                                }}
                                title="첨부파일 다운로드"
                                aria-label="첨부파일 다운로드"
                                className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                              >
                                <ArrowDownTrayIcon className="size-4" aria-hidden />
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

        <OrderDetailLinesCard
          orderLines={orderLines}
          defaultCurrencyCode={po.currencyCode ?? "KRW"}
          orderLineSummaries={orderLineSummaries}
        />

        <OrderDetailDeliveriesCard
          deliveries={deliveries as Delivery[]}
          canRegisterDelivery={canRegisterDelivery}
          onRegisterDeliveryClick={openDeliveryRegistrationModal}
          formatDeliveryDate={formatDate}
          deliveryStatusDisplayName={deliveryStatusDisplayName}
        />
      </div>

      <ConfirmModal
        isOpen={receiveConfirmOpen}
        title="발주 접수"
        message="접수하면 발주가 즉시 종결됩니다. 종결 후에는 납품을 등록할 수 있습니다. 계속하시겠습니까?"
        confirmText="접수하기"
        cancelText="취소"
        confirmVariant="primary"
        illustration="check-circle"
        isConfirming={receiveMutation.isPending}
        onClose={() => setReceiveConfirmOpen(false)}
        onConfirm={() => receiveMutation.mutate()}
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">납품 계획 등록</h3>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
           <br/>
        </p>
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-theme-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300">
            <span className="font-semibold">발주번호 :</span> {po.orderNo}{" "}
            <span className="mx-2 text-gray-400">|</span>
            <span className="font-semibold">제품명 :</span> {deliveryHeaderProductName}{" "}
            <span className="mx-2 text-gray-400">|</span>
            <span className="font-semibold">렌즈 :</span> {deliveryHeaderLensName}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="delivery-date" required>
                  제품 인계일
                </Label>
                <IconTooltip
                  ariaLabel="제품 인계일 안내"
                  content="제품 인계일은 제조사업부로부터 검출기를 인계받는 일자를 의미합니다."
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
                <Label htmlFor="delivery-planned-date">납품 예정일 (선택)</Label>
                <IconTooltip
                  ariaLabel="납품 예정일 안내"
                  content="납품 예정일은 해당 납기 건에 대한 예정일을 의미합니다."
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
                label="담당자"
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
            <div className="sm:col-span-3 grid gap-4 sm:grid-cols-2">
              <SearchableSelectWithCreate
                id="wavelength-code"
                label="파장정보"
                required
                value={wavelengthCode}
                onChange={setWavelengthCode}
                options={wavelengthOptions}
                placeholder="선택하세요"
                noOptionsMessage="WAVELENGTH 코드가 없습니다."
                addTrigger="none"
                addButtonLabel=""
                onAddClick={() => {}}
              />
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="detector-type-code" required>
                    검출기 타입
                  </Label>
                  <a
                    href={DETECTOR_TYPE_GUIDE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-theme-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    타입 표 확인
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                </div>
                <SearchableSelectWithCreate
                  id="detector-type-code"
                  value={detectorId}
                  onChange={setDetectorId}
                  options={detectorTypeOptions}
                  placeholder="선택하세요"
                  noOptionsMessage="DETECTOR_TYPE 코드가 없습니다."
                  addTrigger="none"
                  addButtonLabel=""
                  onAddClick={() => {}}
                />
              </div>
            </div>
            <div className="sm:col-span-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <Label htmlFor="delivery-serial-qty" required>
                    이번 납품 수량
                  </Label>
                  <div className="mt-1.5 flex rounded-lg shadow-theme-xs">
                    <input
                      id="delivery-serial-qty"
                      type="text"
                      inputMode="numeric"
                      value={deliverySerialQtyInput}
                      onChange={(e) =>
                        setDeliverySerialQtyInput(
                          e.target.value.replace(/\D/g, "")
                        )
                      }
                      placeholder="0"
                      className="h-11 w-full rounded-l-lg rounded-r-none border border-gray-300 bg-white px-3 text-sm tabular-nums text-gray-900 shadow-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <span className="inline-flex h-11 items-center rounded-r-lg border border-gray-300 border-l-0 px-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                      EA
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleGenerateSerialClick();
                  }}
                  disabled={!deliverySerialQtyInput.trim()}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                >
                  시리얼 생성
                </button>
              </div>
            </div>

            <div className="col-span-4 border-b border-gray-200 dark:border-gray-700 my-4"></div>
            {/* <div className="sm:col-span-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              시리얼 Prefix/시퀀스는 서버 템플릿(`DET_STD_V2`)으로 생성됩니다.
              검출기 타입은 선택한 검출기 ID를 기준으로 서버에서 자동 계산됩니다.
            </div> */}
          </div>

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
                      {`[사업코드][소자1자리][파장]-[품목][제조사][해상도][피치][검출기]-[년도][고객][일련번호4자리]`}
                    </p>
                    <p className="mt-2 break-all text-gray-600 dark:text-gray-300">
                      예: EIL-EI0320MB-PD0001
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            {!hasDeliveryTargets ? (
              <p className="mt-2 text-theme-sm text-amber-700 dark:text-amber-400">
                납품 등록 가능한 제품 라인이 없습니다.
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
                      <th className="w-56 px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
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
                          시리얼이 생성된 항목이 없습니다.
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
                            <code className="text-brand-700 dark:text-brand-300">
                              {row.serialNo}
                            </code>
                          </td>
                        </tr>
                      ))
                    )}
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
                notify.error("제품 인계일을 입력하세요.");
                return;
              }
              if (!wavelengthCode.trim()) {
                notify.error("파장정보를 선택하세요.");
                return;
              }
              if (!detectorId.trim()) {
                notify.error("검출기 타입을 선택하세요.");
                return;
              }
              const selectedDetectorId = Number(detectorId);
              if (!Number.isFinite(selectedDetectorId) || selectedDetectorId <= 0) {
                notify.error("검출기를 다시 선택하세요.");
                return;
              }
              if (!selectedDetector || Number(selectedDetector.id) !== selectedDetectorId) {
                notify.error("검출기 정보를 찾을 수 없습니다. 다시 선택하세요.");
                return;
              }
              const arrayWidth = Number(selectedDetector.arrayWidth);
              if (!Number.isFinite(arrayWidth) || arrayWidth <= 0) {
                notify.error("검출기 해상도(가로) 정보가 없습니다.");
                return;
              }
              const resolutionCode = String(Math.trunc(arrayWidth)).padStart(4, "0");
              const detectorTypeCode = detectorTypeSuffixCode(
                String(selectedDetector.detectorType ?? "")
              );
              if (!detectorTypeCode) {
                notify.error("검출기 타입 코드(A/A2 등)를 파싱하지 못했습니다.");
                return;
              }
              const yearCode = yearCodeFromDate(deliveryDate.trim());
              if (!yearCode) {
                notify.error("제작년도 코드 매핑이 없습니다. (예: 2025→O, 2026→P)");
                return;
              }
              const customerCode = String(po.partner?.code ?? "").trim().toUpperCase();
              if (!customerCode) {
                notify.error("고객사 업체코드를 찾을 수 없습니다.");
                return;
              }
              if (!hasDeliveryTargets) {
                notify.error("등록할 제품 라인이 없습니다.");
                return;
              }
              if (deliverySerialPreviewRows.length === 0) {
                notify.error("시리얼을 먼저 생성하세요.");
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
              const deliveryProductLog: Array<Record<string, unknown>> = [];
              for (const row of deliverySerialPreviewRows) {
                const current = linesByOrderItemId.get(row.orderItemId);
                if (!current) {
                  linesByOrderItemId.set(row.orderItemId, {
                    quantity: 1,
                    sequenceKey: row.sequenceKey,
                    serials: [
                      {
                        serialNo: row.serialNo,
                        detectorElementCode: row.detectorElementCode,
                        wavelengthCode: row.wavelengthCode,
                        detectorId: row.detectorId,
                        serialSnapshot: row.serialSnapshot,
                      },
                    ],
                  });
                  continue;
                }
                current.quantity += 1;
                current.serials.push({
                  serialNo: row.serialNo,
                  detectorElementCode: row.detectorElementCode,
                  wavelengthCode: row.wavelengthCode,
                  detectorId: row.detectorId,
                  serialSnapshot: row.serialSnapshot,
                });
              }
              const linesPayload: DeliveryCreateLinePayload[] = [];
              for (const line of orderLines) {
                const bundled = linesByOrderItemId.get(line.id);
                if (!bundled) continue;
                const prev = deliveredByOrderItemId.get(line.id) ?? 0;
                const remaining = Math.max(0, line.qty - prev);
                if (bundled.quantity - remaining > QTY_EPS) {
                  notify.error(
                    `잔량을 초과했습니다. (${line.itemName ?? "품목"} · 잔여 ${remaining})`
                  );
                  return;
                }
                const biz =
                  line.businessName?.trim() ||
                  line.businessNameSnapshot?.trim() ||
                  "";
                const serialMeta =
                  productSerialMetaById.get(String(line.productId ?? "").trim());
                const businessCode = serialMeta?.businessCode ?? "";
                if (!businessCode) {
                  notify.error(
                    `제품 business_code를 찾을 수 없습니다. (${line.itemName ?? "품목"})`
                  );
                  return;
                }
                const pitchCode = pitchCodeFromRaw(serialMeta?.pixelPitch ?? "");
                if (!pitchCode) {
                  notify.error(
                    `제품 Pixel Pitch 코드 매핑이 없습니다. (${line.itemName ?? "품목"})`
                  );
                  return;
                }
                const derivedElement = detectorElementCodeFromBusinessName(biz);
                if (!derivedElement) {
                  notify.error(
                    `소자정보를 사업명에서 찾을 수 없습니다. 사업명에 '_' 뒤 소자 코드가 있어야 합니다. (${line.itemName ?? "품목"})`
                  );
                  return;
                }
                const itemTypeCode = itemTypeCodeFromLine(line);
                const sequenceKey = `${businessCode}${detectorElementInitial(derivedElement)}${wavelengthCode
                  .trim()
                  .toUpperCase()}-${itemTypeCode}${SERIAL_MAKER_CODE}${resolutionCode}${pitchCode}${detectorTypeCode}-${yearCode}${customerCode}`;
                linesPayload.push({
                  lineType: "PRODUCT",
                  lineId: line.id,
                  quantity: bundled.quantity,
                  sequenceKey,
                  serials: bundled.serials.map((serial) => ({
                    serialNo: serial.serialNo,
                    detectorElementCode: serial.detectorElementCode,
                    wavelengthCode: serial.wavelengthCode,
                    detectorId: serial.detectorId,
                    serialSnapshot:
                      serial.serialSnapshot ?? {
                        source: "frontend",
                        detectorElementCode: serial.detectorElementCode,
                        wavelengthCode: serial.wavelengthCode,
                        detectorId: serial.detectorId,
                      },
                  })),
                });
                deliveryProductLog.push({
                  orderItemId: line.id,
                  productId: line.productId,
                  itemName: line.itemName ?? null,
                  productNameSnapshot: line.productNameSnapshot ?? null,
                  definitionNameSnapshot: line.definitionNameSnapshot ?? null,
                  businessName: biz || null,
                  derivedDetectorElement: derivedElement,
                  lensName:
                    line.lens?.lensName?.trim() ||
                    line.lensNameSnapshot?.trim() ||
                    null,
                  orderQty: line.qty,
                  thisDeliveryQty: bundled.quantity,
                  wavelengthCode: wavelengthCode.trim(),
                  detectorId: selectedDetectorId,
                  sequenceKey,
                });
              }
              if (linesPayload.length === 0) {
                notify.error("이번 납품 수량을 1건 이상 입력하세요.");
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
              console.log("[납품 등록] 제품 정보", {
                발주번호: po.orderNo,
                납품제목: deliveryTitle.trim() || null,
                제품인계일: deliveryDate.trim(),
                납품예정일: plannedDeliveryDate.trim() || null,
                품목: deliveryProductLog,
              });
              deliveryMutation.mutate({
                deliveryPayload: payload,
              });
            }}
            disabled={
              deliveryMutation.isPending || !hasDeliveryTargets
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
