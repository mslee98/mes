import type { ReactNode } from "react";

export type DetailSummaryMetricProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  badge?: ReactNode;
};

/** 발주·Unit 상세 헤더 하단 요약 지표 셀 */
export function DetailSummaryMetric({
  icon,
  label,
  children,
  badge,
}: DetailSummaryMetricProps) {
  return (
    <div className="flex items-center gap-3 p-4 sm:px-5 sm:py-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-300 sm:size-12">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {badge ? (
          <div className="mt-0.5 flex flex-wrap items-end gap-2">
            <span className="text-sm font-semibold tabular-nums leading-snug text-gray-900 dark:text-white">
              {children}
            </span>
            {badge}
          </div>
        ) : (
          <div className="mt-0.5 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
