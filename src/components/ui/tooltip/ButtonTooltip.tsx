import Tooltip from "./Tooltip";

export interface ButtonTooltipProps {
  content: string;
  label: string;
  className?: string;
  placement?: "top" | "bottom";
}

export default function ButtonTooltip({
  content,
  label,
  className = "",
  placement = "top",
}: ButtonTooltipProps) {
  return (
    <Tooltip
      content={content}
      placement={placement}
      className={className}
      tooltipClassName="max-w-80"
    >
      <button
        type="button"
        className="rounded-lg bg-brand-500 rounded-base border border-transparent bg-brand px-4 py-2.5 text-sm font-medium leading-5 text-white shadow-xs hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/30"
      >
        {label}
      </button>
    </Tooltip>
  );
}
