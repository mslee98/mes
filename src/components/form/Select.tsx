import { useState } from "react";
import { ChevronDownIcon } from "../../icons";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  size?: "sm" | "md";
}

const sizeStyles = {
  sm: "h-9 rounded-md border px-3 py-1.5 pr-9 text-theme-xs",
  md: "h-11 rounded-lg border px-4 py-2.5 pr-10 text-sm",
};

const iconSizeStyles = {
  sm: "right-2.5 w-4 h-4",
  md: "right-3 w-5 h-5",
};

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
  size = "md",
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    onChange(value);
  };

  return (
    <div className={`relative ${className}`}>
      <select
        className={`w-full appearance-none border border-gray-300 bg-white shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
          sizeStyles[size]
        } ${
          selectedValue
            ? "text-gray-800 dark:text-white/90"
            : "text-gray-400 dark:text-gray-400"
        }`}
        value={selectedValue}
        onChange={handleChange}
      >
        <option
          value=""
          disabled
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 ${iconSizeStyles[size]}`}
        aria-hidden
      />
    </div>
  );
};

export default Select;
