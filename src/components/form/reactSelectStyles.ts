import type { GroupBase, StylesConfig } from "react-select";

/**
 * 공통 react-select 스타일 — `CountrySelect`, 폼용 `Select` 등에서 동일 UX(폰트·포커스·드롭다운 스크롤) 유지.
 */
export function buildReactSelectStyles<
  Option extends { label: string; value: string },
>(
  isDark: boolean,
  size: "sm" | "md" = "md"
): StylesConfig<Option, false, GroupBase<Option>> {
  const bg = isDark ? "#111827" : "#ffffff";
  const border = isDark ? "#374151" : "#d1d5db";
  const text = isDark ? "#f9fafb" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const hoverBg = isDark ? "#1f2937" : "#f3f4f6";
  const focusRing = "0 0 0 2px rgba(70, 95, 255, 0.25)";
  const baseShadow = "0 1px 2px rgba(16, 24, 40, 0.05)";
  const minHeight = size === "sm" ? 36 : 44;
  const fontSize = size === "sm" ? 12 : 14;

  return {
    container: (base) => ({ ...base, width: "100%" }),
    control: (base, state) => ({
      ...base,
      minHeight,
      height: minHeight,
      fontSize,
      borderRadius: 8,
      backgroundColor: bg,
      borderColor: state.isFocused ? "#465fff" : border,
      boxShadow: state.isFocused ? `${focusRing}, ${baseShadow}` : baseShadow,
      "&:hover": { borderColor: state.isFocused ? "#465fff" : border },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: bg,
      zIndex: 10001,
      fontSize,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 100020 }),
    menuList: (base) => ({
      ...base,
      padding: 4,
      maxHeight: 280,
      overflowY: "auto",
    }),
    option: (base, state) => ({
      ...base,
      cursor: "pointer",
      fontSize,
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
    valueContainer: (base) => ({ ...base, paddingLeft: 12, paddingRight: 8 }),
  };
}
