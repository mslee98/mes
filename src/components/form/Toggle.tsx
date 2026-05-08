interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
  disabled?: boolean;
  variant?: "brand" | "gray";
}

export default function Toggle({
  id,
  checked,
  onChange,
  activeLabel = "활성",
  inactiveLabel = "비활성",
  className,
  disabled = false,
  variant = "brand",
}: ToggleProps) {
  const trackClass = (() => {
    if (disabled) return "bg-gray-100 dark:bg-gray-800";
    if (variant === "gray") {
      return checked ? "bg-gray-800 dark:bg-gray-600" : "bg-gray-200 dark:bg-white/10";
    }
    return checked ? "bg-brand-500 dark:bg-brand-500" : "bg-gray-200 dark:bg-white/10";
  })();

  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 text-sm font-medium select-none ${
        disabled
          ? "cursor-not-allowed text-gray-400 dark:text-gray-500"
          : "cursor-pointer text-gray-700 dark:text-gray-400"
      } ${className ?? ""}`.trim()}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
          aria-checked={checked}
        />
        <div className={`block h-6 w-11 rounded-full transition-colors ${trackClass}`} />
        <div
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm transition-transform duration-200 ease-linear ${
            checked ? "translate-x-full" : "translate-x-0"
          }`}
        />
      </div>
      <span>{checked ? activeLabel : inactiveLabel}</span>
    </label>
  );
}
