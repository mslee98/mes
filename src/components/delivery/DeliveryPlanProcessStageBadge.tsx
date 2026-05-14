import Badge from "../ui/badge/Badge";
import type { DeliveryPlanUnit } from "../../api/purchaseOrder";
import { processStageBadgeFromUnit } from "../../lib/deliveryPlanProcessLabels";

type DeliveryPlanProcessStageBadgeProps = {
  unit: Pick<
    DeliveryPlanUnit,
    "processStatus" | "currentProcessCode" | "isDeliveryReady" | "isDelivered"
  >;
};

/** 공정 진행 단계 — PASS는 ‘진행’, 출고·납품 완료만 종료(완료) 느낌으로 표시 */
export function DeliveryPlanProcessStageBadge({
  unit,
}: DeliveryPlanProcessStageBadgeProps) {
  const { kind, label } = processStageBadgeFromUnit(unit);

  let color:
    | "primary"
    | "success"
    | "error"
    | "warning"
    | "info"
    | "light"
    | "dark" = "light";
  if (kind === "done") color = "success";
  else if (kind === "progress") color = "info";
  else if (kind === "rework") color = "error";
  else if (kind === "hold" || kind === "wait") color = "warning";

  return (
    <Badge size="sm" color={color}>
      {label}
    </Badge>
  );
}
