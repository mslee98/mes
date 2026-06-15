import type { ReactNode } from "react";

export function BentoTile({
  title,
  className = "",
  headerEnd,
  children,
}: {
  title: string;
  className?: string;
  headerEnd?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03] sm:p-4 ${className}`.trim()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        {headerEnd}
      </div>
      {children}
    </section>
  );
}

export function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 py-1 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="min-w-0 truncate text-end text-theme-sm font-medium text-gray-800 dark:text-gray-100">
        {children}
      </dd>
    </div>
  );
}

export function InfoCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 truncate text-theme-sm font-medium text-gray-900 dark:text-white/90">
        {children}
      </dd>
    </div>
  );
}
