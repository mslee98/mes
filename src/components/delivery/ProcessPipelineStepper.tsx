import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CommonCodeItem } from "../../api/commonCode";
import type { DeliveryPlanUnit } from "../../api/purchaseOrder";
import { labelForProcessCode } from "../../lib/deliveryPlanProcessLabels";
import {
  findProcessStepIndex,
  orderedUnitProcessSteps,
} from "../../lib/deliveryPlanProcessSequence";

type ProcessPipelineRowState = "done" | "current" | "pending";

function rowState(globalIndex: number, currentIndex: number): ProcessPipelineRowState {
  if (currentIndex < 0) return "pending";
  if (globalIndex < currentIndex) return "done";
  if (globalIndex === currentIndex) return "current";
  return "pending";
}

export interface ProcessPipelineStepperProps {
  unit: DeliveryPlanUnit | null;
  stepCodes: CommonCodeItem[];
}

/**
 * 공정 표준 순서 기준 세로 스테퍼 — 완료 / 진행중 / 대기, 연결선, 현재·다음 원형 펄스.
 * 약 4단계 높이만 보이는 뷰포트(스크롤바 숨김) + 상·하단 페이드로 위·아래에 더 있음을 표시합니다.
 */
export function ProcessPipelineStepper({ unit, stepCodes }: ProcessPipelineStepperProps) {
  const ordered = useMemo(() => orderedUnitProcessSteps(stepCodes), [stepCodes]);
  const orderedKey = useMemo(() => ordered.map((s) => s.code).join(","), [ordered]);
  const currentIndex = useMemo(
    () => findProcessStepIndex(unit?.currentProcessCode, ordered),
    [unit?.currentProcessCode, ordered]
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLLIElement | null>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const updateFadeEdges = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const edge = 4;
    setFadeTop(scrollTop > edge);
    setFadeBottom(scrollTop + clientHeight < scrollHeight - edge);
  }, []);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const sync = () => {
      if (currentIndex >= 0) {
        currentRowRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
      }
      updateFadeEdges();
    };

    requestAnimationFrame(sync);

    const ro = new ResizeObserver(() => updateFadeEdges());
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentIndex, unit?.id, unit?.currentProcessCode, orderedKey, updateFadeEdges]);

  if (ordered.length === 0) {
    return (
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        등록된 공정 단계(공통코드)가 없어 로드맵을 표시할 수 없습니다.
      </p>
    );
  }

  return (
    <div className="rounded-2xl bg-white px-1 py-2 dark:bg-gray-900/40 sm:px-2">
      {currentIndex < 0 && unit?.currentProcessCode?.trim() ? (
        <p className="mb-3 text-theme-xs text-amber-700 dark:text-amber-400">
          현재 공정 코드가 표준 순서에 없습니다. 아래는 표준 순서의 전체 단계입니다.
        </p>
      ) : null}
      <div className="relative rounded-xl">
        <div
          ref={viewportRef}
          onScroll={updateFadeEdges}
          title="휠 또는 스와이프로 위·아래 공정을 볼 수 있습니다"
          className="process-pipeline-viewport-scroll max-h-[min(18rem,44vh)] overflow-y-auto overscroll-contain px-1 sm:max-h-[min(19.5rem,40vh)]"
        >
          <ol className="space-y-0 py-3">
            {ordered.map((step, globalIdx) => {
              const state = rowState(globalIdx, currentIndex);
              const label =
                labelForProcessCode(step.code, stepCodes) ||
                step.name?.trim() ||
                step.code;
              const stepNum = globalIdx + 1;
              const isLast = globalIdx === ordered.length - 1;
              const connectorSolid = state === "done";

              const statusText =
                state === "done" ? "완료" : state === "current" ? "진행중" : "대기";
              const statusClass =
                state === "done"
                  ? "text-success-600 dark:text-success-500"
                  : state === "current"
                    ? "font-medium text-brand-600 dark:text-brand-400"
                    : "text-gray-400 dark:text-gray-500";

              const isCurrent = state === "current";
              const isNext = globalIdx === currentIndex + 1 && currentIndex >= 0;
              const pulseClass = isCurrent
                ? "process-pipeline-node-pulse-strong"
                : isNext
                  ? "process-pipeline-node-pulse-soft"
                  : "";

              return (
                <li
                  key={`${globalIdx}-${String(step.code)}`}
                  ref={isCurrent ? currentRowRef : undefined}
                  className="flex gap-3 sm:gap-4"
                >
                  <div className="flex w-11 shrink-0 flex-col items-center pt-0.5 sm:w-12">
                    {state === "done" ? (
                      <div
                        className="relative z-1 flex h-9 w-9 items-center justify-center rounded-full bg-success-500 text-white shadow-theme-xs sm:h-10 sm:w-10"
                        aria-hidden
                      >
                        <svg
                          className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 12.5L10 17L19 7"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div
                        className={`relative z-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold sm:h-10 sm:w-10 sm:text-base ${
                          isCurrent
                            ? "bg-brand-500 text-white"
                            : "border border-gray-200 bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-400"
                        } ${pulseClass}`}
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        {stepNum}
                      </div>
                    )}
                    {!isLast ? (
                      <div
                        className={`mt-1 flex min-h-5 shrink-0 flex-col items-center sm:min-h-6 ${
                          connectorSolid ? "w-[3px]" : "w-0"
                        }`}
                        aria-hidden
                      >
                        <div
                          className={
                            connectorSolid
                              ? "min-h-5 w-[3px] flex-1 rounded-full bg-success-500 sm:min-h-6"
                              : "min-h-5 flex-1 border-l-2 border-dashed border-gray-300 dark:border-gray-600 sm:min-h-6"
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                <div
                  className={`flex min-w-0 flex-1 items-start justify-between gap-3 pb-5 pt-0.5 ${
                    isLast ? "pb-1.5" : ""
                  }`}
                >
                    <span
                      className={`min-w-0 break-words text-theme-sm leading-snug ${
                        state === "pending"
                          ? "text-gray-400 dark:text-gray-500"
                          : "font-medium text-gray-900 dark:text-white"
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`shrink-0 whitespace-nowrap text-theme-xs sm:text-theme-sm ${statusClass}`}
                    >
                      {statusText}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        {fadeTop ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-1 h-7 bg-gradient-to-b from-white/75 to-transparent dark:from-gray-950/80"
            aria-hidden
          />
        ) : null}
        {fadeBottom ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-7 bg-gradient-to-t from-white/75 to-transparent dark:from-gray-950/80"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
