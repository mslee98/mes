import { useCallback, useMemo, useState } from "react";
import type { DeliveryPlanUnitSummary } from "../api/purchaseOrder";
import {
  getUnitSelectionDisabledReason,
  isUnitSelectableForDelivery,
} from "../domains/delivery/helpers/deliveryPlanDetailHelpers";

export function useDeliveryPlanDetailSelection() {
  const [selectedById, setSelectedById] = useState<
    Map<string, DeliveryPlanUnitSummary>
  >(() => new Map());

  const selectedUnits = useMemo(
    () => [...selectedById.values()],
    [selectedById]
  );

  const selectedCount = selectedUnits.length;

  const toggle = useCallback((unit: DeliveryPlanUnitSummary, checked: boolean) => {
    const unitId = String(unit.id ?? "").trim();
    if (!unitId) return;

    setSelectedById((prev) => {
      const next = new Map(prev);
      if (checked) {
        if (!isUnitSelectableForDelivery(unit)) return prev;
        next.set(unitId, unit);
      } else {
        next.delete(unitId);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedById(new Map());
  }, []);

  const isSelected = useCallback(
    (unitId: string) => selectedById.has(unitId),
    [selectedById]
  );

  const isCheckboxDisabled = useCallback((unit: DeliveryPlanUnitSummary) => {
    const unitId = String(unit.id ?? "").trim();
    if (!unitId) return true;
    if (selectedById.has(unitId)) return false;
    return !isUnitSelectableForDelivery(unit);
  }, [selectedById]);

  const getCheckboxDisabledReason = useCallback(
    (unit: DeliveryPlanUnitSummary) => getUnitSelectionDisabledReason(unit),
    []
  );

  return {
    selectedUnits,
    selectedCount,
    toggle,
    clear,
    isSelected,
    isCheckboxDisabled,
    getCheckboxDisabledReason,
  };
}
