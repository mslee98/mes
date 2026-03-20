import type React from "react";
import { ChevronDownIcon } from "../../icons";

export interface SelectInputOption {
  value: string;
  label: string;
  /** 선택 시 오른쪽 입력란 옆에 표시할 기호(예: 원, $, ¥). 없으면 label 사용 */
  symbol?: string;
}

interface SelectInputProps {
  /** 왼쪽 select 옵션 */
  selectOptions: SelectInputOption[];
  selectValue: string;
  onSelectChange: (value: string) => void;
  /** 오른쪽 input 값 */
  inputValue: string;
  onInputChange: (value: string) => void;
  inputType?: "text" | "number";
  inputMode?: "numeric" | "decimal" | "text";
  inputPlaceholder?: string;
  selectPlaceholder?: string;
  id?: string;
  /** 오른쪽 input에 표시할 접미사(예: 통화 기호). 없으면 select의 symbol 또는 label 사용 */
  inputSuffix?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  /** 왼쪽 native select에 추가 클래스(테이블 좁은 열에서 `min-w-[3.5rem]` 등) */
  selectClassName?: string;
  /** input 포맷(숫자 천단위 등) - onInputChange에 이미 포맷된 문자열 전달 시 true */
  formatNumber?: boolean;
  maxFractionDigits?: number;
}

const sizeStyles = {
  sm: "h-9 text-theme-xs px-3 py-1.5",
  md: "h-11 text-sm px-4 py-2.5",
};

export default function SelectInput({
  selectOptions,
  selectValue,
  onSelectChange,
  inputValue,
  onInputChange,
  inputType = "text",
  inputMode,
  inputPlaceholder,
  selectPlaceholder = "선택",
  id,
  inputSuffix,
  size = "md",
  disabled = false,
  className = "",
  selectClassName = "",
  formatNumber = false,
  maxFractionDigits = 2,
}: SelectInputProps) {
  const selectedOption = selectOptions.find((o) => o.value === selectValue);
  const suffix = inputSuffix ?? selectedOption?.symbol ?? selectedOption?.label ?? "";

  const formatWithCommas = (s: string): string => {
    const noCommas = s.replace(/,/g, "");
    const [intPart, decPart] = noCommas.split(".");
    const integer = (intPart ?? "").replace(/\D/g, "");
    if (integer === "" && decPart === undefined) return "";
    const numStr = integer || "0";
    const formattedInt = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (decPart !== undefined) {
      const limited = decPart.replace(/\D/g, "").slice(0, maxFractionDigits);
      return limited.length > 0 ? `${formattedInt}.${limited}` : formattedInt;
    }
    return formattedInt;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (formatNumber) {
      onInputChange(formatWithCommas(raw));
      return;
    }
    onInputChange(raw);
  };

  const baseBorder =
    "border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 dark:focus:border-brand-800";
  const disabledClass = disabled
    ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
    : "";

  const inputPaddingRight = suffix ? "pr-10" : "";

  return (
    <div
      className={`flex -space-x-px rounded-lg overflow-hidden shadow-sm ${className}`}
      role="group"
    >
      <label htmlFor={id ? `${id}-select` : undefined} className="sr-only">
        {selectPlaceholder}
      </label>
      <div className="relative shrink-0">
        <select
          id={id ? `${id}-select` : undefined}
          value={selectValue}
          onChange={(e) => onSelectChange(e.target.value)}
          disabled={disabled}
          className={`inline-flex items-center ${sizeStyles[size]} ${baseBorder} rounded-l-lg border-r-0 rounded-r-none text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-10 appearance-none pl-4 pr-8 min-w-[6rem] ${selectClassName} ${disabledClass}`}
          aria-label={selectPlaceholder}
        >
          {selectPlaceholder && (
            <option value="" disabled>
              {selectPlaceholder}
            </option>
          )}
          {selectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400"
          aria-hidden
        />
      </div>
      <div className="relative flex flex-1 min-w-0">
        <input
          id={id ? `${id}-input` : undefined}
          type={inputType === "number" ? "text" : inputType}
          inputMode={inputMode ?? (inputType === "number" || formatNumber ? "decimal" : "text")}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={inputPlaceholder}
          disabled={disabled}
          className={`w-full ${sizeStyles[size]} ${baseBorder} rounded-r-lg border-l-0 rounded-l-none text-right tabular-nums placeholder:text-gray-400 dark:placeholder:text-gray-500 ${inputPaddingRight} ${disabledClass}`}
          aria-label={inputPlaceholder ?? "값"}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 shrink-0 text-sm text-gray-600 dark:text-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
