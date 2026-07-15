import { useState, useCallback, useEffect, useRef } from "react";
import {
  getPurchaseOrderLotPreview,
  type PurchaseOrderItem,
} from "../../../api/purchaseOrder";
import { distributeProductionPlanItems } from "../../../domains/production-plan/helpers/distributeItems";
import type { OrderDetailDeliveryLotPreviewRow } from "./useOrderDetailMutations";
import {
  LOT_PREVIEW_DEBOUNCE_MS,
  deliveryManagerUserIdFromSelect,
  firstLineProductWithBusiness,
  parseThisProductionQtyInput,
} from "./orderDetailDeliveryModalHelpers";

type UseDeliveryLotPreviewParams = {
  deliveryModalOpen: boolean;
  deliveryModalPurpose: "actual" | "plan";
  accessToken: string | null | undefined;
  orderId: string;
  deliverySerialQtyInput: string;
  deliveryDate: string;
  orderLines: PurchaseOrderItem[];
  registeredByOrderItemId: Map<number, number>;
  deliveryLotBulkOperatorUserValue: string;
};

export function useDeliveryLotPreview({
  deliveryModalOpen,
  deliveryModalPurpose,
  accessToken,
  orderId,
  deliverySerialQtyInput,
  deliveryDate,
  orderLines,
  registeredByOrderItemId,
  deliveryLotBulkOperatorUserValue,
}: UseDeliveryLotPreviewParams) {
  const [deliveryLotPreviewRows, setDeliveryLotPreviewRows] = useState<
    OrderDetailDeliveryLotPreviewRow[]
  >([]);
  const [isLotBulkOperatorPopoverOpen, setIsLotBulkOperatorPopoverOpen] =
    useState(false);
  const lotPreviewGenRequestRef = useRef(0);
  const lotBulkOperatorPopoverRef = useRef<HTMLDivElement | null>(null);

  const clearLotPreview = useCallback(() => {
    setDeliveryLotPreviewRows([]);
    setIsLotBulkOperatorPopoverOpen(false);
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

  const generateLotPreview = useCallback(async () => {
    if (
      !deliveryModalOpen ||
      deliveryModalPurpose !== "plan" ||
      !accessToken ||
      !orderId
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
        orderId,
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
    orderId,
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

  return {
    deliveryLotPreviewRows,
    setDeliveryLotPreviewRows,
    clearLotPreview,
    isLotBulkOperatorPopoverOpen,
    setIsLotBulkOperatorPopoverOpen,
    lotBulkOperatorPopoverRef,
    updateDeliveryLotPreviewOperatorUser,
    applyBulkOperatorUserToLotPreviewRows,
  };
}
