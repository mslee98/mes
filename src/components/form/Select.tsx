import { useMemo, useState } from "react";
import ReactSelect from "react-select";
import type { SingleValue } from "react-select";
import { useTheme } from "../../context/ThemeContext";
import { buildReactSelectStyles } from "./reactSelectStyles";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  /** 비제어 모드 초기값 */
  defaultValue?: string;
  /** 있으면 제어 컴포넌트로 동작 */
  value?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  id?: string;
  /** 검색 가능 — 국가 셀렉트 등과 동일 동작 기본값 true */
  isSearchable?: boolean;
}

/**
 * 폼 공통 단일 선택 — 내부적으로 `react-select` 사용하여 `CountrySelect`와 동일한
 * 폰트·포커스·드롭다운 스크롤 UX를 유지합니다.
 */
const Select: React.FC<SelectProps> = ({
  options,
  placeholder,
  onChange,
  className = "",
  defaultValue = "",
  value: valueProp,
  size = "md",
  disabled = false,
  id,
  isSearchable = true,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = useMemo(
    () => buildReactSelectStyles<SelectOption>(isDark, size),
    [isDark, size]
  );

  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const rawSelected = isControlled ? valueProp : uncontrolledValue;

  const selectedOption = useMemo(() => {
    const hit = options.find((o) => String(o.value) === String(rawSelected));
    return hit ?? null;
  }, [options, rawSelected]);

  const handleChange = (opt: SingleValue<SelectOption>) => {
    const next = opt?.value ?? "";
    if (!isControlled) {
      setUncontrolledValue(next);
    }
    onChange(next);
  };

  return (
    <div className={className}>
      <ReactSelect<SelectOption, false>
        inputId={id}
        instanceId={id}
        isDisabled={disabled}
        isClearable={false}
        isSearchable={isSearchable}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder ?? "선택"}
        styles={styles}
        menuPortalTarget={
          typeof document !== "undefined" ? document.body : null
        }
        menuPosition="fixed"
        noOptionsMessage={() => "항목이 없습니다."}
        filterOption={(option, input) => {
          if (!input) return true;
          const q = input.trim().toLowerCase();
          return (
            String(option.label).toLowerCase().includes(q) ||
            String(option.value).toLowerCase().includes(q)
          );
        }}
      />
    </div>
  );
};

export default Select;
