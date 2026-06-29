import { useMemo } from "react";
import type { CommonCodeItem } from "../../api/commonCode";
import { TrashBinIcon } from "../../icons";
import { fileTypeIconSrc } from "../../lib/ui/fileTypeIcon";
import Label from "../form/Label";
import FileUploadDropzone from "../form/FileUploadDropzone";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";

import {
  UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING,
  UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER,
  UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING,
} from "../../api/commonCode";
import type { ProductionPlanUnit } from "../../api/purchaseOrder";
import type { FlatPlanUnitRow } from "../../domains/production-plan/helpers/detailHelpers";
import { buildProcessStepCodesForPlanUnitRow } from "../../domains/production-plan/helpers/detailHelpers";
import {
  ProcessPipelineStepper,
  type ProcessGateSubmitting,
} from "./ProcessPipelineStepper";



export interface ProcessGateContextPanelProps {

  unit: ProductionPlanUnit | null;

  flatRow?: FlatPlanUnitRow | null;

  stepCodes: CommonCodeItem[];

  interactive?: boolean;

  submitting?: ProcessGateSubmitting;

  failFormOpen?: boolean;

  onFailFormOpenChange?: (open: boolean) => void;

  onPass?: () => void;

  detectorSerialNo?: string;

  onDetectorSerialNoChange?: (value: string) => void;

  /** 포장(ENGINE_PACKAGING) — 전체 제품 시리얼 */

  productSerialNo?: string;

  onProductSerialNoChange?: (value: string) => void;

  onGenerateProductSerial?: () => void;

  productSerialGenerating?: boolean;

  productSerialAlreadyAssigned?: boolean;

  failReason?: string;
  onFailReasonChange?: (value: string) => void;
  onSubmitFail?: () => void;
  pendingAttachmentFiles?: File[];
  onSelectAttachmentFiles?: (files: File[]) => void;
  onRemoveAttachmentFile?: (index: number) => void;
  onAttachmentError?: (message: string) => void;
}



/**

 * 공정 처리 모달 본문 — 스테퍼 + (검출기 입고 대기) 시리얼 · FAIL 사유 인라인.

 */

