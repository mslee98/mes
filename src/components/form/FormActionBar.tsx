import { Link } from "react-router";

interface FormActionBarProps {
  submitLabel: string;
  pendingSubmitLabel?: string;
  isPending?: boolean;
  submitDisabled?: boolean;
  cancelLabel?: string;
  cancelTo?: string;
  onCancel?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function FormActionBar({
  submitLabel,
  pendingSubmitLabel,
  isPending = false,
  submitDisabled = false,
  cancelLabel = "취소",
  cancelTo,
  onCancel,
  className,
  children,
}: FormActionBarProps) {
  return (
    <div
      className={`mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-white/5 ${className ?? ""}`.trim()}
    >
      <button
        type="submit"
        disabled={isPending || submitDisabled}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {isPending ? pendingSubmitLabel ?? submitLabel : submitLabel}
      </button>
      {cancelTo ? (
        <Link
          to={cancelTo}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {cancelLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {cancelLabel}
        </button>
      )}
      {children}
    </div>
  );
}
