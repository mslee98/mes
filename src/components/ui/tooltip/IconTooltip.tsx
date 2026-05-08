import { InformationCircleIcon } from "../../../icons";
import Tooltip from "./Tooltip";

export interface IconTooltipProps {
  content: string;
  ariaLabel: string;
  className?: string;
  placement?: "top" | "bottom";
}

export default function IconTooltip({
  content,
  ariaLabel,
  className = "",
  placement = "top",
}: IconTooltipProps) {
  return (
    <Tooltip
      content={content}
      placement={placement}
      className={className}
      tooltipClassName="max-w-72"
    >
      <button
        type="button"
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1 text-theme-xs font-medium text-gray-500 hover:text-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/20 dark:text-gray-400 dark:hover:text-brand-400"
      >
        <InformationCircleIcon className="h-4 w-4" aria-hidden />
      </button>
    </Tooltip>
  );
}
