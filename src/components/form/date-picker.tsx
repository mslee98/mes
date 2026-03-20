import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Korean } from "flatpickr/dist/l10n/ko.js";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import type { Instance } from "flatpickr/dist/types/instance";

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: flatpickr.Options.Hook | flatpickr.Options.Hook[];
  defaultDate?: flatpickr.Options.DateOption;
  label?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  /** 테이블 행 등에서 SelectInput(sm)과 높이 맞춤 */
  compact?: boolean;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  value,
  onValueChange,
  className = "",
  disabled = false,
  compact = false,
}: PropsType) {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatPickrRef = useRef<Instance | null>(null);
  const onValueChangeRef = useRef(onValueChange);
  const onChangeRef = useRef(onChange);
  onValueChangeRef.current = onValueChange;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;

    const flatPickr = flatpickr(inputRef.current, {
      locale: Korean,
      mode: mode || "single",
      static: false,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate: value || defaultDate,
      appendTo: document.body,
      position: "above",
      clickOpens: !disabled,
      onReady: (_selectedDates, _dateStr, instance) => {
        if (instance.calendarContainer) {
          instance.calendarContainer.style.setProperty(
            "z-index",
            "99999",
            "important"
          );
        }
      },
      onOpen: (_selectedDates, _dateStr, instance) => {
        if (instance.calendarContainer) {
          instance.calendarContainer.style.setProperty(
            "z-index",
            "99999",
            "important"
          );
        }
      },
      onChange: (selectedDates, currentDateString, instance, data) => {
        onValueChangeRef.current?.(currentDateString);

        const hook = onChangeRef.current;
        if (Array.isArray(hook)) {
          hook.forEach((h) =>
            h(selectedDates, currentDateString, instance, data)
          );
        } else {
          hook?.(selectedDates, currentDateString, instance, data);
        }
      },
    });
    flatPickrRef.current = flatPickr;

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
      flatPickrRef.current = null;
    };
  }, [mode, defaultDate, disabled]);

  useEffect(() => {
    if (!flatPickrRef.current) return;
    flatPickrRef.current.set("clickOpens", !disabled);
    if (inputRef.current) {
      inputRef.current.disabled = disabled;
    }
  }, [disabled]);

  useEffect(() => {
    if (!flatPickrRef.current) return;
    flatPickrRef.current.setDate(value || "", false);
  }, [value]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={`w-full rounded-lg border appearance-none bg-transparent text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 disabled:cursor-not-allowed disabled:opacity-60 ${
            compact
              ? "h-9 px-3 py-1.5 pr-8 text-theme-xs"
              : "h-11 px-4 py-2.5 text-sm pr-10"
          } ${className}`}
        />

        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 ${
            compact ? "right-2" : "right-3"
          }`}
        >
          <CalenderIcon className={compact ? "size-5" : "size-6"} />
        </span>
      </div>
    </div>
  );
}
