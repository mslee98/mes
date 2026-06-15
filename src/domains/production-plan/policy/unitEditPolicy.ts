import type { ProductionPlanUnit } from "../../../api/purchaseOrder";
import { LOT_UNIT_CODE_PATTERN_DESCRIPTION } from "../../../lib/format/lotUnitCodeFormat";

export function canEditUnitFieldsBeforeShipment(_unit: ProductionPlanUnit): boolean {
  return true;
}

export function canEditUnitProductSerial(unit: ProductionPlanUnit): boolean {
  return String(unit.serialNo ?? "").trim().length > 0;
}

export function canEditUnitDetectorSerial(unit: ProductionPlanUnit): boolean {
  return String(unit.detectorSerialNo ?? "").trim().length > 0;
}

export function validateLotUnitCodeInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "LOT 번호를 입력하세요.";
  if (!/^LT-\d{8}-\d{3}$/.test(trimmed)) {
    return `LOT 형식이 올바르지 않습니다. (${LOT_UNIT_CODE_PATTERN_DESCRIPTION})`;
  }
  return null;
}

export function validateDetectorSerialInput(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length > 100) {
    return "검출기 S/N은 100자 이하로 입력하세요.";
  }
  return null;
}
