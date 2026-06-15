import type { AssignProductSerialUnitInput } from "../../../api/purchaseOrder";
import {
  detectorElementCodeForApi,
  lineCodeFromOrderLine,
} from "./legacyProductSerialNumber";
import type { FlatPlanUnitRow } from "../helpers/detailHelpers";
import { resolvePlanUnitDetectorFields } from "../helpers/detailHelpers";

/** 백엔드 `OrdersService.PLACEHOLDER_PRODUCT_SERIAL_PATTERN`과 동일 */
export const PLACEHOLDER_PRODUCT_SERIAL_PATTERN = /^unissued-\d{4}$/i;

export function isPlaceholderProductSerialNo(
  serialNo?: string | null
): boolean {
  return PLACEHOLDER_PRODUCT_SERIAL_PATTERN.test(String(serialNo ?? "").trim());
}

export function displayProductSerialNo(serialNo?: string | null): string {
  const s = String(serialNo ?? "").trim();
  if (!s) return "미할당";
  if (isPlaceholderProductSerialNo(s)) return "제품 미확정";
  return s;
}

export function needsProductSerialAssignment(serialNo?: string | null): boolean {
  const s = String(serialNo ?? "").trim();
  return !s || isPlaceholderProductSerialNo(s);
}

export function buildPlaceholderSerialAssignUnits(
  flatRows: FlatPlanUnitRow[]
): AssignProductSerialUnitInput[] {
  return flatRows.map((row) => {
    const lot = row.unit.unitCode ?? row.unit.id;
    const { detectorElementCode, wavelengthCode, detectorId } =
      resolvePlanUnitDetectorFields({
        unit: row.unit,
        orderLine: row.orderLine,
        rowOverrides: row,
      });
    if (!detectorElementCode || !wavelengthCode) {
      throw new Error(
        `품목 ${lot}의 검출기 소자·파장 정보가 없습니다.`
      );
    }
    if (detectorId == null) {
      throw new Error(`품목 ${lot}의 검출기(detectorId)가 없습니다.`);
    }
    const serialNo = String(row.unit.serialNo ?? "").trim();
    return {
      unitId: row.unit.id,
      serialNo,
      detectorElementCode: detectorElementCodeForApi(
        detectorElementCode,
        lineCodeFromOrderLine(row.orderLine)
      ),
      wavelengthCode,
      detectorId,
    };
  });
}
