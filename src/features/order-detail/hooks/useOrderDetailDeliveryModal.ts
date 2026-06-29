import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  startTransition,
} from "react";
import { useNavigate } from "react-router";
import { notify } from "../../../lib/notify";
import {
  getPurchaseOrderLotPreview,
  getPurchaseOrderSerialMaxSequence,
  getPurchaseOrderRequestDepartmentLabel,
  type PurchaseOrderDetail,
  type PurchaseOrderItem,
  type Delivery,
  type DeliveryCreatePayload,
  type DeliveryCreateLinePayload,
  type ProductionPlan,
} from "../../../api/purchaseOrder";
import {
  LEGACY_USER_PREFIX,
  legacyDeptValue,
  tryDecodeLegacyDept,
  tryDecodeLegacyUser,
} from "../../../lib/legacySelectValue";
import {
  buildLtSerialNo,
  ltSerialSequenceKey,
} from "../../../lib/format/ltSerialFormat";
import { yearCodeFromOrderDate } from "../../../lib/format/lotUnitCodeFormat";
import { distributeProductionPlanItems } from "../../../domains/production-plan/helpers/distributeItems";
import {
  resolveOrderLineDetectorElementInitial,
  resolveOrderLineDetectorId,
  resolveOrderLineWavelengthCode,
} from "../../../domains/production-plan/helpers/serialFromOrderLine";
import { compactYmd } from "../../../lib/format/dateFormat";
import type { CommonCodeItem } from "../../../api/commonCode";
import type { UserItem } from "../../../api/user";
import type { UseMutationResult } from "@tanstack/react-query";
import type {
  OrderDetailDeliveryMutationVars,
  OrderDetailDeliveryLotPreviewRow,
} from "./useOrderDetailMutations";

