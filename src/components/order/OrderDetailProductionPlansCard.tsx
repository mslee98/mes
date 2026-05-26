import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import ComponentCard from "../common/ComponentCard";
import LoadingLottie from "../common/LoadingLottie";
import { CalenderIcon, AngleRightIcon } from "../../icons";
import {
  getPurchaseOrderProductionPlans,
  type ProductionPlan,
} from "../../api/purchaseOrder";
import { formatDateYmd } from "../../lib/dateFormat";

type OrderDetailProductionPlansCardProps = {
  purchaseOrderId: string;
  accessToken: string;
  isAuthLoading?: boolean;
  canCreate: boolean;
  /** 실제 납품 등록과 동일한 모달을 연다 — 저장 시 `POST .../production-plans` */
  onOpenPlanModal: () => void;
  /** true면 카드 헤더의「생산 계획 만들기」숨김(페이지 상단 버튼과 중복 방지) */
  hideHeaderCreateButton?: boolean;
  /** `dashboard`: 캘린더·생성일·상세보기 행 스타일 */
  visualVariant?: "default" | "dashboard";
};

function planListTitle(plan: ProductionPlan): string {
  const t = plan.title?.trim();
  if (t) return t;
  const no = plan.planNo?.trim();
  if (no) return no;
  if (plan.planSeq != null && Number.isFinite(plan.planSeq)) {
    return `생산 계획 ${plan.planSeq}차`;
  }
  return String(plan.id);
}

export function OrderDetailProductionPlansCard({
  purchaseOrderId,
  accessToken,
  isAuthLoading = false,
  canCreate,
  onOpenPlanModal,
  hideHeaderCreateButton = false,
  visualVariant = "default",
}: OrderDetailProductionPlansCardProps) {
  const isDashboard = visualVariant === "dashboard";
  const {
    data: plans = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["purchaseOrderProductionPlans", purchaseOrderId],
    queryFn: () => getPurchaseOrderProductionPlans(purchaseOrderId, accessToken),
    enabled:
      !!accessToken && !isAuthLoading && String(purchaseOrderId).trim() !== "",
  });

  const formatPlanDate = (plan: ProductionPlan) => {
    const raw =
      plan.deliveryDate ??
      plan.plannedDeliveryDate ??
      plan.plannedDate ??
      null;
    return formatDateYmd(raw, { emptyFallback: "-" });
  };

  return (
    <ComponentCard
      title="생산 계획"
      desc={isDashboard ? "등록된 생산 계획 목록입니다." : undefined}
      collapsible={!isDashboard}
      defaultCollapsed={false}
      className={isDashboard ? "[&>div:first-child]:px-4 [&>div:first-child]:py-3.5" : ""}
      bodyClassName={isDashboard ? "!p-3 sm:!p-4" : ""}
      contentClassName={isDashboard ? "!space-y-2" : ""}
      headerEnd={
        hideHeaderCreateButton ? undefined : (
          <button
            type="button"
            disabled={!canCreate}
            title={
              canCreate
                ? undefined
                : "발주가 종결(PO_CLOSED)된 뒤에만 등록할 수 있습니다."
            }
            onClick={onOpenPlanModal}
            className="rounded-lg border border-brand-500 bg-white px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-brand-600 dark:bg-gray-800 dark:text-brand-400"
          >
            생산 계획 만들기
          </button>
        )
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[12rem] flex-1">
          {!canCreate ? (
            <p className="text-theme-xs text-amber-700 dark:text-amber-400/90">
              발주가 종결(PO_CLOSED)된 뒤에만 생산 계획을 등록할 수 있습니다.
            </p>
          ) : null}
        </div>
      </div>

      <div className={isDashboard ? "mt-0" : "mt-4"}>
        {isLoading ? (
          <div className="flex min-h-[120px] items-center justify-center py-4">
            <LoadingLottie />
          </div>
        ) : isError ? (
          <p className="text-theme-sm text-red-600 dark:text-red-400">
            {error instanceof Error
              ? error.message
              : "생산 계획 목록을 불러오지 못했습니다."}
          </p>
        ) : plans.length === 0 ? (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {canCreate ? (
              <>
                등록된 생산 계획이 없습니다. 생산 계획을 등록하시겠습니까?{" "}
                <button
                  type="button"
                  onClick={onOpenPlanModal}
                  className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                >
                  등록하기
                </button>
              </>
            ) : (
              "등록된 생산 계획이 없습니다."
            )}
          </p>
        ) : (
          <ul className={isDashboard ? "space-y-3" : "space-y-3"}>
            {plans.map((plan) =>
              isDashboard ? (
                <li
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/40 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <CalenderIcon
                      className="mt-0.5 size-[1.125rem] shrink-0 text-gray-400 dark:text-gray-500"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {planListTitle(plan)}
                      </p>
                      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                        생성일{" "}
                        {formatDateYmd(plan.createdAt, { emptyFallback: "-" })}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/order/${purchaseOrderId}/plan/${plan.id}`}
                    className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    상세보기
                    <AngleRightIcon className="size-4" aria-hidden />
                  </Link>
                </li>
              ) : (
                <li
                  key={plan.id}
                  className="rounded-lg border border-gray-100 p-3 dark:border-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/order/${purchaseOrderId}/plan/${plan.id}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {planListTitle(plan)}
                    </Link>
                    <span className="text-theme-sm text-gray-600 dark:text-gray-400">
                      {formatPlanDate(plan)}
                    </span>
                  </div>
                  {plan.remark?.trim() ? (
                    <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                      {plan.remark.trim()}
                    </p>
                  ) : null}
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </ComponentCard>
  );
}
