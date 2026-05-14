import {
  useState,
  useMemo,
  useEffect,
  startTransition,
  useCallback,
  useRef,
} from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import ConfirmModal from "../components/common/ConfirmModal";
import LoadingLottie from "../components/common/LoadingLottie";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import DatePicker from "../components/form/date-picker";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import { renderPartnerOptionLabel } from "../components/form/PartnerOptionLabel";
import FormActionBar from "../components/form/FormActionBar";
import { useAuth } from "../hooks/useAuth";
import { useOrderCommonCodes } from "../hooks/useOrderCommonCodes";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import { getCurrencySymbol } from "../lib/formatCurrency";
import { itemFormStrings as S } from "./itemFormStrings";
import { toPartnerSearchableSelectOptions } from "../lib/partnerSelectOptions";
import {
  getProductList,
  representativeProductLabel,
  type RepresentativeProduct,
} from "../api/products";
import { getLensList, type LensItem } from "../api/lenses";
import {
  getEmployeeDirectory,
  type EmployeeDirectoryItem,
} from "../api/user";
import {
  getPurchaseOrder,
  getPurchaseOrderItems,
  getPurchaseOrderFiles,
  createPurchaseOrder,
  uploadPurchaseOrderFile,
  deletePurchaseOrderFile,
  updatePurchaseOrder,
  createPurchaseOrderLine,
  updatePurchaseOrderLine,
  deletePurchaseOrderLine,
  type PurchaseOrderCreatePayload,
  type PurchaseOrderUpdatePayload,
  type PurchaseOrderItemPayload,
  type PurchaseOrderLinePatchPayload,
  type PurchaseOrderFile,
  type PurchaseOrderItem,
} from "../api/purchaseOrder";
import OrderAttachmentSection from "../features/order-form/sections/OrderAttachmentSection";
import OrderLineEditorSection from "../features/order-form/sections/OrderLineEditorSection";
import type { ItemRow } from "../features/order-form/types";
import {
  buildCreatePayload,
  buildUpdatePayload,
} from "../features/order-form/utils/payload";
import { validateRequiredFields } from "../lib/formValidation";

const PARTNER_TYPE_CUSTOMER = "CUSTOMER";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function isOrderDateRangeValid(orderDate: string, dueDate: string): boolean {
  const order = String(orderDate ?? "").trim();
  const due = String(dueDate ?? "").trim();
  if (!order || !due) return true;
  // yyyy-mm-dd 형식은 문자열 비교로도 날짜 선후 비교가 가능합니다.
  return order <= due;
}

function parsePositiveIntId(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim());
  return undefined;
}

/**
 * 
 * @param display - 단가 표시 문자열 (콤마 포함)
 * @returns 
 */
