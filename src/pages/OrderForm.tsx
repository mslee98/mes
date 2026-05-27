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
import { notify } from "../lib/notify";
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
import { useDetectorSelectOptions } from "../hooks/useDetectorSelectOptions";
import { useOrderCommonCodes } from "../hooks/useOrderCommonCodes";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import { getCurrencySymbol, normalizeCurrencyCode } from "../lib/formatCurrency";
import { itemFormStrings as S } from "./itemFormStrings";
import { toPartnerSearchableSelectOptions } from "../lib/partnerSelectOptions";
import {
  getProductList,
  representativeProductLabel,
  representativeProductSelectLabel,
  type RepresentativeProduct,
} from "../api/products";
import { getLensList, type LensItem } from "../api/lenses";
import {
  getEmployeeDirectory,
  getUsers,
  requesterDepartmentPathForEmployeeNo,
} from "../api/user";
import { getOrganizationTree } from "../api/organization";
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
import {
  emptyItemRow,
  isPartialProductRow,
} from "../features/order-form/utils/itemRow";
import { computeHeaderSupplyAmount } from "../features/order-form/utils/supplyAmount";
import { validateRequiredFields } from "../lib/formValidation";
import { compactYmd, isYmdRangeValid, localYmdToday } from "../lib/dateFormat";
import { parsePositiveIntId } from "../lib/parseId";
import {
  legacyUserValue,
  tryDecodeLegacyUser,
} from "../lib/legacySelectValue";
import {
  parseLineUnitPrice,
  formatLineUnitPriceDisplay,
  parseOptionalExchangeRate,
} from "../lib/priceInput";
import {
  parseRequesterEmployeeNoFromSelect,
  parseRequesterNameFromSelect,
} from "../lib/orderRequesterSelect";
import {
  defaultHiddenDetectorCodesForProduct,
  ORDER_LINE_WAVELENGTH_CODE,
  resolveOrderLineDetectorPayload,
} from "../lib/orderLineDetectorFields";
import { detectorFieldsFromOrderLine } from "../lib/orderLineItemRow";

