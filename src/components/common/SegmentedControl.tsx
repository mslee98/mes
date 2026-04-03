import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  /** 접근성 — 탭 목록 레이블 */
  ariaLabel: string;
  /** 옵션 버튼에 균등 너비 */
  equalWidth?: boolean;
};

/**
 * `ChartTab`과 동일한 시각 패턴의 세그먼트 컨트롤(회색 트랙 + 선택 시 밝은 패널).
 * 목록 함 구분·모달 내 처리 유형 등에 재사용합니다.
 */
export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = "",
  ariaLabel,
  equalWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex flex-wrap items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900 ${className}`}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-2 text-center text-theme-sm font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${
              equalWidth ? "min-w-0 flex-1" : ""
            } ${
              selected
                ? "shadow-theme-xs bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
