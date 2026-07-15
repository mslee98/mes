import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { guardAppScroll, releaseAppScrollGuard } from "../../../lib/ui/overlayScrollGuard";
import { twMerge } from "tailwind-merge";

const DRAWER_TRANSITION_MS = 300;

export type DrawerPlacement = "left" | "right" | "top" | "bottom";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  placement?: DrawerPlacement;
  children: ReactNode;
  /** 헤더 영역 커스텀. 미지정 시 `title`로 기본 헤더를 렌더합니다. */
  header?: ReactNode;
  title?: ReactNode;
  titleIcon?: ReactNode;
  className?: string;
  panelClassName?: string;
  showCloseButton?: boolean;
  showBackdrop?: boolean;
  /** true면 배경 클릭·Escape로 닫지 않습니다. */
  strictClose?: boolean;
  /** left/right 패널 너비 Tailwind 클래스 */
  widthClassName?: string;
  /** top/bottom 패널 높이 Tailwind 클래스 */
  heightClassName?: string;
  id?: string;
}

const PLACEMENT_BASE_CLASSES: Record<DrawerPlacement, string> = {
  left: "top-0 left-0 h-screen",
  right: "top-0 right-0 h-screen",
  top: "top-0 left-0 w-full",
  bottom: "bottom-0 left-0 w-full",
};

const PLACEMENT_CLOSED_TRANSFORM: Record<DrawerPlacement, string> = {
  left: "-translate-x-full",
  right: "translate-x-full",
  top: "-translate-y-full",
  bottom: "translate-y-full",
};

function getPanelTransformClass(placement: DrawerPlacement, visible: boolean): string {
  if (visible) return "translate-x-0 translate-y-0";
  return PLACEMENT_CLOSED_TRANSFORM[placement];
}

function DrawerCloseIcon() {
  return (
    <svg
      className="size-5"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M6 18 17.94 6M18 18 6.06 6"
      />
    </svg>
  );
}

export function Drawer({
  isOpen,
  onClose,
  placement = "right",
  children,
  header,
  title,
  titleIcon,
  className,
  panelClassName,
  showCloseButton = true,
  showBackdrop = true,
  strictClose = false,
  widthClassName = "w-96 max-w-[calc(100vw-2rem)]",
  heightClassName = "h-80 max-h-[calc(100vh-2rem)]",
  id,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      const timer = window.setTimeout(() => setMounted(false), DRAWER_TRANSITION_MS);
      return () => window.clearTimeout(timer);
    }

    setMounted(true);
    setVisible(false);

    // 첫 페인트에서 닫힌 위치를 그린 뒤, 다음 프레임에 열어 슬라이드 인이 보이게 합니다.
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setVisible(true));
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (strictClose) return;
      onClose();
    };

    if (mounted) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mounted, onClose, strictClose]);

  useEffect(() => {
    if (!mounted) return;

    guardAppScroll();
    return () => releaseAppScrollGuard();
  }, [mounted]);

  if (!mounted) return null;

  const isHorizontal = placement === "left" || placement === "right";
  const sizeClassName = isHorizontal ? widthClassName : heightClassName;
  const showHeaderBar = header != null || title != null || showCloseButton;
  const titleId = id ? `${id}-label` : undefined;

  const defaultHeader =
    title != null ? (
      <h5
        id={titleId}
        className="inline-flex items-center pe-10 text-lg font-medium text-gray-800 dark:text-white/90"
      >
        {titleIcon ? <span className="me-1.5 flex shrink-0">{titleIcon}</span> : null}
        {title}
      </h5>
    ) : null;

  return createPortal(
    <div className={twMerge("fixed inset-0 z-99999", className)} aria-hidden={!visible}>
      {showBackdrop ? (
        <div
          className={twMerge(
            "fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] transition-opacity duration-300 ease-out dark:bg-black/60 dark:backdrop-blur-sm",
            visible ? "opacity-100" : "opacity-0"
          )}
          onClick={strictClose ? undefined : onClose}
          aria-hidden
        />
      ) : null}

      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={twMerge(
          "fixed z-10 overflow-y-auto border border-gray-200 bg-white p-4 shadow-theme-lg transition-transform duration-300 ease-out will-change-transform dark:border-gray-800 dark:bg-gray-900",
          PLACEMENT_BASE_CLASSES[placement],
          getPanelTransformClass(placement, visible),
          sizeClassName,
          panelClassName
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {showHeaderBar ? (
          <div className="relative mb-5 flex items-center border-b border-gray-200 pb-4 dark:border-white/10">
            <div className="min-w-0 flex-1">{header ?? defaultHeader}</div>
            {showCloseButton ? (
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="absolute end-2.5 top-2.5 flex size-9 items-center justify-center rounded-lg bg-transparent text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <DrawerCloseIcon />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="min-w-0">{children}</div>
      </div>
    </div>,
    document.body
  );
}
