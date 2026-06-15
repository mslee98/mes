import { memo, useCallback, type MouseEvent } from "react";
import { CopyIcon } from "../../icons";
import { copyTextToClipboard, isCopyableClipboardText } from "../../lib/ui/copyToClipboard";
import { notify } from "../../lib/notify";

export type CopyTextButtonProps = {
  value: string;
  /** 스크린리더용 — 예: "LOT 복사" */
  ariaLabel: string;
  className?: string;
};

export const CopyTextButton = memo(function CopyTextButton({
  value,
  ariaLabel,
  className = "",
}: CopyTextButtonProps) {
  const handleCopy = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const ok = await copyTextToClipboard(value);
      if (ok) {
        notify.success("복사되었습니다.");
        return;
      }
      notify.error("복사에 실패했습니다.");
    },
    [value]
  );

  if (!isCopyableClipboardText(value)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        void handleCopy(event);
      }}
      className={`inline-flex shrink-0 cursor-pointer items-center rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 focus:opacity-100 focus:outline-hidden group-hover:opacity-100 group-focus-within:opacity-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 ${className}`.trim()}
      aria-label={ariaLabel}
      title="복사"
    >
      <CopyIcon className="h-3.5 w-3.5" />
    </button>
  );
});
