export type ButtonVariant = "solid" | "outline" | "ghost";
export type ButtonColor = "brand" | "neutral" | "success" | "warning" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "compact";

/** 상단 액션 바 등 맥락별 버튼 역할 */
export type ButtonActionRole = "navigate" | "positive" | "edit" | "primary";

const ACTION_ROLE_PRESET: Record<
  ButtonActionRole,
  { variant: ButtonVariant; color: ButtonColor }
> = {
  navigate: { variant: "outline", color: "neutral" },
  positive: { variant: "outline", color: "success" },
  edit: { variant: "outline", color: "warning" },
  primary: { variant: "solid", color: "brand" },
};

/** @deprecated — 기존 Button `variant` 호환 */
export type LegacyButtonVariant = "primary" | "outline" | "outlineBrand";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "px-3 py-1.5 text-theme-xs font-medium gap-1.5",
  compact: "px-3 py-2 text-sm font-medium gap-1.5",
  sm: "px-4 py-3 text-sm gap-2",
  md: "px-5 py-3.5 text-sm gap-2",
};

const VARIANT_COLOR_CLASSES: Record<ButtonVariant, Record<ButtonColor, string>> = {
  solid: {
    brand:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-45 dark:bg-brand-600 dark:hover:bg-brand-500",
    neutral:
      "bg-gray-700 text-white shadow-theme-xs hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500",
    success:
      "bg-success-500 text-white shadow-theme-xs hover:bg-success-600 dark:bg-success-600 dark:hover:bg-success-500",
    warning:
      "bg-warning-500 text-white shadow-theme-xs hover:bg-warning-600 dark:bg-warning-600 dark:hover:bg-warning-500",
    danger:
      "bg-red-600 text-white shadow-theme-xs hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  },
  outline: {
    brand:
      "border border-brand-500 bg-white text-brand-600 shadow-theme-xs hover:bg-brand-50 dark:border-brand-600 dark:bg-gray-800 dark:text-brand-400 dark:hover:bg-brand-500/10",
    neutral:
      "border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
    success:
      "border border-success-500 bg-white text-success-600 shadow-theme-xs hover:bg-success-50 dark:border-success-600 dark:bg-gray-800 dark:text-success-400 dark:hover:bg-success-500/10",
    warning:
      "border border-warning-500 bg-white text-warning-600 shadow-theme-xs hover:bg-warning-50 dark:border-warning-600 dark:bg-gray-800 dark:text-warning-400 dark:hover:bg-warning-500/10",
    danger:
      "border border-red-500 bg-white text-red-600 shadow-theme-xs hover:bg-red-50 dark:border-red-600 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-500/10",
  },
  ghost: {
    brand: "text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10",
    neutral: "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]",
    success: "text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-500/10",
    warning: "text-warning-600 hover:bg-warning-50 dark:text-warning-400 dark:hover:bg-warning-500/10",
    danger: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
  },
};

export function resolveButtonVariantColor(input: {
  variant?: ButtonVariant | LegacyButtonVariant;
  color?: ButtonColor;
  actionRole?: ButtonActionRole;
}): { variant: ButtonVariant; color: ButtonColor } {
  if (input.actionRole) {
    return ACTION_ROLE_PRESET[input.actionRole];
  }
  const legacy = input.variant;
  if (legacy === "primary") return { variant: "solid", color: input.color ?? "brand" };
  if (legacy === "outlineBrand") return { variant: "outline", color: "brand" };
  if (legacy === "outline") return { variant: "outline", color: input.color ?? "neutral" };
  return {
    variant: (input.variant as ButtonVariant) ?? "solid",
    color: input.color ?? "brand",
  };
}

export function buttonClassName(options: {
  variant?: ButtonVariant | LegacyButtonVariant;
  color?: ButtonColor;
  actionRole?: ButtonActionRole;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}): string {
  const { variant, color } = resolveButtonVariantColor(options);
  const size = options.size ?? "compact";
  const disabled = options.disabled ? "cursor-not-allowed opacity-45" : "";

  return [
    "inline-flex items-center justify-center rounded-lg transition",
    SIZE_CLASSES[size],
    VARIANT_COLOR_CLASSES[variant][color],
    disabled,
    options.className ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** UI Playground·문서용 액션 역할 설명 */
export const BUTTON_ACTION_ROLE_GUIDE: {
  role: ButtonActionRole;
  label: string;
  description: string;
}[] = [
  {
    role: "navigate",
    label: "목록",
    description: "탐색·이전 화면 — Neutral Outline",
  },
  {
    role: "positive",
    label: "접수",
    description: "긍정 상태 변경 — Success Outline",
  },
  {
    role: "edit",
    label: "발주 수정",
    description: "데이터 변경 — Warning Outline",
  },
  {
    role: "primary",
    label: "생산계획 등록",
    description: "핵심 CTA — Brand Solid (화면당 1개)",
  },
];
