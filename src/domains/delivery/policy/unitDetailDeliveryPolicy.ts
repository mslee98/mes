import type { ProductionPlanUnit } from "../../../api/purchaseOrder";
import { deliveryPlanUnitMissingDeliverFields } from "../helpers/deliveryPlanDetailHelpers";
import { isPlaceholderProductSerialNo } from "../../../domains/production-plan/serial/placeholderProductSerial";

const TERMINAL_DELIVERY_PLAN_STATUSES = new Set([
  "COMPLETED",
  "COMPLETE",
  "CANCELLED",
  "CANCELED",
  "CLOSED",
]);

export function normalizeDeliveryPlanStatus(status?: string | null): string {
  return String(status ?? "").trim().toUpperCase();
}

export function isDeliveryPlanTerminalStatus(status?: string | null): boolean {
  return TERMINAL_DELIVERY_PLAN_STATUSES.has(
    normalizeDeliveryPlanStatus(status)
  );
}

export function isDeliveryPlanCompleted(status?: string | null): boolean {
  const normalized = normalizeDeliveryPlanStatus(status);
  return normalized === "COMPLETED" || normalized === "COMPLETE";
}

/** Unit 상세 납품 정책 판단용 컨텍스트 */
export type UnitDetailDeliveryContext = {
  isInDeliveryPlan?: boolean;
  isDelivered?: boolean;
  isDeliveryReady?: boolean;
  deliveryPlanStatus?: string | null;
};

/** 납품 계획 COMPLETED 이후 미출고 잔여 Unit */
export function isResidualUndeliveredFromCompletedPlan(
  ctx: UnitDetailDeliveryContext
): boolean {
  if (ctx.isDelivered === true) return false;
  if (ctx.isInDeliveryPlan !== true) return false;
  return isDeliveryPlanCompleted(ctx.deliveryPlanStatus);
}

export type UnitDeliverFieldSource = Pick<
  ProductionPlanUnit,
  "serialNo" | "detectorElementCode" | "wavelengthCode" | "detectorId" | "unitCode"
>;

export function unitHasCompleteDeliverFields(unit: UnitDeliverFieldSource): boolean {
  if (deliveryPlanUnitMissingDeliverFields(unit).length > 0) return false;
  const serial = String(unit.serialNo ?? "").trim();
  if (!serial || isPlaceholderProductSerialNo(serial)) return false;
  return true;
}

/** Unit 상세 「납품 등록」 — 계획 일괄 납품(COMPLETED) 후 미출고 잔여 건만 허용 */
export function canOpenUnitDetailDeliver(input: {
  canCreateDelivery: boolean;
  ctx: UnitDetailDeliveryContext;
  unit: UnitDeliverFieldSource;
}): boolean {
  const { canCreateDelivery, ctx, unit } = input;
  if (!canCreateDelivery) return false;
  if (ctx.isDelivered === true) return false;
  if (ctx.isDeliveryReady !== true) return false;
  if (!unitHasCompleteDeliverFields(unit)) return false;

  return isResidualUndeliveredFromCompletedPlan(ctx);
}

export function getUnitDetailDeliveryHint(
  ctx: UnitDetailDeliveryContext
): string | null {
  if (ctx.isDelivered === true) return null;

  if (isResidualUndeliveredFromCompletedPlan(ctx)) {
    if (ctx.isDeliveryReady === true) {
      return "납품 계획은 완료되었습니다. 이 품목은 미출고 잔여 건으로, 여기서 개별 납품할 수 있습니다.";
    }
    return "납품 계획은 완료되었습니다. 공정을 완료하면 이 화면에서 개별 납품할 수 있습니다.";
  }

  if (
    ctx.isInDeliveryPlan === true &&
    !isDeliveryPlanTerminalStatus(ctx.deliveryPlanStatus)
  ) {
    if (ctx.isDeliveryReady === true) {
      return "납품 대기 상태입니다. 납품 계획 상세에서 일괄 납품하세요.";
    }
    return "납품 계획에 포함되어 있습니다. 공정 완료 후 계획 상세에서 일괄 납품할 수 있습니다.";
  }

  if (ctx.isDeliveryReady === true) {
    return "납품 대기 상태입니다. 납품 계획에 포함한 뒤 계획 상세에서 일괄 납품하세요.";
  }

  return null;
}

/** COMPLETED 계획 잔여 + 공정 진행중 */
export function isUnitDetailResidualInProgress(
  ctx: UnitDetailDeliveryContext
): boolean {
  return (
    isResidualUndeliveredFromCompletedPlan(ctx) && ctx.isDeliveryReady !== true
  );
}

/** Unit 상세 「공정 처리」 — 납품 대기·납품 완료 시 숨김 */
export function canShowUnitDetailProcessGate(
  ctx: Pick<UnitDetailDeliveryContext, "isDelivered" | "isDeliveryReady">
): boolean {
  return ctx.isDelivered !== true && ctx.isDeliveryReady !== true;
}
