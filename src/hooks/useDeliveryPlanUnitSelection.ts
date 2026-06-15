import { useCallback, useMemo, useState } from "react";
import type { ProductionPlanUnitListItem } from "../api/purchaseOrder";
import {
  canToggleUnitSelection,
  getCheckboxOrderMismatchHint,
  getSelectionAnchorOrderId,
} from "../domains/delivery/helpers/deliveryPlanUnitSelection";

export function useDeliveryPlanUnitSelection() {
  const [selectedById, setSelectedById] = useState<
    Map<string, ProductionPlanUnitListItem>
  >(() => new Map());

  const selectedItems = useMemo(
    () => [...selectedById.values()],
    [selectedById]
  );

  const anchorOrderId = useMemo(
    () => getSelectionAnchorOrderId(selectedItems),
    [selectedItems]
  );

  const toggle = useCallback(
    (row: ProductionPlanUnitListItem, checked: boolean) => {
      const unitId = String(row.unitId ?? "").trim();
      if (!unitId) return;

      setSelectedById((prev) => {
        const next = new Map(prev);
        if (checked) {
          const current = [...next.values()];
          if (!canToggleUnitSelection(current, row)) return prev;
          next.set(unitId, row);
        } else {
          next.delete(unitId);
        }
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => {
    setSelectedById(new Map());
  }, []);

  const isSelected = useCallback(
    (unitId: string) => selectedById.has(unitId),
    [selectedById]
  );

  const isRowCheckboxDisabled = useCallback(
    (row: ProductionPlanUnitListItem) => {
      const unitId = String(row.unitId ?? "").trim();
      if (!unitId) return true;
      if (selectedById.has(unitId)) return false;
      const current = [...selectedById.values()];
      return !canToggleUnitSelection(current, row);
    },
    [selectedById]
  );

  const getRowCheckboxOrderMismatchHint = useCallback(
    (row: ProductionPlanUnitListItem) => {
      const unitId = String(row.unitId ?? "").trim();
      return getCheckboxOrderMismatchHint(
        row,
        [...selectedById.values()],
        unitId ? selectedById.has(unitId) : false
      );
    },
    [selectedById]
  );

  return {
    selectedItems,
    selectedCount: selectedItems.length,
    anchorOrderId,
    toggle,
    clear,
    isSelected,
    isRowCheckboxDisabled,
    getRowCheckboxOrderMismatchHint,
  };
}
