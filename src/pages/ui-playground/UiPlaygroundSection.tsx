import type { ReactNode } from "react";

type UiPlaygroundSectionProps = {
  title: string;
  children: ReactNode;
};

export function UiPlaygroundSection({ title, children }: UiPlaygroundSectionProps) {
  return (
    <section className="space-y-5">
      <h2 className="border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

type UiPlaygroundSubsectionProps = {
  title: string;
  children: ReactNode;
};

export function UiPlaygroundSubsection({
  title,
  children,
}: UiPlaygroundSubsectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-theme-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
        {title}
      </h3>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
