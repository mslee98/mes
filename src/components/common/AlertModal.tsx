import type { ReactNode } from "react";
import { Modal } from "../ui/modal";
import { CheckCircleIcon, TrashBinIcon } from "../../icons";

type AlertModalAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "secondary";
  disabled?: boolean;
};

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseButtonClick?: () => void;
  /** Modal 상단 헤더 바 제목(예: 주의). 본문 `title`과 역할을 분리합니다. */
  headerLabel?: string;
  /** 헤더 제목 아래 보조 문구 */
  headerDescription?: string;
  title: string;
  message: string;
  description?: ReactNode;
  illustration?: "trash" | "check-circle" | "warning";
  actions: AlertModalAction[];
  className?: string;
}

export default function AlertModal({
  isOpen,
  onClose,
  onCloseButtonClick,
  headerLabel,
  headerDescription,
  title,
  message,
  description,
  illustration = "warning",
  actions,
  className = "mx-4 max-w-md p-6 text-center sm:p-8",
}: AlertModalProps) {
  const iconWrapClass =
    illustration === "check-circle"
      ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400"
      : illustration === "trash"
        ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"
        : "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400";

  const icon = (() => {
    if (illustration === "check-circle") {
      return <CheckCircleIcon className="h-10 w-10" aria-hidden />;
    }
    if (illustration === "trash") {
      return <TrashBinIcon className="h-10 w-10" aria-hidden />;
    }
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  })();

  const buttonClass = (variant: AlertModalAction["variant"]) => {
    if (variant === "danger") {
      return "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-900";
    }
    if (variant === "secondary") {
      return "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";
    }
    return "bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-300 dark:bg-brand-600 dark:hover:bg-brand-700 dark:focus:ring-brand-900";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onCloseButtonClick={onCloseButtonClick}
      className={className}
      header={
        headerLabel ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {headerLabel}
            </h3>
            {headerDescription ? (
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {headerDescription}
              </p>
            ) : null}
          </>
        ) : undefined
      }
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconWrapClass}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-300">{message}</p>
      {description ? <div className="mt-2 text-xs leading-5 text-gray-400 dark:text-gray-500">{description}</div> : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={`inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass(
              action.variant
            )}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
