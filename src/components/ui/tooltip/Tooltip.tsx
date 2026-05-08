import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEventHandler,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "top" | "bottom";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  className?: string;
  tooltipClassName?: string;
}

export default function Tooltip({
  content,
  children,
  placement = "top",
  className = "",
  tooltipClassName = "",
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const updatePosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const GAP = 8;
    const top = placement === "bottom" ? r.bottom + GAP : r.top - GAP;
    const left = r.left + r.width / 2;
    setCoords({ top, left });
  }, [placement]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleMouseEnter: MouseEventHandler<HTMLSpanElement> = () =>
    setIsOpen(true);
  const handleMouseLeave: MouseEventHandler<HTMLSpanElement> = () =>
    setIsOpen(false);
  const handleFocus: FocusEventHandler<HTMLSpanElement> = () => setIsOpen(true);
  const handleBlur: FocusEventHandler<HTMLSpanElement> = () => setIsOpen(false);

  const tooltipStyle: CSSProperties = {
    position: "fixed",
    top: coords.top,
    left: coords.left,
    transform:
      placement === "bottom" ? "translate(-50%, 0)" : "translate(-50%, -100%)",
  };

  const tooltipNode = (
    <span
      id={tooltipId}
      role="tooltip"
      style={tooltipStyle}
      className={`pointer-events-none z-[100120] w-max max-w-[20rem] whitespace-normal break-keep rounded-base bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-xs transition-opacity dark:bg-gray-700 ${
        isOpen ? "visible opacity-100" : "invisible opacity-0"
      } ${tooltipClassName}`.trim()}
    >
      {content}
    </span>
  );

  return (
    <span
      ref={rootRef}
      className={`inline-flex ${className}`.trim()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      aria-describedby={isOpen ? tooltipId : undefined}
    >
      {children}
      {typeof document !== "undefined" ? createPortal(tooltipNode, document.body) : null}
    </span>
  );
}