function parseLineUnitPrice(display: string): number {
  const n = Number(display.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * 
 * @param value - 단가 값
 * @returns 단가 표시 문자열 (콤마 포함)
 */
function formatLineUnitPriceDisplay(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/,/g, "");
  const [intPartRaw, decPartRaw] = normalized.split(".");
  const intDigits = (intPartRaw ?? "").replace(/\D/g, "");
  if (!intDigits && !decPartRaw) return "";
  const formattedInt = (intDigits || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decPartRaw == null) return formattedInt;
  const decDigits = decPartRaw.replace(/\D/g, "");
  return decDigits ? `${formattedInt}.${decDigits}` : formattedInt;
}

/** 환율 입력 — 비어 있으면 null (exchange_rate 미입력) */
function parseOptionalExchangeRate(display: string): number | null {
  const t = display.trim();
  if (!t) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * 헤더 통화 기준 라인 공급가액 (백엔드 `supplyAmount`)
 */
function computeHeaderSupplyAmount(rows: ItemRow[], headerCurrency: string): number {
  const cc = headerCurrency.trim().toUpperCase() || "KRW";
  let subtotal = 0;
  for (const row of rows) {
    const rcc = (row.currencyCode || "KRW").trim().toUpperCase() || "KRW";
    if (rcc !== cc) continue;
    if (row.qty <= 0) continue;
    subtotal += row.qty * parseLineUnitPrice(row.unitPrice);
  }
  return subtotal;
}

function isBlankProductRow(row: ItemRow): boolean {
  return (
    row.productId.trim() === "" &&
    row.unitCode.trim() === "" &&
    row.qty <= 0 &&
    row.unitPrice.trim() === "" &&
    row.remark.trim() === ""
  );
}

function isPartialProductRow(row: ItemRow): boolean {
  if (isBlankProductRow(row)) return false;
  const price = parseLineUnitPrice(row.unitPrice);
  return (
    row.productId.trim() === "" ||
    row.unitCode.trim() === "" ||
    row.qty <= 0 ||
    !Number.isFinite(price) ||
    price < 0
  );
}

/**
 * 
 * @returns 빈 행 데이터
 */
const emptyItemRow = (): ItemRow => ({
  lineId: undefined,
  productId: "",
  lensId: "",
  unitCode: "",
  qty: 0,
  unitPrice: "",
  currencyCode: "KRW",
  requestDeliveryDate: "",
  remark: "",
});

const LEGACY_USER_PREFIX = "legacy-user:";

/**
 * 
 * @param name - 사용자 이름
 * @returns 사용자 이름 문자열 (레거시 접두사 포함)
 */
function legacyUserValue(name: string) {
  return `${LEGACY_USER_PREFIX}${encodeURIComponent(name)}`;
}

/**
 * 
 * @param selectValue - 사용자 선택값
 * @returns 사용자 이름 문자열 (레거시 접두사 제거)
 */
function tryDecodeLegacyUser(selectValue: string): string | null {
  if (!selectValue.startsWith(LEGACY_USER_PREFIX)) return null;
  try {
    return decodeURIComponent(selectValue.slice(LEGACY_USER_PREFIX.length));
  } catch {
    return null;
  }
}

/**
 * 
 * @param selectValue - 사용자 선택값
 * @param users - 사용자 리스트
 * @returns 사용자 이름
 */
function parseRequesterNameFromSelect(
  selectValue: string,
  users: EmployeeDirectoryItem[]
): string {
  if (!selectValue) return "";
  const legacy = tryDecodeLegacyUser(selectValue);
  if (legacy !== null) return legacy;
  return (
    users.find((u) => String(u.employeeNo) === selectValue)?.name?.trim() ?? ""
  );
}

function parseRequesterIdFromSelect(selectValue: string): number | null {
  if (!selectValue) return null;
  if (tryDecodeLegacyUser(selectValue) !== null) return null;
  const n = Number(selectValue);
  return Number.isFinite(n) ? n : null;
}

/**
 * 
 * @returns 발주 폼
 */
export default function OrderForm() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = orderId == null || orderId === "new";
  const id = isNew ? "" : String(orderId ?? "").trim();
  const { accessToken, user } = useAuth();

  const [title, setTitle] = useState("");
  const [isTitleAutoFilled, setIsTitleAutoFilled] = useState(true);
  const [partnerId, setPartnerId] = useState<string>("");
  const [orderDate, setOrderDate] = useState(todayString());
  const [dueDate, setDueDate] = useState("");
  const [requestDeliveryDate, setRequestDeliveryDate] = useState("");
  const [requesterUserSelectValue, setRequesterUserSelectValue] =
    useState("");
  const [vendorOrderNo, setVendorOrderNo] = useState("");
  const [vendorRequest, setVendorRequest] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [orderTypeCode, setOrderTypeCode] = useState("");
  const [orderStatusCode, setOrderStatusCode] = useState("");
  const [orderCurrencyCode, setOrderCurrencyCode] = useState("KRW");
  const [exchangeRateCurrencyCode, setExchangeRateCurrencyCode] =
    useState("KRW");
  const [exchangeRateInput, setExchangeRateInput] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItemRow()]);
  const [editingLineIds, setEditingLineIds] = useState<number[]>([]);
  const [pendingFilesForCreate, setPendingFilesForCreate] = useState<File[]>([]);
  const [recentlySavedLineIds, setRecentlySavedLineIds] = useState<number[]>([]);
  const [uploadingExistingFileNames, setUploadingExistingFileNames] = useState<
    string[]
  >([]);
  const [recentlyUploadedFileNames, setRecentlyUploadedFileNames] = useState<
    string[]
  >([]);
  const [lineDeleteConfirmIndex, setLineDeleteConfirmIndex] = useState<number | null>(null);
  const [fileDeleteConfirmId, setFileDeleteConfirmId] = useState<number | null>(null);
  const uploadErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    }
    if (message.includes("파일을 1개 이상 선택해 주세요")) {
      return "업로드할 파일을 먼저 선택해 주세요.";
    }
    return message || "첨부파일 업로드에 실패했습니다.";
  };
  const recentlySavedLineTimersRef = useRef<
    Record<number, ReturnType<typeof setTimeout>>
  >({});
  const recentlyUploadedFileTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => getPurchaseOrder(id, accessToken!),
    enabled: !isNew && !!accessToken && id !== "",
  });

  const shouldFetchOrderLineItems =
    !isNew &&
    !!accessToken &&
    id !== "" &&
    !!order &&
    ((order.orderItems?.length ?? 0) === 0 &&
      (order.items?.length ?? 0) === 0);

  const authUserId = useMemo(() => {
    if (!user) return undefined;
    return parsePositiveIntId((user as Record<string, unknown>).id);
  }, [user]);

  const canEditExistingOrder = useMemo(() => {
    if (isNew) return true;
    if (!order) return false;
    const createdBy = order.createdBy as Record<string, unknown> | undefined;
    const createdById = parsePositiveIntId(createdBy?.id);
    const createdByEmployeeNo = String(
      (createdBy?.employeeNo as string | undefined) ?? ""
    ).trim();
    const authEmployeeNo = String(user?.employeeNo ?? "").trim();
    const isOwnerById =
      createdById == null || (authUserId != null && authUserId === createdById);
    const isOwnerByEmployeeNo =
      createdByEmployeeNo === "" ||
      (authEmployeeNo !== "" && authEmployeeNo === createdByEmployeeNo);
    const isOwner = isOwnerById || isOwnerByEmployeeNo;
    const isPoClosed =
      String(order.status ?? order.orderStatus ?? "").trim() === "PO_CLOSED";
    return isOwner && !isPoClosed;
  }, [isNew, order, user?.employeeNo, authUserId]);

  const blockedEditToastShownRef = useRef(false);

  useEffect(() => {
    if (isNew || !order) return;
    if (canEditExistingOrder) return;
    if (!blockedEditToastShownRef.current) {
      toast.error("작성자만 수정할 수 있으며, 종결된 발주는 수정할 수 없습니다.");
      blockedEditToastShownRef.current = true;
    }
    navigate(`/order/${id}`, { replace: true });
  }, [isNew, order, canEditExistingOrder, navigate, id]);

  /**
   * 
   * @returns 발주 라인 아이템 리스트
   */
  const { data: orderLineItemsFetched = [] } = useQuery({
    queryKey: ["purchaseOrder", id, "lineItems"],
    queryFn: () => getPurchaseOrderItems(id, accessToken!),
    enabled: shouldFetchOrderLineItems,
  });

  const resolvedOrderLineItems = useMemo((): PurchaseOrderItem[] => {
    if (isNew || !order) return [];
    const embedded = order.orderItems ?? order.items;
    if (embedded && embedded.length > 0) return embedded;
    return orderLineItemsFetched;
  }, [isNew, order, orderLineItemsFetched]);

  /**
   * 
   * @returns 발주 첨부파일 리스트
   */
  const { data: files = [] } = useQuery({
    queryKey: ["purchaseOrderFiles", id],
    queryFn: () => getPurchaseOrderFiles(id, accessToken!),
    enabled: !isNew && !!accessToken && id !== "",
  });

  /**
   * 
   * @returns 거래처 리스트
   */
  const { data: partners = [] } = usePartnersQuery(accessToken, {
    type: PARTNER_TYPE_CUSTOMER,
  }, {
    enabled: !!accessToken,
  });

  const {
    countryCodes,
    currencyCodes,
    unitCodes,
    purchaseOrderTypeCodes,
    purchaseOrderStatusCodes,
  } = useOrderCommonCodes(accessToken, !!accessToken);

  /**
   * 
   * @returns 제품 리스트
   */
  const { data: productListResult } = useQuery({
    queryKey: ["products", "select", "active", 100],
    queryFn: () =>
      getProductList(accessToken!, {
        isActive: true,
        page: 1,
        size: 100,
      }),
    enabled: !!accessToken,
  });
  const productList: RepresentativeProduct[] = productListResult?.items ?? [];
  const { data: lensListResult } = useQuery({
    queryKey: ["lenses", "select", "active", 100],
    queryFn: () =>
      getLensList(accessToken!, {
        isActive: true,
        page: 1,
        size: 100,
      }),
    enabled: !!accessToken,
  });
  const lensList: LensItem[] = lensListResult?.items ?? [];

  const firstLineTitleLabel = useMemo(() => {
    const firstRow = items[0];
    if (!firstRow || !firstRow.productId.trim()) return "제품 미선택";
    const product = productList.find((p) => p.id === firstRow.productId);
    if (!product) return "제품 미선택";
    return representativeProductLabel(product);
  }, [items, productList]);

  const firstLineQtyLabel = useMemo(() => {
    const firstRow = items[0];
    if (!firstRow) return "0";
    return String(Number.isFinite(firstRow.qty) ? firstRow.qty : 0);
  }, [items]);

  const autoGeneratedTitle = useMemo(() => {
    const dateLabel = orderDate || todayString();
    return `${dateLabel} - ${firstLineTitleLabel} - ${firstLineQtyLabel}`;
  }, [orderDate, firstLineTitleLabel, firstLineQtyLabel]);

  const {
    data: employeeDirectory = [],
    isLoading: employeeDirectoryLoading,
    isError: employeeDirectoryError,
  } = useQuery({
    queryKey: ["employeeDirectory"],
    queryFn: () => getEmployeeDirectory(accessToken!),
    enabled: !!accessToken,
  });

  /**
   * 
   * @returns 기본 발주 유형 코드
   */
  const defaultOrderTypeCode = useMemo(() => {
    if (purchaseOrderTypeCodes.length === 0) return "";
    const general = purchaseOrderTypeCodes.find((c) => c.code === "GENERAL");
    return (general ?? purchaseOrderTypeCodes[0])?.code ?? "";
  }, [purchaseOrderTypeCodes]);

  /**
   * 
   * @returns 기본 발주 상태 코드
   */
  const defaultOrderStatusCode = useMemo(() => {
    if (purchaseOrderStatusCodes.length === 0) return "";
    const registered = purchaseOrderStatusCodes.find(
      (c) => c.code === "PO_REGISTERED"
    );
    return (registered ?? purchaseOrderStatusCodes[0])?.code ?? "";
  }, [purchaseOrderStatusCodes]);

  /**
   * 
   * @returns 유효한 발주 유형 코드
   */
  const effectiveOrderTypeCode = isNew
    ? orderTypeCode || defaultOrderTypeCode
    : orderTypeCode;

  const effectiveOrderStatusCode = isNew
    ? orderStatusCode || defaultOrderStatusCode
    : orderStatusCode;

  // const orderStatusSelectOptions = useMemo(() => {
  //   const base = commonCodesToSelectOptions(purchaseOrderStatusCodes);
  //   if (
  //     effectiveOrderStatusCode &&
  //     !base.some((o) => o.value === effectiveOrderStatusCode)
  //   ) {
  //     return [
  //       {
  //         value: effectiveOrderStatusCode,
  //         label: `${effectiveOrderStatusCode} (저장된 값)`,
  //       },
  //       ...base,
  //     ];
  //   }
  //   return base;
  // }, [purchaseOrderStatusCodes, effectiveOrderStatusCode]);

  const requesterUserOptions = useMemo(() => {
    const opts = employeeDirectory.map((u) => ({
      value: String(u.employeeNo),
      label: `${u.name} (${u.employeeNo})`,
    }));
    const sel = requesterUserSelectValue;
    if (!sel || opts.some((o) => o.value === sel)) return opts;
    const legacyName = tryDecodeLegacyUser(sel);
    if (legacyName) {
      opts.unshift({ value: sel, label: `${legacyName} (저장된 값)` });
      return opts;
    }
    opts.unshift({ value: sel, label: `사용자 #${sel}` });
    return opts;
  }, [employeeDirectory, requesterUserSelectValue]);

  useEffect(() => {
    if (!isNew && order) {
      queueMicrotask(() => setIsTitleAutoFilled(false));
      startTransition(() => {
        setTitle(order.title ?? "");
        setPartnerId(String(order.partnerId ?? ""));
        setOrderDate(order.orderDate ?? todayString());
        setDueDate(order.dueDate ?? "");
        const persistedCurrencyCode = String(order.currencyCode ?? "KRW").trim() || "KRW";
        setOrderCurrencyCode(persistedCurrencyCode);
        setExchangeRateCurrencyCode(persistedCurrencyCode);
        setRequestDeliveryDate(order.requestDeliveryDate ?? "");
        setVendorOrderNo(order.vendorOrderNo ?? "");
        setVendorRequest(order.vendorRequest ?? "");
        setSpecialNote(order.specialNote ?? "");
        setOrderTypeCode((order.orderType ?? "").trim());
        setOrderStatusCode(
          String(order.status ?? order.orderStatus ?? "").trim()
        );
        const persistedExchangeRate = Number(order.exchangeRate ?? NaN);
        setExchangeRateInput(
          Number.isFinite(persistedExchangeRate)
            ? formatLineUnitPriceDisplay(persistedExchangeRate)
            : ""
        );
      });
    }
  }, [isNew, order]);

  useEffect(() => {
    if (!isNew) return;
    if (!isTitleAutoFilled) return;
    queueMicrotask(() => setTitle(autoGeneratedTitle));
  }, [isNew, isTitleAutoFilled, autoGeneratedTitle]);

  useEffect(() => {
    if (isNew || !order) return;
    const name = (order.requesterName ?? "").trim();
    if (!name) {
      queueMicrotask(() => setRequesterUserSelectValue(""));
      return;
    }
    if (employeeDirectory.length === 0) return;
    const u = employeeDirectory.find((x) => x.name === name);
    if (u) queueMicrotask(() => setRequesterUserSelectValue(String(u.employeeNo)));
    else queueMicrotask(() => setRequesterUserSelectValue(legacyUserValue(name)));
  }, [isNew, order, employeeDirectory]);

  useEffect(() => {
    if (!isNew) return;
    if (requesterUserSelectValue !== "") return;
    if (user?.employeeNo == null || employeeDirectory.length === 0) return;
    const me = employeeDirectory.find((u) => u.employeeNo === user.employeeNo);
    if (me) {
      queueMicrotask(() => setRequesterUserSelectValue(String(me.employeeNo)));
    }
  }, [isNew, requesterUserSelectValue, employeeDirectory, user?.employeeNo]);

  const partnerSelectOptions = useMemo(() => {
    return toPartnerSearchableSelectOptions(partners, countryCodes);
  }, [partners, countryCodes]);

  /**
   * 
   * @returns 제품 옵션
   */
  const productSelectOptions = useMemo(() => {
    return productList.map((p) => ({
      value: String(p.id),
      label: representativeProductLabel(p),
    }));
  }, [productList]);

  const lensSelectOptions = useMemo(() => {
    return lensList.map((lens) => {
      const lensName = String(lens.lensName ?? "").trim() || `렌즈 #${lens.id}`;
      const fNumber = String(lens.fNumber ?? "").trim();
      const focalLength = String(lens.focalLength ?? "").trim();
      const detail = [fNumber, focalLength].filter(Boolean).join(" · ");
      return {
        value: String(lens.id),
        label: detail ? `${lensName} (${detail})` : lensName,
      };
    });
  }, [lensList]);

  /**
   * 
   * @returns 통화 옵션
   */
  const currencyOptions = useMemo(() => {
    const list: { value: string; label: string; symbol?: string }[] = [];
    currencyCodes.forEach((c) =>
      list.push({
        value: c.code,
        label: c.name || c.code,
        symbol: getCurrencySymbol(c.code),
      })
    );
    if (list.length === 0) {
      list.push({
        value: "KRW",
        label: S.currencyKrwLabel,
        symbol: S.currencyKrwSymbol,
      });
    }
    return list;
  }, [currencyCodes]);

  /**
   * 
   * @returns 단위 옵션
   */
  const unitOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    unitCodes.forEach((c) =>
      list.push({ value: c.code, label: c.name || c.code })
    );
    if (list.length === 0) {
      list.push({ value: "EA", label: "EA" });
    }
    return list;
  }, [unitCodes]);

  const firstUnitValue = unitOptions[0]?.value ?? "";

  /** 환율 입력의 통화(원/달러 등) — 신규로 추가하는 라인의 기본 통화 */
  const defaultNewLineCurrency = useMemo(() => {
    const fromExchange = exchangeRateCurrencyCode?.trim().toUpperCase();
    if (fromExchange) return fromExchange;
    return (orderCurrencyCode || "KRW").trim().toUpperCase() || "KRW";
  }, [exchangeRateCurrencyCode, orderCurrencyCode]);

  /**
   * 
   * @returns 첫 번째 단위 값
   */
  useEffect(() => {
    if (!isNew || !firstUnitValue) return;
    queueMicrotask(() => {
      setItems((prev) => {
        let changed = false;
        const next = prev.map((row) => {
          if (row.unitCode === "") {
            changed = true;
            return { ...row, unitCode: firstUnitValue };
          }
          return row;
        });
        return changed ? next : prev;
      });
    });
  }, [isNew, firstUnitValue]);

  /**
   * 
   * @returns 발주 생성 뮤테이션
   */
  const createMutation = useMutation({
    mutationFn: (payload: PurchaseOrderCreatePayload) =>
      createPurchaseOrder(payload, accessToken!),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      if (pendingFilesForCreate.length > 0) {
        let uploadedCount = 0;
        let failedCount = 0;
        try {
          const uploaded = await uploadPurchaseOrderFile(
            data.id,
            pendingFilesForCreate,
            accessToken!
          );
          uploadedCount = uploaded.length;
          failedCount = Math.max(pendingFilesForCreate.length - uploadedCount, 0);
        } catch (error) {
          failedCount = pendingFilesForCreate.length;
          toast.error(uploadErrorMessage(error));
        }
        if (uploadedCount > 0) {
          toast.success(
            `발주가 등록되었고 첨부파일 ${uploadedCount}건이 업로드되었습니다.`
          );
        } else {
          toast.success("발주가 등록되었습니다.");
        }
        if (failedCount > 0) {
          toast.error(`첨부파일 ${failedCount}건 업로드에 실패했습니다.`);
        }
        setPendingFilesForCreate([]);
      } else {
        toast.success("발주가 등록되었습니다.");
      }
      navigate(`/order/${data.id}`);
    },
    onError: (e: Error) => toast.error(e.message || "등록에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PurchaseOrderUpdatePayload) =>
      updatePurchaseOrder(id, payload, accessToken!),
    onSuccess: () => {
      toast.success("발주가 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      navigate(`/order/${id}`);
    },
    onError: (e: Error) => toast.error(e.message || "수정에 실패했습니다."),
  });

  const lineUpdateMutation = useMutation({
    mutationFn: ({
      lineId,
      payload,
    }: {
      lineId: number;
      payload: PurchaseOrderLinePatchPayload;
    }) => updatePurchaseOrderLine(id, lineId, payload, accessToken!),
    onSuccess: () => {
      toast.success("발주 라인이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "발주 라인 수정에 실패했습니다."),
  });

  const lineCreateMutation = useMutation({
    mutationFn: ({
      payload,
    }: {
      index: number;
      payload: PurchaseOrderItemPayload;
    }) => createPurchaseOrderLine(id, payload, accessToken!),
    onSuccess: (created, { index }) => {
      toast.success("발주 라인이 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
      if (created) {
        setItems((prev) => {
          const next = [...prev];
          const row = next[index];
          if (!row) return prev;
          next[index] = {
            lineId: created.id,
            productId: created.productId ?? row.productId,
            lensId: created.lensId?.trim() ?? "",
            unitCode: String(created.unit ?? firstUnitValue ?? "").trim(),
            qty: Number(created.qty ?? 0),
            unitPrice: formatLineUnitPriceDisplay(created.unitPrice),
            currencyCode:
              String(created.currencyCode ?? order?.currencyCode ?? "KRW").trim() ||
              "KRW",
            requestDeliveryDate: created.requestDeliveryDate ?? "",
            remark: created.remark ?? "",
          };
          return next;
        });
      }
    },
    onError: (e: Error) =>
      toast.error(e.message || "발주 라인 추가에 실패했습니다."),
  });

  const lineDeleteMutation = useMutation({
    mutationFn: (lineId: number) => deletePurchaseOrderLine(id, lineId, accessToken!),
    onSuccess: () => {
      toast.success("발주 라인이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "발주 라인 삭제에 실패했습니다."),
  });

  const fileUploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadPurchaseOrderFile(id, files, accessToken!),
    onSuccess: () => {
      toast.success("파일이 업로드되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderFiles", id] });
    },
    onError: (e: Error) => toast.error(uploadErrorMessage(e)),
  });

  const fileDeleteMutation = useMutation({
    mutationFn: (fileLinkId: number) =>
      deletePurchaseOrderFile(id, fileLinkId, accessToken!),
    onSuccess: () => {
      toast.success("첨부파일이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderFiles", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
    },
    onError: (e: Error) => toast.error(e.message || "삭제에 실패했습니다."),
  });

  const markLineSaved = useCallback((lineId?: number) => {
    if (!lineId) return;
    setRecentlySavedLineIds((prev) =>
      prev.includes(lineId) ? prev : [...prev, lineId]
    );
    const existingTimer = recentlySavedLineTimersRef.current[lineId];
    if (existingTimer) clearTimeout(existingTimer);
    recentlySavedLineTimersRef.current[lineId] = setTimeout(() => {
      setRecentlySavedLineIds((prev) => prev.filter((id) => id !== lineId));
      delete recentlySavedLineTimersRef.current[lineId];
    }, 2500);
  }, []);

  const markFileUploadCompleted = useCallback((fileName: string) => {
    if (!fileName) return;
    setRecentlyUploadedFileNames((prev) =>
      prev.includes(fileName) ? prev : [...prev, fileName]
    );
    const existingTimer = recentlyUploadedFileTimersRef.current[fileName];
    if (existingTimer) clearTimeout(existingTimer);
    recentlyUploadedFileTimersRef.current[fileName] = setTimeout(() => {
      setRecentlyUploadedFileNames((prev) =>
        prev.filter((name) => name !== fileName)
      );
      delete recentlyUploadedFileTimersRef.current[fileName];
    }, 3500);
  }, []);

  const hasUnsavedWorkingLine = useMemo(() => {
    if (isNew) return false;
    if (editingLineIds.length > 0) return true;
    return items.some(
      (row) =>
        !row.lineId &&
        (row.productId.trim() !== "" ||
          row.qty > 0 ||
          row.unitPrice.trim() !== "" ||
          row.remark.trim() !== "")
    );
  }, [isNew, editingLineIds, items]);

  const addItemRow = () => {
    if (!isNew && !canEditExistingOrder) {
      toast.error("수정 권한이 없습니다.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        ...emptyItemRow(),
        unitCode: firstUnitValue,
        currencyCode: defaultNewLineCurrency,
      },
    ]);
  };
  const removeItemRow = (index: number) => {
    if (!isNew && !canEditExistingOrder) {
      toast.error("수정 권한이 없습니다.");
      return;
    }
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const addPendingFileForCreate = (files: File[]) => {
    if (files.length === 0) return;
    setPendingFilesForCreate((prev) => [...prev, ...files].slice(0, 20));
    toast.success(`첨부 대기 목록에 ${files.length}건 추가되었습니다.`);
  };

  const removePendingFileForCreate = (targetIndex: number) => {
    setPendingFilesForCreate((prev) =>
      prev.filter((_, index) => index !== targetIndex)
    );
  };
  const updateItemRow = (
    index: number,
    field: keyof ItemRow,
    value: string | number | null
  ) => {
    setItems((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  };
  const setLineProductId = (index: number, productId: string) => {
    setItems((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      next[index] = { ...row, productId };
      return next;
    });
  };
  const setLineLensId = (index: number, lensId: string) => {
    setItems((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      next[index] = { ...row, lensId };
      return next;
    });
  };

  const beginLineEdit = (lineId?: number) => {
    if (!isNew && !canEditExistingOrder) {
      toast.error("수정 권한이 없습니다.");
      return;
    }
    if (!lineId) return;
    setEditingLineIds((prev) =>
      prev.includes(lineId) ? prev : [...prev, lineId]
    );
  };

  const finishLineEdit = (lineId?: number) => {
    if (!lineId) return;
    setEditingLineIds((prev) => prev.filter((id) => id !== lineId));
  };

  const saveLine = (index: number) => {
    if (!isNew && !canEditExistingOrder) {
      toast.error("수정 권한이 없습니다.");
      return;
    }
    const row = items[index];
    if (!row) return;
    if (!row.productId.trim()) {
      toast.error("대표 제품을 선택하세요.");
      return;
    }
    if (!row.unitCode.trim()) {
      toast.error("단위를 선택하세요.");
      return;
    }
    if (row.qty <= 0) {
      toast.error("수량은 0보다 커야 합니다.");
      return;
    }
    const unitPrice = parseLineUnitPrice(row.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("단가를 확인하세요.");
      return;
    }

    if (!row.lineId) {
      if (isNew) return;
      const createPayload: PurchaseOrderItemPayload = {
        productId: row.productId,
        lensId: row.lensId.trim() ? row.lensId.trim() : null,
        qty: row.qty,
        unitPrice,
        unit: row.unitCode.trim() || null,
        currencyCode: row.currencyCode.trim() || "KRW",
        remark: row.remark.trim() || null,
      };
      lineCreateMutation.mutate(
        { index, payload: createPayload },
        {
          onSuccess: (created) => markLineSaved(created?.id),
        }
      );
      return;
    }

    lineUpdateMutation.mutate(
      {
        lineId: row.lineId,
        payload: {
          productId: row.productId,
          lensId: row.lensId.trim() ? row.lensId.trim() : null,
          qty: row.qty,
          unit: row.unitCode.trim() || null,
          unitPrice,
          currencyCode: row.currencyCode.trim() || "KRW",
          remark: row.remark.trim() || null,
        },
      },
      {
        onSuccess: () => {
          markLineSaved(row.lineId);
          finishLineEdit(row.lineId);
        },
      }
    );
  };

  /**
   * 
   * @param index 
   */
  const removeLine = (index: number) => {
    if (!isNew && !canEditExistingOrder) {
      toast.error("수정 권한이 없습니다.");
      return;
    }
    const row = items[index];
    if (!row) return;
    const isBlankDraftRow =
      !row.lineId &&
      row.productId.trim() === "" &&
      row.qty <= 0 &&
      row.unitPrice.trim() === "" &&
      row.remark.trim() === "";
    if (isBlankDraftRow) {
      removeItemRow(index);
      return;
    }
    if (!row.lineId) {
      setLineDeleteConfirmIndex(index);
      return;
    }
    setLineDeleteConfirmIndex(index);
  };

  /**
   * 
   * @param index 
   */
  const cancelLineEdit = (index: number) => {
    const row = items[index];
    if (!row?.lineId) return;
    const source = resolvedOrderLineItems.find((line) => line.id === row.lineId);
    if (source) {
      setItems((prev) => {
        const next = [...prev];
        const cur = next[index];
        if (!cur) return prev;
        next[index] = {
          ...cur,
          productId: String(source.productId ?? "").trim(),
          lensId: source.lensId?.trim() ?? "",
          unitCode: String(source.unit ?? firstUnitValue ?? "").trim(),
          qty: Number(source.qty ?? 0),
          unitPrice: formatLineUnitPriceDisplay(source.unitPrice),
          currencyCode:
            String(source.currencyCode ?? order?.currencyCode ?? "KRW").trim() ||
            "KRW",
          requestDeliveryDate: source.requestDeliveryDate ?? "",
          remark: source.remark ?? "",
        };
        return next;
      });
    }
    finishLineEdit(row.lineId);
  };

  /**
   * 
   * @param e 
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNew && !canEditExistingOrder) {
      toast.error("작성자만 수정할 수 있으며, 종결된 발주는 수정할 수 없습니다.");
      return;
    }
    if (hasUnsavedWorkingLine) {
      toast.error("작업중인 행이 있습니다. 행 저장 후 다시 시도하세요.");
      return;
    }
    if (
      !validateRequiredFields(
        [
          { value: title, message: "제목을 입력하세요." },
          { value: partnerId, message: "업체를 선택하세요." },
          { value: dueDate, message: "고객요청납기일을 입력하세요." },
          { value: requesterUserSelectValue, message: "영업담당자를 선택하세요." },
        ],
        toast.error
      )
    ) {
      return;
    }

    if (!isOrderDateRangeValid(orderDate, dueDate)) {
      toast.error("고객요청납기일은 발주일자보다 빠를 수 없고, 발주일자는 고객요청납기일보다 클 수 없습니다.");
      return;
    }

    if (isNew) {
      if (items.some((row) => isPartialProductRow(row))) {
        toast.error("제품 라인을 확인하세요. (대표 제품·단위·수량·단가)");
        return;
      }
      const validItems = items.filter(
        (row) =>
          row.productId.trim() !== "" &&
          row.unitCode.trim() !== "" &&
          row.qty > 0 &&
          parseLineUnitPrice(row.unitPrice) >= 0
      );
      if (validItems.length === 0) {
        toast.error(
          "대표 제품·단위·수량·단가를 모두 입력한 라인을 1건 이상 등록하세요."
        );
        return;
      }
      if (
        purchaseOrderTypeCodes.length > 0 &&
        !effectiveOrderTypeCode.trim()
      ) {
        toast.error("발주 유형을 선택하세요.");
        return;
      }
      const headerCurrency =
        validItems.find((r) => r.currencyCode.trim())?.currencyCode ||
        orderCurrencyCode ||
        order?.currencyCode ||
        "KRW";
      const supplyAmount = computeHeaderSupplyAmount(validItems, headerCurrency);
      const payload = buildCreatePayload({
        title,
        partnerId,
        orderDate,
        dueDate,
        requestDeliveryDate,
        requesterDepartment: "",
        requesterName: parseRequesterNameFromSelect(
          requesterUserSelectValue,
          employeeDirectory
        ),
        requesterId: parseRequesterIdFromSelect(requesterUserSelectValue),
        vendorOrderNo,
        vendorRequest,
        specialNote,
        effectiveOrderTypeCode,
        effectiveOrderStatusCode,
        headerCurrency,
        supplyAmount,
        exchangeRate: parseOptionalExchangeRate(exchangeRateInput),
        validItems,
        parseLineUnitPrice,
      });
      createMutation.mutate(payload);
      return;
    }

    if (items.some((row) => isPartialProductRow(row))) {
      toast.error("제품 라인을 확인하세요. (대표 제품·단위·수량·단가)");
      return;
    }

    const validItems = items.filter(
      (row) =>
        row.productId.trim() !== "" &&
        row.unitCode.trim() !== "" &&
        row.qty > 0 &&
        parseLineUnitPrice(row.unitPrice) >= 0
    );

    const headerCurrency =
      orderCurrencyCode || order?.currencyCode || "KRW";
    const supplyAmount = computeHeaderSupplyAmount(validItems, headerCurrency);

    if (
      purchaseOrderTypeCodes.length > 0 &&
      !effectiveOrderTypeCode.trim()
    ) {
      toast.error("발주 유형을 선택하세요.");
      return;
    }

    const payload = buildUpdatePayload({
      title,
      partnerId,
      orderDate,
      dueDate,
      requestDeliveryDate,
      requesterDepartment: "",
      requesterName: parseRequesterNameFromSelect(
        requesterUserSelectValue,
        employeeDirectory
      ),
      requesterId: parseRequesterIdFromSelect(requesterUserSelectValue),
      vendorOrderNo,
      vendorRequest,
      specialNote,
      effectiveOrderTypeCode,
      effectiveOrderStatusCode,
      headerCurrency,
      supplyAmount,
      exchangeRate: parseOptionalExchangeRate(exchangeRateInput),
      validItems,
      parseLineUnitPrice,
    });
    updateMutation.mutate(payload);
  };

  useEffect(() => {
    if (isNew) return;
    if (!order) return;
    const lines = resolvedOrderLineItems;
    const nextItems =
      lines.length === 0
        ? [{ ...emptyItemRow(), unitCode: firstUnitValue }]
        : lines.map((line) => ({
            lineId: Number(line.id ?? 0) || undefined,
            productId: line.productId ?? "",
            lensId: line.lensId?.trim() ?? "",
            unitCode: String(line.unit ?? firstUnitValue ?? "").trim(),
            qty: Number(line.qty ?? 0),
            unitPrice: formatLineUnitPriceDisplay(line.unitPrice),
            currencyCode:
              String(line.currencyCode ?? order.currencyCode ?? "KRW").trim() ||
              "KRW",
            requestDeliveryDate: line.requestDeliveryDate ?? "",
            remark: line.remark ?? "",
          }));
    queueMicrotask(() => {
      setItems(nextItems);
    });
  }, [isNew, order, resolvedOrderLineItems, firstUnitValue]);

  if (!isNew && orderLoading && !order) {
    return (
      <>
        <PageMeta title="발주 수정" description="발주 수정" />
        <PageBreadcrumb pageTitle="발주 수정" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie />
        </div>
      </>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const orderNoDisplay =
    !isNew && order
      ? (order.orderNo ?? `#${order.id}`)
      : "자동 채번";

  const registrantDisplay = user
    ? user.name
      ? `${user.name} (사번 ${user.employeeNo})`
      : `사번 ${user.employeeNo}`
    : "—";

  return (
    <>
      <PageMeta
        title={isNew ? "발주 등록" : "발주 수정"}
        description={isNew ? "발주 등록" : "발주 수정"}
      />
      <PageBreadcrumb pageTitle={isNew ? "발주 등록" : "발주 수정"} />

      <form
        className="space-y-6"
        onSubmit={handleSubmit}
        key={isNew ? "new" : order ? `edit-${order.id}` : "loading"}
      >
        <ComponentCard
          collapsible
          title={isNew ? "발주 기본 정보" : "발주 기본 정보 수정"}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="order-display-id" required>발주 ID</Label>
              <Input
                id="order-display-id"
                value={orderNoDisplay}
                readOnly
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="order-registrant" required>등록자</Label>
              <Input
                id="order-registrant"
                value={registrantDisplay}
                readOnly
                disabled
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="title" required>
                제목
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setIsTitleAutoFilled(false);
                  setTitle(e.target.value);
                }}
                placeholder="발주 제목"
                className="mt-1"
              />
            </div>

            <DatePicker
              id="order-orderDate"
              label="발주일자"
              required
              placeholder="년-월-일"
              value={orderDate}
              onValueChange={setOrderDate}
            />
            <DatePicker
              id="order-dueDate"
              label="고객요청납기일"
              required
              placeholder="년-월-일"
              value={dueDate}
              onValueChange={setDueDate}
            />

            {/* <div className="sm:col-span-2">
              <Label htmlFor="order-orderType">발주 유형</Label>
              <div className="relative mt-1">
                <select
                  id="order-orderType"
                  value={effectiveOrderTypeCode}
                  onChange={(e) => setOrderTypeCode(e.target.value)}
                  className={`w-full appearance-none border border-gray-300 bg-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 h-11 rounded-lg px-4 py-2.5 pr-10 text-sm ${
                    effectiveOrderTypeCode
                      ? "text-gray-800 dark:text-white/90"
                      : "text-gray-400 dark:text-gray-400"
                  }`}
                >
                  {orderTypeSelectOptions.length === 0 ? (
                    <option value="">목록을 불러오는 중…</option>
                  ) : (
                    orderTypeSelectOptions.map((o) => (
                      <option
                        key={o.value}
                        value={o.value}
                        className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
                      >
                        {o.label}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDownIcon
                  className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  aria-hidden
                />
              </div>
            </div> */}

            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <SearchableSelectWithCreate
                  id="order-partner"
                  label="고객명"
                  required
                  value={partnerId}
                  onChange={setPartnerId}
                  options={partnerSelectOptions}
                  formatOptionLabel={renderPartnerOptionLabel}
                  placeholder="검색하여 업체 선택"
                  addTrigger="none"
                  addButtonLabel=""
                  onAddClick={() => {}}
                />
              </div>

              <div className="min-w-0">
                <SearchableSelectWithCreate
                  id="order-requesterUser"
                  label="영업담당자"
                  required
                  value={requesterUserSelectValue}
                  onChange={setRequesterUserSelectValue}
                  options={requesterUserOptions}
                  placeholder={
                    employeeDirectoryLoading
                      ? "전체 직원 목록 불러오는 중…"
                      : "담당자 검색·선택"
                  }
                  noOptionsMessage="표시할 활성 직원이 없습니다."
                  addTrigger="none"
                  addButtonLabel=""
                  onAddClick={() => {}}
                  isDisabled={employeeDirectoryLoading}
                />
                {employeeDirectoryError ? (
                  <p className="mt-1 text-theme-xs text-red-600 dark:text-red-400">
                    담당자 목록을 불러오지 못했습니다.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="vendorOrderNo">고객발주번호</Label>
              <Input
                id="vendorOrderNo"
                value={vendorOrderNo}
                onChange={(e) => setVendorOrderNo(e.target.value)}
                placeholder="고객에서 부여한 발주번호"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label
                htmlFor="vendorRequest"
                className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90"
              >
                고객요청사항
              </Label>
              <TextArea
                id="vendorRequest"
                rows={4}
                value={vendorRequest}
                onChange={setVendorRequest}
                placeholder="고객 요청 내용을 입력하세요."
              />
            </div>
            <div className="sm:col-span-2">
              <Label
                htmlFor="specialNote"
                className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90"
              >
                특이사항
              </Label>
              <TextArea
                id="specialNote"
                rows={4}
                value={specialNote}
                onChange={setSpecialNote}
                placeholder="특이사항을 입력하세요."
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90">
                첨부파일
              </Label>
              <OrderAttachmentSection
                isNew={isNew}
                isPending={isPending}
                pendingFilesForCreate={pendingFilesForCreate}
                files={files as PurchaseOrderFile[]}
                isFileUploadPending={fileUploadMutation.isPending}
                isFileDeletePending={fileDeleteMutation.isPending}
                uploadingExistingFileNames={uploadingExistingFileNames}
                recentlyUploadedFileNames={recentlyUploadedFileNames}
                onError={(message) => toast.error(message)}
                onSelectCreateFiles={addPendingFileForCreate}
                onRemoveCreateFile={removePendingFileForCreate}
                onUploadExistingFiles={(incomingFiles) => {
                  if (incomingFiles.length === 0) return;
                  const names = incomingFiles.map((file) => file.name);
                  setUploadingExistingFileNames((prev) => [
                    ...prev,
                    ...names.filter((name) => !prev.includes(name)),
                  ]);
                  fileUploadMutation.mutate(incomingFiles, {
                    onSuccess: () => {
                      names.forEach((name) => markFileUploadCompleted(name));
                    },
                    onSettled: () => {
                    setUploadingExistingFileNames((prev) =>
                      prev.filter((name) => !names.includes(name))
                    );
                    },
                  });
                }}
                onDeleteExistingFile={(fileId) => setFileDeleteConfirmId(fileId)}
              />
            </div>
          </div>
        </ComponentCard>

        <OrderLineEditorSection
          isNew={isNew}
          lineLayoutEditable={isNew || canEditExistingOrder}
          items={items}
          editingLineIds={editingLineIds}
          productSelectOptions={productSelectOptions}
          lensSelectOptions={lensSelectOptions}
          unitOptions={unitOptions}
          currencyOptions={currencyOptions}
          exchangeRateCurrencyCode={exchangeRateCurrencyCode}
          exchangeRateInput={exchangeRateInput}
          onExchangeRateCurrencyChange={setExchangeRateCurrencyCode}
          onExchangeRateInputChange={setExchangeRateInput}
          isLineCreatePending={lineCreateMutation.isPending}
          isLineUpdatePending={lineUpdateMutation.isPending}
          isLineDeletePending={lineDeleteMutation.isPending}
          recentlySavedLineIds={recentlySavedLineIds}
          onAddItemRow={addItemRow}
          onSetLineProductId={setLineProductId}
          onSetLineLensId={setLineLensId}
          onUpdateItemRow={updateItemRow}
          onRemoveItemRow={removeItemRow}
          onSaveLine={saveLine}
          onCancelLineEdit={cancelLineEdit}
          onBeginLineEdit={beginLineEdit}
          onRemoveLine={removeLine}
        />

        <FormActionBar
          submitLabel={isNew ? "등록" : "수정"}
          pendingSubmitLabel="저장 중..."
          isPending={isPending}
          cancelTo={isNew ? "/order" : `/order/${id}`}
        >
          {isNew ? (
            <span className="text-theme-sm text-gray-500 dark:text-gray-400">
              발주번호·ID는 등록 완료 시 자동 부여됩니다.
            </span>
          ) : null}
        </FormActionBar>
      </form>

      <ConfirmModal
        isOpen={lineDeleteConfirmIndex != null}
        title="발주 라인을 삭제할까요?"
        message="삭제 후 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={lineDeleteMutation.isPending}
        onClose={() => setLineDeleteConfirmIndex(null)}
        onConfirm={() => {
          if (lineDeleteConfirmIndex == null) return;
          const row = items[lineDeleteConfirmIndex];
          if (!row) {
            setLineDeleteConfirmIndex(null);
            return;
          }
          if (!row.lineId) {
            removeItemRow(lineDeleteConfirmIndex);
            setLineDeleteConfirmIndex(null);
            return;
          }
          lineDeleteMutation.mutate(row.lineId, {
            onSettled: () => setLineDeleteConfirmIndex(null),
          });
        }}
      />

      <ConfirmModal
        isOpen={fileDeleteConfirmId != null}
        title="첨부파일을 삭제할까요?"
        message="삭제 후 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={fileDeleteMutation.isPending}
        onClose={() => setFileDeleteConfirmId(null)}
        onConfirm={() => {
          if (fileDeleteConfirmId == null) return;
          fileDeleteMutation.mutate(fileDeleteConfirmId, {
            onSettled: () => setFileDeleteConfirmId(null),
          });
        }}
      />
    </>
  );
}
