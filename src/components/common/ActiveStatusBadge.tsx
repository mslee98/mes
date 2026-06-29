import Badge from "../ui/badge/Badge";
import { badgeColorFromUseStatusCode } from "../../lib/ui/badgeStatusColor";

type ActiveStatusBadgeProps = {
  active?: boolean | null;
  size?: "sm" | "md";
};

/** 활성/비활성 boolean → 공통 뱃지 (USE_STATUS 색상 규칙) */
export default function ActiveStatusBadge({
  active,
  size = "sm",
}: ActiveStatusBadgeProps) {
  const isActive = active !== false;
  const label = isActive ? "활성" : "비활성";
  const color = badgeColorFromUseStatusCode(isActive ? "ACTIVE" : "INACTIVE");

  return (
    <Badge size={size} color={color}>
      {label}
    </Badge>
  );
}
