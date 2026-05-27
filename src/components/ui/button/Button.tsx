import type { FC, ReactNode } from "react";
import {
  buttonClassName,
  type ButtonActionRole,
  type ButtonColor,
  type ButtonSize,
  type ButtonVariant,
  type LegacyButtonVariant,
} from "../../../lib/buttonStyles";

interface ButtonProps {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  size?: ButtonSize;
  variant?: ButtonVariant | LegacyButtonVariant;
  color?: ButtonColor;
  /** 상단 액션 바 등 맥락별 프리셋 (variant/color보다 우선) */
  actionRole?: ButtonActionRole;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}

const Button: FC<ButtonProps> = ({
  children,
  type = "button",
  size = "md",
  variant = "primary",
  color,
  actionRole,
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  title,
}) => {
  return (
    <button
      type={type}
      title={title}
      className={buttonClassName({
        variant,
        color,
        actionRole,
        size,
        disabled,
        className,
      })}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon ? <span className="flex shrink-0 items-center">{startIcon}</span> : null}
      {children}
      {endIcon ? <span className="flex shrink-0 items-center">{endIcon}</span> : null}
    </button>
  );
};

export default Button;
