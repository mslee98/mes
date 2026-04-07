import { useId, type ReactNode } from "react";

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
  const selectId = useId();

  const toPlainTextLabel = (label: ReactNode, fallbackValue: string) => {
    if (typeof label === "string" || typeof label === "number") {
      return String(label);
    }
    return fallbackValue;
  };

  return (
    <div className={className}>
      <div className="sm:hidden">
        <label htmlFor={selectId} className="sr-only">
          {ariaLabel}
        </label>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {toPlainTextLabel(opt.label, opt.value)}
            </option>
          ))}
        </select>
      </div>

      <ul
        role="tablist"
        aria-label={ariaLabel}
        className={`-space-x-px hidden text-center text-sm font-medium sm:flex ${
          equalWidth ? "w-full" : ""
        }`}
      >
        {options.map((opt, idx) => {
          const selected = value === opt.value;
          const isFirst = idx === 0;
          const isLast = idx === options.length - 1;

          return (
            <li
              key={opt.value}
              className={`focus-within:z-10 ${equalWidth ? "w-full" : ""}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onChange(opt.value)}
                className={`inline-block w-full border px-4 py-2.5 text-sm font-medium leading-5 transition-colors focus:outline-none ${
                  isFirst ? "rounded-s-lg" : ""
                } ${isLast ? "rounded-e-lg" : ""} ${
                  selected
                    ? "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.04] dark:hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
