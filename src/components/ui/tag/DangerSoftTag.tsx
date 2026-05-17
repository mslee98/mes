import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export type DangerSoftTagProps = HTMLAttributes<HTMLSpanElement>;

/**
 * UI 디자인 시스템 — danger 소프트 태그 (`bg-danger-soft` + `text-fg-danger-strong`).
 * 지연·경고성 라벨 등에 사용.
 */
export function DangerSoftTag({ className, children, ...rest }: DangerSoftTagProps) {
  return (
    <span
      className={twMerge(
        "inline-flex max-w-full items-center rounded bg-danger-soft px-1.5 py-0.5 text-xs font-medium text-fg-danger-strong dark:bg-error-500/15 dark:text-error-300",
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
