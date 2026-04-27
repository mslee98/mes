interface ActiveToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export default function ActiveToggle({
  id,
  checked,
  onChange,
  activeLabel = "활성",
  inactiveLabel = "비활성",
  className,
}: ActiveToggleProps) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700 select-none dark:text-gray-400 ${className ?? ""}`.trim()}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`block h-6 w-11 rounded-full ${
            checked ? "bg-brand-500 dark:bg-brand-500" : "bg-gray-200 dark:bg-white/10"
          }`}
        />
        <div
          className={`shadow-theme-sm absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white duration-300 ease-linear ${
            checked ? "translate-x-full" : "translate-x-0"
          }`}
        />
      </div>
      {checked ? activeLabel : inactiveLabel}
    </label>
  );
}
