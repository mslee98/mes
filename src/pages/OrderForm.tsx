import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  startTransition,
  useRef,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import DatePicker from "../components/form/date-picker";
import SelectInput from "../components/form/SelectInput";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import PartnerQuickCreateModal from "../components/form/PartnerQuickCreateModal";
import ItemQuickCreateModal from "../components/form/ItemQuickCreateModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  ChevronDownIcon,
  PencilIcon,
  TrashBinIcon,
} from "../icons";
import { ReactComponent as ArrowDownOnSquareIcon } from "../icons/arrow-down-on-square.svg?react";
import { ReactComponent as XCircleSolidIcon } from "../icons/x-circle.svg?react";
import { useAuth } from "../context/AuthContext";
import { getCurrencySymbol } from "../lib/formatCurrency";
import {
  ORDER_LINE_VAT_RATE,
  OrderLineAmountSummary,
  type LineAmountSummary,
} from "../lib/orderLineAmountSummary";
import { itemFormStrings as S } from "./itemFormStrings";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  commonCodesToSelectOptions,
} from "../api/commonCode";
import { getItems, type Item } from "../api/items";
import {
  getOrganizationTree,
  flattenOrganizationUnitsForSelect,
  getOrganizationUnitUsers,
  type OrganizationUnitUserItem,
} from "../api/organization";
import {
  getPurchaseOrder,
  getPurchaseOrderItems,
  getPartners,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderLine,
  deletePurchaseOrderLine,
  type PurchaseOrderCreatePayload,
  type PurchaseOrderUpdatePayload,
  type PurchaseOrderItemPayload,
  type PurchaseOrderLinePatchPayload,
  type Partner,
  type PurchaseOrderItem,
} from "../api/purchaseOrder";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

type ItemRow = {
  lineId?: number;
  itemId: number;
  /** 공통코드 UNIT 코드 */
  unitCode: string;
  qty: number;
  unitPrice: string;
  currencyCode: string;
  requestDeliveryDate: string;
  remark: string;
};

