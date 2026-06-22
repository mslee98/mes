import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { Korean } from "flatpickr/dist/l10n/ko.js";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import type { Instance } from "flatpickr/dist/types/instance";
import type { Options } from "flatpickr/dist/types/options";
import { createFlatpickrOverlayHooks } from "../../lib/ui/flatpickrOverlay";

/** `YYYY-MM`이면 월의 1일로 보정해 flatpickr에 넘김 */
function coercePickerValue(value: string | undefined, monthOnly: boolean): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (monthOnly && /^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  return s;
}

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: flatpickr.Options.Hook | flatpickr.Options.Hook[];
  defaultDate?: flatpickr.Options.DateOption;
  label?: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  /** 테이블 행 등에서 SelectInput(sm)과 높이 맞춤 */
  compact?: boolean;
  /**
   * flatpickr `monthSelect` 플러그인 — 일(day) 격자 없이 연·월만 선택. 기본 달력 스킨 유지.
   * `onValueChange`에는 `dateFormat` `Y-m` 문자열이 전달됩니다.
   */
  monthOnly?: boolean;
  /**
   * 달력 팝업 위치. 기본 `auto` — 뷰포트 여유에 따라 위/아래 자동 전환.
   */
  position?: Options["position"];
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  required = false,
  defaultDate,
  placeholder,
  value,
  onValueChange,
  className = "",
  disabled = false,
  compact = false,
  monthOnly = false,
  position = "auto",
}: PropsType) {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatPickrRef = useRef<Instance | null>(null);
  const onValueChangeRef = useRef(onValueChange);
  const onChangeRef = useRef(onChange);
  onValueChangeRef.current = onValueChange;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;

    const dark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");

    const overlayHooks = createFlatpickrOverlayHooks();

    const flatPickr = flatpickr(inputRef.current, {
      locale: Korean,
      mode: mode || "single",
      static: false,
      monthSelectorType: "static",
      ...(monthOnly
        ? {
            disableMobile: true,
            closeOnSelect: true,
            plugins: [
              monthSelectPlugin({
                shorthand: true,
                dateFormat: "Y-m",
                altFormat: "Y-m",
                theme: dark ? "dark" : "light",
              }),
            ],
          }
        : {
            dateFormat: "Y-m-d",
          }),
      defaultDate:
        coercePickerValue(String(value ?? ""), monthOnly) ||
        defaultDate ||
        undefined,
      appendTo: document.body,
      position,
      clickOpens: !disabled,
      ...overlayHooks,
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
  }, [mode, defaultDate, disabled, monthOnly, position]);

  useEffect(() => {
    if (!flatPickrRef.current) return;
    flatPickrRef.current.set("clickOpens", !disabled);
    if (inputRef.current) {
      inputRef.current.disabled = disabled;
    }
  }, [disabled]);

  useEffect(() => {
    if (!flatPickrRef.current) return;
    const v = coercePickerValue(String(value ?? ""), monthOnly);
    flatPickrRef.current.setDate(v || "", false);
  }, [value, monthOnly]);

  return (
    <div>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={`w-full rounded-lg border appearance-none bg-transparent text-gray-800 !shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 disabled:cursor-not-allowed disabled:opacity-60 ${
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
