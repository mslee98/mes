import { useMemo } from "react";
import Select, {
  type GroupBase,
  type StylesConfig,
} from "react-select";
import Label from "./Label";
import { useTheme } from "../../context/ThemeContext";
import {
  PARTNER_COUNTRY_OPTIONS,
  partnerCountryFlagUrl,
} from "../../lib/partnerCountryOptions";

export type CountrySelectOption = {
  value: string;
  label: string;
  flagUrl?: string;
};

function buildStyles(
  isDark: boolean
): StylesConfig<CountrySelectOption, false, GroupBase<CountrySelectOption>> {
  const bg = isDark ? "#111827" : "#ffffff";
  const border = isDark ? "#374151" : "#d1d5db";
  const text = isDark ? "#f9fafb" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const hoverBg = isDark ? "#1f2937" : "#f3f4f6";
  const focusRing = "0 0 0 2px rgba(70, 95, 255, 0.25)";

  return {
    container: (base) => ({ ...base, width: "100%" }),
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      fontSize: 14,
      borderRadius: 8,
      backgroundColor: bg,
      borderColor: state.isFocused ? "#465fff" : border,
      boxShadow: state.isFocused ? focusRing : "none",
      "&:hover": { borderColor: state.isFocused ? "#465fff" : border },
    }),
    menu: (base) => ({ ...base, backgroundColor: bg, zIndex: 10001 }),
    menuPortal: (base) => ({ ...base, zIndex: 100020 }),
    menuList: (base) => ({ ...base, padding: 4 }),
    option: (base, state) => ({
      ...base,
      cursor: "pointer",
      backgroundColor: state.isSelected
        ? isDark
          ? "#312e81"
          : "#e0e7ff"
        : state.isFocused
          ? hoverBg
          : "transparent",
      color: text,
    }),
    singleValue: (base) => ({ ...base, color: text }),
    input: (base) => ({ ...base, color: text }),
    placeholder: (base) => ({ ...base, color: muted }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: border }),
    dropdownIndicator: (base) => ({ ...base, color: muted }),
  };
}

function CountryOptionLabel({
  label,
  flagUrl,
}: {
  label: string;
  flagUrl?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {flagUrl ? (
        <img
          src={flagUrl}
          alt=""
          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
          decoding="async"
        />
      ) : (
        <span
          className="inline-flex h-5 w-[1.375rem] shrink-0 items-center justify-center rounded-sm bg-gray-100 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          aria-hidden
        >
          ···
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}

export interface CountrySelectProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (code: string) => void;
  isDisabled?: boolean;
  helpText?: React.ReactNode;
}

export default function CountrySelect({
  id,
  label,
  value,
  onChange,
  isDisabled = false,
  helpText,
}: CountrySelectProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = useMemo(() => buildStyles(isDark), [isDark]);

  const options: CountrySelectOption[] = useMemo(
    () =>
      PARTNER_COUNTRY_OPTIONS.map((c) => ({
        value: c.code,
        label: c.label,
        flagUrl: partnerCountryFlagUrl(c.code),
      })),
    []
  );

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">
        <Select<CountrySelectOption, false>
          inputId={id}
          instanceId={id}
          isDisabled={isDisabled}
          isClearable={false}
          isSearchable
          options={options}
          value={selected}
          onChange={(opt) => onChange(opt?.value ?? "")}
          styles={styles}
          menuPortalTarget={
            typeof document !== "undefined" ? document.body : null
          }
          menuPosition="fixed"
          placeholder="국가 선택"
          formatOptionLabel={(option) => (
            <CountryOptionLabel label={option.label} flagUrl={option.flagUrl} />
          )}
          filterOption={(option, input) => {
            if (!input) return true;
            const q = input.trim().toLowerCase();
            const { label: lb, value: v } = option;
            return (
              String(lb).toLowerCase().includes(q) ||
              String(v).toLowerCase().includes(q)
            );
          }}
          noOptionsMessage={() => "일치하는 국가가 없습니다."}
        />
      </div>
      {helpText ? (
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
