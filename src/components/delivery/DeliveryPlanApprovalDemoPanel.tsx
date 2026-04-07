import { useEffect, useState } from "react";
import type { CommonCodeItem } from "../../api/commonCode";
import ComponentCard from "../common/ComponentCard";
import Badge from "../ui/badge/Badge";
import LoadingLottie from "../common/LoadingLottie";
import { deliveryStatusIndexInSorted } from "./deliveryStepperUtils";

const DELIVERY_PLAN_WIRE_DEMO_PREFIX = "deliveryPlanWireDemo";

function planWireStorageKey(deliveryId: number): string {
  return `${DELIVERY_PLAN_WIRE_DEMO_PREFIX}:${deliveryId}`;
}

function readPlanPhase(deliveryId: number): number {
  try {
    const raw = sessionStorage.getItem(planWireStorageKey(deliveryId));
    const n = raw != null ? Number(raw) : 0;
    if (Number.isInteger(n) && n >= 0 && n <= 3) return n;
  } catch {
    /* ignore */
  }
  return 0;
}

function labelForCode(sortedCodes: CommonCodeItem[], code: string | undefined | null): string {
  const c = String(code ?? "").trim();
  if (!c) return "미지정";
  const hit = sortedCodes.find((x) => x.code === c);
  return (hit?.name ?? "").trim() || c;
}

/** phase: 0 시작, 1 계획 완료, 2 상신 완료, 3 승인 완료 */
type WireDemoPhase = 0 | 1 | 2 | 3;

