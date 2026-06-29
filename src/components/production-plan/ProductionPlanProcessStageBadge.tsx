import Badge from "../ui/badge/Badge";
import type { ProductionPlanUnit } from "../../api/purchaseOrder";
import { processStageBadgeFromUnit } from "../../domains/production-plan/labels/processLabels";

type ProductionPlanProcessStageBadgeProps = {
  unit: Pick<
    ProductionPlanUnit,
    "processStatus" | "currentProcessCode" | "isDeliveryReady" | "isDelivered"
  >;
};

/** 공정 진행 단계 — PASS는 ‘진행’, 납품 대기·납품 완료만 종료(완료) 느낌으로 표시 */
export function ProductionPlanProcessStageBadge({
  unit,
}: ProductionPlanProcessStageBadgeProps) {
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
      <span className="whitespace-nowrap">{label}</span>
    </Badge>
  );
}
