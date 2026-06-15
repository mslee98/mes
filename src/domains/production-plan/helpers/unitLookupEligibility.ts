import type { SearchRmaTargetUnitItem } from "../../../api/rma";

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

export type UnitLookupContext = "rma" | "delivery";

export type UnitLookupSelectionBlockReason =
  | "NOT_DELIVERED"
  | "ALREADY_SELECTED"
  | "RMA_IN_PROGRESS"
  | "QUALITY_FAIL"
  | "DISCARDED";

export type UnitLookupEligibility = {
  selectable: boolean;
  reason?: UnitLookupSelectionBlockReason;
  message?: string;
};

export function unitLookupEligibility(
  unit: SearchRmaTargetUnitItem,
  context: UnitLookupContext,
  excludedUnitIds: string[] = []
): UnitLookupEligibility {
  const unitId = toText(unit.productionPlanUnitId);
  if (excludedUnitIds.includes(unitId)) {
    return {
      selectable: false,
      reason: "ALREADY_SELECTED",
      message: "이미 현재 등록 목록에 추가된 항목입니다.",
    };
  }

  if (context === "rma") {
    if (unit.isDelivered === false) {
      return {
        selectable: false,
        reason: "NOT_DELIVERED",
        message: "아직 납품 완료되지 않은 제품입니다. RMA 접수할 수 없습니다.",
      };
    }
  }

  const unitStatus = toText(unit.unitStatus).toUpperCase();
  if (unitStatus.includes("FAIL") || unitStatus.includes("불량")) {
    return {
      selectable: false,
      reason: "QUALITY_FAIL",
      message: "선택할 수 없습니다. 사유: 품질 상태가 FAIL입니다.",
    };
  }
  if (unitStatus.includes("DISCARD") || unitStatus.includes("폐기")) {
    return {
      selectable: false,
      reason: "DISCARDED",
      message: "선택할 수 없습니다. 사유: 폐기 처리된 Unit입니다.",
    };
  }
  if (unitStatus.includes("RMA")) {
    return {
      selectable: false,
      reason: "RMA_IN_PROGRESS",
      message: "선택할 수 없습니다. 사유: 현재 RMA 진행 중인 Unit입니다.",
    };
  }

  return { selectable: true };
}

export function unitDisplaySerial(unit: SearchRmaTargetUnitItem): string {
  return (
    toText(unit.productSerialNo) ||
    toText(unit.engineSerialNo) ||
    toText(unit.detectorSerialNo) ||
    toText(unit.unitCode) ||
    "-"
  );
}

export function unitLotLabel(unit: SearchRmaTargetUnitItem): string {
  return toText(unit.lotNo) || toText(unit.unitCode) || "-";
}

export function unitProductLabel(unit: SearchRmaTargetUnitItem): string {
  return toText(unit.productName) || toText(unit.itemName) || "-";
}

/** LOT prefix 그룹 키 (일련번호 4자리 제외) */
export function lotGroupKey(unit: SearchRmaTargetUnitItem): string {
  const lot = toText(unit.lotNo);
  if (lot) return lot;
  const code = toText(unit.unitCode);
  if (!code) return unit.productionPlanUnitId;
  const parts = code.split("-");
  if (parts.length <= 1) return code;
  return parts.slice(0, -1).join("-");
}

export function groupUnitsByLot(units: SearchRmaTargetUnitItem[]) {
  const map = new Map<string, SearchRmaTargetUnitItem[]>();
  for (const unit of units) {
    const key = lotGroupKey(unit);
    const list = map.get(key) ?? [];
    list.push(unit);
    map.set(key, list);
  }
  return [...map.entries()].map(([lotKey, items]) => ({
    lotKey,
    items,
    totalCount: items.length,
    selectableCount: items.filter(
      (item) => unitLookupEligibility(item, "rma").selectable
    ).length,
  }));
}