export type DeliverySerialPreviewRow = {
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

const SERIAL_PREVIEW_DEBOUNCE_MS = 280;
const LOT_PREVIEW_DEBOUNCE_MS = 280;

function deliveryManagerUserIdFromSelect(selectValue: string): number | null {
  const t = selectValue.trim();
  if (!t || t.startsWith(LEGACY_USER_PREFIX)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

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

type DeliveryMutation = UseMutationResult<
  ProductionPlan | Delivery,
  Error,
  OrderDetailDeliveryMutationVars,
  unknown
>;

type UseOrderDetailDeliveryModalParams = {
  orderId: string;
  accessToken: string | null | undefined;
  order: PurchaseOrderDetail | undefined;
  orderLines: PurchaseOrderItem[];
  deliveries: Delivery[];
  nextProductionPlanSeq: number;
  deliveredByOrderItemId: Map<number, number>;
  registeredByOrderItemId: Map<number, number>;
  lotYearCodes: CommonCodeItem[];
  departmentOptionsFromTree: { value: string; label: string }[];
  users: UserItem[];
  deliveryMutation: DeliveryMutation;
  deliveryModalOpen: boolean;
  setDeliveryModalOpen: (open: boolean) => void;
};

export function useOrderDetailDeliveryModal({
  orderId,
  accessToken,
  order,
  orderLines,
  deliveries,
  nextProductionPlanSeq,
  deliveredByOrderItemId,
  registeredByOrderItemId,
  lotYearCodes,
  departmentOptionsFromTree,
  users,
  deliveryMutation,
  deliveryModalOpen,
  setDeliveryModalOpen,
}: UseOrderDetailDeliveryModalParams) {
  const id = orderId;
  const navigate = useNavigate();

  const [deliveryModalPurpose, setDeliveryModalPurpose] = useState<
    "actual" | "plan"
  >("actual");
  const [linkUnitsModalOpen, setLinkUnitsModalOpen] = useState(false);
  const [linkUnitsDelivery, setLinkUnitsDelivery] = useState<Delivery | null>(
    null
  );
  const [deliveryTitle, setDeliveryTitle] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState("");
  const [deliveryRemark, setDeliveryRemark] = useState("");
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
    OrderDetailDeliveryLotPreviewRow[]
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

  const closeDeliveryModal = useCallback(() => {
    setDeliveryModalOpen(false);
    resetDeliveryModalForm();
    setDeliveryModalPurpose("actual");
  }, [resetDeliveryModalForm]);

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
        const nextRows: OrderDetailDeliveryLotPreviewRow[] = [];
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

  const openDeliveryRegistrationModal = useCallback(
    (purpose: "actual" | "plan") => {
      if (!order) return;
      const po = order as PurchaseOrderDetail;
      const requestDeptLabel = getPurchaseOrderRequestDepartmentLabel(po);

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
    },
    [
      order,
      orderLines,
      nextProductionPlanSeq,
      deliveries,
      departmentOptionsFromTree,
    ]
  );

  const hasDeliveryTargets = orderLines.length > 0;
  const isPlanProductionModal = deliveryModalPurpose === "plan";

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
  const orderConsumedQty = isPlanProductionModal
    ? orderRegisteredQty
    : orderDeliveredQty;
  const orderRemainingQty = Math.max(0, orderTotalQty - orderConsumedQty);
  const thisProductionQty = parseThisProductionQtyInput(deliverySerialQtyInput);
  const displayedRemainingQty = orderTotalQty - (orderConsumedQty + thisProductionQty);

  const handleDeliveryMutationSuccess = useCallback(
    (data: ProductionPlan | Delivery, vars: OrderDetailDeliveryMutationVars) => {
      if (vars.purpose === "plan") {
        const plan = data as ProductionPlan;
        setDeliveryModalOpen(false);
        resetDeliveryModalForm();
        setDeliveryModalPurpose("actual");
        navigate(`/order/${id}/plan/${plan.id}`);
        return;
      }
      const delivery = data as Delivery;
      setDeliveryModalOpen(false);
      resetDeliveryModalForm();
      setLinkUnitsDelivery(delivery);
      setLinkUnitsModalOpen(true);
    },
    [id, navigate, resetDeliveryModalForm]
  );

  const submitDeliveryModal = useCallback(() => {
    if (!deliveryDate.trim()) {
      notify.error("IDCCA 인수일을 입력하세요.");
      return;
    }
    if (
      deliveryModalPurpose === "plan" &&
      !plannedDeliveryDate.trim()
    ) {
      notify.error("생산 예정일을 입력하세요.");
      return;
    }
    if (!hasDeliveryTargets) {
      notify.error("등록할 제품 라인이 없습니다.");
      return;
    }

    const managerId = deliveryManagerUserIdFromSelect(
      deliveryManagerUserSelectValue
    );

    if (deliveryModalPurpose === "plan") {
      const qty = parseThisProductionQtyInput(deliverySerialQtyInput);
      if (qty <= 0) {
        notify.error("이번 생산 수량을 1 이상 입력하세요.");
        return;
      }
      if (deliveryLotPreviewRows.length === 0) {
        notify.error("LOT 미리보기를 먼저 불러오세요.");
        return;
      }
      const { items, error } = distributeProductionPlanItems(
        orderLines,
        qty,
        registeredByOrderItemId
      );
      if (error) {
        notify.error(error);
        return;
      }
      const expectedPreviewCount = items.reduce(
        (sum, item) => sum + item.plannedQty,
        0
      );
      if (deliveryLotPreviewRows.length !== expectedPreviewCount) {
        notify.error(
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
      notify.error("시리얼을 먼저 생성하세요.");
      return;
    }
    for (let i = 0; i < deliverySerialPreviewRows.length; i += 1) {
      if (!deliverySerialPreviewRows[i].serialNo.trim()) {
        notify.error(`시리얼 번호를 입력하세요. (${i + 1}번 행)`);
        return;
      }
    }
    const trimmedSerials = deliverySerialPreviewRows.map((r) =>
      r.serialNo.trim()
    );
    if (new Set(trimmedSerials).size !== trimmedSerials.length) {
      notify.error("시리얼 번호에 중복이 있습니다. 서로 다르게 수정하세요.");
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
        notify.error(
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
      notify.error("이번 생산 수량을 1건 이상 입력하세요.");
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
  }, [
    deliveryDate,
    deliveryModalPurpose,
    plannedDeliveryDate,
    hasDeliveryTargets,
    deliveryManagerUserSelectValue,
    deliverySerialQtyInput,
    deliveryLotPreviewRows,
    orderLines,
    registeredByOrderItemId,
    deliveryTitle,
    deliveryRemark,
    deliverySerialPreviewRows,
    deliveredByOrderItemId,
    deliveryMutation,
  ]);

  return {
    deliveryModalOpen,
    deliveryModalPurpose,
    linkUnitsModalOpen,
    setLinkUnitsModalOpen,
    linkUnitsDelivery,
    setLinkUnitsDelivery,
    deliveryDate,
    setDeliveryDate,
    plannedDeliveryDate,
    setPlannedDeliveryDate,
    deliveryRemark,
    setDeliveryRemark,
    deliveryManagerUserSelectValue,
    setDeliveryManagerUserSelectValue,
    deliveryLotBulkOperatorUserValue,
    setDeliveryLotBulkOperatorUserValue,
    deliverySerialQtyInput,
    setDeliverySerialQtyInput,
    isSerialRulePopoverOpen,
    setIsSerialRulePopoverOpen,
    deliverySerialPreviewRows,
    deliveryLotPreviewRows,
    isLotBulkOperatorPopoverOpen,
    setIsLotBulkOperatorPopoverOpen,
    isLotRulePopoverOpen,
    setIsLotRulePopoverOpen,
    lotBulkOperatorPopoverRef,
    closeDeliveryModal,
    updateDeliveryLotPreviewOperatorUser,
    applyBulkOperatorUserToLotPreviewRows,
    updateDeliverySerialPreviewSerialNo,
    deliveryManagerUserOptions,
    operatorUserOptions,
    openDeliveryRegistrationModal,
    hasDeliveryTargets,
    orderTotalQty,
    orderConsumedQty,
    orderRemainingQty,
    thisProductionQty,
    displayedRemainingQty,
    handleDeliveryMutationSuccess,
    submitDeliveryModal,
  };
}
