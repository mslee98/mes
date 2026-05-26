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
import { OrderDetailDeliveryPlansCard } from "../components/order/OrderDetailDeliveryPlansCard";
import { OrderDetailLinkUnitsModal } from "../components/order/OrderDetailLinkUnitsModal";
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
  createDeliveryPlan,
  getPurchaseOrderDeliveryPlans,
  getPurchaseOrderSerialMaxSequence,
  aggregateDeliveredQtyByOrderItemId,
  getPurchaseOrderRequestDepartmentLabel,
  updatePurchaseOrder,
  type PurchaseOrderDetail,
  type PurchaseOrderFile,
  type PurchaseOrderItem,
  type Delivery,
  type DeliveryCreatePayload,
  type DeliveryPlan,
  type DeliveryCreateLinePayload,
  type Partner,
} from "../api/purchaseOrder";
import { API_BASE } from "../api/apiBase";
import {
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
import { formatDateYmd } from "../lib/dateFormat";
import { buildApiFileUrl, downloadFileWithAuth } from "../lib/fileDownload";
import { ReactComponent as ArrowDownTrayIcon } from "../icons/arrow-down-tray.svg?react";
import {
  ArrowTopRightOnSquareIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  GroupIcon,
  CalenderIcon,
  DollarLineIcon,
  TruckIcon,
} from "../icons";
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

/** 諛쒖＜ ??`OrderForm`)怨??숈씪 ??議곗쭅 ?⑥쐞 ?좏깮媛뮻룸젅嫄곗떆 遺??臾몄옄??*/
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
  if (joined.includes("CAMERA") || joined.includes("移대찓??.toUpperCase())) return "C";
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
 * 諛쒖＜ ?쇱씤 ?ъ뾽紐낆뿉???뚯옄 怨듯넻肄붾뱶???대떦?섎뒗 ?좏겙??異붿텧?⑸땲??
 * ?? `ICC640_T2SL` ?먮뒗 ?쒖떆紐?`??(ICC640_T2SL)` ??`T2SL` (`_` 湲곗? 留덉?留?援ш컙)
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

function firstLineProductWithBusiness(
  line: PurchaseOrderItem | undefined
): string {
  if (!line) return "-";
  const baseLabel =
    line.itemName?.trim() ||
    line.productNameSnapshot?.trim() ||
    line.definitionNameSnapshot?.trim() ||
    (line.productId != null && String(line.productId).trim() !== ""
      ? `?쒗뭹 #${line.productId}`
      : `?쇱씤 #${line.id}`);
  const lineCode =
    line.businessName?.trim() ||
    line.businessNameSnapshot?.trim() ||
    line.versionSnapshot?.trim() ||
    "";
  if (
    !lineCode ||
    baseLabel.includes(`(${lineCode})`) ||
    baseLabel.startsWith("?쒗뭹 #") ||
    baseLabel.startsWith("?쇱씤 #")
  ) {
    return baseLabel;
  }
  return `${baseLabel} (${lineCode})`;
}

function compactYmdForPlanTitle(planned: string, delivery: string): string {
  const src = planned.trim() ? planned.trim() : delivery.trim();
  let ymd = formatDateYmd(src || undefined, { emptyFallback: "" });
  if (!ymd || ymd === "-") {
    ymd = formatDateYmd(new Date().toISOString(), { emptyFallback: "" });
  }
  return ymd.replace(/-/g, "");
}

function buildDeliveryPlanAutoTitle(opts: {
  plannedDeliveryDate: string;
  deliveryDate: string;
  lines: PurchaseOrderItem[];
  nextPlanSeq: number;
}): string {
  const compact = compactYmdForPlanTitle(
    opts.plannedDeliveryDate,
    opts.deliveryDate
  );
  const productSeg = firstLineProductWithBusiness(opts.lines[0]);
  const totalQty = opts.lines.reduce(
    (s, l) => s + (Number(l.qty) || 0),
    0
  );
  return `${compact}-${productSeg}-${totalQty} ${opts.nextPlanSeq}李??⑺뭹怨꾪쉷`;
}

/**
 * ?묒닔 / ?⑺뭹 怨꾪쉷 / ?ㅼ젣 ?⑺뭹
 * -----------------------------------------------------------------
 * - ?묒닔: PUT `.../purchase-orders/:id` (status=PO_CLOSED) ??諛쒖＜ 利됱떆 醫낃껐.
 * - ?⑺뭹 怨꾪쉷: POST `.../delivery-plans` ???ㅼ젣 ?⑺뭹怨??숈씪 蹂몃Ц(`DeliveryCreatePayload`), 醫낃껐 ???깅줉, ?곸꽭??`/order/:id/plan/:planId`.
 * - ?ㅼ젣 ?⑺뭹: POST `.../deliveries` ??`PO_CLOSED` ???뚮쭔 ?덉슜; ?????Unit ?곌껐 紐⑤떖?먯꽌 `delivery-items/:id/units`.
 *
 * UI: 怨쇨굅 ?뚯씠釉뷀삎 ?곸꽭(`?layout=classic`)???쒓굅????移대뱶???붿빟 ?덉씠?꾩썐留??좎??⑸땲??
 */
export default function OrderDetail() {
  const { orderId } = useParams();
  const id = String(orderId ?? "").trim();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser, accessToken, isLoading: isAuthLoading } = useAuth();

  /** ?⑺뭹 紐⑤떖: ?ㅼ젣 ?⑺뭹 vs ?⑺뭹 怨꾪쉷 ???숈씪 ?셋룸룞??`DeliveryCreatePayload`, ?몄텧 API留??ㅻ쫫 */
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
  const [wavelengthCode, setWavelengthCode] = useState("");
  const [detectorId, setDetectorId] = useState("");
  /** ?⑺뭹 ?대떦????諛쒖＜ ?깅줉怨??숈씪: 議곗쭅 ?⑥쐞 id(臾몄옄?? + ?ъ슜??id(臾몄옄?? */
  const [deliveryManagerDeptSelectValue, setDeliveryManagerDeptSelectValue] =
    useState("");
  const [deliveryManagerUserSelectValue, setDeliveryManagerUserSelectValue] =
    useState("");
  /** ?⑺뭹 ?쇱씤 key(`oi:{orderItemId}`) ???대쾲 ?⑺뭹 ?섎웾 ?낅젰 臾몄옄??*/
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
  /** ?쒕━??誘몃━蹂닿린媛 ?덉쓣 ?? ?앹꽦 ?쒖젏怨??ㅻⅨ ?낅젰???섎㈃ 誘몃━蹂닿린瑜?臾댄슚??*/
  const lastSerialDepsWhenPreviewRef = useRef<string | null>(null);
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

  /** ?묒닔(醫낃껐) ?뺤씤 紐⑤떖 */
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

  const { data: poDeliveryPlans = [] } = useQuery({
    queryKey: ["purchaseOrderDeliveryPlans", id],
    queryFn: () => getPurchaseOrderDeliveryPlans(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  const nextDeliveryPlanSeq = useMemo(
    () =>
      Math.max(0, ...poDeliveryPlans.map((p) => p.planSeq ?? 0)) + 1,
    [poDeliveryPlans]
  );

  const deliveredByOrderItemId = useMemo(
    () => aggregateDeliveredQtyByOrderItemId(deliveries as Delivery[]),
    [deliveries]
  );

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  /* ?⑺뭹 ?ㅼ쟻 移대뱶 鍮꾪몴????DELIVERY_STATUS 肄붾뱶 遺덊븘????移대뱶 蹂듦뎄 ???④퍡 ?댁젣
  const { data: deliveryStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );
  */
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

  /** 濡쒓렇???ъ슜??id 留ㅼ묶?????ъ슜??紐⑸줉 */
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  /** JWT쨌濡쒓렇??user.id ?곗꽑, ?놁쑝硫?GET /users ?먯꽌 employeeNo 濡?留ㅼ묶(?묒꽦?먃룹젒??踰꾪듉 ?? */
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
      opts.unshift({ value: sel, label: `${legacyName} (??λ맂 媛?` });
      return opts;
    }
    opts.unshift({ value: sel, label: `?ъ슜??#${sel}` });
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

  /* ?⑺뭹 ?ㅼ쟻 移대뱶 ?꾩슜 ??移대뱶 蹂듦뎄 ???④퍡 ?댁젣
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

  /** ?묒닔 ??諛쒖＜ ?곹깭瑜?利됱떆 醫낃껐(PO_CLOSED)濡?蹂寃?*/
  const receiveMutation = useMutation({
    mutationFn: async () =>
      updatePurchaseOrder(
        id,
        {
          status: "PO_CLOSED",
          statusChangeComment: "諛쒖＜ ?묒닔濡??명븳 醫낃껐 泥섎━",
        },
        accessToken!
      ),
    onSuccess: () => {
      toast.success("?묒닔?섏뼱 諛쒖＜媛 醫낃껐?섏뿀?듬땲??");
      setReceiveConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "?묒닔 泥섎━???ㅽ뙣?덉뒿?덈떎."),
  });

  const deliveryMutation = useMutation({
    mutationFn: async (vars: {
      deliveryPayload: DeliveryCreatePayload;
      purpose: "actual" | "plan";
    }) => {
      if (vars.purpose === "plan") {
        return createDeliveryPlan(id, vars.deliveryPayload, accessToken!);
      }
      return createDelivery(id, vars.deliveryPayload, accessToken!);
    },
    onSuccess: (data, vars) => {
      if (vars.purpose === "plan") {
        const plan = data as DeliveryPlan;
        toast.success("?⑺뭹 怨꾪쉷???깅줉?섏뿀?듬땲??");
        setDeliveryModalOpen(false);
        resetDeliveryModalForm();
        setDeliveryModalPurpose("actual");
        queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
        queryClient.invalidateQueries({
          queryKey: ["purchaseOrderDeliveryPlans", id],
        });
        navigate(`/order/${id}/plan/${plan.id}`);
        return;
      }
      const delivery = data as Delivery;
      toast.success("?⑺뭹 諛??쒕━?쇱씠 ?깅줉?섏뿀?듬땲??");
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
            ? "?⑺뭹 怨꾪쉷 ?깅줉???ㅽ뙣?덉뒿?덈떎."
            : "?⑺뭹/?쒕━???깅줉???ㅽ뙣?덉뒿?덈떎.")
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
        buildDeliveryPlanAutoTitle({
          plannedDeliveryDate,
          deliveryDate,
          lines: orderLines,
          nextPlanSeq: nextDeliveryPlanSeq,
        })
      );
    });
  }, [
    deliveryModalOpen,
    deliveryModalPurpose,
    plannedDeliveryDate,
    deliveryDate,
    orderLines,
    nextDeliveryPlanSeq,
  ]);

  useEffect(() => {
    const snap = JSON.stringify({
      deliveryDate,
      wavelengthCode,
      detectorId,
      deliverySerialQtyInput,
      deliveryLineQtyInput,
    });
    if (deliverySerialPreviewRows.length === 0) {
      lastSerialDepsWhenPreviewRef.current = null;
      return;
    }
    if (lastSerialDepsWhenPreviewRef.current === null) {
      lastSerialDepsWhenPreviewRef.current = snap;
      return;
    }
    if (lastSerialDepsWhenPreviewRef.current !== snap) {
      lastSerialDepsWhenPreviewRef.current = snap;
      startTransition(() => {
        setDeliverySerialPreviewRows([]);
        setIsSerialRulePopoverOpen(false);
      });
    }
  }, [
    deliveryDate,
    wavelengthCode,
    detectorId,
    deliverySerialQtyInput,
    deliveryLineQtyInput,
    deliverySerialPreviewRows.length,
  ]);

  if (orderLoading || !order) {
    return (
      <>
        <PageMeta title="諛쒖＜ ?곸꽭" description="諛쒖＜ ?곸꽭" />
        <PageBreadcrumb pageTitle="諛쒖＜ ?곸꽭" />
        <div className="flex min-h-[320px] items-center justify-center">
          {orderLoading && <LoadingLottie />}
          {!orderLoading && orderError && (
            <p className="text-sm text-red-600 dark:text-red-400">諛쒖＜瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??</p>
          )}
        </div>
      </>
    );
  }

  const po = order as PurchaseOrderDetail;
  /** ?⑺뭹 紐⑤떖 珥덇린媛??깆뿉 ?곕뒗 ?붿껌 遺??臾몄옄??API 蹂꾩묶 ?듯빀) */
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

  const openDeliveryRegistrationModal = (purpose: "actual" | "plan") => {
    setDeliveryModalPurpose(purpose);
    const init: Record<string, string> = {};
    for (const line of orderLines) {
      init[deliveryQtyKey(line.id)] = "";
    }
    setDeliveryLineQtyInput(init);
    setDeliverySerialQtyInput("");
    setIsSerialRulePopoverOpen(false);
    setDeliverySerialPreviewRows([]);
    const orderTitle = (po.title ?? "").trim() || po.orderNo || "諛쒖＜";
    const initialDeliveryDate = new Date().toISOString().slice(0, 10);
    if (purpose === "plan") {
      setDeliveryTitle(
        buildDeliveryPlanAutoTitle({
          plannedDeliveryDate: "",
          deliveryDate: initialDeliveryDate,
          lines: orderLines,
          nextPlanSeq: nextDeliveryPlanSeq,
        })
      );
    } else {
      const phase = (deliveries as Delivery[]).length + 1;
      setDeliveryTitle(`${orderTitle} ${phase}李??⑺뭹`);
    }
    setDeliveryDate(initialDeliveryDate);
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
      toast.error("?깅줉???쒗뭹 ?쇱씤???놁뒿?덈떎.");
      return;
    }
    const raw = deliverySerialQtyInput.trim();
    const qty = Number(raw);
    if (!raw || !Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      toast.error("?⑺뭹 ?섎웾? 1 ?댁긽???뺤닔濡??낅젰?섏꽭??");
      return;
    }
    if (!wavelengthCode.trim()) {
      toast.error("?뚯옣?뺣낫瑜??좏깮?섏꽭??");
      return;
    }
    if (!detectorId.trim()) {
      toast.error("寃異쒓린 ??낆쓣 ?좏깮?섏꽭??");
      return;
    }
    if (!selectedDetector) {
      toast.error("寃異쒓린 ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎. ?ㅼ떆 ?좏깮?섏꽭??");
      return;
    }
    const normalizedWavelengthCode = wavelengthCode.trim().toUpperCase();
    const arrayWidth = Number(selectedDetector.arrayWidth);
    if (!Number.isFinite(arrayWidth) || arrayWidth <= 0) {
      toast.error("寃異쒓린 ?댁긽??媛濡? ?뺣낫媛 ?놁뒿?덈떎.");
      return;
    }
    const resolutionCode = String(Math.trunc(arrayWidth)).padStart(4, "0");
    const detectorTypeCode = detectorTypeSuffixCode(
      String(selectedDetector.detectorType ?? "")
    );
    if (!detectorTypeCode) {
      toast.error("寃異쒓린 ???肄붾뱶(A/A2 ??瑜??뚯떛?섏? 紐삵뻽?듬땲??");
      return;
    }
    const yearCode = yearCodeFromDate(deliveryDate.trim());
    if (!yearCode) {
      toast.error("?쒖옉?꾨룄 肄붾뱶 留ㅽ븨???놁뒿?덈떎. (?? 2025?뭀, 2026?뭁)");
      return;
    }
    const customerCode = String(po.partner?.code ?? "").trim().toUpperCase();
    if (!customerCode) {
      toast.error("怨좉컼???낆껜肄붾뱶瑜?李얠쓣 ???놁뒿?덈떎.");
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
          ? `?쒗뭹 #${line.productId}`
          : `?쇱씤 #${line.id}`);
      const lineCode =
        line.businessName?.trim() ||
        line.businessNameSnapshot?.trim() ||
        line.versionSnapshot?.trim() ||
        "";
      const serialMeta = productSerialMetaById.get(String(line.productId ?? "").trim());
      const businessCode = serialMeta?.businessCode ?? "";
      if (!businessCode) {
        toast.error(
          `?쒗뭹 business_code瑜?李얠쓣 ???놁뒿?덈떎. (${line.itemName ?? "?덈ぉ"})`
        );
        return;
      }
      const pitchCode = pitchCodeFromRaw(serialMeta?.pixelPitch ?? "");

      if (!pitchCode) {
        toast.error(
          `?쒗뭹 Pixel Pitch 肄붾뱶 留ㅽ븨???놁뒿?덈떎. (${line.itemName ?? "?덈ぉ"})`
        );
        return;
      }
      const detectorElementCode = detectorElementCodeFromBusinessName(lineCode);
      if (!detectorElementCode) {
        toast.error(
          `?뚯옄?뺣낫瑜?李얠쓣 ???놁뒿?덈떎. (${line.itemName ?? "?덈ぉ"})`
        );
        return;
      }
      const itemTypeCode = itemTypeCodeFromLine(line);
      const sequenceKey = `${businessCode}${detectorElementInitial(detectorElementCode)}${normalizedWavelengthCode}-${itemTypeCode}${SERIAL_MAKER_CODE}${resolutionCode}${pitchCode}${detectorTypeCode}-${yearCode}${customerCode}`;
      const lineLabel =
        !lineCode ||
        baseLabel.includes(`(${lineCode})`) ||
        baseLabel.startsWith("?쒗뭹 #") ||
        baseLabel.startsWith("?쇱씤 #")
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
      toast.error(`?붿뿬 ?섎웾(${totalRemaining})??珥덇낵?덉뒿?덈떎.`);
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
          : "?쒕━???쒗??議고쉶 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.";
      toast.error(message);
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
    toast.success("?쒕━???섎쾭瑜?諛쒓툒?덉뒿?덈떎.");
  };

  const createdById = po.createdBy?.id;
  const isPoClosed =
    String(po.status ?? po.orderStatus ?? "").trim() === "PO_CLOSED";
  /** `POST .../deliveries` ??諛깆뿏?? 諛쒖＜ status 媛 PO_CLOSED ???뚮쭔 ?덉슜 */
  const canRegisterDelivery = isPoClosed;
  const isAuthor =
    createdById == null ||
    (currentUserId != null && createdById === currentUserId);
  const canEditOrder = !isPoClosed && isAuthor;
  /** 誘몄쥌寃걔룸벑濡앹옄留??묒닔(利됱떆 醫낃껐) 媛??*/
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
  const planCount = poDeliveryPlans.length;
  const deliveryOverviewText =
    planCount === 0 ? "?⑺뭹怨꾪쉷 ?놁쓬" : `?⑺뭹怨꾪쉷 ${planCount}嫄?;
  const totalWithVatDisplay =
    totalAmountWithVat != null
      ? `${formatCurrency(totalAmountWithVat, headerCurrency)} (遺媛???ы븿)`
      : "??;

  return (
    <>
      <PageMeta title={`諛쒖＜ ${po.orderNo}`} description={`諛쒖＜ ${po.orderNo} ?곸꽭`} />
      <PageBreadcrumb pageTitle={`諛쒖＜ ?곸꽭 쨌 ${po.orderNo}`} />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:gap-2.5 sm:text-2xl">
              <span>諛쒖＜ ?곸꽭</span>
              <span className="font-mono text-lg font-medium text-gray-700 dark:text-gray-300">
                {po.orderNo}
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
            <Link
              to="/order"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
            >
              <ListIcon className="size-4 shrink-0" aria-hidden />
              紐⑸줉
            </Link>
            {canEditOrder ? (
              <Link
                to={`/order/${id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
              >
                <PencilIcon className="size-4 shrink-0" aria-hidden />
                ?섏젙
              </Link>
            ) : null}
            {canShowReceiveButton ? (
              <button
                type="button"
                onClick={() => setReceiveConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-white px-2.5 py-1.5 text-sm font-medium text-brand-600 shadow-theme-xs hover:bg-brand-50 dark:border-brand-600 dark:bg-gray-800 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                ?묒닔
              </button>
            ) : null}
            <button
              type="button"
              disabled={!canRegisterDelivery}
              title={
                canRegisterDelivery
                  ? undefined
                  : "諛쒖＜媛 醫낃껐(PO_CLOSED)???ㅼ뿉留??깅줉?????덉뒿?덈떎."
              }
              onClick={() => openDeliveryRegistrationModal("plan")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              <PlusIcon className="size-4 shrink-0" aria-hidden />
              ?⑺뭹 怨꾪쉷 留뚮뱾湲?            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex min-h-[7.25rem] flex-col justify-center rounded-xl border border-gray-100 bg-white p-3.5 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.02] sm:min-h-[7.75rem] sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 shadow-inner dark:bg-white/[0.08] dark:text-gray-200 sm:size-14">
                <GroupIcon className="size-7 sm:size-8" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                  嫄곕옒泥?                </p>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium leading-snug text-gray-900 dark:text-white">
                  {partnerFlagUrl ? (
                    <img
                      src={partnerFlagUrl}
                      alt=""
                      className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
                      decoding="async"
                    />
                  ) : null}
                  <span className="min-w-0 truncate">{partnerName}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex min-h-[7.25rem] flex-col justify-center rounded-xl border border-gray-100 bg-white p-3.5 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.02] sm:min-h-[7.75rem] sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 shadow-inner dark:bg-white/[0.08] dark:text-gray-200 sm:size-14">
                <CalenderIcon className="size-7 sm:size-8" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-sm leading-snug text-gray-900 dark:text-white">
                <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                  ?쇱젙
                </p>
                <p>
                  <span className="text-gray-500 dark:text-gray-400">諛쒖＜??/span>{" "}
                  {formatDateYmd(po.orderDate, { emptyFallback: "-" })}
                </p>
                <p>
                  <span className="text-gray-500 dark:text-gray-400">?붿껌 ?⑷린</span>{" "}
                  {formatDateYmd(po.dueDate, { emptyFallback: "-" })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex min-h-[7.25rem] flex-col justify-center rounded-xl border border-gray-100 bg-white p-3.5 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.02] sm:min-h-[7.75rem] sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 shadow-inner dark:bg-white/[0.08] dark:text-gray-200 sm:size-14">
                <DollarLineIcon className="size-7 sm:size-8" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                  ?⑷퀎 湲덉븸
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums leading-snug text-gray-900 dark:text-white">
                  {totalWithVatDisplay}
                </p>
              </div>
            </div>
          </div>
          <div className="flex min-h-[7.25rem] flex-col justify-center rounded-xl border border-gray-100 bg-white p-3.5 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.02] sm:min-h-[7.75rem] sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 shadow-inner dark:bg-white/[0.08] dark:text-gray-200 sm:size-14">
                <TruckIcon className="size-7 sm:size-8" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                  ?⑺뭹 吏꾪뻾
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-gray-900 dark:text-white">
                  {deliveryOverviewText}
                </p>
              </div>
            </div>
          </div>
        </div>

        <ComponentCard
          title="諛쒖＜ ?뺣낫"
          desc="諛쒖＜ 留덉뒪??諛?怨좉컼 ?붿껌 ?ы빆?낅땲??"
          collapsible={false}
          className="[&>div:first-child]:px-4 [&>div:first-child]:py-3.5"
          bodyClassName="!p-3 sm:!p-4"
          contentClassName="!space-y-3"
        >
          {!canRegisterDelivery ? (
            <p className="mb-2 text-theme-xs text-amber-700 dark:text-amber-400/90">
              諛쒖＜媛 醫낃껐(PO_CLOSED)???ㅼ뿉留??⑺뭹 怨꾪쉷???깅줉?????덉뒿?덈떎.
            </p>
          ) : null}
          <div className="grid gap-5 md:grid-cols-2">
            <dl className="space-y-3">
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  嫄곕옒泥?                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                  {partnerFlagUrl ? (
                    <img
                      src={partnerFlagUrl}
                      alt=""
                      className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
                      decoding="async"
                    />
                  ) : null}
                  <span>{partnerName}</span>
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  諛쒖＜??                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {formatDateYmd(po.orderDate, { emptyFallback: "-" })}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  怨좉컼 諛쒖＜踰덊샇
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {po.vendorOrderNo?.trim() || "??}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  ?대떦??                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {po.requesterName?.trim() ||
                    po.createdBy?.name?.trim() ||
                    "??}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  泥⑤??뚯씪
                </dt>
                <dd className="mt-1">
                  {(files as PurchaseOrderFile[]).length === 0 ? (
                    <span className="text-sm text-gray-500">泥⑤??뚯씪???놁뒿?덈떎.</span>
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
                          <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
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
                                    : "泥⑤??뚯씪 ?ㅼ슫濡쒕뱶???ㅽ뙣?덉뒿?덈떎.";
                                toast.error(message);
                              }
                            }}
                            title="泥⑤??뚯씪 ?ㅼ슫濡쒕뱶"
                            aria-label="泥⑤??뚯씪 ?ㅼ슫濡쒕뱶"
                            className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                          >
                            <ArrowDownTrayIcon className="size-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
            <dl className="space-y-3">
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  ?쒕ぉ
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {po.title?.trim() || "??}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  怨좉컼 ?붿껌 ?⑷린
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {formatDateYmd(po.dueDate, { emptyFallback: "?? })}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  ?붿껌?ы빆
                </dt>
                <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                  {po.vendorRequest?.trim() ? (
                    <span className="whitespace-pre-wrap">{po.vendorRequest}</span>
                  ) : (
                    <span className="text-gray-500">??/span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  ?뱀씠?ы빆
                </dt>
                <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                  {po.specialNote?.trim() ? (
                    <span className="whitespace-pre-wrap">{po.specialNote}</span>
                  ) : (
                    <span className="text-gray-500">??/span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </ComponentCard>

        <OrderDetailLinesCard
          orderLines={orderLines}
          defaultCurrencyCode={po.currencyCode ?? "KRW"}
          orderLineSummaries={orderLineSummaries}
          layoutMode="dashboard"
        />

        <OrderDetailDeliveryPlansCard
          purchaseOrderId={id}
          accessToken={accessToken ?? ""}
          isAuthLoading={isAuthLoading}
          canCreate={canRegisterDelivery}
          onOpenPlanModal={() => openDeliveryRegistrationModal("plan")}
          hideHeaderCreateButton
          visualVariant="dashboard"
        />
      </div>

      <ConfirmModal
        isOpen={receiveConfirmOpen}
        title="諛쒖＜ ?묒닔"
        message="?묒닔?섎㈃ 諛쒖＜媛 利됱떆 醫낃껐?⑸땲?? 醫낃껐 ?꾩뿉???⑺뭹???깅줉?????덉뒿?덈떎. 怨꾩냽?섏떆寃좎뒿?덇퉴?"
        confirmText="?묒닔?섍린"
        cancelText="痍⑥냼"
        confirmVariant="primary"
        illustration="check-circle"
        isConfirming={receiveMutation.isPending}
        onClose={() => setReceiveConfirmOpen(false)}
        onConfirm={() => receiveMutation.mutate()}
      />

      {/* ?⑺뭹 ?깅줉 紐⑤떖 */}
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
                ? "?⑺뭹 怨꾪쉷 ?깅줉"
                : "?ㅼ젣 ?⑺뭹 ?깅줉"}
            </h3>
            {deliveryModalPurpose === "plan" ? null : (
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                諛쒖＜ 醫낃껐 ???ㅼ젣 ?⑺뭹 ?ㅻ뜑쨌?쇱씤쨌?쒕━?쇱쓣 ?깅줉?⑸땲?? ?????                ?숈씪 諛쒖＜???⑺뭹 怨꾪쉷?먯꽌 異쒓퀬 媛?ν븳 Unit???⑺뭹 ?쇱씤???곌껐??                ???덉뒿?덈떎.
              </p>
            )}
          </>
        }
      >
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-theme-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300">
            <span className="font-semibold">諛쒖＜踰덊샇 :</span> {po.orderNo}{" "}
            <span className="mx-2 text-gray-400">|</span>
            <span className="font-semibold">?쒗뭹紐?:</span> {deliveryHeaderProductName}{" "}
            <span className="mx-2 text-gray-400">|</span>
            <span className="font-semibold">?뚯쫰 :</span> {deliveryHeaderLensName}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="delivery-date" required>
                  ?쒗뭹 ?멸퀎??                </Label>
                <IconTooltip
                  ariaLabel="?쒗뭹 ?멸퀎???덈궡"
                  content="?쒗뭹 ?멸퀎?쇱? ?쒖“?ъ뾽遺濡쒕???寃異쒓린瑜??멸퀎諛쏅뒗 ?쇱옄瑜??섎??⑸땲??"
                />
              </div>
              <DatePicker
                id="delivery-date"
                placeholder="??????
                value={deliveryDate}
                onValueChange={setDeliveryDate}
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                {deliveryModalPurpose === "plan" ? (
                  <Label htmlFor="delivery-planned-date" required>
                    ?⑺뭹 ?덉젙??                  </Label>
                ) : (
                  <Label htmlFor="delivery-planned-date">?⑺뭹 ?덉젙??(?좏깮)</Label>
                )}
                <IconTooltip
                  ariaLabel="?⑺뭹 ?덉젙???덈궡"
                  content="?⑺뭹 ?덉젙?쇱? ?대떦 ?⑷린 嫄댁뿉 ????덉젙?쇱쓣 ?섎??⑸땲??"
                />
              </div>
              <DatePicker
                id="delivery-planned-date"
                placeholder="??????
                value={plannedDeliveryDate}
                onValueChange={setPlannedDeliveryDate}
              />
            </div>
            <div>
              <SearchableSelectWithCreate
                id="delivery-manager-user"
                label="?대떦??
                required
                value={deliveryManagerUserSelectValue}
                onChange={setDeliveryManagerUserSelectValue}
                options={deliveryManagerUserOptions}
                placeholder={
                  isAuthLoading
                    ? "?대떦??遺덈윭?ㅻ뒗 以묅?
                    : "?대떦??寃?됀룹꽑??
                }
                noOptionsMessage="?쒖떆???대떦?먭? ?놁뒿?덈떎."
                addTrigger="none"
                addButtonLabel=""
                onAddClick={() => {}}
                isDisabled={isAuthLoading}
              />
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="delivery-remark">鍮꾧퀬 (?좏깮)</Label>
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
                label="?뚯옣?뺣낫"
                required
                value={wavelengthCode}
                onChange={setWavelengthCode}
                options={wavelengthOptions}
                placeholder="?좏깮?섏꽭??
                noOptionsMessage="WAVELENGTH 肄붾뱶媛 ?놁뒿?덈떎."
                addTrigger="none"
                addButtonLabel=""
                onAddClick={() => {}}
              />
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="detector-type-code" required>
                    寃異쒓린 ???                  </Label>
                  <a
                    href={DETECTOR_TYPE_GUIDE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-theme-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    ??????뺤씤
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                </div>
                <SearchableSelectWithCreate
                  id="detector-type-code"
                  value={detectorId}
                  onChange={setDetectorId}
                  options={detectorTypeOptions}
                  placeholder="?좏깮?섏꽭??
                  noOptionsMessage="DETECTOR_TYPE 肄붾뱶媛 ?놁뒿?덈떎."
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
                    ?대쾲 ?⑺뭹 ?섎웾
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
                  ?쒕━???앹꽦
                </button>
              </div>
            </div>

            <div className="col-span-4 border-b border-gray-200 dark:border-gray-700 my-4"></div>
            {/* <div className="sm:col-span-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              ?쒕━??Prefix/?쒗?ㅻ뒗 ?쒕쾭 ?쒗뵆由?`DET_STD_V2`)?쇰줈 ?앹꽦?⑸땲??
              寃異쒓린 ??낆? ?좏깮??寃異쒓린 ID瑜?湲곗??쇰줈 ?쒕쾭?먯꽌 ?먮룞 怨꾩궛?⑸땲??
            </div> */}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                ?쒕━??踰덊샇 誘몃━蹂닿린
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSerialRulePopoverOpen((v) => !v)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  ?쒕━??援ъ꽦 ?ㅻ챸
                </button>
                {isSerialRulePopoverOpen ? (
                  <div className="absolute top-9 right-0 z-20 w-[20rem] rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-5 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <p className="font-semibold">?쒕━???⑦꽩</p>
                    <p className="mt-1 break-all">
                      {`[?ъ뾽肄붾뱶][?뚯옄1?먮━][?뚯옣]-[?덈ぉ][?쒖“??[?댁긽??[?쇱튂][寃異쒓린]-[?꾨룄][怨좉컼][?쇰젴踰덊샇4?먮━]`}
                    </p>
                    <p className="mt-2 break-all text-gray-600 dark:text-gray-300">
                      ?? EIL-EI0320MB-PD0001
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            {!hasDeliveryTargets ? (
              <p className="mt-2 text-theme-sm text-amber-700 dark:text-amber-400">
                ?⑺뭹 ?깅줉 媛?ν븳 ?쒗뭹 ?쇱씤???놁뒿?덈떎.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table className="min-w-full divide-y divide-gray-200 text-theme-sm dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="w-20 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        ?쒕쾲
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        ?쇱씤
                      </th>
                      <th className="min-w-[16rem] px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        ?쒕━??踰덊샇
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
                          ?쒕━?쇱씠 ?앹꽦????ぉ???놁뒿?덈떎.
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
                              aria-label={`?쒕━??踰덊샇 ${index + 1}`}
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
            痍⑥냼
          </button>
          <button
            type="button"
            onClick={() => {
              if (!deliveryDate.trim()) {
                toast.error("?쒗뭹 ?멸퀎?쇱쓣 ?낅젰?섏꽭??");
                return;
              }
              if (
                deliveryModalPurpose === "plan" &&
                !plannedDeliveryDate.trim()
              ) {
                toast.error("?⑺뭹 ?덉젙?쇱쓣 ?낅젰?섏꽭??");
                return;
              }
              if (!wavelengthCode.trim()) {
                toast.error("?뚯옣?뺣낫瑜??좏깮?섏꽭??");
                return;
              }
              if (!detectorId.trim()) {
                toast.error("寃異쒓린 ??낆쓣 ?좏깮?섏꽭??");
                return;
              }
              const selectedDetectorId = Number(detectorId);
              if (!Number.isFinite(selectedDetectorId) || selectedDetectorId <= 0) {
                toast.error("寃異쒓린瑜??ㅼ떆 ?좏깮?섏꽭??");
                return;
              }
              if (!selectedDetector || Number(selectedDetector.id) !== selectedDetectorId) {
                toast.error("寃異쒓린 ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎. ?ㅼ떆 ?좏깮?섏꽭??");
                return;
              }
              const arrayWidth = Number(selectedDetector.arrayWidth);
              if (!Number.isFinite(arrayWidth) || arrayWidth <= 0) {
                toast.error("寃異쒓린 ?댁긽??媛濡? ?뺣낫媛 ?놁뒿?덈떎.");
                return;
              }
              const resolutionCode = String(Math.trunc(arrayWidth)).padStart(4, "0");
              const detectorTypeCode = detectorTypeSuffixCode(
                String(selectedDetector.detectorType ?? "")
              );
              if (!detectorTypeCode) {
                toast.error("寃異쒓린 ???肄붾뱶(A/A2 ??瑜??뚯떛?섏? 紐삵뻽?듬땲??");
                return;
              }
              const yearCode = yearCodeFromDate(deliveryDate.trim());
              if (!yearCode) {
                toast.error("?쒖옉?꾨룄 肄붾뱶 留ㅽ븨???놁뒿?덈떎. (?? 2025?뭀, 2026?뭁)");
                return;
              }
              const customerCode = String(po.partner?.code ?? "").trim().toUpperCase();
              if (!customerCode) {
                toast.error("怨좉컼???낆껜肄붾뱶瑜?李얠쓣 ???놁뒿?덈떎.");
                return;
              }
              if (!hasDeliveryTargets) {
                toast.error("?깅줉???쒗뭹 ?쇱씤???놁뒿?덈떎.");
                return;
              }
              if (deliverySerialPreviewRows.length === 0) {
                toast.error("?쒕━?쇱쓣 癒쇱? ?앹꽦?섏꽭??");
                return;
              }
              for (let i = 0; i < deliverySerialPreviewRows.length; i += 1) {
                if (!deliverySerialPreviewRows[i].serialNo.trim()) {
                  toast.error(`?쒕━??踰덊샇瑜??낅젰?섏꽭?? (${i + 1}踰???`);
                  return;
                }
              }
              const trimmedSerials = deliverySerialPreviewRows.map((r) =>
                r.serialNo.trim()
              );
              if (new Set(trimmedSerials).size !== trimmedSerials.length) {
                toast.error("?쒕━??踰덊샇??以묐났???덉뒿?덈떎. ?쒕줈 ?ㅻⅤ寃??섏젙?섏꽭??");
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
                    `?붾웾??珥덇낵?덉뒿?덈떎. (${line.itemName ?? "?덈ぉ"} 쨌 ?붿뿬 ${remaining})`
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
                  toast.error(
                    `?쒗뭹 business_code瑜?李얠쓣 ???놁뒿?덈떎. (${line.itemName ?? "?덈ぉ"})`
                  );
                  return;
                }
                const pitchCode = pitchCodeFromRaw(serialMeta?.pixelPitch ?? "");
                if (!pitchCode) {
                  toast.error(
                    `?쒗뭹 Pixel Pitch 肄붾뱶 留ㅽ븨???놁뒿?덈떎. (${line.itemName ?? "?덈ぉ"})`
                  );
                  return;
                }
                const derivedElement = detectorElementCodeFromBusinessName(biz);
                if (!derivedElement) {
                  toast.error(
                    `?뚯옄?뺣낫瑜??ъ뾽紐낆뿉??李얠쓣 ???놁뒿?덈떎. ?ъ뾽紐낆뿉 '_' ???뚯옄 肄붾뱶媛 ?덉뼱???⑸땲?? (${line.itemName ?? "?덈ぉ"})`
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
                toast.error("?대쾲 ?⑺뭹 ?섎웾??1嫄??댁긽 ?낅젰?섏꽭??");
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
              console.log(
                deliveryModalPurpose === "plan"
                  ? "[?⑺뭹 怨꾪쉷 ?깅줉] ?쒗뭹 ?뺣낫"
                  : "[?⑺뭹 ?깅줉] ?쒗뭹 ?뺣낫",
                {
                  諛쒖＜踰덊샇: po.orderNo,
                  ?⑺뭹?쒕ぉ: deliveryTitle.trim() || null,
                  ?쒗뭹?멸퀎?? deliveryDate.trim(),
                  ?⑺뭹?덉젙?? plannedDeliveryDate.trim() || null,
                  ?덈ぉ: deliveryProductLog,
                }
              );
              deliveryMutation.mutate({
                deliveryPayload: payload,
                purpose: deliveryModalPurpose,
              });
            }}
            disabled={
              deliveryMutation.isPending ||
              !hasDeliveryTargets ||
              deliverySerialPreviewRows.length === 0
            }
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {deliveryMutation.isPending
              ? "?깅줉 以?.."
              : deliveryModalPurpose === "plan"
                ? "?⑺뭹 怨꾪쉷 ???
                : "?ㅼ젣 ?⑺뭹 ?깅줉"}
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
