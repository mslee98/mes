import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { InformationCircleIcon } from "../../icons";

export interface InfoActionPopoverProps {
  /** 스크린 리더용 트리거 설명 */
  ariaLabel: string;
  /** 팝오버 본문 안내 문구 */
  description: string;
  /** 하단 액션 버튼 라벨 */
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}

const PANEL_MAX_WIDTH_PX = 288; // 18rem
const VIEWPORT_MARGIN = 16;

/**
 * 정보 아이콘 클릭 시 열리는 작은 팝오버. 안내 + 단일 액션 버튼.
 * 패널은 portal + fixed로 그려 테이블 overflow에 잘리지 않습니다.
 */
export default function InfoActionPopover({
  ariaLabel,
  description,
  actionLabel,
  onAction,
  disabled = false,
}: InfoActionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxW = Math.min(PANEL_MAX_WIDTH_PX, window.innerWidth - VIEWPORT_MARGIN * 2);
    let left = r.left;
    if (left + maxW > window.innerWidth - VIEWPORT_MARGIN) {
      left = Math.max(VIEWPORT_MARGIN, window.innerWidth - VIEWPORT_MARGIN - maxW);
    }
    setCoords({ top: r.bottom + 6, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel = open ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: `min(18rem, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
        zIndex: 100100,
      }}
      className="rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <p className="text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {description}
      </p>
      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-brand-500 px-3 py-2 text-center text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/25 dark:bg-brand-600 dark:hover:bg-brand-700"
        onClick={() => {
          onAction();
          setOpen(false);
        }}
      >
        {actionLabel}
      </button>
    </div>
  ) : null;

  return (
    <div className="relative inline-flex shrink-0" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => !disabled && setOpen((v) => !v)}
        className="rounded-full p-0.5 text-gray-500 outline-none hover:bg-gray-100 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-brand-400"
      >
        <InformationCircleIcon className="size-[18px]" aria-hidden />
      </button>

      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}
