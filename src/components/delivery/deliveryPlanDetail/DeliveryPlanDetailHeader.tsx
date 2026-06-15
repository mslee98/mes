import { Link } from "react-router";
import type { DeliveryPlanDetailResponse } from "../../../api/purchaseOrder";
import Badge from "../../ui/badge/Badge";
import { buttonClassName } from "../../../lib/ui/buttonStyles";
import { formatDateYmd } from "../../../lib/format/dateFormat";
import { partnerCountrySubline } from "../../../domains/delivery/display/deliveryUnitListDisplay";
import {
  deriveDeliveryPlanSummary,
  isDeliveryPlanEditable,
  resolveDeliveryPlanManagerName,
  resolveDeliveryPlanOrderId,
  resolveDeliveryPlanOrderNo,
  resolveDeliveryPlanPartnerName,
} from "../../../domains/delivery/helpers/deliveryPlanDetailHelpers";
import { badgeColorFromKoStatusLabel } from "../../../lib/ui/badgeStatusColor";
import {
  labelForDeliveryPlanStatus,
  MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL,
} from "../../../domains/delivery/labels/statusLabels";
import { isDeliveryPlanCompleted } from "../../../domains/delivery/policy/unitDetailDeliveryPolicy";
import type { CommonCodeItem } from "../../../api/commonCode";
import { PencilIcon, PlusIcon, ArrowDownOnSquareIcon } from "../../../icons";

type DeliveryPlanDetailHeaderProps = {
  plan: DeliveryPlanDetailResponse;
  countryCodes: CommonCodeItem[];
  deliveryPlanStatusCodes: CommonCodeItem[];
  managerName: string;
  canCreateDelivery: boolean;
  canDeliver: boolean;
  undeliveredUnitCount: number;
  readyUnitCount: number;
  skippedUnitCount: number;
  onEditClick: () => void;
  onAddUnitsClick: () => void;
  onDeliverClick: () => void;
};

export function DeliveryPlanDetailHeader({
  plan,
  countryCodes,
  deliveryPlanStatusCodes,
  managerName,
  canCreateDelivery,
  canDeliver,
  undeliveredUnitCount,
  readyUnitCount,
  skippedUnitCount,
  onEditClick,
  onAddUnitsClick,
  onDeliverClick,
}: DeliveryPlanDetailHeaderProps) {
  const editable = isDeliveryPlanEditable(plan.status);
  const summary = deriveDeliveryPlanSummary(plan);
  const orderId = resolveDeliveryPlanOrderId(plan);
  const orderNo = resolveDeliveryPlanOrderNo(plan);
  const partnerName = resolveDeliveryPlanPartnerName(plan);
  const countryLine = partnerCountrySubline(plan.partner?.countryCode, countryCodes);
  const resolvedManagerName =
    managerName !== "-"
      ? managerName
      : resolveDeliveryPlanManagerName(plan);
  const statusName = labelForDeliveryPlanStatus(
    deliveryPlanStatusCodes,
    plan.status
  );
  const showRemainingUndeliveredHint =
    isDeliveryPlanCompleted(plan.status) && summary.undeliveredUnitCount > 0;

  const planTitle = [plan.planNo?.trim(), plan.title?.trim()]
    .filter(Boolean)
    .join(" / ");

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className="p-5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {planTitle || "납품 계획"}
              </h1>
              {plan.status ? (
                <Badge size="sm" color={badgeColorFromKoStatusLabel(statusName)}>
                  {statusName}
                </Badge>
              ) : null}
              {showRemainingUndeliveredHint ? (
                <span className="text-theme-xs text-amber-700 dark:text-amber-300/90">
                  미출고 {summary.undeliveredUnitCount}대 — {MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editable ? (
              <>
                <button
                  type="button"
                  className={buttonClassName({ actionRole: "edit", size: "compact" })}
                  onClick={onEditClick}
                >
                  <PencilIcon className="size-4 shrink-0" aria-hidden />
                  일정/담당자 수정
                </button>
                <button
                  type="button"
                  className={buttonClassName({ actionRole: "positive", size: "compact" })}
                  onClick={onAddUnitsClick}
                >
                  <PlusIcon className="size-4 shrink-0" aria-hidden />
                  품목 추가
                </button>
              </>
            ) : null}
            {canCreateDelivery && canDeliver ? (
              <button
                type="button"
                className={buttonClassName({
                  actionRole: "primary",
                  size: "compact",
                  disabled: !canDeliver,
                })}
                onClick={onDeliverClick}
                disabled={!canDeliver}
                title={
                  !canDeliver
                    ? undeliveredUnitCount === 0
                      ? "납품 계획에 미납품 품목이 없습니다."
                      : "이미 완료된 납품 계획입니다."
                    : readyUnitCount > 0
                      ? `납품 대기 ${readyUnitCount}대 실납품 · 진행 중 ${skippedUnitCount}대 제외 · 계획 마감`
                      : `납품 대기 0대 · 진행 중 ${skippedUnitCount}대 제외 · 계획만 완료`
                }
              >
                <ArrowDownOnSquareIcon className="size-4 shrink-0" aria-hidden />
                납품 등록
              </button>
            ) : null}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주번호</dt>
            <dd className="mt-0.5 text-theme-sm font-medium text-gray-900 dark:text-white">
              {orderId ? (
                <Link
                  to={`/order/${encodeURIComponent(orderId)}`}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {orderNo}
                </Link>
              ) : (
                orderNo
              )}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">고객사</dt>
            <dd className="mt-0.5 text-theme-sm font-medium text-gray-900 dark:text-white">
              {partnerName}
            </dd>
            {countryLine ? (
              <dd className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {countryLine.label}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 예정일</dt>
            <dd className="mt-0.5 text-theme-sm text-gray-900 dark:text-white">
              {formatDateYmd(plan.plannedDeliveryDate, { emptyFallback: "—" })}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 담당자</dt>
            <dd className="mt-0.5 text-theme-sm text-gray-900 dark:text-white">
              {resolvedManagerName}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">포함 품목</dt>
            <dd className="mt-0.5 text-theme-sm tabular-nums text-gray-900 dark:text-white">
              {summary.totalUnitCount}대
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 대기</dt>
            <dd className="mt-0.5 text-theme-sm tabular-nums text-gray-900 dark:text-white">
              {summary.readyUnitCount}대
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 완료</dt>
            <dd className="mt-0.5 text-theme-sm tabular-nums text-gray-900 dark:text-white">
              {summary.deliveredUnitCount}대
            </dd>
          </div>
          {plan.remark?.trim() ? (
            <div className="sm:col-span-2">
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">비고</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-theme-sm text-gray-700 dark:text-gray-300">
                {plan.remark.trim()}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
