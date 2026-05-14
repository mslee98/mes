import type { FC, ReactNode } from "react";

interface ButtonProps {
  children: ReactNode; // Button text or content
  type?: "button" | "submit" | "reset"; // Button type
  size?: "xs" | "sm" | "md"; // Button size
  variant?: "primary" | "outline" | "outlineBrand"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: () => void; // Click handler
  disabled?: boolean; // Disabled state
  className?: string; // Extra classes
  title?: string;
}

const Button: FC<ButtonProps> = ({
  children,
  type = "button",
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  title,
}) => {
  // Size Classes
  const sizeClasses = {
    xs: "px-3 py-1.5 text-theme-xs font-medium",
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 dark:bg-brand-600 dark:hover:bg-brand-500",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    outlineBrand:
      "bg-white text-brand-600 ring-1 ring-inset ring-brand-300 shadow-theme-xs hover:bg-brand-50 disabled:text-brand-300 dark:bg-gray-900 dark:text-brand-400 dark:ring-brand-500/50 dark:hover:bg-brand-500/10 dark:disabled:text-brand-700",
  };

  return (
    <button
      type={type}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
