import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Delivery, DeliveryOrderWithDetail } from "../../api/purchaseOrder";
import type { CommonCodeItem } from "../../api/commonCode";
import Badge from "../ui/badge/Badge";
import ComponentCard from "../common/ComponentCard";
import LoadingLottie from "../common/LoadingLottie";
import { DeliverySummaryStepper } from "./DeliverySummaryStepper";
import { badgeColorFromKoStatusLabel } from "../../lib/badgeStatusColor";
import {
  deliveryDetailUserDisplayName,
  deliveryLinesFromDelivery,
  formatDeliveryDetailDate,
  formatDeliveryDetailDateTimeKo,
  labelForSortedDeliveryStatus,
} from "../../lib/deliveryDetailHelpers";
import type { DeliveryDetailTab } from "./deliveryDetailTabTypes";

type NextDeliveryStatusHint =
  | { type: "empty" }
  | { type: "unknown" }
  | { type: "last" }
  | { type: "next"; label: string; code: string };

type DeliveryDetailOverviewTabProps = {
  delivery: Delivery;
  order: DeliveryOrderWithDetail | undefined;
  purchaseOrderId: number | undefined;
  partnerLabel: ReactNode;
  effectiveDeliveryStatus: string | null | undefined;
  deliveryStatusSimCode: string | null;
  statusName: (code: string | undefined) => string;
  statusStepTotal: number;
  statusProgressIndex: number;
  statusProgressPercent: number;
  nextDeliveryStatusHint: NextDeliveryStatusHint;
  sortedDeliveryStatusCodes: CommonCodeItem[];
  deliveryStatusCodesLoading: boolean;
  stepLabels: string[];
  stepperCompleted: number;
  stepperDetails: string[];
  onNavigateTab: (tab: DeliveryDetailTab) => void;
};

