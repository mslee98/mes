import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { notify } from "../../../lib/notify";
import { normalizeCurrencyCode } from "../../../lib/format/formatCurrency";
import { formatLineUnitPriceDisplay } from "../../../lib/format/priceInput";
import type { PurchaseOrderDetail, PurchaseOrderItem } from "../../../api/purchaseOrder";
import type { RepresentativeProduct } from "../../../api/products";
import type { ItemRow } from "../types";
import {
  emptyItemRow,
  itemRowsFromOrderLines,
  serializeItemRows,
} from "../utils/itemRow";
import { detectorFieldsFromOrderLine } from "../../../domains/order/helpers/orderLineItemRow";
import {
  defaultHiddenDetectorCodesForProduct,
  ORDER_LINE_WAVELENGTH_CODE,
} from "../../../domains/order/helpers/orderLineDetectorFields";

type UseOrderFormLineStateParams = {
  isNew: boolean;
  order: PurchaseOrderDetail | undefined;
  resolvedOrderLineItems: PurchaseOrderItem[];
  productList: RepresentativeProduct[];
  firstUnitValue: string;
  orderCurrencyCode: string;
  exchangeRateCurrencyCode: string;
  canEditExistingOrder: boolean;
};

export function useOrderFormLineState({
  isNew,
  order,
  resolvedOrderLineItems,
  productList,
  firstUnitValue,
  orderCurrencyCode,
  exchangeRateCurrencyCode,
  canEditExistingOrder,
}: UseOrderFormLineStateParams) {
  const [items, setItems] = useState<ItemRow[]>([emptyItemRow()]);
  const [editingLineIds, setEditingLineIds] = useState<number[]>([]);
  const [recentlySavedLineIds, setRecentlySavedLineIds] = useState<number[]>([]);
  const [lineDeleteConfirmIndex, setLineDeleteConfirmIndex] = useState<number | null>(null);

  const recentlySavedLineTimersRef = useRef<
    Record<number, ReturnType<typeof setTimeout>>
  >({});

  const productById = useMemo(() => {
    const m = new Map<string, RepresentativeProduct>();
    productList.forEach((p) => {
      const pid = String(p.id ?? "").trim();
      if (pid) m.set(pid, p);
    });
    return m;
  }, [productList]);

  const defaultNewLineCurrency = useMemo(() => {
    const fromExchange = exchangeRateCurrencyCode?.trim().toUpperCase();
    if (fromExchange) return fromExchange;
    return normalizeCurrencyCode(orderCurrencyCode);
  }, [exchangeRateCurrencyCode, orderCurrencyCode]);

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

  const markLineSaved = useCallback((lineId?: number) => {
    if (!lineId) return;
    setRecentlySavedLineIds((prev) =>
      prev.includes(lineId) ? prev : [...prev, lineId]
    );
    const existingTimer = recentlySavedLineTimersRef.current[lineId];
    if (existingTimer) clearTimeout(existingTimer);
    recentlySavedLineTimersRef.current[lineId] = setTimeout(() => {
      setRecentlySavedLineIds((prev) => prev.filter((savedId) => savedId !== lineId));
      delete recentlySavedLineTimersRef.current[lineId];
    }, 2500);
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

  const initialItemsJson = useMemo(() => {
    if (isNew) {
      return serializeItemRows([
        { ...emptyItemRow(), unitCode: firstUnitValue || "" },
      ]);
    }
    if (!order) return null;
    return serializeItemRows(
      itemRowsFromOrderLines(
        resolvedOrderLineItems,
        order.currencyCode ?? undefined,
        firstUnitValue
      )
    );
  }, [isNew, order, resolvedOrderLineItems, firstUnitValue]);

  const isLineDirty = useMemo(() => {
    if (!initialItemsJson) return false;
    if (!isNew && (editingLineIds.length > 0 || hasUnsavedWorkingLine)) {
      return true;
    }
    return serializeItemRows(items) !== initialItemsJson;
  }, [
    initialItemsJson,
    isNew,
    editingLineIds,
    hasUnsavedWorkingLine,
    items,
  ]);

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
    setEditingLineIds((prev) => prev.filter((savedId) => savedId !== lineId));
  };

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
    setLineDeleteConfirmIndex(index);
  };

  return {
    items,
    setItems: setItems as Dispatch<SetStateAction<ItemRow[]>>,
    editingLineIds,
    recentlySavedLineIds,
    lineDeleteConfirmIndex,
    setLineDeleteConfirmIndex,
    productById,
    hasUnsavedWorkingLine,
    isLineDirty,
    markLineSaved,
    addItemRow,
    removeItemRow,
    updateItemRow,
    setLineProductId,
    setLineDetectorId,
    setLineLensId,
    beginLineEdit,
    finishLineEdit,
    cancelLineEdit,
    removeLine,
  };
}
