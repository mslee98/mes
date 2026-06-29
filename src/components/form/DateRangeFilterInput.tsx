import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Korean } from "flatpickr/dist/l10n/ko.js";
import { createFlatpickrOverlayHooks } from "../../lib/ui/flatpickrOverlay";

type DateRangeFilterInputProps = {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  /** 검색 초기화 등으로 flatpickr 인스턴스를 재생성할 때 증가 */
  resetKey?: number;
  placeholder?: string;
  className?: string;
};

/** 발주 목록 등 — flatpickr range + 오버레이 z-index 훅 캡슐화 */
export default function DateRangeFilterInput({
  start,
  end,
  onChange,
  resetKey = 0,
  placeholder = "년-월-일 ~ 년-월-일",
  className = "h-9 w-full rounded-md border border-gray-300 bg-transparent py-2 pl-3 pr-9 text-theme-xs text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800",
}: DateRangeFilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    const overlayHooks = createFlatpickrOverlayHooks();
    const fp = flatpickr(inputRef.current, {
      locale: Korean,
      mode: "range",
      dateFormat: "Y-m-d",
      static: false,
      monthSelectorType: "static",
      appendTo: document.body,
      position: "auto",
      defaultDate:
        start && end ? [start, end] : start ? [start] : undefined,
      ...overlayHooks,
      onChange: (selectedDates: Date[]) => {
        onChange(
          selectedDates[0] ? selectedDates[0].toISOString().slice(0, 10) : "",
          selectedDates[1] ? selectedDates[1].toISOString().slice(0, 10) : ""
        );
      },
    });
    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
  }, [resetKey]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        readOnly
        placeholder={placeholder}
        className={className}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
        <svg
          className="size-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </span>
    </div>
  );
}
