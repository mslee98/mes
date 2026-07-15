import { useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { guardAppScroll, releaseAppScrollGuard } from "../../../lib/ui/overlayScrollGuard";
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  /**
   * true면 배경 클릭·Escape로 닫지 않습니다. 우측 X·취소 등 명시적 닫기만 허용합니다.
   */
  strictClose?: boolean;
  /** 지정 시 우측 X 버튼만 이 콜백 사용. 배경·Esc는 `strictClose`가 아닐 때만 `onClose` */
  onCloseButtonClick?: () => void;
  /**
   * 헤더 좌측(제목·서브타이틀 등). 우측에 닫기(X)가 같은 줄에 배치되고,
   * 그 아래 `border-b`로 본문과 구분됩니다.
   */
  header?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  strictClose = false,
  onCloseButtonClick,
  header,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (strictClose) return;
      onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, strictClose]);

  useEffect(() => {
    if (!isOpen) return;

    guardAppScroll();
    return () => releaseAppScrollGuard();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCloseButtonClick = onCloseButtonClick ?? onClose;

  const contentClasses = isFullscreen
    ? "flex h-full w-full min-h-0 flex-col"
    : "relative flex max-h-[min(90vh,calc(100vh-2rem))] min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900";
  const showHeaderBar = showCloseButton || header != null;

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center overflow-hidden p-4 modal">
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/60 dark:backdrop-blur-sm"
          onClick={strictClose ? undefined : onClose}
          aria-hidden
        ></div>
      )}
      <div
        ref={modalRef}
        className={`${contentClasses} ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeaderBar ? (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 pb-4 dark:border-white/10">
            <div className="min-w-0 flex-1 pr-2 pt-0.5 text-left">
              {header}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                aria-label="닫기"
                onClick={handleCloseButtonClick}
                className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:h-11 sm:w-11"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        ) : null}
        <div
          className={`custom-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain ${
            showHeaderBar ? "pt-4" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};