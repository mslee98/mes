import type { ProductionPlan } from "../../api/purchaseOrder";
import { formatDateTimeKo } from "../../lib/dateFormat";
import Badge from "../ui/badge/Badge";

type ProductionPlanDetailSummaryTabProps = {
  plan: ProductionPlan;
};

export function ProductionPlanDetailSummaryTab({
  plan,
}: ProductionPlanDetailSummaryTabProps) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-3 text-theme-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">계획 ID</dt>
          <dd className="mt-0.5 font-mono text-theme-xs text-gray-800 dark:text-white/90">
            {plan.id}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">계획번호</dt>
          <dd className="mt-0.5 text-gray-800 dark:text-white/90">
            {plan.planNo ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">제목</dt>
          <dd className="mt-0.5 text-gray-800 dark:text-white/90">
            {plan.title?.trim() || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">상태</dt>
          <dd className="mt-0.5">
            {plan.status ? (
              <Badge size="sm" color="primary">
                {plan.status}
              </Badge>
            ) : (
              <span className="text-gray-800 dark:text-white/90">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">담당자</dt>
          <dd className="mt-0.5 text-gray-800 dark:text-white/90">
            {plan.productionManager?.name?.trim() ||
              (plan.productionManagerId != null
                ? `#${plan.productionManagerId}`
                : "—")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-gray-500 dark:text-gray-400">비고</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-gray-800 dark:text-white/90">
            {plan.remark?.trim() || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">등록일시</dt>
          <dd className="mt-0.5 text-gray-800 dark:text-white/90">
            {formatDateTimeKo(plan.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">수정일시</dt>
          <dd className="mt-0.5 text-gray-800 dark:text-white/90">
            {formatDateTimeKo(plan.updatedAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
