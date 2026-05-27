import { Modal } from "../ui/modal";

type OrderReceiveConfirmModalProps = {
  isOpen: boolean;
  isConfirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * 발주 접수(즉시 종결) 확인 — 생산 모달과 동일한 `Modal` + `header` 패턴.
 */
export function OrderReceiveConfirmModal({
  isOpen,
  isConfirming,
  onClose,
  onConfirm,
}: OrderReceiveConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-w-lg p-6"
      header={
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            발주 접수
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            접수하면 발주가 즉시 종결됩니다.
          </p>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-theme-sm leading-relaxed text-gray-700 dark:text-gray-300">
          종결 후에는 이 발주에 대해{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            생산 계획
          </span>
          과{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            실제 생산
          </span>
          을 등록할 수 있습니다. 계속하시겠습니까?
        </p>
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-theme-xs leading-relaxed text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
          접수 후 발주 수정은 제한됩니다. 내용을 다시 확인한 뒤 진행하세요.
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isConfirming}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isConfirming ? "접수 중..." : "접수하기"}
        </button>
      </div>
    </Modal>
  );
}
