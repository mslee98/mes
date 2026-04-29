import type { CommonCodeItem } from "../../api/commonCode";
import ComponentCard from "../common/ComponentCard";
import LoadingLottie from "../common/LoadingLottie";
import { DeliverySummaryStepper } from "./DeliverySummaryStepper";

type DeliveryDetailProgressTabProps = {
  sortedDeliveryStatusCodes: CommonCodeItem[];
  deliveryStatusCodesLoading: boolean;
  effectiveDeliveryStatus: string | undefined;
  statusName: (code: string | undefined) => string;
  statusProgressIndex: number;
  stepLabels: string[];
  stepperCompleted: number;
  stepperDetails: string[];
  onPreviousStatus: () => void;
  onNextStatus: () => void;
  onResetStatus: () => void;
};

export function DeliveryDetailProgressTab({
  sortedDeliveryStatusCodes,
  deliveryStatusCodesLoading,
  effectiveDeliveryStatus,
  statusName,
  statusProgressIndex,
  stepLabels,
  stepperCompleted,
  stepperDetails,
  onPreviousStatus,
  onNextStatus,
  onResetStatus,
}: DeliveryDetailProgressTabProps) {
  const hasSteps = sortedDeliveryStatusCodes.length > 0;
  const canGoPrev = hasSteps && statusProgressIndex > 0;
  const canGoNext =
    hasSteps &&
    (statusProgressIndex < 0 || statusProgressIndex < sortedDeliveryStatusCodes.length - 1);

  return (
    <ComponentCard title="진행 상태">
      {deliveryStatusCodesLoading ? (
        <div className="flex min-h-[120px] items-center justify-center py-4">
          <LoadingLottie />
        </div>
      ) : sortedDeliveryStatusCodes.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          진행 상태 정보를 불러올 수 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
            현재 상태:{" "}
            <strong className="font-semibold text-gray-900 dark:text-white">
              {statusName(effectiveDeliveryStatus)}
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPreviousStatus}
              disabled={!canGoPrev}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.04]"
            >
              이전 단계
            </button>
            <button
              type="button"
              onClick={onNextStatus}
              disabled={!canGoNext}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-3 py-2 text-theme-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              다음 단계
            </button>
            <button
              type="button"
              onClick={onResetStatus}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.04]"
            >
              초기화
            </button>
          </div>

          <DeliverySummaryStepper
            stepLabels={stepLabels}
            completedCount={stepperCompleted}
            stepDetails={stepperDetails}
          />
        </div>
      )}
    </ComponentCard>
  );
}
