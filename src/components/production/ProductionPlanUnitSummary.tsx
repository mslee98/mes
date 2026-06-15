import Badge from "../ui/badge/Badge";
import type { ProductionPlanUnitSummary as UnitSummary } from "../../api/purchaseOrder";

type ProductionPlanUnitSummaryProps = {
  summary?: UnitSummary | null;
};

export function unitSummaryCount(
  summary: UnitSummary | null | undefined,
  key: keyof UnitSummary
): number {
  const v = summary?.[key];
  return Number(v) || 0;
}

/** 진행 유닛(대기 제외) / 전체 — 목록·콜랩스 `4 / 15` 표기 */
export function formatPlanUnitProgressRatio(
  summary?: UnitSummary | null
): { label: string; progressed: number; total: number } {
  const total = unitSummaryCount(summary, "total");
  if (total <= 0) {
    return { label: "—", progressed: 0, total: 0 };
  }
  const waiting = unitSummaryCount(summary, "waiting");
  const progressed = Math.max(0, total - waiting);
  return { label: `${progressed} / ${total}`, progressed, total };
}

type ProductionPlanUnitCountRatioProps = {
  summary?: UnitSummary | null;
  className?: string;
};

/** 계획 목록 유닛 컬럼 — `진행 / 전체` */
export function ProductionPlanUnitCountRatio({
  summary,
  className = "",
}: ProductionPlanUnitCountRatioProps) {
  const { label, progressed, total } = formatPlanUnitProgressRatio(summary);

  if (total <= 0) {
    return (
      <span className={`text-theme-xs text-gray-400 dark:text-gray-500 ${className}`}>
        —
      </span>
    );
  }

  return (
    <span
      className={`inline-block tabular-nums text-theme-sm font-medium text-gray-800 dark:text-gray-200 ${className}`}
      title={`진행 ${progressed} · 전체 ${total}`}
    >
      {label}
    </span>
  );
}

/** 계획 목록 `unitSummary` 뱃지 묶음 (상세·기타 화면용) */
export function ProductionPlanUnitSummaryBadges({
  summary,
}: ProductionPlanUnitSummaryProps) {
  const total = unitSummaryCount(summary, "total");
  const waiting = unitSummaryCount(summary, "waiting");
  const inProgress = unitSummaryCount(summary, "inProgress");
  const deliveryReady = unitSummaryCount(summary, "deliveryReady");
  const completed = unitSummaryCount(summary, "completed");
  const delayed = unitSummaryCount(summary, "delayed");

  if (
    total === 0 &&
    waiting === 0 &&
    inProgress === 0 &&
    deliveryReady === 0 &&
    completed === 0
  ) {
    return (
      <span className="text-theme-xs text-gray-400 dark:text-gray-500">—</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {total > 0 ? (
        <Badge size="sm" variant="solid" color="dark">
          {total}
        </Badge>
      ) : null}
      {waiting > 0 ? (
        <Badge size="sm" color="light">
          대기 {waiting}
        </Badge>
      ) : null}
      {inProgress > 0 ? (
        <Badge size="sm" color="primary">
          진행 {inProgress}
        </Badge>
      ) : null}
      {deliveryReady > 0 ? (
        <Badge size="sm" color="info">
          납품 대기 {deliveryReady}
        </Badge>
      ) : null}
      {completed > 0 ? (
        <Badge size="sm" color="success">
          납품 완료 {completed}
        </Badge>
      ) : null}
      {delayed > 0 ? (
        <Badge size="sm" color="warning">
          지연 {delayed}
        </Badge>
      ) : null}
    </div>
  );
}