export function DeliveryDetailOverviewTab({
  delivery: d,
  order,
  purchaseOrderId,
  partnerLabel,
  effectiveDeliveryStatus,
  deliveryStatusSimCode,
  statusName,
  statusStepTotal,
  statusProgressIndex,
  statusProgressPercent,
  nextDeliveryStatusHint,
  sortedDeliveryStatusCodes,
  deliveryStatusCodesLoading,
  stepLabels,
  stepperCompleted,
  stepperDetails,
  onNavigateTab,
}: DeliveryDetailOverviewTabProps) {
  const lines = deliveryLinesFromDelivery(d);

  return (
    <>
      <div
        className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50/90 to-white px-4 py-4 dark:border-white/10 dark:from-white/[0.04] dark:to-white/[0.02] sm:px-5 sm:py-5"
        role="region"
        aria-label="납품 요약"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              납품
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {d.deliveryNo?.trim() || `ID ${d.id}`}
            </p>
            {d.title?.trim() ? (
              <p className="mt-0.5 text-theme-sm text-gray-600 dark:text-gray-300">
                {d.title.trim()}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              size="sm"
              color={badgeColorFromKoStatusLabel(statusName(effectiveDeliveryStatus))}
            >
              {statusName(effectiveDeliveryStatus)}
            </Badge>
            {deliveryStatusSimCode?.trim() ? (
              <span className="text-theme-xs text-amber-700 dark:text-amber-300">
                납품 상태 시연 오버레이
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400">
            <span>납품 진행률 (공통코드 순)</span>
            <span>
              {statusStepTotal > 0 && statusProgressIndex >= 0
                ? `${statusProgressIndex + 1} / ${statusStepTotal}`
                : "—"}
              {statusStepTotal > 0 && statusProgressIndex >= 0
                ? ` · ${statusProgressPercent}%`
                : ""}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={statusProgressPercent}
            aria-label="납품 상태 진행률"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-300 dark:bg-brand-400"
              style={{ width: `${statusProgressPercent}%` }}
            />
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-theme-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
              {purchaseOrderId != null && order?.orderNo ? (
                <Link
                  to={`/order/${purchaseOrderId}`}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {order.orderNo}
                </Link>
              ) : (
                <span>{order?.orderNo ?? "—"}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">거래처</dt>
            <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{partnerLabel}</dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품일 / 예정</dt>
            <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
              {formatDeliveryDetailDate(d.deliveryDate)}
              {d.plannedDeliveryDate?.trim() ? (
                <span className="text-gray-500 dark:text-gray-400">
                  {" "}
                  · {formatDeliveryDetailDate(d.plannedDeliveryDate)}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">이번 납품 품목</dt>
            <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
              {lines.length}건
              {lines.length > 0 ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => onNavigateTab("lines")}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    품목 탭으로
                  </button>
                </>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-dashed border-brand-300/80 bg-brand-50/40 px-4 py-3 dark:border-brand-600/40 dark:bg-brand-500/10">
        <p className="text-theme-xs font-medium text-brand-900 dark:text-brand-100">다음 작업</p>
        <p className="mt-1 text-theme-sm text-gray-700 dark:text-gray-200">
          {nextDeliveryStatusHint.type === "empty" ? (
            "납품 상태 공통코드를 불러오면 다음 단계 안내가 표시됩니다."
          ) : nextDeliveryStatusHint.type === "unknown" ? (
            <>
              현재 코드가 공통코드 목록에 없습니다. 서버 상태:{" "}
              <span className="font-mono text-theme-xs">{d.status ?? "—"}</span>
            </>
          ) : nextDeliveryStatusHint.type === "last" ? (
            "공통코드 기준 마지막 단계에 도달했습니다."
          ) : (
            <>
              다음 단계:{" "}
              <strong className="font-medium">{nextDeliveryStatusHint.label}</strong>
              <span className="ml-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                ({nextDeliveryStatusHint.code})
              </span>
            </>
          )}
        </p>
        <p className="mt-2 text-theme-xs text-gray-600 dark:text-gray-300">
          <strong className="font-medium text-gray-800 dark:text-gray-200">납품 진행 단계</strong>{" "}
          시연(공통코드 순)과{" "}
          <strong className="font-medium text-gray-800 dark:text-gray-200">계획·결재</strong> 와이어 시연은{" "}
          <button
            type="button"
            onClick={() => onNavigateTab("progress")}
            className="font-medium text-brand-600 underline hover:no-underline dark:text-brand-400"
          >
            진행
          </button>
          ·{" "}
          <button
            type="button"
            onClick={() => onNavigateTab("approval")}
            className="font-medium text-brand-600 underline hover:no-underline dark:text-brand-400"
          >
            결재
          </button>
          탭에서 연동·조작할 수 있습니다.
        </p>
      </div>

      <ComponentCard title="납품 진행 단계" collapsible>
        <div className="min-w-0 overflow-x-auto pb-1">
          <div className="min-w-[640px] sm:min-w-0">
            {deliveryStatusCodesLoading ? (
              <div className="flex min-h-[120px] items-center justify-center py-4">
                <LoadingLottie />
              </div>
            ) : sortedDeliveryStatusCodes.length === 0 ? (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                납품 상태 공통 코드를 불러올 수 없어 단계를 표시하지 못했습니다.
              </p>
            ) : (
              <DeliverySummaryStepper
                stepLabels={stepLabels}
                completedCount={stepperCompleted}
                stepDetails={stepperDetails}
              />
            )}
          </div>
        </div>
      </ComponentCard>

      <ComponentCard title="납품 상세 정보" collapsible defaultCollapsed>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 번호</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
              {d.deliveryNo?.trim() || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">제목</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
              {d.title?.trim() || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품일</dt>
            <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
              {formatDeliveryDetailDate(d.deliveryDate)}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">예정일</dt>
            <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
              {d.plannedDeliveryDate?.trim()
                ? formatDeliveryDetailDate(d.plannedDeliveryDate)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">상태</dt>
            <dd className="mt-0.5 space-y-1">
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">서버</span>{" "}
                <Badge
                  size="sm"
                  color={badgeColorFromKoStatusLabel(
                    labelForSortedDeliveryStatus(sortedDeliveryStatusCodes, d.status)
                  )}
                >
                  {labelForSortedDeliveryStatus(sortedDeliveryStatusCodes, d.status)}
                </Badge>
                {d.status?.trim() ? (
                  <span className="ml-1 font-mono text-theme-xs text-gray-500">
                    {d.status.trim()}
                  </span>
                ) : null}
              </div>
              {deliveryStatusSimCode?.trim() ? (
                <div>
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">화면 반영</span>{" "}
                  <Badge
                    size="sm"
                    color={badgeColorFromKoStatusLabel(statusName(effectiveDeliveryStatus))}
                  >
                    {statusName(effectiveDeliveryStatus)}
                  </Badge>
                </div>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주</dt>
            <dd className="mt-0.5">
              {purchaseOrderId != null && order?.orderNo ? (
                <Link
                  to={`/order/${purchaseOrderId}`}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {order.orderNo}
                </Link>
              ) : (
                <span className="text-gray-800 dark:text-gray-100">{order?.orderNo ?? "—"}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 담당자</dt>
            <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
              {deliveryDetailUserDisplayName(d.deliveryManager)}
              {d.deliveryManagerDepartment?.trim() ? (
                <span className="text-gray-500 dark:text-gray-400">
                  {" "}
                  · {d.deliveryManagerDepartment.trim()}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">등록 / 수정</dt>
            <dd className="mt-0.5 text-theme-xs text-gray-700 dark:text-gray-200">
              <div>
                {d.createdAt ? formatDeliveryDetailDateTimeKo(d.createdAt) : "—"}{" "}
                {deliveryDetailUserDisplayName(d.createdBy) !== "—"
                  ? `· ${deliveryDetailUserDisplayName(d.createdBy)}`
                  : ""}
              </div>
              <div className="mt-0.5 text-gray-500 dark:text-gray-400">
                {d.updatedAt ? formatDeliveryDetailDateTimeKo(d.updatedAt) : "—"}{" "}
                {deliveryDetailUserDisplayName(d.updatedBy) !== "—"
                  ? `· ${deliveryDetailUserDisplayName(d.updatedBy)}`
                  : ""}
              </div>
            </dd>
          </div>
        </dl>

        {d.updateReason?.trim() ? (
          <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-theme-sm text-amber-950 dark:border-amber-600/40 dark:bg-amber-500/10 dark:text-amber-100">
            <span className="text-theme-xs font-medium text-amber-800 dark:text-amber-200">
              수정 사유
            </span>
            <p className="mt-1 text-gray-800 dark:text-gray-100">{d.updateReason.trim()}</p>
          </div>
        ) : null}

        {d.remark?.trim() ? (
          <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
            {d.remark}
          </p>
        ) : null}
      </ComponentCard>
    </>
  );
}
