import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { notify } from "../../lib/notify";
import type { ProductionPlanUnit, UnitProcessRecord } from "../../api/purchaseOrder";
import { UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING } from "../../api/commonCode";
import Badge from "../ui/badge/Badge";
import { formatDateTimeKo } from "../../lib/format/dateFormat";
import { normalizeUnitProcessRecordAttachments } from "../../domains/production-plan/helpers/unitProcessRecordAttachments";
import { ProcessHistoryAttachmentRow } from "./ProcessHistoryAttachmentRow";
import FileUploadDropzone from "../form/FileUploadDropzone";

function detectorSerialFromProcessRecord(record: UnitProcessRecord): string {
  const o = record as unknown as Record<string, unknown>;
  for (const key of [
    "detectorSerialNo",
    "detectorSerial",
    "detectorSerialNumber",
    "serialNo",
  ]) {
    const v = o[key];
    if (v != null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function detectorSerialFromUnit(unit: ProductionPlanUnit | null | undefined): string {
  if (!unit) return "";
  const direct = String(unit.detectorSerialNo ?? "").trim();
  if (direct) return direct;
  const d = unit.detector;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    for (const key of [
      "serialNo",
      "serialNumber",
      "sn",
      "detectorSerialNo",
      "detectorSerial",
      "detectorSerialNumber",
    ]) {
      const v = o[key];
      if (v != null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
  }
  return "";
}

function remarkFromProcessRecord(record: UnitProcessRecord): string {
  const o = record as unknown as Record<string, unknown>;
  for (const key of ["remark", "comment", "memo", "note", "actionTaken"]) {
    const v = o[key];
    if (v != null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

export interface UnitProcessRecordsTimelineProps {
  records: UnitProcessRecord[];
  isLoading: boolean;
  unit: ProductionPlanUnit | null;
  accessToken: string | null;
  /** 뷰포트 최대 높이 Tailwind 클래스 */
  viewportClassName?: string;
  onUploadAttachments?: (recordId: string, files: File[]) => Promise<void>;
  uploadingRecordKey?: string | null;
}

function recordUploadKey(
  unitId: string | null | undefined,
  recordId: string | number | null | undefined
): string {
  const uid = String(unitId ?? "").trim();
  const rid = String(recordId ?? "").trim();
  return uid && rid ? `${uid}:${rid}` : "";
}

/**
 * 공정 PASS/FAIL 이력을 세로 타임라인으로 표시. 스크롤 + 상·하단 페이드.
 */
export function UnitProcessRecordsTimeline({
  records,
  isLoading,
  unit,
  accessToken,
  viewportClassName = "max-h-[min(14rem,36vh)] sm:max-h-[min(16rem,32vh)]",
  onUploadAttachments,
  uploadingRecordKey = null,
}: UnitProcessRecordsTimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);
  const [openUploadRecordKey, setOpenUploadRecordKey] = useState<string | null>(
    null
  );

  const recordsKey = useMemo(
    () =>
      records
        .map((r) => `${r.id ?? ""}-${r.processSeq ?? ""}-${r.processCode ?? ""}`)
        .join("|"),
    [records]
  );

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
    requestAnimationFrame(() => updateFadeEdges());
    const ro = new ResizeObserver(() => updateFadeEdges());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recordsKey, isLoading, updateFadeEdges]);

  useEffect(() => {
    setOpenUploadRecordKey(null);
  }, [recordsKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6 text-theme-xs text-gray-500 dark:text-gray-400">
        이력을 불러오는 중…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        등록된 공정 이력이 없습니다.
      </p>
    );
  }

  return (
    <div className="relative rounded-xl">
      <div
        ref={viewportRef}
        onScroll={updateFadeEdges}
        title="휠 또는 스와이프로 전체 이력을 볼 수 있습니다"
        className={`process-pipeline-viewport-scroll overflow-y-auto overscroll-contain px-0.5 py-2 ${viewportClassName}`}
      >
        <ol className="relative space-y-0">
          {records.map((r, idx) => {
            const isLast = idx === records.length - 1;
            const currentUploadKey = recordUploadKey(unit?.id, r.id);
            const canUpload =
              Boolean(onUploadAttachments) &&
              currentUploadKey !== "" &&
              accessToken != null;
            const isUploadOpen = canUpload && openUploadRecordKey === currentUploadKey;
            const isUploadingThis = currentUploadKey !== "" &&
              uploadingRecordKey === currentUploadKey;
            const isDetectorIncomingRecord =
              String(r.processCode ?? "").trim().toUpperCase() ===
              UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING;
            const recordAttachments = normalizeUnitProcessRecordAttachments(
              r as unknown as Record<string, unknown>
            );
            const detectorSerialText =
              detectorSerialFromProcessRecord(r) || detectorSerialFromUnit(unit);
            const remarkText = remarkFromProcessRecord(r);
            const result = String(r.result ?? "").toUpperCase();
            const dotClass =
              result === "FAIL"
                ? "bg-red-500 ring-2 ring-red-500/25"
                : result === "PASS"
                  ? "bg-success-500 ring-2 ring-success-500/25"
                  : "bg-gray-300 ring-2 ring-gray-300/30 dark:bg-gray-600 dark:ring-gray-600/30";
            const lineClass =
              result === "FAIL"
                ? "bg-red-200/90 dark:bg-red-900/40"
                : result === "PASS"
                  ? "bg-success-200/90 dark:bg-success-900/35"
                  : "bg-gray-200 dark:bg-gray-700";

            return (
              <li key={recordKey(r, idx)} className="flex gap-3 sm:gap-4">
                <div className="flex w-9 shrink-0 flex-col items-center pt-1 sm:w-10">
                  <div
                    className={`relative z-1 size-3 shrink-0 rounded-full ${dotClass}`}
                    aria-hidden
                  />
                  {!isLast ? (
                    <div
                      className={`mt-1 min-h-4 w-0.5 flex-1 rounded-full ${lineClass}`}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div
                  className={`min-w-0 flex-1 rounded-lg border border-gray-100 bg-gray-50/80 p-2.5 text-theme-sm text-gray-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/90 sm:p-3 ${
                    isLast ? "mb-0" : "mb-3"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      #{r.processSeq ?? idx + 1}{" "}
                      {r.processName ?? r.processCode ?? ""}
                    </span>
                    {r.result === "FAIL" ? (
                      <Badge size="sm" color="error">
                        FAIL
                      </Badge>
                    ) : r.result === "PASS" ? (
                      <Badge size="sm" color="success">
                        PASS
                      </Badge>
                    ) : (
                      <Badge size="sm" color="light">
                        {r.result ?? "—"}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                    {formatDateTimeKo(r.startedAt)} ~ {formatDateTimeKo(r.endedAt)}
                  </div>
                  {r.failReason ? (
                    <p className="mt-1 text-theme-xs text-red-700 dark:text-red-400">
                      사유: {r.failReason}
                    </p>
                  ) : null}
                  {remarkText ? (
                    <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-400">
                      비고: {remarkText}
                    </p>
                  ) : null}
                  {isDetectorIncomingRecord && detectorSerialText ? (
                    <p className="mt-1 text-theme-xs text-gray-700 dark:text-gray-300">
                      검출기 S/N: {detectorSerialText}
                    </p>
                  ) : null}
                  {recordAttachments.length > 0 || canUpload ? (
                    <div className="mt-2 border-t border-gray-100 pt-2 dark:border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                          첨부
                        </p>
                        {canUpload ? (
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-theme-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            disabled={uploadingRecordKey != null}
                            onClick={() =>
                              setOpenUploadRecordKey((prev) =>
                                prev === currentUploadKey ? null : currentUploadKey
                              )
                            }
                          >
                            {isUploadingThis
                              ? "업로드 중…"
                              : isUploadOpen
                                ? "첨부 닫기"
                                : "첨부 추가"}
                          </button>
                        ) : null}
                      </div>
                      {recordAttachments.length > 0 ? (
                        <ul className="mt-1 space-y-2">
                          {recordAttachments.map((a) => (
                            <ProcessHistoryAttachmentRow
                              key={a.key}
                              attachment={a}
                              accessToken={accessToken}
                            />
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                          첨부파일이 없습니다.
                        </p>
                      )}
                      {canUpload && isUploadOpen ? (
                        <div className="mt-2">
                          <FileUploadDropzone
                            onSelectFiles={async (files) => {
                              if (!onUploadAttachments || r.id == null) return;
                              try {
                                await onUploadAttachments(String(r.id), files);
                                setOpenUploadRecordKey(null);
                              } catch {
                                // 에러 토스트는 상위 mutation에서 처리합니다.
                              }
                            }}
                            onError={(message) => notify.error(message)}
                            disabled={uploadingRecordKey != null}
                            buttonLabel={isUploadingThis ? "업로드 중…" : "파일 선택"}
                            uploadGuideText="이 공정 이력에 첨부할 파일을 선택하세요."
                            className="mt-1"
                            maxFiles={10}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {fadeTop ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-1 h-7 bg-gradient-to-b from-white to-transparent dark:from-gray-900"
          aria-hidden
        />
      ) : null}
      {fadeBottom ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-7 bg-gradient-to-t from-white to-transparent dark:from-gray-900"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function recordKey(r: UnitProcessRecord, idx: number): string {
  if (r.id != null) return String(r.id);
  return `${r.processSeq ?? idx}-${r.processCode ?? ""}-${idx}`;
}
