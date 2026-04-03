type ApprovalModalAlternateActionProps = {
  show: boolean;
  actionLabel: string;
  onAction: () => void;
};

export default function ApprovalModalAlternateAction({
  show,
  actionLabel,
  onAction,
}: ApprovalModalAlternateActionProps) {
  if (!show) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        다른 작업
      </p>
      <button
        type="button"
        onClick={onAction}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.06]"
      >
        {actionLabel}
      </button>
    </div>
  );
}
