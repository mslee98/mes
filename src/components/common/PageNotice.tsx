import type { ReactNode } from "react";

type PageNoticeVariant = "brand" | "neutral";

type PageNoticeProps = {
  children: ReactNode;
  className?: string;
  variant?: PageNoticeVariant;
};

const variantClass: Record<PageNoticeVariant, string> = {
  brand:
    "border-brand-300/80 bg-brand-50/50 text-brand-800 dark:border-brand-600/50 dark:bg-brand-500/10 dark:text-brand-200",
  neutral:
    "border-gray-200 bg-gray-50/90 text-gray-700 dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-200 " +
    "[&_strong]:font-semibold [&_strong]:text-gray-900 [&_strong]:dark:text-gray-100 " +
    "[&_code]:rounded [&_code]:bg-gray-200/90 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.8rem] [&_code]:text-gray-800 " +
    "[&_code]:dark:bg-gray-950 [&_code]:dark:text-gray-200 [&_code]:dark:ring-1 [&_code]:dark:ring-white/10",
};

/**
 * 목록·폼 상단 안내 문구용 박스. `ConfirmModal` 본문과 맞는 `text-theme-sm` 계열 타이포를 사용합니다.
 */
export default function PageNotice({
  children,
  className = "",
  variant = "brand",
}: PageNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-dashed px-4 py-3 text-theme-sm mb-6 bg-primary-50/50 text-primary-800 dark:bg-primary-900/60 dark:text-primary-200 ${variantClass[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