/** 계획·결재 줄과 동일: 완료 시 원+체크, 현재 단계는 브랜드 원+번호, 대기는 회색 원+번호 */
function RoundStepMarker({ stepNumber, done, isCurrent }: { stepNumber: number; done: boolean; isCurrent: boolean }) {
  if (done) {
    return (
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
        aria-hidden
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 12.5 10.5 17 18 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (isCurrent) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 bg-brand-50 text-xs font-bold text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300">
        {stepNumber}
      </span>
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-50 text-xs font-bold text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
      {stepNumber}
    </span>
  );
}

function StepCircle({ step, phase }: { step: 1 | 2 | 3; phase: WireDemoPhase }) {
  const done = phase >= step;
  const isCurrent = phase === step - 1 && phase < 3;
  return <RoundStepMarker stepNumber={step} done={done} isCurrent={isCurrent} />;
}

export function DeliveryPlanApprovalDemoPanel({
  deliveryId,
  sortedCodes,
  codesLoading,
  serverStatus,
  simCode,
  onSimChange,
}: {
  deliveryId: number;
  sortedCodes: CommonCodeItem[];
  codesLoading: boolean;
  serverStatus: string | undefined;
  simCode: string | null;
  onSimChange: (code: string | null) => void;
}) {
  const [planPhase, setPlanPhase] = useState<WireDemoPhase>(0);

  useEffect(() => {
    setPlanPhase(readPlanPhase(deliveryId) as WireDemoPhase);
  }, [deliveryId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(planWireStorageKey(deliveryId), String(planPhase));
    } catch {
      /* ignore */
    }
  }, [planPhase, deliveryId]);

  const btnPrimary =
    "inline-flex items-center justify-center rounded-lg bg-brand-500 px-3 py-2 text-theme-xs font-medium text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-brand-600 dark:hover:bg-brand-500";
  const btnSecondary =
    "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.04]";

  const panelClass = (highlight: boolean) =>
    `min-w-0 flex-1 rounded-lg border p-4 shadow-sm dark:bg-gray-900/40 ${
      highlight
        ? "border-brand-300 bg-brand-50/50 dark:border-brand-600/40 dark:bg-brand-500/10"
        : "border-gray-200 bg-white dark:border-gray-700"
    }`;

  const label = "text-theme-xs font-medium text-gray-500 dark:text-gray-400";
  const placeholder = "mt-0.5 font-mono text-theme-xs text-gray-400 dark:text-gray-500";

  const effectiveStatus = simCode?.trim() ? simCode.trim() : serverStatus;
  const statusIdx = deliveryStatusIndexInSorted(effectiveStatus, sortedCodes);
  const nStatus = sortedCodes.length;
  const atLastStatus = nStatus > 0 && statusIdx >= nStatus - 1;
  const atFirstStatus = statusIdx <= 0;

  const advanceStatus = () => {
    if (statusIdx < 0 && nStatus > 0) {
      onSimChange(sortedCodes[0].code);
      return;
    }
    if (statusIdx >= 0 && statusIdx < nStatus - 1) {
      onSimChange(sortedCodes[statusIdx + 1].code);
    }
  };

  const goBackStatus = () => {
    if (statusIdx <= 0) return;
    onSimChange(sortedCodes[statusIdx - 1].code);
  };

  const resetPlanOnly = () => {
    setPlanPhase(0);
    try {
      sessionStorage.removeItem(planWireStorageKey(deliveryId));
    } catch {
      /* ignore */
    }
  };

  const resetAllDemo = () => {
    onSimChange(null);
    resetPlanOnly();
  };

  const segmentClass = (afterStep: 1 | 2) =>
    `mt-2 w-px flex-1 min-h-[1.5rem] ${planPhase >= afterStep ? "bg-blue-600 dark:bg-blue-500" : "bg-gray-200 dark:bg-gray-600"}`;

  return (
    <ComponentCard
      title="납품 계획 · 결재 처리"
      collapsible
      defaultCollapsed={false}
      headerEnd={
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="rounded-md bg-sky-100 px-2 py-0.5 text-theme-xs font-medium text-sky-900 dark:bg-sky-500/20 dark:text-sky-200">
            개요 탭 연동
          </span>
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-theme-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
            UI 시연 · 미저장
          </span>
        </span>
      }
    >
      <div className="mb-6 rounded-lg border border-dashed border-amber-300/90 bg-gradient-to-br from-amber-50/80 via-white to-sky-50/50 px-3 py-2.5 text-theme-xs leading-relaxed text-gray-800 dark:border-amber-600/40 dark:from-amber-500/10 dark:via-white/[0.02] dark:to-sky-500/10 dark:text-gray-100">
        <strong className="font-medium text-gray-900 dark:text-white">DELIVERY_STATUS</strong> 공통코드 순서는 개요 탭{" "}
        <strong className="font-medium">납품 진행 단계</strong> 스테퍼·진행률과 같습니다. 아래 첫 구간에서 단계를
        옮기면 개요와 동일하게 반영됩니다. 이어지는{" "}
        <strong className="font-medium">계획·결재·승인</strong> 블록은 상세 필드 와이어이며, 상태 시연과 별도로
        로컬(sessionStorage)만 씁니다. 서버 PATCH는 없습니다.
      </div>

      <section aria-label="납품 진행 단계 DELIVERY_STATUS">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">납품 진행 (공통코드)</h3>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          정렬된 상태 코드별 타임라인과 시연 버튼입니다.
        </p>

        {codesLoading ? (
          <div className="flex min-h-[100px] items-center justify-center py-6">
            <LoadingLottie />
          </div>
        ) : nStatus === 0 ? (
          <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
            납품 상태 공통코드를 불러올 수 없어 단계를 표시하지 못했습니다.
          </p>
        ) : (
          <>
            <dl className="mt-3 grid gap-2 text-theme-sm sm:grid-cols-2">
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">서버 저장 상태</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {labelForCode(sortedCodes, serverStatus)}
                  {serverStatus?.trim() ? (
                    <span className="ml-1 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                      ({serverStatus.trim()})
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">화면 적용 (스테퍼·진행률)</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {labelForCode(sortedCodes, effectiveStatus)}
                  {simCode?.trim() ? (
                    <span className="ml-2 inline-block align-middle">
                      <Badge size="sm" color="warning">
                        시연 오버레이
                      </Badge>
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">단계 위치</dt>
                <dd className="text-gray-800 dark:text-gray-100">
                  {statusIdx >= 0 ? (
                    <>
                      {statusIdx + 1} / {nStatus} 단계
                    </>
                  ) : (
                    "목록에 없는 상태 코드입니다. 시연으로 첫 단계를 맞출 수 있습니다."
                  )}
                </dd>
              </div>
            </dl>

            <div
              className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-4 shadow-sm dark:border-gray-700 dark:bg-slate-900/40 sm:px-4"
              role="list"
              aria-label="납품 상태 단계"
            >
              <ol className="space-y-0">
                {sortedCodes.map((c, i) => {
                  const done = statusIdx >= 0 && i < statusIdx;
                  const isCurrent = statusIdx >= 0 && i === statusIdx;
                  const isLast = i === nStatus - 1;
                  const lineDone = i < statusIdx;
                  const title = (c.name ?? "").trim() || c.code;

                  return (
                    <li
                      key={c.id ?? c.code}
                      role="listitem"
                      className="flex gap-3 sm:gap-4"
                      aria-label={`${title}, ${isCurrent ? "현재 단계" : done ? "완료" : "대기"}`}
                    >
                      <div className="flex flex-col items-center pt-1">
                        <RoundStepMarker stepNumber={i + 1} done={done} isCurrent={isCurrent} />
                        {!isLast ? (
                          <span
                            className={`mt-2 w-px flex-1 min-h-[1.5rem] ${
                              lineDone ? "bg-blue-600 dark:bg-blue-500" : "bg-gray-200 dark:bg-gray-600"
                            }`}
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      <div
                        className={`min-w-0 flex-1 rounded-lg px-2 py-1 sm:px-0 sm:py-0 ${
                          isCurrent ? "bg-brand-50 dark:bg-brand-500/15" : ""
                        } ${isLast ? "pb-0" : "pb-4 sm:pb-5"}`}
                      >
                        <p
                          className={`text-theme-sm font-medium leading-snug ${
                            isCurrent
                              ? "text-brand-900 dark:text-brand-100"
                              : done
                                ? "text-blue-800 dark:text-blue-300"
                                : "text-gray-500 dark:text-slate-400"
                          }`}
                        >
                          {title}
                          {isCurrent ? (
                            <span className="ml-2 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
                              ← 현재
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-gray-400 dark:text-gray-500 sm:text-theme-xs">
                          {c.code}
                        </p>
                        {/* 단계별 보조 필드 (와이어) */}
                        <dl className="mt-2 grid gap-2 border-t border-gray-100 pt-2 text-theme-xs dark:border-white/[0.06] sm:grid-cols-2">
                          <div>
                            <dt className={label}>처리 일시</dt>
                            <dd className={placeholder}>{`statusAt_${c.code}`}</dd>
                          </div>
                          <div>
                            <dt className={label}>처리자</dt>
                            <dd className={placeholder}>{`actor_${c.code}`}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className={label}>메모 / 비고</dt>
                            <dd className={placeholder}>{`remark_${c.code}`}</dd>
                          </div>
                        </dl>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={nStatus === 0 || atLastStatus} onClick={advanceStatus}>
                {statusIdx < 0 ? "첫 단계로 맞추기" : "다음 단계로"}
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={atFirstStatus || nStatus === 0}
                onClick={goBackStatus}
              >
                이전 단계
              </button>
              <button type="button" className={btnSecondary} disabled={simCode == null} onClick={() => onSimChange(null)}>
                서버 상태로 되돌리기
              </button>
            </div>
          </>
        )}
      </section>

      <div className="my-8 border-t border-gray-200 dark:border-gray-700" aria-hidden />

      <section aria-label="계획 결재 승인 와이어">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">계획 · 결재 · 승인 (상세 필드)</h3>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          현장 계획 수립 → 결재 상신 → 승인 흐름의 확장 필드 골격입니다. 위 진행 단계와 별도의 로컬 시연 단계입니다.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-theme-xs text-gray-600 dark:text-gray-300">
          <span>
            계획·결재 시연 단계:{" "}
            <strong className="text-gray-900 dark:text-white">
              {planPhase === 0 ? "시작 전" : planPhase === 1 ? "계획 완료" : planPhase === 2 ? "상신 완료" : "승인 완료"}
            </strong>
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={resetPlanOnly}>
              계획 시연만 초기화
            </button>
            <button type="button" className={btnSecondary} onClick={resetAllDemo}>
              납품 상태·계획 모두 초기화
            </button>
          </div>
        </div>

        <div className="relative mt-4 space-y-0 pl-2 sm:pl-0">
          <ol className="space-y-6">
            <li className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center pt-1">
                <StepCircle step={1} phase={planPhase} />
                <span className={segmentClass(1)} aria-hidden />
              </div>
              <div className={panelClass(planPhase === 0)}>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">납품 계획 수립</h4>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  일정·라인 수량·특이사항 등 현장 기준으로 확정
                </p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className={label}>완료 일시</dt>
                    <dd className={placeholder}>{`planCompletedAt`}</dd>
                  </div>
                  <div>
                    <dt className={label}>담당자</dt>
                    <dd className={placeholder}>{`planCompletedBy`}</dd>
                  </div>
                  <div>
                    <dt className={label}>계획 문서번호</dt>
                    <dd className={placeholder}>{`planDocumentNo`}</dd>
                  </div>
                  <div>
                    <dt className={label}>납품 예정 창고/도크</dt>
                    <dd className={placeholder}>{`plannedWarehouseOrDock`}</dd>
                  </div>
                  <div>
                    <dt className={label}>라인별 납품 수량 요약</dt>
                    <dd className={placeholder}>{`lineQtySummary`}</dd>
                  </div>
                  <div>
                    <dt className={label}>현장 점검 결과</dt>
                    <dd className={placeholder}>{`siteCheckResult`}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className={label}>현장 특이사항</dt>
                    <dd className={placeholder}>{`siteNotes`}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className={label}>첨부·참조 링크</dt>
                    <dd className={placeholder}>{`attachmentRefs`}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={planPhase >= 1}
                    onClick={() => setPlanPhase(1)}
                  >
                    계획 수립 완료
                  </button>
                </div>
              </div>
            </li>

            <li className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center pt-1">
                <StepCircle step={2} phase={planPhase} />
                <span className={segmentClass(2)} aria-hidden />
              </div>
              <div className={panelClass(planPhase === 1)}>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">결재 요청</h4>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  계획안 상신 · 결재선/문서번호는 도메인에 맞게 표시
                </p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className={label}>상신 일시</dt>
                    <dd className={placeholder}>{`approvalSubmittedAt`}</dd>
                  </div>
                  <div>
                    <dt className={label}>상신자</dt>
                    <dd className={placeholder}>{`submittedBy`}</dd>
                  </div>
                  <div>
                    <dt className={label}>결재 문서번호</dt>
                    <dd className={placeholder}>{`approvalDocumentNo`}</dd>
                  </div>
                  <div>
                    <dt className={label}>긴급 여부</dt>
                    <dd className={placeholder}>{`urgentFlag`}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className={label}>결재선 요약</dt>
                    <dd className={placeholder}>{`approvalLineSummary`}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className={label}>상신 코멘트 / 비고</dt>
                    <dd className={placeholder}>{`submitComment`}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={planPhase !== 1}
                    onClick={() => setPlanPhase(2)}
                  >
                    결재 상신
                  </button>
                </div>
              </div>
            </li>

            <li className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center pt-1">
                <StepCircle step={3} phase={planPhase} />
              </div>
              <div className={panelClass(planPhase === 2)}>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">승인 완료</h4>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  최종 승인 후 다음 공정(제작·출고 등)으로 이어짐
                </p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className={label}>승인 일시</dt>
                    <dd className={placeholder}>{`approvalApprovedAt`}</dd>
                  </div>
                  <div>
                    <dt className={label}>승인자</dt>
                    <dd className={placeholder}>{`approvedBy`}</dd>
                  </div>
                  <div>
                    <dt className={label}>결재 결과</dt>
                    <dd className={placeholder}>{`approvalOutcome`}</dd>
                  </div>
                  <div>
                    <dt className={label}>다음 공정 안내</dt>
                    <dd className={placeholder}>{`nextProcessHint`}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className={label}>승인 의견</dt>
                    <dd className={placeholder}>{`approverComment`}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className={label}>반려 시 사유 (해당 시)</dt>
                    <dd className={placeholder}>{`rejectionReason`}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={planPhase !== 2}
                    onClick={() => setPlanPhase(3)}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={planPhase !== 2}
                    onClick={() => setPlanPhase(1)}
                  >
                    반려 (계획 단계로 되돌림)
                  </button>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </ComponentCard>
  );
}
