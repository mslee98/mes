import type { CommonCodeItem } from "../../../api/commonCode";
import { Modal } from "../../ui/modal";
import { ProcessGateContextPanel } from "../../production-plan/ProcessGateContextPanel";
import { ProcessModalProductSummary } from "../../production-plan/ProcessModalProductSummary";
import type { useUnitDetailProcessGate } from "../../../domains/production-plan/hooks/useUnitDetailProcessGate";
import { notify } from "../../../lib/notify";

type ProcessGateState = ReturnType<typeof useUnitDetailProcessGate>;

type UnitDetailProcessGateModalProps = {
  processGate: ProcessGateState;
  visibleStepCodes: CommonCodeItem[];
};

export function UnitDetailProcessGateModal({
  processGate,
  visibleStepCodes,
}: UnitDetailProcessGateModalProps) {
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
          stepCodes={visibleStepCodes}
        />
        <ProcessGateContextPanel
          unit={processEntryUnit}
          flatRow={processEntryFlatRow}
          stepCodes={visibleStepCodes}
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
              prev.filter((_, i) => i !== index)
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
  );
}