const PARTNER_TYPE_CUSTOMER = "CUSTOMER";

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
  const [orderDate, setOrderDate] = useState(localYmdToday());
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
      notify.error("작성자만 수정할 수 있으며, 종결된 발주는 수정할 수 없습니다.");
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
  const productById = useMemo(() => {
    const m = new Map<string, RepresentativeProduct>();
    productList.forEach((p) => {
      const pid = String(p.id ?? "").trim();
      if (pid) m.set(pid, p);
    });
    return m;
  }, [productList]);
  const { options: detectorSelectOptions, labelById: detectorLabelById } =
    useDetectorSelectOptions(accessToken, !!accessToken);
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

  const firstLineTitleParts = useMemo(() => {
    const firstRow = items[0];
    const qty = firstRow && Number.isFinite(firstRow.qty) ? firstRow.qty : 0;
    if (!firstRow || !firstRow.productId.trim()) {
      return { businessLabel: "제품미선택", productName: "", qty };
    }
    const product = productList.find((p) => p.id === firstRow.productId);
    if (!product) {
      return { businessLabel: "제품미선택", productName: "", qty };
    }
    const businessName = (product.businessName ?? "").trim();
    const businessCode = (product.businessCode ?? "").trim();
    const productName = (product.productName ?? "").trim();
    const businessLabel =
      businessName ||
      businessCode ||
      representativeProductLabel(product).replace(/\s+/g, "");
    return { businessLabel, productName, qty };
  }, [items, productList]);

  const autoGeneratedTitle = useMemo(() => {
    const compactDate =
      compactYmd(orderDate || localYmdToday()) ||
      compactYmd(localYmdToday()) ||
      "";
    const { businessLabel, productName, qty } = firstLineTitleParts;
    let productSegment = businessLabel;
    if (
      productName &&
      productName !== businessLabel &&
      !businessLabel.includes(`(${productName})`)
    ) {
      productSegment = `${businessLabel} (${productName})`;
    }
    const dateAndProduct = compactDate
      ? `${compactDate}-${productSegment}`
      : productSegment;
    return `${dateAndProduct} - ${qty}`;
  }, [orderDate, firstLineTitleParts]);

  const {
    data: employeeDirectory = [],
    isLoading: employeeDirectoryLoading,
    isError: employeeDirectoryError,
  } = useQuery({
    queryKey: ["employeeDirectory"],
    queryFn: () => getEmployeeDirectory(accessToken!),
    enabled: !!accessToken,
  });

  const { data: usersForRequester = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken,
  });

  const { data: organizationTree = [] } = useQuery({
    queryKey: ["organizationTree"],
    queryFn: () => getOrganizationTree(accessToken!),
    enabled: !!accessToken,
  });

  const requesterDepartmentForPayload = useMemo(() => {
    const fromEmployee = requesterDepartmentPathForEmployeeNo(
      requesterUserSelectValue,
      usersForRequester,
      organizationTree
    );
    if (fromEmployee) return fromEmployee;
    if (!isNew && order) {
      return (
        order.requesterDepartment?.trim() ||
        order.requestDepartment?.trim() ||
        ""
      );
    }
    return "";
  }, [
    requesterUserSelectValue,
    usersForRequester,
    organizationTree,
    isNew,
    order,
  ]);

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
        setOrderDate(order.orderDate ?? localYmdToday());
        setDueDate(order.dueDate ?? "");
        const persistedCurrencyCode = normalizeCurrencyCode(order.currencyCode);
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
      label: representativeProductSelectLabel(p),
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
    return normalizeCurrencyCode(orderCurrencyCode);
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
          notify.error(uploadErrorMessage(error));
        }
        if (uploadedCount > 0) {
          notify.success(
            `발주가 등록되었고 첨부파일 ${uploadedCount}건이 업로드되었습니다.`
          );
        } else {
          notify.success("발주가 등록되었습니다.");
        }
        if (failedCount > 0) {
          notify.error(`첨부파일 ${failedCount}건 업로드에 실패했습니다.`);
        }
        setPendingFilesForCreate([]);
      } else {
        notify.success("발주가 등록되었습니다.");
      }
      navigate(`/order/${data.id}`);
    },
    onError: (e: Error) => notify.error(e.message || "등록에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PurchaseOrderUpdatePayload) =>
      updatePurchaseOrder(id, payload, accessToken!),
    onSuccess: () => {
      notify.success("발주가 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      navigate(`/order/${id}`);
    },
    onError: (e: Error) => notify.error(e.message || "수정에 실패했습니다."),
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
      notify.success("발주 라인이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
    },
    onError: (e: Error) =>
      notify.error(e.message || "발주 라인 수정에 실패했습니다."),
  });

  const lineCreateMutation = useMutation({
    mutationFn: ({
      payload,
    }: {
      index: number;
      payload: PurchaseOrderItemPayload;
    }) => createPurchaseOrderLine(id, payload, accessToken!),
    onSuccess: (created, { index }) => {
      notify.success("발주 라인이 추가되었습니다.");
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
            ...detectorFieldsFromOrderLine(created),
            unitCode: String(created.unit ?? firstUnitValue ?? "").trim(),
            qty: Number(created.qty ?? 0),
            unitPrice: formatLineUnitPriceDisplay(created.unitPrice),
            currencyCode: normalizeCurrencyCode(
              created.currencyCode ?? order?.currencyCode
            ),
            requestDeliveryDate: created.requestDeliveryDate ?? "",
            remark: created.remark ?? "",
          };
          return next;
        });
      }
    },
    onError: (e: Error) =>
      notify.error(e.message || "발주 라인 추가에 실패했습니다."),
  });

  const lineDeleteMutation = useMutation({
    mutationFn: (lineId: number) => deletePurchaseOrderLine(id, lineId, accessToken!),
    onSuccess: () => {
      notify.success("발주 라인이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
    },
    onError: (e: Error) =>
      notify.error(e.message || "발주 라인 삭제에 실패했습니다."),
  });

  const fileUploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadPurchaseOrderFile(id, files, accessToken!),
    onSuccess: () => {
      notify.success("파일이 업로드되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderFiles", id] });
    },
    onError: (e: Error) => notify.error(uploadErrorMessage(e)),
  });

  const fileDeleteMutation = useMutation({
    mutationFn: (fileLinkId: number) =>
      deletePurchaseOrderFile(id, fileLinkId, accessToken!),
    onSuccess: () => {
      notify.success("첨부파일이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderFiles", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
    },
    onError: (e: Error) => notify.error(e.message || "삭제에 실패했습니다."),
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
      notify.error("수정 권한이 없습니다.");
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
      notify.error("수정 권한이 없습니다.");
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
      const product = productById.get(productId.trim());
      const hiddenDefaults = defaultHiddenDetectorCodesForProduct(product);
      next[index] = {
        ...row,
        productId,
        detectorElementCode:
          row.detectorElementCode.trim() || hiddenDefaults.detectorElementCode,
        wavelengthCode: ORDER_LINE_WAVELENGTH_CODE,
      };
      return next;
    });
  };
  const setLineDetectorId = (index: number, detectorId: string) => {
    setItems((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      next[index] = { ...row, detectorId };
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
      notify.error("수정 권한이 없습니다.");
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
      notify.error("수정 권한이 없습니다.");
      return;
    }
    const row = items[index];
    if (!row) return;
    if (!row.productId.trim()) {
      notify.error("대표 제품을 선택하세요.");
      return;
    }
    if (!row.detectorId.trim()) {
      notify.error("검출기를 선택하세요.");
      return;
    }
    const detectorPayload = resolveOrderLineDetectorPayload(
      row,
      productById.get(row.productId.trim())
    );
    if (!detectorPayload) {
      notify.error(
        "검출기·소자 정보를 확인할 수 없습니다. 제품 사업명을 확인하세요."
      );
      return;
    }
    if (!row.unitCode.trim()) {
      notify.error("단위를 선택하세요.");
      return;
    }
    if (row.qty <= 0) {
      notify.error("수량은 0보다 커야 합니다.");
      return;
    }
    const unitPrice = parseLineUnitPrice(row.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      notify.error("단가를 확인하세요.");
      return;
    }

    if (!row.lineId) {
      if (isNew) return;
      const createPayload: PurchaseOrderItemPayload = {
        productId: row.productId,
        lensId: row.lensId.trim() ? row.lensId.trim() : null,
        ...detectorPayload,
        qty: row.qty,
        unitPrice,
        unit: row.unitCode.trim() || null,
        currencyCode: normalizeCurrencyCode(row.currencyCode),
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
          ...detectorPayload,
          qty: row.qty,
          unit: row.unitCode.trim() || null,
          unitPrice,
          currencyCode: normalizeCurrencyCode(row.currencyCode),
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
      notify.error("수정 권한이 없습니다.");
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
          ...detectorFieldsFromOrderLine(source),
          unitCode: String(source.unit ?? firstUnitValue ?? "").trim(),
          qty: Number(source.qty ?? 0),
          unitPrice: formatLineUnitPriceDisplay(source.unitPrice),
          currencyCode: normalizeCurrencyCode(
            source.currencyCode ?? order?.currencyCode
          ),
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
      notify.error("작성자만 수정할 수 있으며, 종결된 발주는 수정할 수 없습니다.");
      return;
    }
    if (hasUnsavedWorkingLine) {
      notify.error("작업중인 행이 있습니다. 행 저장 후 다시 시도하세요.");
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
        notify.error
      )
    ) {
      return;
    }

    if (!isYmdRangeValid(orderDate, dueDate)) {
      notify.error("고객요청납기일은 발주일자보다 빠를 수 없고, 발주일자는 고객요청납기일보다 클 수 없습니다.");
      return;
    }

    if (isNew) {
      if (items.some((row) => isPartialProductRow(row))) {
        notify.error("제품 라인을 확인하세요. (대표 제품·검출기·단위·수량·단가)");
        return;
      }
      const validItems = items.filter(
        (row) =>
          row.productId.trim() !== "" &&
          row.detectorId.trim() !== "" &&
          row.unitCode.trim() !== "" &&
          row.qty > 0 &&
          parseLineUnitPrice(row.unitPrice) >= 0
      );
      if (validItems.length === 0) {
        notify.error(
          "대표 제품·검출기·단위·수량·단가를 모두 입력한 라인을 1건 이상 등록하세요."
        );
        return;
      }
      if (
        purchaseOrderTypeCodes.length > 0 &&
        !effectiveOrderTypeCode.trim()
      ) {
        notify.error("발주 유형을 선택하세요.");
        return;
      }
      const headerCurrency =
        validItems.find((r) => r.currencyCode.trim())?.currencyCode ||
        orderCurrencyCode ||
        order?.currencyCode ||
        "KRW";
      const supplyAmount = computeHeaderSupplyAmount(validItems, headerCurrency);
      let payload: PurchaseOrderCreatePayload;
      try {
        payload = buildCreatePayload({
          title,
          partnerId,
          orderDate,
          dueDate,
          requestDeliveryDate,
          requesterDepartment: requesterDepartmentForPayload,
          requesterName: parseRequesterNameFromSelect(
            requesterUserSelectValue,
            employeeDirectory
          ),
          requesterEmployeeNo: parseRequesterEmployeeNoFromSelect(
            requesterUserSelectValue
          ),
          vendorOrderNo,
          vendorRequest,
          specialNote,
          effectiveOrderTypeCode,
          effectiveOrderStatusCode,
          headerCurrency,
          supplyAmount,
          exchangeRate: parseOptionalExchangeRate(exchangeRateInput),
          validItems,
          productById,
        });
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "발주 라인을 확인하세요.");
        return;
      }
      createMutation.mutate(payload);
      return;
    }

    if (items.some((row) => isPartialProductRow(row))) {
      notify.error("제품 라인을 확인하세요. (대표 제품·검출기·단위·수량·단가)");
      return;
    }

    const validItems = items.filter(
      (row) =>
        row.productId.trim() !== "" &&
        row.detectorId.trim() !== "" &&
        row.unitCode.trim() !== "" &&
        row.qty > 0 &&
        parseLineUnitPrice(row.unitPrice) >= 0
    );

    const headerCurrency =
      normalizeCurrencyCode(orderCurrencyCode || order?.currencyCode);
    const supplyAmount = computeHeaderSupplyAmount(validItems, headerCurrency);

    if (
      purchaseOrderTypeCodes.length > 0 &&
      !effectiveOrderTypeCode.trim()
    ) {
      notify.error("발주 유형을 선택하세요.");
      return;
    }

    let payload: PurchaseOrderUpdatePayload;
    try {
      payload = buildUpdatePayload({
        title,
        partnerId,
        orderDate,
        dueDate,
        requestDeliveryDate,
        requesterDepartment: requesterDepartmentForPayload,
        requesterName: parseRequesterNameFromSelect(
          requesterUserSelectValue,
          employeeDirectory
        ),
        requesterEmployeeNo: parseRequesterEmployeeNoFromSelect(
          requesterUserSelectValue
        ),
        vendorOrderNo,
        vendorRequest,
        specialNote,
        effectiveOrderTypeCode,
        effectiveOrderStatusCode,
        headerCurrency,
        supplyAmount,
        exchangeRate: parseOptionalExchangeRate(exchangeRateInput),
        validItems,
        productById,
      });
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "발주 라인을 확인하세요.");
      return;
    }
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
            ...detectorFieldsFromOrderLine(line),
            unitCode: String(line.unit ?? firstUnitValue ?? "").trim(),
            qty: Number(line.qty ?? 0),
            unitPrice: formatLineUnitPriceDisplay(line.unitPrice),
            currencyCode: normalizeCurrencyCode(
              line.currencyCode ?? order.currencyCode
            ),
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
                  label="영업 담당자"
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
                onError={(message) => notify.error(message)}
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
          detectorSelectOptions={detectorSelectOptions}
          detectorLabelById={detectorLabelById}
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
          onSetLineDetectorId={setLineDetectorId}
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
