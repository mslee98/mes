import type { CommonCodeItem } from "../../api/commonCode";
import type { DeliveryPlanUnit } from "../../api/purchaseOrder";
import { ProcessPipelineStepper } from "./ProcessPipelineStepper";

export interface ProcessGateContextPanelProps {
  unit: DeliveryPlanUnit | null;
  stepCodes: CommonCodeItem[];
}

/**
 * 공정 처리 진입 모달 본문 — 표준 공정 로드맵 스테퍼(스크롤·현재/다음 펄스).
 */
export function ProcessGateContextPanel({ unit, stepCodes }: ProcessGateContextPanelProps) {
  return <ProcessPipelineStepper unit={unit} stepCodes={stepCodes} />;
}
