/**
 * 발주·납품 맥락의 납품 처리 단계 가로 스테퍼 (발주 상세 상단에 두었던 UI를 납품 상세로 이동).
 * 단계 라벨·진행률은 호출부에서 `DELIVERY_STATUS` 공통 코드와 납품 `status`를 반영해 넘긴다.
 */

export function DeliverySummaryStepper({
  completedCount,
  stepDetails,
  stepLabels,
}: {
  completedCount: number;
  stepDetails: string[];
  stepLabels: readonly string[];
}) {
  const n = stepLabels.length;
  if (n === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-gray-200 bg-gray-50/90 px-2 py-5 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:px-4"
      role="list"
      aria-label="납품 처리 단계"
    >
      <div className="flex w-full items-start justify-between gap-0">
        {stepLabels.map((label, i) => {
          const done = i < completedCount;
          const lineLeftDone = i > 0 && i < completedCount;
          const lineRightDone = i < n - 1 && i < completedCount - 1;
          return (
            <div
              key={`${label}-${i}`}
              role="listitem"
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              <div className="flex w-full items-center">
                <div
                  className={`h-0.5 min-w-0 flex-1 rounded-full ${
                    i === 0
                      ? "bg-transparent"
                      : lineLeftDone
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-gray-200 dark:bg-slate-600"
                  }`}
                  aria-hidden
                />
                <div
                  className={`mx-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 sm:mx-1 sm:h-9 sm:w-9 ${
                    done
                      ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                      : "border-gray-300 bg-white text-gray-300 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  {done ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <path
                        d="M6 12.5 10.5 17 18 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div
                  className={`h-0.5 min-w-0 flex-1 rounded-full ${
                    i === n - 1
                      ? "bg-transparent"
                      : lineRightDone
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-gray-200 dark:bg-slate-600"
                  }`}
                  aria-hidden
                />
              </div>
              <div className="mt-2 flex w-full flex-col items-center">
                <p
                  className={`w-full px-0.5 text-center text-[10px] font-medium leading-tight sm:text-xs ${
                    done
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {label}
                </p>
                <div className="hidden min-h-[1.125rem] w-full sm:block">
                  {stepDetails[i] ? (
                    <p className="mt-0.5 w-full px-0.5 text-center text-[9px] leading-tight text-gray-500 dark:text-slate-400 sm:text-[10px]">
                      {stepDetails[i]}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
