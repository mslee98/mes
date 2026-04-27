import Input from "./input/InputField";

type AddonPlacement = "inside-left" | "outside-left" | "outside-right";

interface InputAddonFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  addon: React.ReactNode;
  addonPlacement: AddonPlacement;
  addonAriaLabel?: string;
  type?: string;
}

export default function InputAddonField({
  id,
  value,
  onChange,
  placeholder,
  addon,
  addonPlacement,
  addonAriaLabel,
  type = "text",
}: InputAddonFieldProps) {
  if (addonPlacement === "inside-left") {
    return (
      <div className="relative mt-1.5">
        <span
          className="pointer-events-none absolute top-1/2 left-0 z-10 flex h-11 -translate-y-1/2 items-center border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400"
          aria-label={addonAriaLabel}
        >
          {addon}
        </span>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-[58px]"
        />
      </div>
    );
  }

  const isOutsideLeft = addonPlacement === "outside-left";
  return (
    <div className="mt-1.5 flex w-full rounded-lg shadow-theme-xs">
      {isOutsideLeft ? (
        <span
          className="inline-flex h-11 items-center rounded-l-lg border border-gray-300 border-r-0 px-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
          aria-label={addonAriaLabel}
        >
          {addon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${isOutsideLeft ? "rounded-l-none" : "rounded-r-none"} shadow-none`}
        />
      </div>
      {!isOutsideLeft ? (
        <span
          className="inline-flex h-11 items-center rounded-r-lg border border-gray-300 border-l-0 px-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
          aria-label={addonAriaLabel}
        >
          {addon}
        </span>
      ) : null}
    </div>
  );
}
