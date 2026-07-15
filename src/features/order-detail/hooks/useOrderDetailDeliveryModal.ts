import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  startTransition,
} from "react";
import { useNavigate } from "react-router";
import { notify } from "../../../lib/notify";
import {
  getPurchaseOrderRequestDepartmentLabel,
  type PurchaseOrderDetail,
  type PurchaseOrderItem,
  type Delivery,
  type DeliveryCreatePayload,
  type DeliveryCreateLinePayload,
  type ProductionPlan,
} from "../../../api/purchaseOrder";
import {
  legacyDeptValue,
  tryDecodeLegacyDept,
  tryDecodeLegacyUser,
} from "../../../lib/legacySelectValue";
import { distributeProductionPlanItems } from "../../../domains/production-plan/helpers/distributeItems";
import type { CommonCodeItem } from "../../../api/commonCode";
import type { UserItem } from "../../../api/user";
import type { UseMutationResult } from "@tanstack/react-query";
import type {
  OrderDetailDeliveryMutationVars,
} from "./useOrderDetailMutations";
import {
  buildProductionPlanAutoTitle,
  deliveryManagerUserIdFromSelect,
  parseThisProductionQtyInput,
} from "./orderDetailDeliveryModalHelpers";
import { useDeliverySerialPreview } from "./useDeliverySerialPreview";
import { useDeliveryLotPreview } from "./useDeliveryLotPreview";

export type { DeliverySerialPreviewRow } from "./orderDetailDeliveryModalHelpers";

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
  const [isLotRulePopoverOpen, setIsLotRulePopoverOpen] = useState(false);

  const {
    deliverySerialPreviewRows,
    setDeliverySerialPreviewRows,
    clearSerialPreview,
    updateDeliverySerialPreviewSerialNo,
  } = useDeliverySerialPreview({
    deliveryModalOpen,
    deliveryModalPurpose,
    order,
    accessToken,
    orderId: id,
    deliverySerialQtyInput,
    deliveryDate,
    deliveredByOrderItemId,
    lotYearCodes,
  });

  const {
    deliveryLotPreviewRows,
    setDeliveryLotPreviewRows,
    clearLotPreview,
    isLotBulkOperatorPopoverOpen,
    setIsLotBulkOperatorPopoverOpen,
    lotBulkOperatorPopoverRef,
    updateDeliveryLotPreviewOperatorUser,
    applyBulkOperatorUserToLotPreviewRows,
  } = useDeliveryLotPreview({
    deliveryModalOpen,
    deliveryModalPurpose,
    accessToken,
    orderId: id,
    deliverySerialQtyInput,
    deliveryDate,
    orderLines,
    registeredByOrderItemId,
    deliveryLotBulkOperatorUserValue,
  });

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
    clearSerialPreview();
    clearLotPreview();
    setIsLotRulePopoverOpen(false);
  }, [clearSerialPreview, clearLotPreview]);

  const closeDeliveryModal = useCallback(() => {
    setDeliveryModalOpen(false);
    resetDeliveryModalForm();
    setDeliveryModalPurpose("actual");
  }, [resetDeliveryModalForm, setDeliveryModalOpen]);

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
      setDeliveryModalOpen,
      setDeliverySerialPreviewRows,
      setDeliveryLotPreviewRows,
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
    [id, navigate, resetDeliveryModalForm, setDeliveryModalOpen]
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
