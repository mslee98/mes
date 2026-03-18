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
}: PropsType) {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatPickrRef = useRef<Instance | null>(null);

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
        onValueChange?.(currentDateString);

        if (Array.isArray(onChange)) {
          onChange.forEach((hook) =>
            hook(selectedDates, currentDateString, instance, data)
          );
        } else {
          onChange?.(selectedDates, currentDateString, instance, data);
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
  }, [mode, onChange, defaultDate, value, onValueChange]);

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
          className={`h-11 w-full rounded-lg border appearance-none bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${className}`}
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
