import { useMemo } from "react";
import Select, {
  type FormatOptionLabelMeta,
  type GroupBase,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import Label from "./Label";
import InfoActionPopover from "./InfoActionPopover";
import { useTheme } from "../../context/ThemeContext";

export type SearchableSelectOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
  countryCode?: string;
};

export interface SearchableSelectWithCreateProps {
  id?: string;
  label?: string;
  /** 선택 값 (빈 문자열이면 미선택) */
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  noOptionsMessage?: string;
  addButtonLabel: string;
  onAddClick: () => void;
  /** `below`: 셀렉트 아래 점선 추가 버튼. `popover`: 라벨 옆 정보 아이콘 팝오버. `none`: 추가 UI 없음(테이블 헤더 등에서 별도 배치) */
  addTrigger?: "below" | "popover" | "none";
  /** `addTrigger="popover"`일 때 팝오버 본문 */
  popoverDescription?: string;
  popoverAriaLabel?: string;
  /**
   * 라벨 없이 `popover` 사용 시(예: 테이블 셀): 정보 아이콘을 셀렉트 위가 아니라 **옆**에 붙여 세로 공간을 줄임.
   */
  popoverBesideSelect?: boolean;
  isDisabled?: boolean;
  /** 테이블 셀 등 좁은 영역에서 전체 너비 */
  className?: string;
  /** 테이블 행에서 SelectInput(sm)·DatePicker(compact)과 높이 맞춤 */
  compact?: boolean;
  /** `false`면 선택 후 X(지우기) 숨김 — 테이블 제품 등 */
  isClearable?: boolean;
  /** 옵션/선택값 커스텀 렌더 */
  formatOptionLabel?: (
    option: SearchableSelectOption,
    meta: FormatOptionLabelMeta<SearchableSelectOption>
  ) => React.ReactNode;
}

function buildStyles(
  isDark: boolean,
  compact: boolean
): StylesConfig<SearchableSelectOption, false, GroupBase<SearchableSelectOption>> {
  const bg = isDark ? "#111827" : "#ffffff";
  const border = isDark ? "#374151" : "#d1d5db";
  const text = isDark ? "#f9fafb" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const hoverBg = isDark ? "#1f2937" : "#f3f4f6";
  const focusRing = "0 0 0 2px rgba(70, 95, 255, 0.25)";
  const minHeight = compact ? 36 : 44;
  const fontSize = compact ? 12 : 14;

  return {
    container: (base) => ({
      ...base,
      width: "100%",
    }),
    control: (base, state) => ({
      ...base,
      minHeight,
      fontSize,
      borderRadius: 8,
      backgroundColor: bg,
      borderColor: state.isFocused ? "#465fff" : border,
      boxShadow: state.isFocused ? focusRing : "none",
      "&:hover": { borderColor: state.isFocused ? "#465fff" : border },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: bg,
      zIndex: 10001,
      // 테이블 셀 등 좁은 트리거에서도 옵션 한 줄에 가깝게 보이도록 메뉴만 넓힘
      ...(compact
        ? {
            minWidth: "max(100%, 28rem)",
          }
        : {}),
    }),
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
    clearIndicator: (base) => ({ ...base, color: muted }),
  };
}

export default function SearchableSelectWithCreate({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "검색하여 선택",
  noOptionsMessage = "일치하는 항목이 없습니다.",
  addButtonLabel,
  onAddClick,
  addTrigger = "below",
  popoverDescription = "",
  popoverAriaLabel,
  popoverBesideSelect = false,
  isDisabled = false,
  className = "",
  compact = false,
  isClearable = true,
  formatOptionLabel,
}: SearchableSelectWithCreateProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = useMemo(
    () => buildStyles(isDark, compact),
    [isDark, compact]
  );

  const selected: SingleValue<SearchableSelectOption> = useMemo(() => {
    if (!value) return null;
    return options.find((o) => o.value === value) ?? null;
  }, [value, options]);

  const showBelowAdd = addTrigger === "below";
  const showPopoverAdd = addTrigger === "popover";
  const showNoAdd = addTrigger === "none";

  const popoverForInline =
    showPopoverAdd && !label ? (
      <InfoActionPopover
        ariaLabel={popoverAriaLabel ?? "추가 안내"}
        description={
          popoverDescription ||
          "목록에 없으면 등록 후 바로 선택할 수 있습니다."
        }
        actionLabel={addButtonLabel}
        onAction={onAddClick}
        disabled={isDisabled}
      />
    ) : null;

  const searchableSelect = (
    <Select<SearchableSelectOption, false>
      inputId={id}
      instanceId={id}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable
      options={options}
      placeholder={placeholder}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? "")}
      styles={styles}
      menuPortalTarget={
        typeof document !== "undefined" ? document.body : null
      }
      menuPosition="fixed"
      noOptionsMessage={() => noOptionsMessage}
      filterOption={(option, input) => {
        if (!input) return true;
        const q = input.trim().toLowerCase();
        const labelStr = String(option.label ?? "").toLowerCase();
        const valueStr = String(option.value ?? "").toLowerCase();
        return labelStr.includes(q) || valueStr.includes(q);
      }}
      formatOptionLabel={formatOptionLabel}
    />
  );

  return (
    <div className={className}>
      {label ? (
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Label htmlFor={id} className="!mb-0">
            {label}
          </Label>
          {showPopoverAdd ? (
            <InfoActionPopover
              ariaLabel={
                popoverAriaLabel ??
                `${label.replace(/\s*\*\s*$/, "")} 안내 및 빠른 등록`
              }
              description={
                popoverDescription ||
                "목록에 없으면 등록 후 바로 선택할 수 있습니다."
              }
              actionLabel={addButtonLabel}
              onAction={onAddClick}
              disabled={isDisabled}
            />
          ) : null}
        </div>
      ) : showPopoverAdd && !popoverBesideSelect ? (
        <div className="mb-1.5 flex justify-end">{popoverForInline}</div>
      ) : null}
      {showNoAdd ? (
        searchableSelect
      ) : showPopoverAdd && !label && popoverBesideSelect ? (
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">{searchableSelect}</div>
          {popoverForInline}
        </div>
      ) : (
        searchableSelect
      )}
      {showBelowAdd ? (
        <button
          type="button"
          onClick={onAddClick}
          disabled={isDisabled}
          className="mt-2 w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-gray-800"
        >
          + {addButtonLabel}
        </button>
      ) : null}
    </div>
  );
}
