import { useMemo, useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { CommonCodeItem } from "../../../api/commonCode";
import type { ProductionPlanUnit, UnitProcessRecord } from "../../../api/purchaseOrder";
import { Modal } from "../../../components/ui/modal";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import DatePicker from "../../../components/form/date-picker";
import SearchableSelectWithCreate from "../../../components/form/SearchableSelectWithCreate";
import LoadingLottie from "../../../components/common/LoadingLottie";
import { ProcessGateContextPanel } from "../../../components/production-plan/ProcessGateContextPanel";
import { ProcessModalProductSummary } from "../../../components/production-plan/ProcessModalProductSummary";
import { UnitProcessRecordsTimeline } from "../../../components/production-plan/UnitProcessRecordsTimeline";
import Button from "../../../components/ui/button/Button";
import type { FlatPlanUnitRow } from "../../../domains/production-plan/helpers/detailHelpers";
import { notify } from "../../../lib/notify";
import { processRecordUploadKey } from "../helpers/processRecordUploadKey";
import {
  buildSplitDeliveryManagerUserOptions,
  type SplitModalContext,
} from "../helpers/splitHelpers";
import type { useProductionPlanDetailProcessGate } from "../hooks/useProductionPlanDetailProcessGate";

type DeliverModalState = {
  unit: ProductionPlanUnit;
  purchaseOrderItemId: number;
} | null;

type ProcessGateState = ReturnType<typeof useProductionPlanDetailProcessGate>;

type ProductionPlanProcessSectionProps = {
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
  flatUnits: FlatPlanUnitRow[];
  unitProcessStepCodes: CommonCodeItem[];
  usersForDeliveryManager: {
    id: number;
    name: string;
    employeeNo: string | number;
    isActive?: boolean;
  }[];
  processGate: ProcessGateState;
  splitModalOpen: boolean;
  onSplitModalOpenChange: (open: boolean) => void;
  splitModalContext: SplitModalContext | null;
  onSplitModalContextChange: (ctx: SplitModalContext | null) => void;
  splitDeliveryDate: string;
  onSplitDeliveryDateChange: (v: string) => void;
  splitPlannedDeliveryDate: string;
  onSplitPlannedDeliveryDateChange: (v: string) => void;
  splitDeliveryManagerUserSelectValue: string;
  onSplitDeliveryManagerUserSelectValueChange: (v: string) => void;
  splitTitle: string;
  onSplitTitleChange: (v: string) => void;
  splitRemark: string;
  onSplitRemarkChange: (v: string) => void;
  splitMutation: UseMutationResult<unknown, Error, void, unknown>;
  deliverModal: DeliverModalState;
  onDeliverModalChange: (modal: DeliverModalState) => void;
  deliverDate: string;
  onDeliverDateChange: (v: string) => void;
  deliverRemark: string;
  onDeliverRemarkChange: (v: string) => void;
  deliverMutation: UseMutationResult<unknown, Error, void, unknown>;
  deliverRecordsLoading: boolean;
  sortedDeliverRecords: UnitProcessRecord[];
  modalRecordsLoading: boolean;
  sortedModalRecords: UnitProcessRecord[];
  recordsModalUnitId: string | null;
  onRecordsModalUnitIdChange: (id: string | null) => void;
  uploadProcessRecordFilesMutation: UseMutationResult<
    { unitId: string; recordId: string },
    Error,
    { unitId: string; recordId: string; files: File[] },
    unknown
  >;
};

export function ProductionPlanProcessSection({
  accessToken,
  isAuthLoading,
  flatUnits,
  unitProcessStepCodes,
  usersForDeliveryManager,
  processGate,
  splitModalOpen,
  onSplitModalOpenChange,
  splitModalContext,
  onSplitModalContextChange,
  splitDeliveryDate,
  onSplitDeliveryDateChange,
  splitPlannedDeliveryDate,
  onSplitPlannedDeliveryDateChange,
  splitDeliveryManagerUserSelectValue,
  onSplitDeliveryManagerUserSelectValueChange,
  splitTitle,
  onSplitTitleChange,
  splitRemark,
  onSplitRemarkChange,
  splitMutation,
  deliverModal,
  onDeliverModalChange,
  deliverDate,
  onDeliverDateChange,
  deliverRemark,
  onDeliverRemarkChange,
  deliverMutation,
  deliverRecordsLoading,
  sortedDeliverRecords,
  modalRecordsLoading,
  sortedModalRecords,
  recordsModalUnitId,
  onRecordsModalUnitIdChange,
  uploadProcessRecordFilesMutation,
}: ProductionPlanProcessSectionProps) {
  const [uploadingProcessRecordKey, setUploadingProcessRecordKey] = useState<
    string | null
  >(null);

  const splitDeliveryManagerUserOptions = useMemo(
    () =>
      buildSplitDeliveryManagerUserOptions(
        usersForDeliveryManager,
        splitDeliveryManagerUserSelectValue
      ),
    [usersForDeliveryManager, splitDeliveryManagerUserSelectValue]
  );

  const selectedHistoryUnit = useMemo(
    () => flatUnits.find((row) => row.unit.id === recordsModalUnitId)?.unit ?? null,
    [flatUnits, recordsModalUnitId]
  );

  const recordsModalFlatRow = useMemo(
    () =>
      recordsModalUnitId
        ? flatUnits.find((r) => r.unit.id === recordsModalUnitId) ?? null
        : null,
    [flatUnits, recordsModalUnitId]
  );

  const handleUploadProcessRecordFiles = async (
    unitId: string,
    recordId: string,
    files: File[]
  ) => {
    const uploadKey = processRecordUploadKey(unitId, recordId);
    setUploadingProcessRecordKey(uploadKey);
    try {
      await uploadProcessRecordFilesMutation.mutateAsync({
        unitId,
        recordId,
        files,
      });
    } finally {
      setUploadingProcessRecordKey((prev) =>
        prev === uploadKey ? null : prev
      );
    }
  };

  const {
    processEntryUnit,
    processEntryFlatRow,
    closeProcessGate,
    gateDetectorSerial,
    setGateDetectorSerial,
    gateProductSerialNo,
    setGateProductSerialNo,
    gateProductSerialGenerating,
    gateMastersLoading,
    gateProductSerialAlreadyAssigned,
    gateFailReason,
    setGateFailReason,
    gateFailFormOpen,
    setGateFailFormOpen,
    gatePendingAttachmentFiles,
    setGatePendingAttachmentFiles,
    handleGateGenerateProductSerial,
    passMutation,
    failMutation,
    gateSubmitting,
  } = processGate;

  return (
    <>
      <Modal
        isOpen={splitModalOpen}
        onClose={() => {
          onSplitModalOpenChange(false);
          onSplitModalContextChange(null);
        }}
        strictClose
        className="mx-4 max-h-[90vh] max-w-2xl overflow-y-auto p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              새 생산 계획으로 분할
            </h3>
            {splitModalContext ? (
              <p className="mt-0.5 text-theme-sm text-gray-600 dark:text-gray-400">
                {splitModalContext.lineLabel} · {splitModalContext.unitIds.length}
                대
              </p>
            ) : null}
          </>
        }
      >
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">
          새 계획이 만들어지고 선택한 제품만 옮겨집니다. (권한·발주 상태·실납품
          연결 여부 등은 서버에서 검증합니다.)
        </p>
        <div className="mt-4 space-y-3">
          <DatePicker
            id="split-delivery-date"
            label="제품 인계일"
            value={splitDeliveryDate}
            onValueChange={onSplitDeliveryDateChange}
            placeholder="년-월-일 (선택)"
          />
          <DatePicker
            id="split-planned-delivery"
            label="납품 예정일"
            value={splitPlannedDeliveryDate}
            onValueChange={onSplitPlannedDeliveryDateChange}
            placeholder="년-월-일 (선택)"
          />
          <SearchableSelectWithCreate
            id="split-delivery-manager-user"
            label="담당자 (선택)"
            value={splitDeliveryManagerUserSelectValue}
            onChange={onSplitDeliveryManagerUserSelectValueChange}
            options={splitDeliveryManagerUserOptions}
            placeholder={
              isAuthLoading ? "담당자 불러오는 중…" : "담당자 검색·선택"
            }
            noOptionsMessage="표시할 담당자가 없습니다."
            addTrigger="none"
            addButtonLabel=""
            onAddClick={() => {}}
            isDisabled={isAuthLoading}
            isClearable
          />
          <div>
            <Label htmlFor="split-title">계획 제목 (선택)</Label>
            <Input
              id="split-title"
              type="text"
              value={splitTitle}
              onChange={(e) => onSplitTitleChange(e.target.value)}
              className="mt-1"
              placeholder="현재 계획 제목이 채워집니다."
            />
          </div>
          <div>
            <Label htmlFor="split-remark">비고 (선택)</Label>
            <TextArea
              id="split-remark"
              rows={2}
              value={splitRemark}
              onChange={onSplitRemarkChange}
              className="mt-1"
              placeholder="비고"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onSplitModalOpenChange(false);
              onSplitModalContextChange(null);
            }}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={splitMutation.isPending || !splitModalContext}
            onClick={() => splitMutation.mutate()}
          >
            {splitMutation.isPending ? "처리 중…" : "분할 실행"}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!deliverModal}
        onClose={() => {
          onDeliverModalChange(null);
          onDeliverRemarkChange("");
        }}
        strictClose
        className="mx-4 max-w-lg p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              납품 등록
            </h3>
            <p className="mt-0.5 font-mono text-theme-sm text-gray-600 dark:text-gray-400">
              {deliverModal?.unit.unitCode ?? deliverModal?.unit.id}
            </p>
          </>
        }
      >
        {deliverModal ? (
          <div className="mt-4">
            <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              공정 처리 이력
            </p>
            <UnitProcessRecordsTimeline
              records={sortedDeliverRecords}
              isLoading={deliverRecordsLoading}
              unit={deliverModal.unit}
              accessToken={accessToken ?? null}
              viewportClassName="max-h-[min(22rem,48vh)] sm:max-h-[min(28rem,46vh)]"
              onUploadAttachments={(recordId, files) =>
                handleUploadProcessRecordFiles(deliverModal.unit.id, recordId, files)
              }
              uploadingRecordKey={uploadingProcessRecordKey}
            />
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          <DatePicker
            id="deliver-date"
            label="제품 납품일"
            value={deliverDate}
            onValueChange={onDeliverDateChange}
            placeholder="년-월-일"
            required
          />
          <div>
            <Label htmlFor="deliver-remark">비고 (선택)</Label>
            <TextArea
              id="deliver-remark"
              rows={2}
              value={deliverRemark}
              onChange={onDeliverRemarkChange}
              className="mt-1"
              placeholder="납품 비고"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
            onClick={() => {
              onDeliverModalChange(null);
              onDeliverRemarkChange("");
            }}
          >
            취소
          </button>
          <Button
            type="button"
            size="sm"
            disabled={deliverMutation.isPending || !deliverDate.trim()}
            onClick={() => deliverMutation.mutate()}
          >
            {deliverMutation.isPending ? "등록 중…" : "납품 등록"}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!processEntryUnit}
        onClose={closeProcessGate}
        strictClose
        className="mx-4 flex max-h-[min(92vh,780px)] max-w-lg flex-col overflow-hidden p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              공정 처리
            </h3>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              현재 공정에서 PASS·FAIL을 선택하면 바로 반영됩니다.
            </p>
          </>
        }
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
          <ProcessModalProductSummary
            variant="minimal"
            flatRow={processEntryFlatRow}
            unit={processEntryUnit}
            stepCodes={unitProcessStepCodes}
          />
          <ProcessGateContextPanel
            unit={processEntryUnit}
            flatRow={processEntryFlatRow}
            stepCodes={unitProcessStepCodes}
            interactive
            submitting={gateSubmitting}
            failFormOpen={gateFailFormOpen}
            onFailFormOpenChange={setGateFailFormOpen}
            onPass={() => passMutation.mutate()}
            detectorSerialNo={gateDetectorSerial}
            onDetectorSerialNoChange={setGateDetectorSerial}
            productSerialNo={gateProductSerialNo}
            onProductSerialNoChange={setGateProductSerialNo}
            onGenerateProductSerial={() => void handleGateGenerateProductSerial()}
            productSerialGenerating={
              gateProductSerialGenerating || gateMastersLoading
            }
            productSerialAlreadyAssigned={gateProductSerialAlreadyAssigned}
            failReason={gateFailReason}
            onFailReasonChange={setGateFailReason}
            onSubmitFail={() => failMutation.mutate()}
            pendingAttachmentFiles={gatePendingAttachmentFiles}
            onSelectAttachmentFiles={(files) =>
              setGatePendingAttachmentFiles((prev) =>
                [...prev, ...files].slice(0, 20)
              )
            }
            onRemoveAttachmentFile={(index) =>
              setGatePendingAttachmentFiles((prev) =>
                prev.filter((_, fileIndex) => fileIndex !== index)
              )
            }
            onAttachmentError={(message) => notify.error(message)}
          />
        </div>

        <div className="mt-4 shrink-0 border-t border-gray-100 pt-4 dark:border-white/10">
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
              onClick={closeProcessGate}
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!recordsModalUnitId}
        onClose={() => onRecordsModalUnitIdChange(null)}
        className="mx-4 max-h-[85vh] max-w-lg overflow-y-auto p-6"
        header={
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              공정 이력
            </h3>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              선택한 제품의 공정 PASS/FAIL 기록입니다.
            </p>
          </>
        }
      >
        <div>
          <ProcessModalProductSummary
            variant="minimal"
            flatRow={recordsModalFlatRow}
            unit={selectedHistoryUnit}
            stepCodes={unitProcessStepCodes}
          />
        </div>
        {recordsModalUnitId ? (
          <p className="mt-2 break-all font-mono text-theme-xs text-gray-400 dark:text-gray-500">
            내부 ID: {recordsModalUnitId}
          </p>
        ) : null}
        {modalRecordsLoading ? (
          <div className="mt-6 flex justify-center py-8">
            <LoadingLottie />
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              공정 처리 이력
            </p>
            <UnitProcessRecordsTimeline
              records={sortedModalRecords}
              isLoading={false}
              unit={selectedHistoryUnit}
              accessToken={accessToken ?? null}
              viewportClassName="max-h-[min(50vh,26rem)] sm:max-h-[min(52vh,30rem)]"
              onUploadAttachments={(recordId, files) => {
                if (!selectedHistoryUnit?.id) {
                  throw new Error("제품 정보를 찾을 수 없습니다.");
                }
                return handleUploadProcessRecordFiles(
                  selectedHistoryUnit.id,
                  recordId,
                  files
                );
              }}
              uploadingRecordKey={uploadingProcessRecordKey}
            />
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
            onClick={() => onRecordsModalUnitIdChange(null)}
          >
            닫기
          </button>
        </div>
      </Modal>
    </>
  );
}
