import type { DeliveryPlanDetailResponse } from "../../../api/purchaseOrder";
import { DetailSummaryMetric } from "../../common/DetailSummaryMetric";
import {
  deriveDeliveryPlanSummary,
} from "../../../domains/delivery/helpers/deliveryPlanDetailHelpers";
import {
  BoxIcon,
  BoxIconLine,
  CheckCircleIcon,
  AlertIcon,
  TimeIcon,
} from "../../../icons";

type DeliveryPlanDetailSummaryRowProps = {
  plan: DeliveryPlanDetailResponse;
};

export function DeliveryPlanDetailSummaryRow({
  plan,
}: DeliveryPlanDetailSummaryRowProps) {
  const summary = deriveDeliveryPlanSummary(plan);

  return (
    <div className="grid border-t border-gray-100 sm:grid-cols-2 xl:grid-cols-5 xl:divide-x xl:divide-gray-100 dark:border-white/[0.06] dark:xl:divide-white/[0.06]">
      <DetailSummaryMetric icon={<BoxIcon className="size-6" aria-hidden />} label="전체 품목">
        <span className="tabular-nums">{summary.totalUnitCount}</span>
      </DetailSummaryMetric>
      <DetailSummaryMetric
        icon={<CheckCircleIcon className="size-6" aria-hidden />}
        label="납품 대기"
      >
        <span className="tabular-nums">{summary.readyUnitCount}</span>
      </DetailSummaryMetric>
      <DetailSummaryMetric icon={<TimeIcon className="size-6" aria-hidden />} label="공정 진행중">
        <span className="tabular-nums">{summary.inProgressUnitCount}</span>
      </DetailSummaryMetric>
      <DetailSummaryMetric icon={<AlertIcon className="size-6" aria-hidden />} label="공정 FAIL/재작업">
        <span className="tabular-nums">{summary.blockedUnitCount}</span>
      </DetailSummaryMetric>
      <DetailSummaryMetric
        icon={<BoxIconLine className="size-6" aria-hidden />}
        label="납품 완료"
      >
        <span className="tabular-nums">{summary.deliveredUnitCount}</span>
      </DetailSummaryMetric>
    </div>
  );
}
