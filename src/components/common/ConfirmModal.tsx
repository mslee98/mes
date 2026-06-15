import AlertModal from "./AlertModal";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  /** Modal 헤더 바 제목. 미지정 시 `confirmVariant="danger"`이면 `주의` */
  headerLabel?: string;
  /** 헤더 제목 아래 보조 문구. 미지정 시 danger면 기본 안내 문구 */
  headerDescription?: string;
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

const CONFIRM_MODAL_DANGER_HEADER_LABEL = "주의";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  headerLabel,
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
  const resolvedHeaderLabel =
    headerLabel ??
    (confirmVariant === "danger" ? CONFIRM_MODAL_DANGER_HEADER_LABEL : undefined);

  return (
    <AlertModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseButtonClick={onCloseButtonClick}
      headerLabel={resolvedHeaderLabel}
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
