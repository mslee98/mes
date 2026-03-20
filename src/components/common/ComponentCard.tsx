import type { ReactNode } from "react";

interface ComponentCardProps {
    title: string;
    /** 제목과 같은 줄 오른쪽 (예: 액션 버튼) */
    headerEnd?: ReactNode;
    children: React.ReactNode;
    className?: string; // Additional custom classes for styling
    bodyClassName?: string;
    contentClassName?: string;
    desc?: string; // Description text
  }
  
  const ComponentCard: React.FC<ComponentCardProps> = ({
    title,
    headerEnd,
    children,
    className = "",
    bodyClassName = "",
    contentClassName = "",
    desc = "",
  }) => {
    return (
      <div
        className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
      >
        {/* Card Header */}
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {title}
            </h3>
            {headerEnd ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {headerEnd}
              </div>
            ) : null}
          </div>
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
  
        {/* Card Body */}
        <div
          className={`border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6 ${bodyClassName}`}
        >
          <div className={`space-y-6 ${contentClassName}`}>{children}</div>
        </div>
      </div>
    );
  };
  
  export default ComponentCard;