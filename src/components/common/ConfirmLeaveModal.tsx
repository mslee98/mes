import ConfirmModal from "./ConfirmModal";

interface ConfirmLeaveModalProps {
  isOpen: boolean;
  message?: string;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * 등록/수정 폼 공통: 취소 시 "변경된 데이터가 저장되지 않습니다" 확인 모달
 * - 확인 = 나가기 (onConfirm)
 * - 취소 = 계속 편집 (onClose)
 */
export default function ConfirmLeaveModal({
  isOpen,
  message = "변경된 데이터가 저장되지 않습니다. 취소하시겠습니까?",
  onClose,
  onConfirm,
}: ConfirmLeaveModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title="취소 확인"
      message={message}
      confirmText="취소하고 나가기"
      cancelText="계속 편집"
      confirmVariant="primary"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
