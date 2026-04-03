import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "../../icons";

interface ComponentCardProps {
  title: string;
  /** 제목과 같은 줄 오른쪽 (예: 액션 버튼) */
  headerEnd?: ReactNode;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  bodyClassName?: string;
  contentClassName?: string;
  desc?: string; // Description text
  /** true면 헤더에서 본문 접기/펼치기 (코랩스) */
  collapsible?: boolean;
  /** collapsible일 때 초기 접힘 여부 */
  defaultCollapsed?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  headerEnd,
  children,
  className = "",
  bodyClassName = "",
  contentClassName = "",
  desc = "",
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const bodyId = useId();
  const triggerId = `${bodyId}-trigger`;
  const [open, setOpen] = useState(!defaultCollapsed);

  const titleBlock = collapsible ? (
    <button
      type="button"
      id={triggerId}
      className="group flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left text-gray-800 outline-none ring-brand-500/40 transition-colors hover:bg-gray-50 focus-visible:ring-2 dark:text-white/90 dark:hover:bg-white/[0.04]"
      aria-expanded={open}
      aria-controls={bodyId}
      onClick={() => setOpen((v) => !v)}
    >
      <ChevronDownIcon
        className={`mt-0.5 size-5 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
          open ? "rotate-0" : "-rotate-90"
        }`}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block text-base font-medium">{title}</span>
        {desc ? (
          <span className="mt-1 block text-sm font-normal text-gray-500 dark:text-gray-400">
            {desc}
          </span>
        ) : null}
      </span>
    </button>
  ) : (
    <div className="min-w-0 flex-1">
      <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
        {title}
      </h3>
      {desc ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>
      ) : null}
    </div>
  );

  const bodyHidden = collapsible && !open;

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      <div className={`px-6 py-5 ${collapsible ? "pb-4" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          {titleBlock}
          {headerEnd ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 pt-0.5">
              {headerEnd}
            </div>
          ) : null}
        </div>
      </div>

      <div
        id={bodyId}
        role={collapsible ? "region" : undefined}
        aria-labelledby={collapsible ? triggerId : undefined}
        hidden={bodyHidden}
        className={`border-t border-gray-100 dark:border-gray-800 sm:p-6 ${bodyClassName} ${
          bodyHidden ? "p-0 sm:p-0" : "p-4"
        }`}
      >
        <div className={`space-y-6 ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
