import type { HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type RibbonVariant = "rounded" | "shape" | "filed" | "hover";
export type RibbonColor = "brand" | "success" | "error" | "warning" | "info";

export interface RibbonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: RibbonVariant;
  color?: RibbonColor;
  label: ReactNode;
  /** hover variant에서 라벨 옆에 표시할 아이콘 */
  hoverIcon?: ReactNode;
  /** 리본이 붙는 카드 본문 */
  children: ReactNode;
  /** 리본이 있을 때 본문 상단 여백 보정 */
  contentClassName?: string;
}

const RIBBON_BG_CLASSES: Record<RibbonColor, string> = {
  brand: "bg-brand-500",
  success: "bg-success-500",
  error: "bg-error-500",
  warning: "bg-warning-500",
  info: "bg-blue-light-500",
};

const RIBBON_SHAPE_TAIL_CLASSES: Record<RibbonColor, string> = {
  brand:
    "before:border-l-brand-500 before:border-t-brand-500 after:border-b-brand-500 after:border-l-brand-500",
  success:
    "before:border-l-success-500 before:border-t-success-500 after:border-b-success-500 after:border-l-success-500",
  error:
    "before:border-l-error-500 before:border-t-error-500 after:border-b-error-500 after:border-l-error-500",
  warning:
    "before:border-l-warning-500 before:border-t-warning-500 after:border-b-warning-500 after:border-l-warning-500",
  info:
    "before:border-l-blue-light-500 before:border-t-blue-light-500 after:border-b-blue-light-500 after:border-l-blue-light-500",
};

const DEFAULT_HOVER_ICON = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M10.679 2.2915L3.98828 11.6958H9.32224L9.32224 17.7082L16.013 8.30385L10.679 8.30385V2.2915Z"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function RibbonLabel({
  variant,
  color,
  label,
  hoverIcon,
}: Pick<RibbonProps, "variant" | "color" | "label" | "hoverIcon">) {
  const bgClass = RIBBON_BG_CLASSES[color ?? "brand"];
  const shapeTailClass = RIBBON_SHAPE_TAIL_CLASSES[color ?? "brand"];

  if (variant === "rounded") {
    return (
      <span
        className={twMerge(
          "absolute -left-px mt-3 inline-block rounded-r-full px-4 py-1.5 text-sm font-medium text-white",
          bgClass
        )}
      >
        {label}
      </span>
    );
  }

  if (variant === "shape") {
    return (
      <span
        className={twMerge(
          "absolute -left-px mt-3 inline-block px-4 py-1.5 text-sm font-medium text-white",
          "before:absolute before:-right-4 before:top-0 before:border-[13px] before:border-transparent before:content-['']",
          "after:absolute after:-right-4 after:bottom-0 after:border-[13px] after:border-transparent after:content-['']",
          bgClass,
          shapeTailClass
        )}
      >
        {label}
      </span>
    );
  }

  if (variant === "filed") {
    return (
      <span
        className={twMerge(
          "absolute -left-9 -top-7 mt-3 flex h-14 w-24 -rotate-45 items-end justify-center px-4 py-1.5 text-sm font-medium text-white shadow-theme-xs",
          bgClass
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={twMerge(
        "absolute -left-px mt-3 flex -translate-x-[55px] items-center gap-1 px-4 py-1.5 text-sm font-medium text-white transition-transform duration-500 ease-in-out",
        "before:absolute before:-right-4 before:top-0 before:border-[16px] before:border-transparent before:content-['']",
        "after:absolute after:-right-4 after:bottom-0 after:border-[16px] after:border-transparent after:content-['']",
        "group-hover:translate-x-0",
        bgClass,
        shapeTailClass
      )}
    >
      <span className="opacity-0 transition-opacity duration-300 ease-linear group-hover:opacity-100">
        {label}
      </span>
      {hoverIcon ?? DEFAULT_HOVER_ICON}
    </span>
  );
}

/**
 * 카드·패널 좌측에 리본 라벨을 붙이는 컨테이너.
 * variant: rounded | shape | filed | hover
 */
export function Ribbon({
  variant = "rounded",
  color = "brand",
  label,
  hoverIcon,
  children,
  className,
  contentClassName,
  ...rest
}: RibbonProps) {
  const needsTopPadding = variant === "rounded" || variant === "shape" || variant === "filed" || variant === "hover";

  return (
    <div
      className={twMerge(
        "group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 dark:bg-white/[0.03]",
        variant === "hover" && "group",
        className
      )}
      {...rest}
    >
      <RibbonLabel variant={variant} color={color} label={label} hoverIcon={hoverIcon} />
      <div
        className={twMerge(
          "p-5",
          needsTopPadding && "pt-16",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
