import { useState, useCallback } from "react";

export interface UseConfirmLeaveOptions {
  /** 변경 시 취소 클릭 시 확인 모달 메시지 */
  message?: string;
}

export interface UseConfirmLeaveReturn {
  /** 확인 모달 열림 여부 */
  showLeaveModal: boolean;
  /** 확인 모달에 표시할 메시지 */
  message: string;
  /** 취소 버튼 클릭 시: 변경 있으면 모달 열기, 없으면 onLeave 호출 */
  handleCancelClick: (e?: React.MouseEvent) => void;
  /** 모달에서 "취소하고 나가기" 확인 시 호출 (모달 닫고 onLeave 실행) */
  handleConfirmLeave: () => void;
  /** 모달 닫기 (계속 편집) */
  closeLeaveModal: () => void;
}

/**
 * 등록/수정 폼 공통: 변경된 데이터가 있을 때 취소 클릭 시 확인 모달
 * @param isDirty 폼 데이터가 초기와 다른지 (등록: 입력값 있음, 수정: 수정됨)
 * @param onLeave 실제 나가기 실행 (목록/상세로 이동)
 */
export function useConfirmLeave(
  isDirty: boolean,
  onLeave: () => void,
  options: UseConfirmLeaveOptions = {}
): UseConfirmLeaveReturn {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const message =
    options.message ??
    "변경된 데이터가 저장되지 않습니다. 취소하시겠습니까?";

  const handleCancelClick = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (isDirty) {
        setShowLeaveModal(true);
      } else {
        onLeave();
      }
    },
    [isDirty, onLeave]
  );

  const handleConfirmLeave = useCallback(() => {
    setShowLeaveModal(false);
    onLeave();
  }, [onLeave]);

  const closeLeaveModal = useCallback(() => {
    setShowLeaveModal(false);
  }, []);

  return {
    showLeaveModal,
    message,
    handleCancelClick,
    handleConfirmLeave,
    closeLeaveModal,
  };
}
