import { useState, useCallback, useEffect, useRef } from "react";
import {
  getPurchaseOrderSerialMaxSequence,
  type PurchaseOrderDetail,
  type PurchaseOrderItem,
} from "../../../api/purchaseOrder";
import {
  buildLtSerialNo,
  ltSerialSequenceKey,
} from "../../../lib/format/ltSerialFormat";
import { yearCodeFromOrderDate } from "../../../lib/format/lotUnitCodeFormat";
import {
  resolveOrderLineDetectorElementInitial,
  resolveOrderLineDetectorId,
  resolveOrderLineWavelengthCode,
} from "../../../domains/production-plan/helpers/serialFromOrderLine";
import { resolvePartnerForDisplay } from "../../../domains/partner/display/partnerDisplay";
import type { CommonCodeItem } from "../../../api/commonCode";
import {
  SERIAL_PREVIEW_DEBOUNCE_MS,
  type DeliverySerialPreviewRow,
  firstLineProductWithBusiness,
  parseThisProductionQtyInput,
} from "./orderDetailDeliveryModalHelpers";

type UseDeliverySerialPreviewParams = {
  deliveryModalOpen: boolean;
  deliveryModalPurpose: "actual" | "plan";
  order: PurchaseOrderDetail | undefined;
  accessToken: string | null | undefined;
  orderId: string;
  deliverySerialQtyInput: string;
  deliveryDate: string;
  deliveredByOrderItemId: Map<number, number>;
  lotYearCodes: CommonCodeItem[];
};

export function useDeliverySerialPreview({
  deliveryModalOpen,
  deliveryModalPurpose,
  order,
  accessToken,
  orderId,
  deliverySerialQtyInput,
  deliveryDate,
  deliveredByOrderItemId,
  lotYearCodes,
}: UseDeliverySerialPreviewParams) {
  const [deliverySerialPreviewRows, setDeliverySerialPreviewRows] = useState<
    DeliverySerialPreviewRow[]
  >([]);
  const serialPreviewGenRequestRef = useRef(0);

  const clearSerialPreview = useCallback(() => {
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

  const generateSerialPreview = useCallback(async () => {
    if (
      !deliveryModalOpen ||
      deliveryModalPurpose !== "actual" ||
      !order ||
      !accessToken ||
      !orderId
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

    const partnerCode = String(
      resolvePartnerForDisplay(poDetail.partner, poDetail.partnerSummary)?.code ??
        ""
    )
      .trim()
      .toUpperCase();
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
        orderId,
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
    orderId,
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

  return {
    deliverySerialPreviewRows,
    setDeliverySerialPreviewRows,
    clearSerialPreview,
    updateDeliverySerialPreviewSerialNo,
  };
}
