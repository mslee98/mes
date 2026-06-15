import { RADIO_INPUT_CLASS, RADIO_LABEL_CLASS } from "../../../lib/ui/radioInputStyles";

interface RadioProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function Radio({
  id,
  name,
  value,
  checked,
  label,
  onChange,
  className = "",
  disabled = false,
}: RadioProps) {
  return (
    <div className={`flex items-center ${className}`.trim()}>
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => !disabled && onChange(value)}
        className={RADIO_INPUT_CLASS}
      />
      <label
        htmlFor={id}
        className={`${RADIO_LABEL_CLASS} ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        {label}
      </label>
    </div>
  );
}
