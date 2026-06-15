import type { ReactNode } from "react";
import Label from "./Label";

export type FormFieldHelpTone = "default" | "error" | "success";

interface FormFieldProps {
  id?: string;
  label: ReactNode;
  required?: boolean;
  control: ReactNode;
  helpText?: ReactNode;
  helpTone?: FormFieldHelpTone;
  reserveHelpSpace?: boolean;
  controlMarginClassName?: string;
}

const HELP_TONE_CLASS: Record<FormFieldHelpTone, string> = {
  default: "text-gray-500 dark:text-gray-400",
  error: "text-error-500 dark:text-error-400",
  success: "text-success-500 dark:text-success-600",
};

export default function FormField({
  id,
  label,
  required = false,
  control,
  helpText,
  helpTone = "default",
  reserveHelpSpace = true,
  controlMarginClassName = "mt-1",
}: FormFieldProps) {
  const showHelpSlot = reserveHelpSpace || helpText;
  const helpVisible = helpText != null && helpText !== "";

  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className={controlMarginClassName}>{control}</div>
      {showHelpSlot ? (
        <p
          className={`mt-1 min-h-[1.125rem] text-theme-xs leading-snug ${
            helpVisible ? HELP_TONE_CLASS[helpTone] : "invisible"
          }`}
        >
          {helpVisible ? helpText : "\u00A0"}
        </p>
      ) : null}
    </div>
  );
}
