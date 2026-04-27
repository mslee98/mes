import { useMemo } from "react";
import Select from "react-select";
import Label from "./Label";
import { useTheme } from "../../context/ThemeContext";
import {
  PARTNER_COUNTRY_OPTIONS,
  partnerCountryFlagUrl,
} from "../../lib/partnerCountryOptions";
import { buildReactSelectStyles } from "./reactSelectStyles";

export type CountrySelectOption = {
  value: string;
  label: string;
  flagUrl?: string;
};

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
  required?: boolean;
  value: string;
  onChange: (code: string) => void;
  isDisabled?: boolean;
  helpText?: React.ReactNode;
  showLabel?: boolean;
}

export default function CountrySelect({
  id,
  label,
  required = false,
  value,
  onChange,
  isDisabled = false,
  helpText,
  showLabel = true,
}: CountrySelectProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = useMemo(
    () => buildReactSelectStyles<CountrySelectOption>(isDark, "md"),
    [isDark]
  );

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
      {showLabel ? (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      ) : null}
      <div className={showLabel ? "mt-1" : ""}>
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
