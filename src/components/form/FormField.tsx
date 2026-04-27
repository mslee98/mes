import type { ReactNode } from "react";
import Label from "./Label";

interface FormFieldProps {
  id?: string;
  label: ReactNode;
  required?: boolean;
  control: ReactNode;
  helpText?: ReactNode;
  reserveHelpSpace?: boolean;
  controlMarginClassName?: string;
}

export default function FormField({
  id,
  label,
  required = false,
  control,
  helpText,
  reserveHelpSpace = true,
  controlMarginClassName = "mt-1",
}: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className={controlMarginClassName}>{control}</div>
      {reserveHelpSpace || helpText ? (
        <p
          className={`mt-1 text-theme-xs ${
            helpText ? "text-gray-500 dark:text-gray-400" : "invisible"
          }`}
        >
          {helpText ?? "placeholder"}
        </p>
      ) : null}
    </div>
  );
}