function parseLineUnitPrice(display: string): number {
  const n = Number(display.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

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

/** 헤더 통화 기준 라인 공급가액·부가세 포함 총액 (백엔드 supplyAmount / totalAmountVatIncluded) */
function computeHeaderSupplyAndTotalVatIncluded(
  rows: ItemRow[],
  headerCurrency: string
): { supplyAmount: number; totalAmountVatIncluded: number } {
  const cc = headerCurrency.trim().toUpperCase() || "KRW";
  let subtotal = 0;
  for (const row of rows) {
    const rcc = (row.currencyCode || "KRW").trim().toUpperCase() || "KRW";
    if (rcc !== cc) continue;
    if (row.qty <= 0) continue;
    subtotal += row.qty * parseLineUnitPrice(row.unitPrice);
  }
  const vat = Math.round(subtotal * ORDER_LINE_VAT_RATE * 100) / 100;
  return {
    supplyAmount: subtotal,
    totalAmountVatIncluded: Math.round((subtotal + vat) * 100) / 100,
  };
}

/** POST /purchase-orders 생성 시 우선순위 기본값 */
const PO_CREATE_PRIORITY = "NORMAL";

const emptyItemRow = (): ItemRow => ({
  lineId: undefined,
  itemId: 0,
  unitCode: "",
  qty: 0,
  unitPrice: "",
  currencyCode: "KRW",
  requestDeliveryDate: "",
  remark: "",
});

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

function parseDeptPathFromSelect(
  selectValue: string,
  idOptions: { value: string; label: string }[]
): string {
  if (!selectValue) return "";
  const legacy = tryDecodeLegacyDept(selectValue);
  if (legacy !== null) return legacy;
  return idOptions.find((o) => o.value === selectValue)?.label ?? "";
}

function orgUnitIdFromDeptSelect(selectValue: string): number | null {
  if (!selectValue || selectValue.startsWith(LEGACY_DEPT_PREFIX)) return null;
  const n = Number(selectValue);
  return Number.isFinite(n) ? n : null;
}

function legacyUserValue(name: string) {
  return `${LEGACY_USER_PREFIX}${encodeURIComponent(name)}`;
}

function tryDecodeLegacyUser(selectValue: string): string | null {
  if (!selectValue.startsWith(LEGACY_USER_PREFIX)) return null;
  try {
    return decodeURIComponent(selectValue.slice(LEGACY_USER_PREFIX.length));
  } catch {
    return null;
  }
}

function parseRequesterNameFromSelect(
  selectValue: string,
  users: OrganizationUnitUserItem[]
): string {
  if (!selectValue) return "";
  const legacy = tryDecodeLegacyUser(selectValue);
  if (legacy !== null) return legacy;
  return users.find((u) => String(u.id) === selectValue)?.name?.trim() ?? "";
}

export default function OrderForm() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = orderId == null || orderId === "new";
  const id = isNew ? 0 : Number(orderId);
  const { accessToken, user } = useAuth();

  const [title, setTitle] = useState("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [orderDate, setOrderDate] = useState(todayString());
  const [dueDate, setDueDate] = useState("");
  const [requestDeliveryDate, setRequestDeliveryDate] = useState("");
  const [requesterDeptSelectValue, setRequesterDeptSelectValue] =
    useState("");
  const [requesterUserSelectValue, setRequesterUserSelectValue] =
    useState("");
  const defaultedRequesterForDeptRef = useRef<string>("");
  const [vendorOrderNo, setVendorOrderNo] = useState("");
  const [vendorRequest, setVendorRequest] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [orderTypeCode, setOrderTypeCode] = useState("");
  const [orderStatusCode, setOrderStatusCode] = useState("");
  const [orderCurrencyCode, setOrderCurrencyCode] = useState("KRW");
  const [partnerCreateOpen, setPartnerCreateOpen] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([emptyItemRow()]);
  const [editingLineIds, setEditingLineIds] = useState<number[]>([]);
  const [itemCreateRowIndex, setItemCreateRowIndex] = useState<number | null>(
    null
  );
  const itemCreateRowRef = useRef<number | null>(null);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => getPurchaseOrder(id, accessToken!),
    enabled: !isNew && !!accessToken && Number.isFinite(id),
  });

  const shouldFetchOrderLineItems =
    !isNew &&
    !!accessToken &&
    Number.isFinite(id) &&
    !!order &&
    ((order.orderItems?.length ?? 0) === 0 &&
      (order.items?.length ?? 0) === 0);

  const { data: orderLineItemsFetched = [] } = useQuery({
    queryKey: ["purchaseOrder", id, "lineItems"],
    queryFn: () => getPurchaseOrderItems(id, accessToken!),
    enabled: shouldFetchOrderLineItems,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["partners"],
    queryFn: () => getPartners(accessToken!),
    enabled: !!accessToken,
  });

  const { data: itemList = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(accessToken!),
    enabled: !!accessToken,
  });

  const { data: currencyCodes = [] } = useQuery({
    queryKey: ["commonCodes", "CURRENCY"],
    queryFn: () => getCommonCodesByGroup("CURRENCY", accessToken!),
    enabled: !!accessToken,
  });

  const { data: unitCodes = [] } = useQuery({
    queryKey: ["commonCodes", "UNIT"],
    queryFn: () => getCommonCodesByGroup("UNIT", accessToken!),
    enabled: !!accessToken,
  });

  const { data: purchaseOrderTypeCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
        accessToken!
      ),
    enabled: !!accessToken,
  });

  const { data: purchaseOrderStatusCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
        accessToken!
      ),
    enabled: !!accessToken,
  });

  const {
    data: organizationTree = [],
    isLoading: orgTreeLoading,
    isError: orgTreeError,
  } = useQuery({
    queryKey: ["organizationTree"],
    queryFn: getOrganizationTree,
    enabled: !!accessToken,
  });

  const departmentOptionsFromTree = useMemo(
    () => flattenOrganizationUnitsForSelect(organizationTree),
    [organizationTree]
  );

  const orgUnitIdForUsers = useMemo(
    () => orgUnitIdFromDeptSelect(requesterDeptSelectValue),
    [requesterDeptSelectValue]
  );

  const {
    data: orgUnitUsers = [],
    isLoading: orgUnitUsersLoading,
    isError: orgUnitUsersError,
  } = useQuery({
    queryKey: ["organizationUnitUsers", orgUnitIdForUsers],
    queryFn: () =>
      getOrganizationUnitUsers(orgUnitIdForUsers!, accessToken!),
    enabled: !!accessToken && orgUnitIdForUsers != null,
  });

  const requesterDepartmentOptions = useMemo(() => {
    const opts = [...departmentOptionsFromTree];
    const sel = requesterDeptSelectValue;
    if (!sel) return opts;
    const legacyPath = tryDecodeLegacyDept(sel);
    if (legacyPath && !opts.some((o) => o.value === sel)) {
      opts.unshift({
        value: sel,
        label: `${legacyPath} (저장된 값)`,
      });
    }
    return opts;
  }, [departmentOptionsFromTree, requesterDeptSelectValue]);

  const defaultOrderTypeCode = useMemo(() => {
    if (purchaseOrderTypeCodes.length === 0) return "";
    const general = purchaseOrderTypeCodes.find((c) => c.code === "GENERAL");
    return (general ?? purchaseOrderTypeCodes[0])?.code ?? "";
  }, [purchaseOrderTypeCodes]);

  const defaultOrderStatusCode = useMemo(() => {
    if (purchaseOrderStatusCodes.length === 0) return "";
    const registered = purchaseOrderStatusCodes.find(
      (c) => c.code === "PO_REGISTERED"
    );
    return (registered ?? purchaseOrderStatusCodes[0])?.code ?? "";
  }, [purchaseOrderStatusCodes]);

  const effectiveOrderTypeCode = isNew
    ? orderTypeCode || defaultOrderTypeCode
    : orderTypeCode;

  const effectiveOrderStatusCode = isNew
    ? orderStatusCode || defaultOrderStatusCode
    : orderStatusCode;

  const orderTypeSelectOptions = useMemo(() => {
    const base = commonCodesToSelectOptions(purchaseOrderTypeCodes);
    if (
      effectiveOrderTypeCode &&
      !base.some((o) => o.value === effectiveOrderTypeCode)
    ) {
      return [
        {
          value: effectiveOrderTypeCode,
          label: `${effectiveOrderTypeCode} (저장된 값)`,
        },
        ...base,
      ];
    }
    return base;
  }, [purchaseOrderTypeCodes, effectiveOrderTypeCode]);

  const orderStatusSelectOptions = useMemo(() => {
    const base = commonCodesToSelectOptions(purchaseOrderStatusCodes);
    if (
      effectiveOrderStatusCode &&
      !base.some((o) => o.value === effectiveOrderStatusCode)
    ) {
      return [
        {
          value: effectiveOrderStatusCode,
          label: `${effectiveOrderStatusCode} (저장된 값)`,
        },
        ...base,
      ];
    }
    return base;
  }, [purchaseOrderStatusCodes, effectiveOrderStatusCode]);

  const requesterUserOptions = useMemo(() => {
    const opts = orgUnitUsers.map((u) => ({
      value: String(u.id),
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
  }, [orgUnitUsers, requesterUserSelectValue]);

  const handleRequesterDeptChange = useCallback((v: string) => {
    setRequesterDeptSelectValue(v);
    setRequesterUserSelectValue("");
    defaultedRequesterForDeptRef.current = "";
  }, []);

  useEffect(() => {
    if (!isNew && order) {
      startTransition(() => {
        setTitle(order.title ?? "");
        setPartnerId(String(order.partnerId ?? ""));
        setOrderDate(order.orderDate ?? todayString());
        setDueDate(order.dueDate ?? "");
        setOrderCurrencyCode(order.currencyCode ?? "KRW");
        setRequestDeliveryDate(order.requestDeliveryDate ?? "");
        setVendorOrderNo(order.vendorOrderNo ?? "");
        setVendorRequest(order.vendorRequest ?? "");
        setSpecialNote(order.specialNote ?? "");
        setOrderTypeCode((order.orderType ?? "").trim());
        setOrderStatusCode(
          String(order.status ?? order.orderStatus ?? "").trim()
        );
      });
    }
  }, [isNew, order]);

  useEffect(() => {
    if (isNew || !order) return;
    const path = (order.requesterDepartment ?? "").trim();
    defaultedRequesterForDeptRef.current = "";
    if (!path) {
      setRequesterDeptSelectValue("");
      setRequesterUserSelectValue("");
      return;
    }
    const match = departmentOptionsFromTree.find((o) => o.label === path);
    if (match) {
      setRequesterDeptSelectValue(match.value);
    } else {
      setRequesterDeptSelectValue(legacyDeptValue(path));
    }
  }, [isNew, order, departmentOptionsFromTree]);

  useEffect(() => {
    if (isNew || !order) return;
    const name = (order.requesterName ?? "").trim();
    if (!name) {
      setRequesterUserSelectValue("");
      return;
    }
    const orgId = orgUnitIdFromDeptSelect(requesterDeptSelectValue);
    if (orgId == null) {
      setRequesterUserSelectValue(legacyUserValue(name));
      return;
    }
    if (orgUnitUsers.length === 0) return;
    const u = orgUnitUsers.find((x) => x.name === name);
    if (u) setRequesterUserSelectValue(String(u.id));
    else setRequesterUserSelectValue(legacyUserValue(name));
  }, [isNew, order, requesterDeptSelectValue, orgUnitUsers]);

  useEffect(() => {
    const legacyPath = tryDecodeLegacyDept(requesterDeptSelectValue);
    if (legacyPath == null) return;
    const match = departmentOptionsFromTree.find(
      (o) => o.label === legacyPath
    );
    if (match) setRequesterDeptSelectValue(match.value);
  }, [departmentOptionsFromTree, requesterDeptSelectValue]);

  useEffect(() => {
    if (!isNew) return;
    if (requesterUserSelectValue !== "") return;
    const orgId = orgUnitIdFromDeptSelect(requesterDeptSelectValue);
    if (orgId == null || user?.employeeNo == null || orgUnitUsers.length === 0)
      return;
    if (defaultedRequesterForDeptRef.current === String(orgId)) return;
    const me = orgUnitUsers.find((u) => u.employeeNo === user.employeeNo);
    defaultedRequesterForDeptRef.current = String(orgId);
    if (me) setRequesterUserSelectValue(String(me.id));
  }, [
    isNew,
    requesterDeptSelectValue,
    requesterUserSelectValue,
    orgUnitUsers,
    user?.employeeNo,
  ]);

  const partnerSelectOptions = useMemo(() => {
    return (partners as Partner[]).map((p) => ({
      value: String(p.id),
      label: (p.code || p.name || "-").trim(),
    }));
  }, [partners]);

  const itemSelectOptions = useMemo(() => {
    return (itemList as Item[]).map((i) => ({
      value: String(i.id),
      label: (i.name || i.code || "-").trim(),
    }));
  }, [itemList]);

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

  useEffect(() => {
    if (!isNew || !firstUnitValue) return;
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
  }, [isNew, firstUnitValue]);

  const createMutation = useMutation({
    mutationFn: (payload: PurchaseOrderCreatePayload) =>
      createPurchaseOrder(payload, accessToken!),
    onSuccess: (data) => {
      toast.success("발주가 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
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
      toast.success("발주 제품이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "발주 제품 수정에 실패했습니다."),
  });

  const lineDeleteMutation = useMutation({
    mutationFn: (lineId: number) => deletePurchaseOrderLine(id, lineId, accessToken!),
    onSuccess: () => {
      toast.success("발주 제품이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "발주 제품 삭제에 실패했습니다."),
  });

  const addItemRow = () =>
    setItems((prev) => [
      ...prev,
      { ...emptyItemRow(), unitCode: firstUnitValue },
    ]);
  const removeItemRow = (index: number) =>
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  const updateItemRow = (
    index: number,
    field: keyof ItemRow,
    value: string | number
  ) => {
    setItems((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const beginLineEdit = (lineId?: number) => {
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
    const row = items[index];
    if (!row?.lineId) return;
    if (row.itemId <= 0) {
      toast.error("제품을 선택하세요.");
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

    lineUpdateMutation.mutate(
      {
        lineId: row.lineId,
        payload: {
          itemId: row.itemId,
          qty: row.qty,
          unit: row.unitCode.trim() || null,
          unitPrice,
          currencyCode: row.currencyCode.trim() || "KRW",
          requestDeliveryDate: row.requestDeliveryDate || null,
          remark: row.remark.trim() || null,
        },
      },
      {
        onSuccess: () => finishLineEdit(row.lineId),
      }
    );
  };

  const removeLine = (index: number) => {
    const row = items[index];
    if (!row?.lineId) return;
    lineDeleteMutation.mutate(row.lineId);
  };

  const cancelLineEdit = (index: number) => {
    const row = items[index];
    if (!row?.lineId) return;
    const source = resolvedOrderLineItems.find((line) => line.id === row.lineId);
    if (source) {
      updateItemRow(index, "itemId", Number(source.itemId ?? 0));
      updateItemRow(index, "unitCode", String(source.unit ?? firstUnitValue ?? "").trim());
      updateItemRow(index, "qty", Number(source.qty ?? 0));
      updateItemRow(
        index,
        "unitPrice",
        formatLineUnitPriceDisplay(source.unitPrice)
      );
      updateItemRow(
        index,
        "currencyCode",
        String(source.currencyCode ?? order?.currencyCode ?? "KRW").trim() || "KRW"
      );
      updateItemRow(index, "requestDeliveryDate", source.requestDeliveryDate ?? "");
      updateItemRow(index, "remark", source.remark ?? "");
    }
    finishLineEdit(row.lineId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("제목을 입력하세요.");
      return;
    }
    if (!partnerId || Number(partnerId) <= 0) {
      toast.error("업체를 선택하세요.");
      return;
    }

    if (isNew) {
      const validItems = items.filter(
        (row) =>
          row.itemId > 0 &&
          row.unitCode.trim() !== "" &&
          row.qty > 0 &&
          parseLineUnitPrice(row.unitPrice) >= 0
      );
      if (validItems.length === 0) {
        toast.error(
          "제품·단위·수량·단가를 모두 입력한 행을 1건 이상 등록하세요."
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
      const { supplyAmount, totalAmountVatIncluded } =
        computeHeaderSupplyAndTotalVatIncluded(validItems, headerCurrency);
      const payload: PurchaseOrderCreatePayload = {
        title: title.trim(),
        partnerId: Number(partnerId),
        orderDate,
        currencyCode: headerCurrency,
        dueDate: dueDate || null,
        requestDeliveryDate: requestDeliveryDate || null,
        requesterDepartment:
          parseDeptPathFromSelect(
            requesterDeptSelectValue,
            departmentOptionsFromTree
          ).trim() || null,
        requesterName:
          parseRequesterNameFromSelect(
            requesterUserSelectValue,
            orgUnitUsers
          ).trim() || null,
        vendorOrderNo: vendorOrderNo.trim() || null,
        vendorRequest: vendorRequest.trim() || null,
        specialNote: specialNote.trim() || null,
        orderType: effectiveOrderTypeCode.trim() || null,
        priority: PO_CREATE_PRIORITY,
        memo: null,
        status: effectiveOrderStatusCode.trim() || null,
        supplyAmount,
        totalAmountVatIncluded,
        items: validItems.map(
          (row): PurchaseOrderItemPayload => ({
            itemId: row.itemId,
            qty: row.qty,
            unitPrice: parseLineUnitPrice(row.unitPrice),
            unit: row.unitCode.trim() || null,
            currencyCode: row.currencyCode.trim() || "KRW",
            requestDeliveryDate: row.requestDeliveryDate || null,
            remark: row.remark.trim() || null,
          })
        ),
      };
      createMutation.mutate(payload);
      return;
    }

    const headerCurrency =
      orderCurrencyCode || order?.currencyCode || "KRW";
    const { supplyAmount, totalAmountVatIncluded } =
      computeHeaderSupplyAndTotalVatIncluded(items, headerCurrency);

    if (
      purchaseOrderTypeCodes.length > 0 &&
      !effectiveOrderTypeCode.trim()
    ) {
      toast.error("발주 유형을 선택하세요.");
      return;
    }

    const payload: PurchaseOrderUpdatePayload = {
      title: title.trim(),
      partnerId: partnerId ? Number(partnerId) : undefined,
      orderDate,
      currencyCode: headerCurrency,
      dueDate: dueDate || null,
      requestDeliveryDate: requestDeliveryDate || null,
      requesterDepartment:
        parseDeptPathFromSelect(
          requesterDeptSelectValue,
          departmentOptionsFromTree
        ).trim() || null,
      requesterName:
        parseRequesterNameFromSelect(
          requesterUserSelectValue,
          orgUnitUsers
        ).trim() || null,
      vendorOrderNo: vendorOrderNo.trim() || null,
      vendorRequest: vendorRequest.trim() || null,
      specialNote: specialNote.trim() || null,
      orderType: effectiveOrderTypeCode.trim() || null,
      status: effectiveOrderStatusCode.trim() || null,
      supplyAmount,
      totalAmountVatIncluded,
    };
    updateMutation.mutate(payload);
  };

  const resolvedOrderLineItems = useMemo((): PurchaseOrderItem[] => {
    if (isNew || !order) return [];
    const embedded = order.orderItems ?? order.items;
    if (embedded && embedded.length > 0) return embedded;
    return orderLineItemsFetched;
  }, [isNew, order, orderLineItemsFetched]);

  useEffect(() => {
    if (isNew) return;
    if (!order) return;
    const lines = resolvedOrderLineItems;
    const nextItems =
      lines.length === 0
        ? [{ ...emptyItemRow(), unitCode: firstUnitValue }]
        : lines.map((line) => ({
            lineId: Number(line.id ?? 0) || undefined,
            itemId: Number(line.itemId ?? 0),
            unitCode: String(line.unit ?? firstUnitValue ?? "").trim(),
            qty: Number(line.qty ?? 0),
            unitPrice: formatLineUnitPriceDisplay(line.unitPrice),
            currencyCode:
              String(line.currencyCode ?? order.currencyCode ?? "KRW").trim() ||
              "KRW",
            requestDeliveryDate: line.requestDeliveryDate ?? "",
            remark: line.remark ?? "",
          }));
    queueMicrotask(() => setItems(nextItems));
  }, [isNew, order, resolvedOrderLineItems, firstUnitValue]);

  const draftLineAmountSummaries = useMemo((): LineAmountSummary[] => {
    const map = new Map<string, number>();
    for (const row of items) {
      if (row.qty <= 0) continue;
      const cc =
        (row.currencyCode || "KRW").trim().toUpperCase() || "KRW";
      const lineAmount = row.qty * parseLineUnitPrice(row.unitPrice);
      map.set(cc, (map.get(cc) ?? 0) + lineAmount);
    }
    return Array.from(map.entries())
      .map(([currencyCode, subtotal]) => {
        const vat = Math.round(subtotal * ORDER_LINE_VAT_RATE * 100) / 100;
        return { currencyCode, subtotal, vat, total: subtotal + vat };
      })
      .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }, [items]);

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
      : "등록 시 자동 부여";

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
          title={isNew ? "발주 기본 정보" : "발주 기본 정보 수정"}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="order-display-id">발주 ID</Label>
              <Input
                id="order-display-id"
                value={orderNoDisplay}
                readOnly
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="발주 제목"
                className="mt-1"
              />
            </div>

            <DatePicker
              id="order-orderDate"
              label="발주일자 *"
              placeholder="년-월-일"
              value={orderDate}
              onValueChange={setOrderDate}
            />
            <DatePicker
              id="order-dueDate"
              label="납품예정일자"
              placeholder="년-월-일"
              value={dueDate}
              onValueChange={setDueDate}
            />

            <div>
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
            </div>
            <div>
              <Label htmlFor="order-orderStatus">발주 상태</Label>
              <div className="relative mt-1">
                <select
                  id="order-orderStatus"
                  value={effectiveOrderStatusCode}
                  onChange={(e) => setOrderStatusCode(e.target.value)}
                  className={`w-full appearance-none border border-gray-300 bg-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 h-11 rounded-lg px-4 py-2.5 pr-10 text-sm ${
                    effectiveOrderStatusCode
                      ? "text-gray-800 dark:text-white/90"
                      : "text-gray-400 dark:text-gray-400"
                  }`}
                >
                  {orderStatusSelectOptions.length === 0 ? (
                    <option value="">목록을 불러오는 중…</option>
                  ) : (
                    orderStatusSelectOptions.map((o) => (
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
            </div>

            <div>
              <SearchableSelectWithCreate
                id="order-requesterDepartment"
                label="부서"
                value={requesterDeptSelectValue}
                onChange={handleRequesterDeptChange}
                options={requesterDepartmentOptions}
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
                id="order-requesterUser"
                label="담당자"
                value={requesterUserSelectValue}
                onChange={setRequesterUserSelectValue}
                options={requesterUserOptions}
                placeholder={
                  orgUnitIdForUsers == null
                    ? "먼저 부서를 선택하세요"
                    : orgUnitUsersLoading
                      ? "소속 사용자 불러오는 중…"
                      : "담당자 검색·선택"
                }
                noOptionsMessage="이 부서에 표시할 활성 사용자가 없습니다."
                addTrigger="none"
                addButtonLabel=""
                onAddClick={() => {}}
                isDisabled={
                  orgUnitIdForUsers == null ||
                  orgUnitUsersLoading
                }
              />
              {orgUnitUsersError ? (
                <p className="mt-1 text-theme-xs text-red-600 dark:text-red-400">
                  담당자 목록을 불러오지 못했습니다.
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <SearchableSelectWithCreate
                  id="order-partner"
                  label="업체명 *"
                  value={partnerId}
                  onChange={setPartnerId}
                  options={partnerSelectOptions}
                  placeholder="검색하여 업체 선택"
                  addTrigger="popover"
                  popoverDescription="목록에 없는 업체는 정보 아이콘을 눌러 빠르게 등록할 수 있습니다. 등록 후 자동으로 선택됩니다."
                  popoverAriaLabel="업체 빠른 등록 안내"
                  addButtonLabel="업체 등록"
                  onAddClick={() => setPartnerCreateOpen(true)}
                />
              </div>
              <div className="min-w-0">
                <DatePicker
                  id="order-requestDeliveryDate"
                  label="납품요청일자"
                  placeholder="년-월-일"
                  value={requestDeliveryDate}
                  onValueChange={setRequestDeliveryDate}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="vendorOrderNo">업체발주번호</Label>
              <Input
                id="vendorOrderNo"
                value={vendorOrderNo}
                onChange={(e) => setVendorOrderNo(e.target.value)}
                placeholder="업체에서 부여한 발주번호"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label
                htmlFor="vendorRequest"
                className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90"
              >
                업체요청사항
              </Label>
              <TextArea
                id="vendorRequest"
                rows={4}
                value={vendorRequest}
                onChange={setVendorRequest}
                placeholder="업체 요청 내용을 입력하세요."
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
          </div>
        </ComponentCard>

        <ComponentCard
          title="발주 제품"
          headerEnd={
            isNew ? (
            <button
              type="button"
              onClick={addItemRow}
              className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-600 dark:text-brand-400 dark:hover:bg-gray-800"
            >
              + 품목 추가
            </button>
            ) : undefined
          }
        >
          <div className="space-y-4 dark:border-gray-700">
                <div className="relative overflow-x-auto border-b dark:border-gray-800">
                  <Table className="w-full text-left text-sm text-gray-900 dark:text-white md:table-fixed">
                    <TableHeader className="border-b border-gray-100 dark:border-white/5">
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          isHeader
                          className="whitespace-nowrap py-3 font-medium text-gray-600 dark:text-gray-400 md:w-[24%]"
                        >
                          제품 *
                        </TableCell>
                        <TableCell
                          isHeader
                          className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[16%]"
                        >
                          단위 · 수량 *
                        </TableCell>
                        <TableCell
                          isHeader
                          className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[24%]"
                        >
                          통화 · 단가 *
                        </TableCell>
                        <TableCell
                          isHeader
                          className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[14%]"
                        >
                          납품 요청일
                        </TableCell>
                        <TableCell
                          isHeader
                          className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[16%]"
                        >
                          비고
                        </TableCell>
                        <TableCell
                          isHeader
                          className="w-[88px] p-3 text-center font-medium text-gray-600 dark:text-gray-400"
                        >
                          <span className="sr-only">행 작업</span>
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {items.map((row, index) => (
                        <TableRow key={index} className="align-middle hover:bg-transparent">
                          {(() => {
                            const isLineEditing =
                              !isNew &&
                              !!row.lineId &&
                              editingLineIds.includes(row.lineId);
                            const isEditReadonly = !isNew && !isLineEditing;
                            return (
                              <>
                          <TableCell className="whitespace-nowrap py-3 align-middle">
                            <SearchableSelectWithCreate
                              id={`order-item-${index}`}
                              value={row.itemId ? String(row.itemId) : ""}
                              onChange={(v) =>
                                updateItemRow(index, "itemId", Number(v) || 0)
                              }
                              options={itemSelectOptions}
                              placeholder="제품 검색"
                              addTrigger="none"
                              addButtonLabel="제품 추가"
                              onAddClick={() => {}}
                              compact
                              isClearable={false}
                              isDisabled={isEditReadonly}
                            />
                          </TableCell>
                          <TableCell className="p-3 align-middle">
                            <SelectInput
                              id={`order-line-${index}-qty`}
                              size="sm"
                              selectOptions={unitOptions}
                              selectValue={row.unitCode}
                              onSelectChange={(v) =>
                                updateItemRow(index, "unitCode", v)
                              }
                              inputValue={row.qty === 0 ? "" : String(row.qty)}
                              onInputChange={(v) => {
                                const t = v.trim();
                                if (t === "") {
                                  updateItemRow(index, "qty", 0);
                                  return;
                                }
                                const n = Number(t.replace(/,/g, ""));
                                updateItemRow(
                                  index,
                                  "qty",
                                  Number.isFinite(n) ? n : 0
                                );
                              }}
                              inputType="text"
                              inputMode="decimal"
                              inputPlaceholder="0"
                              selectPlaceholder="단위"
                              inputSuffix=""
                              selectClassName="min-w-[3.25rem] max-w-[4.25rem] pl-2 pr-7"
                              className="shadow-none max-w-full"
                              disabled={isEditReadonly}
                            />
                          </TableCell>
                          <TableCell className="p-3 align-middle">
                            <SelectInput
                              id={`order-line-${index}-unitPrice`}
                              size="sm"
                              selectOptions={currencyOptions}
                              selectValue={row.currencyCode || "KRW"}
                              onSelectChange={(v) =>
                                updateItemRow(index, "currencyCode", v)
                              }
                              inputValue={row.unitPrice}
                              onInputChange={(v) =>
                                updateItemRow(index, "unitPrice", v)
                              }
                              inputPlaceholder="0"
                              selectPlaceholder={S.selectCurrency}
                              formatNumber
                              maxFractionDigits={2}
                              className="shadow-none max-w-full"
                              disabled={isEditReadonly}
                            />
                          </TableCell>
                          <TableCell className="p-3 align-middle">
                            <DatePicker
                              id={`order-line-req-${index}`}
                              placeholder="년-월-일"
                              value={row.requestDeliveryDate}
                              onValueChange={(v) =>
                                updateItemRow(index, "requestDeliveryDate", v)
                              }
                              compact
                              className="max-w-full min-w-0"
                              disabled={isEditReadonly}
                            />
                          </TableCell>
                          <TableCell className="p-3 align-middle">
                            <input
                              type="text"
                              value={row.remark}
                              onChange={(e) =>
                                updateItemRow(index, "remark", e.target.value)
                              }
                              placeholder="비고"
                              className="h-9 w-full min-w-[6rem] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-theme-xs text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-white/30 dark:focus:border-brand-800"
                              aria-label="비고"
                              disabled={isEditReadonly}
                            />
                          </TableCell>
                          <TableCell className="p-3 align-middle text-center">
                            {isNew ? (
                              <button
                                type="button"
                                onClick={() => removeItemRow(index)}
                                disabled={items.length <= 1}
                                title="행 삭제"
                                aria-label="행 삭제"
                                className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                              >
                                <TrashBinIcon className="size-[18px]" aria-hidden />
                              </button>
                            ) : isLineEditing ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => saveLine(index)}
                                  disabled={lineUpdateMutation.isPending}
                                  title="행 저장"
                                  aria-label="행 저장"
                                  className="inline-flex size-9 items-center justify-center rounded-lg text-brand-600 transition-colors hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40 dark:text-brand-400 dark:hover:bg-brand-500/10"
                                >
                                  <ArrowDownOnSquareIcon className="size-[18px]" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelLineEdit(index)}
                                  title="행 편집 취소"
                                  aria-label="행 편집 취소"
                                  className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-gray-200"
                                >
                                  <XCircleSolidIcon className="size-[18px]" aria-hidden />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => beginLineEdit(row.lineId)}
                                  title="행 수정"
                                  aria-label="행 수정"
                                  className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-brand-400"
                                >
                                  <PencilIcon className="size-[18px]" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeLine(index)}
                                  disabled={
                                    lineDeleteMutation.isPending ||
                                    items.length <= 1
                                  }
                                  title="행 삭제"
                                  aria-label="행 삭제"
                                  className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                >
                                  <TrashBinIcon className="size-[18px]" aria-hidden />
                                </button>
                              </div>
                            )}
                          </TableCell>
                              </>
                            );
                          })()}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 space-y-6">
                  <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                    주문 요약
                  </h3>
                <OrderLineAmountSummary
                  summaries={
                    draftLineAmountSummaries.length > 0
                      ? draftLineAmountSummaries
                      : [
                          {
                            currencyCode: orderCurrencyCode || "KRW",
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

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isPending
              ? "저장 중..."
              : isNew
                ? "등록"
                : "수정"}
          </button>
          <Link
            to={isNew ? "/order" : `/order/${id}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            취소
          </Link>
          {isNew ? (
            <span className="text-theme-sm text-gray-500 dark:text-gray-400">
              발주번호·ID는 등록 완료 시 자동 부여됩니다.
            </span>
          ) : null}
        </div>
      </form>

      <PartnerQuickCreateModal
        isOpen={partnerCreateOpen}
        onClose={() => setPartnerCreateOpen(false)}
        onCreated={(p) => setPartnerId(String(p.id))}
      />
      <ItemQuickCreateModal
        isOpen={itemCreateRowIndex !== null}
        onClose={() => {
          itemCreateRowRef.current = null;
          setItemCreateRowIndex(null);
        }}
        onCreated={(item) => {
          const idx = itemCreateRowRef.current;
          if (idx != null) {
            updateItemRow(idx, "itemId", item.id);
          }
          itemCreateRowRef.current = null;
          setItemCreateRowIndex(null);
        }}
      />
    </>
  );
}