export function ProcessGateContextPanel({

  unit,

  flatRow = null,

  stepCodes,

  interactive = false,

  submitting = null,

  failFormOpen = false,

  onFailFormOpenChange,

  onPass,

  detectorSerialNo = "",

  onDetectorSerialNoChange,

  productSerialNo = "",

  onProductSerialNoChange,

  onGenerateProductSerial,

  productSerialGenerating = false,

  productSerialAlreadyAssigned = false,

  failReason = "",
  onFailReasonChange,
  onSubmitFail,
  pendingAttachmentFiles = [],
  onSelectAttachmentFiles,
  onRemoveAttachmentFile,
  onAttachmentError,
}: ProcessGateContextPanelProps) {

  const currentCode = unit?.currentProcessCode?.trim().toUpperCase() ?? "";

  const visibleStepCodes = useMemo(
    () => buildProcessStepCodesForPlanUnitRow(stepCodes, flatRow),
    [stepCodes, flatRow]
  );

  const needsDetectorSerial =

    interactive &&

    currentCode === UNIT_PROCESS_STEP_CODE_WAIT_DETECTOR_INCOMING;

  const needsProductSerial =

    interactive && currentCode === UNIT_PROCESS_STEP_CODE_ENGINE_PACKAGING;

  const isReadyToDeliverStep =

    interactive && currentCode === UNIT_PROCESS_STEP_CODE_READY_TO_DELIVER;



  return (

    <div className="space-y-3">

      <ProcessPipelineStepper

        unit={unit}

        stepCodes={visibleStepCodes}

        interactive={interactive}

        submitting={submitting}

        failFormOpen={failFormOpen}

        onFailFormOpenChange={onFailFormOpenChange}

        onPass={onPass}

      />

      {isReadyToDeliverStep ? (

        <div className="rounded-lg border border-success-200 bg-success-50/60 px-3 py-3 text-theme-sm text-success-800 dark:border-success-900/40 dark:bg-success-950/20 dark:text-success-200">

          PASS 처리 후 바로 납품 등록 단계로 이어집니다.

        </div>

      ) : null}



      {needsDetectorSerial ? (

        <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-3 dark:border-brand-800/50 dark:bg-brand-500/10">

          <Label htmlFor="gate-detector-serial-no" required>

            검출기 시리얼 넘버

          </Label>

          <input

            id="gate-detector-serial-no"

            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-4 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"

            value={detectorSerialNo}

            onChange={(e) => onDetectorSerialNoChange?.(e.target.value)}

            placeholder="예: EIA1DV15WNCA-2505-005"

            disabled={submitting != null}

          />

          <p className="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">

            PASS 선택 시 위 시리얼이 함께 저장됩니다.

          </p>

        </div>

      ) : null}



      {needsProductSerial ? (

        <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-3 dark:border-brand-800/50 dark:bg-brand-500/10">

          <div className="flex flex-wrap items-center justify-between gap-2">

            <Label required={!productSerialAlreadyAssigned}>제품 시리얼</Label>

            {!productSerialAlreadyAssigned && onGenerateProductSerial ? (

              <Button

                size="sm"

                variant="outline"

                disabled={submitting != null || productSerialGenerating}

                onClick={onGenerateProductSerial}

              >

                {productSerialGenerating ? "생성 중…" : "시리얼 생성"}

              </Button>

            ) : null}

          </div>

          {productSerialAlreadyAssigned ? (

            <p className="mt-1 font-mono text-theme-sm text-gray-900 dark:text-white/90">

              {unit?.serialNo?.trim() || "—"}

            </p>

          ) : (

            <input

              id="gate-product-serial-no"

              type="text"

              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-theme-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-4 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"

              value={productSerialNo}

              onChange={(e) => onProductSerialNoChange?.(e.target.value)}

              placeholder="시리얼 생성 또는 직접 입력"

              disabled={submitting != null || productSerialGenerating}

            />

          )}

          <p className="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">

            {productSerialAlreadyAssigned

              ? "제품 시리얼이 이미 확정되어 있습니다. PASS만 진행합니다."

              : "「시리얼 생성」으로 자동 채번 후 수정할 수 있습니다. PASS 시 확정됩니다."}

          </p>

        </div>

      ) : null}

      {interactive ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <Label>첨부파일</Label>
          <div className="mt-1.5 space-y-3">
            <FileUploadDropzone
              onSelectFiles={onSelectAttachmentFiles}
              onError={onAttachmentError}
              disabled={submitting != null}
              multiple
              buttonLabel="파일 선택"
              uploadGuideText="파일을 선택하면 PASS/FAIL 처리 후 현재 공정 이력에 함께 업로드됩니다."
            />
            <ul className="divide-y divide-gray-100 text-theme-sm dark:divide-white/5">
              {pendingAttachmentFiles.length === 0 ? (
                <li className="py-2 text-gray-500 dark:text-gray-400">
                  선택된 첨부파일이 없습니다.
                </li>
              ) : (
                pendingAttachmentFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <img
                        src={fileTypeIconSrc(file.name)}
                        alt=""
                        className="h-5 w-5 shrink-0"
                        decoding="async"
                      />
                      <span className="truncate text-gray-800 dark:text-gray-200">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveAttachmentFile?.(index)}
                        disabled={submitting != null}
                        title="첨부파일 제거"
                        aria-label="첨부파일 제거"
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-error-600 transition-colors hover:bg-error-50 disabled:pointer-events-none disabled:opacity-40 dark:text-error-400 dark:hover:bg-error-500/15"
                      >
                        <TrashBinIcon className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}



      {interactive && failFormOpen ? (

        <div className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-3 dark:border-red-900/40 dark:bg-red-950/20">

          <Label htmlFor="gate-fail-reason" required>

            불합격 사유

          </Label>

          <TextArea

            id="gate-fail-reason"

            rows={2}

            value={failReason}

            onChange={(v) => onFailReasonChange?.(v)}

            className="mt-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"

          />

          <div className="mt-3 flex justify-end">

            <button

              type="button"

              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-red-700 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"

              disabled={submitting != null || !failReason.trim()}

              onClick={() => onSubmitFail?.()}

            >

              {submitting === "fail" ? "처리 중…" : "FAIL 저장"}

            </button>

          </div>

        </div>

      ) : null}

    </div>

  );

}

