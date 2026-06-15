import { useEffect, useRef, type FC } from "react";
import {
  CHECKBOX_INDETERMINATE_CLASS,
  CHECKBOX_INPUT_CLASS,
  CHECKBOX_LABEL_CLASS,
} from "../../../lib/ui/checkboxInputStyles";

interface CheckboxProps {
  label?: string;
  checked: boolean;
  className?: string;
  labelClassName?: string;
  id?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** 헤더 전체 선택 등 부분 선택 상태 표시 */
  indeterminate?: boolean;
}

const Checkbox: FC<CheckboxProps> = ({
  label,
  checked,
  id,
  onChange,
  className = "",
  labelClassName = "",
  disabled = false,
  indeterminate = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const showCheck = checked && !indeterminate;
  const showIndeterminate = indeterminate && !checked;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.indeterminate = indeterminate;
  }, [indeterminate]);

  const inputClass = [
    CHECKBOX_INPUT_CLASS,
    indeterminate && !checked ? CHECKBOX_INDETERMINATE_CLASS : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`flex items-center ${disabled ? "opacity-60" : ""}`.trim()}>
      <div className="relative size-4 shrink-0">
        <input
          ref={inputRef}
          id={id}
          type="checkbox"
          className={inputClass}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        {showCheck ? (
          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
          >
            <path
              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
              stroke={disabled ? "#E4E7EC" : "white"}
              strokeWidth="1.94437"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
        {showIndeterminate ? (
          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
          >
            <path
              d="M3.5 7H10.5"
              stroke="white"
              strokeWidth="1.94437"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
      </div>
      {label ? (
        <label
          htmlFor={id}
          className={`${CHECKBOX_LABEL_CLASS} ${labelClassName} ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`.trim()}
        >
          {label}
        </label>
      ) : null}
    </div>
  );
};

export default Checkbox;
