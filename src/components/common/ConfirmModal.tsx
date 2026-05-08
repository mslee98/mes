import AlertModal from "./AlertModal";

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
  const handleCancelClick = onCancel ?? onClose;

  return (
    <AlertModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseButtonClick={onCloseButtonClick}
      title={title}
      message={message}
      illustration={illustration}
      actions={[
        {
          label: cancelText,
          onClick: handleCancelClick,
          variant: "secondary",
          disabled: isConfirming,
        },
        {
          label: isConfirming ? "처리 중..." : confirmText,
          onClick: onConfirm,
          variant: confirmVariant,
          disabled: isConfirming,
        },
      ]}
    />
  );
}
