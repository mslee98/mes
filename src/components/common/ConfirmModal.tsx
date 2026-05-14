import { Modal } from "../ui/modal";
import { CheckCircleIcon, TrashBinIcon } from "../../icons";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "primary";
  /** 상단 일러스트: 삭제·경고류는 휴지통, 등록 완료 후 다음 단계 안내 등은 체크 원 */
  illustration?: "trash" | "check-circle";
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** 우측 X 전용 (예: 권한 화면에서 뒤로가기). 미지정 시 X도 `onClose`와 동일 */
  onCloseButtonClick?: () => void;
  /**
   * 취소 버튼 전용. 미지정 시 취소도 `onClose`와 동일.
   * 배경·Esc·X는 항상 `onClose` (및 X는 `onCloseButtonClick` 우선).
   */
  onCancel?: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  confirmVariant = "primary",
  illustration = "trash",
  isConfirming = false,
  onClose,
  onConfirm,
  onCloseButtonClick,
  onCancel,
}: ConfirmModalProps) {
  const confirmButtonClass =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-900"
      : "bg-brand-500 hover:bg-brand-600 focus:ring-brand-300 dark:bg-brand-600 dark:hover:bg-brand-700 dark:focus:ring-brand-900";

  const illustrationCircleClass =
    illustration === "check-circle"
      ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400"
      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300";

  const handleCancelClick = onCancel ?? onClose;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onCloseButtonClick={onCloseButtonClick}
      className="mx-4 max-w-md p-6 text-center sm:p-8"
      header={
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      }
    >
      <div
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${illustrationCircleClass}`}
      >
        {illustration === "check-circle" ? (
          <CheckCircleIcon className="h-10 w-10" aria-hidden />
        ) : (
          <TrashBinIcon className="h-10 w-10" aria-hidden />
        )}
      </div>

      <p className="text-sm leading-6 text-gray-500 dark:text-gray-300">
        {message}
      </p>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleCancelClick}
          disabled={isConfirming}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className={`inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-white focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
        >
          {isConfirming ? "처리 중..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}
