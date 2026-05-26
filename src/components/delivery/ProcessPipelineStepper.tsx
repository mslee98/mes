import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CommonCodeItem } from "../../api/commonCode";
import type { ProductionPlanUnit } from "../../api/purchaseOrder";
import { labelForProcessCode } from "../../lib/productionPlanProcessLabels";
import {
  findProcessStepIndex,
  orderedUnitProcessSteps,
} from "../../lib/productionPlanProcessSequence";

type ProcessPipelineRowState = "done" | "current" | "pending";

function rowState(globalIndex: number, currentIndex: number): ProcessPipelineRowState {
  if (currentIndex < 0) return "pending";
  if (globalIndex < currentIndex) return "done";
  if (globalIndex === currentIndex) return "current";
  return "pending";
}

export type ProcessGateSubmitting = "pass" | "fail" | null;

export interface ProcessPipelineStepperProps {
  unit: ProductionPlanUnit | null;
  stepCodes: CommonCodeItem[];
  /** 현재 공정 행에 PASS/FAIL 조작 UI 표시 */
  interactive?: boolean;
  submitting?: ProcessGateSubmitting;
  failFormOpen?: boolean;
  onFailFormOpenChange?: (open: boolean) => void;
  onPass?: () => void;
}

function ProcessActionCheckbox({
  id,
  label,
  tone,
  disabled,
  busy,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  tone: "pass" | "fail";
  disabled?: boolean;
  busy?: boolean;
  checked?: boolean;
  onToggle: (next: boolean) => void;
}) {
  const toneClass =
    tone === "pass"
      ? "accent-brand-500 text-brand-500 focus:ring-brand-500/20"
      : "accent-red-600 text-red-600 focus:ring-red-500/20";

  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-1.5 text-theme-xs font-medium select-none ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer"
      } ${
        tone === "pass"
          ? "text-brand-600 dark:text-brand-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked ?? false}
        disabled={disabled || busy}
        onChange={(e) => onToggle(e.target.checked)}
        className={`size-4 shrink-0 rounded border-gray-300 dark:border-gray-600 ${toneClass}`}
      />
      <span>{busy ? "처리 중…" : label}</span>
    </label>
  );
}

/**
 * 공정 표준 순서 기준 세로 스테퍼 — 완료 / (인터랙티브) PASS·FAIL / 대기.
 */
export function ProcessPipelineStepper({
  unit,
  stepCodes,
  interactive = false,
  submitting = null,
  failFormOpen = false,
  onFailFormOpenChange,
  onPass,
}: ProcessPipelineStepperProps) {
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

  const isBusy = submitting != null;

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

              const showActions = interactive && isCurrent && onPass;

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
                    className={`flex min-w-0 flex-1 flex-col gap-2 pb-5 pt-0.5 ${
                      isLast ? "pb-1.5" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <span
                        className={`min-w-0 break-words text-theme-sm leading-snug ${
                          state === "pending"
                            ? "text-gray-400 dark:text-gray-500"
                            : "font-medium text-gray-900 dark:text-white"
                        }`}
                      >
                        {label}
                      </span>
                      {showActions ? (
                        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                          <ProcessActionCheckbox
                            id={`process-pass-${unit?.id ?? "unit"}`}
                            label="PASS"
                            tone="pass"
                            disabled={isBusy || failFormOpen}
                            busy={submitting === "pass"}
                            onToggle={(checked) => {
                              if (checked) onPass();
                            }}
                          />
                          <ProcessActionCheckbox
                            id={`process-fail-${unit?.id ?? "unit"}`}
                            label="FAIL"
                            tone="fail"
                            disabled={isBusy}
                            busy={submitting === "fail"}
                            checked={failFormOpen}
                            onToggle={(checked) =>
                              onFailFormOpenChange?.(checked)
                            }
                          />
                        </div>
                      ) : (
                        <span
                          className={`shrink-0 whitespace-nowrap text-theme-xs sm:text-theme-sm ${statusClass}`}
                        >
                          {statusText}
                        </span>
                      )}
                    </div>
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
