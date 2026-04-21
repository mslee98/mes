import type { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}

const Label: FC<LabelProps> = ({ htmlFor, children, className, required = false }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx(
        twMerge(
          "mb-1.5 block text-sm font-semibold text-gray-800 dark:text-white/90",
          className,
        ),
      )}
    >
      {children}
      {required ? (
        <span className="ml-1 align-middle text-error-500 dark:text-error-400">*</span>
      ) : null}
    </label>
  );
};

export default Label;
