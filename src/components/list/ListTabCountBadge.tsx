import Badge from "../ui/badge/Badge";

export type ListTabBadgeTone =
  | "all"
  | "primary"
  | "success"
  | "warning"
  | "waiting"
  | "error"
  | "info";

type ListTabCountBadgeProps = {
  count: number;
  tone: ListTabBadgeTone;
};

function badgePropsForTone(tone: ListTabBadgeTone): {
  variant?: "solid";
  color: "dark" | "primary" | "success" | "warning" | "error" | "info";
} {
  switch (tone) {
    case "all":
      return { variant: "solid", color: "dark" };
    case "waiting":
      return { variant: "solid", color: "dark" };
    case "success":
      return { color: "success" };
    case "warning":
      return { color: "warning" };
    case "error":
      return { color: "error" };
    case "info":
      return { color: "info" };
    case "primary":
    default:
      return { color: "primary" };
  }
}

/** 목록 SegmentedControl 탭 옆 건수 뱃지 */
export function ListTabCountBadge({ count, tone }: ListTabCountBadgeProps) {
  const badgeProps = badgePropsForTone(tone);
  return (
    <Badge size="sm" {...badgeProps}>
      {count}
    </Badge>
  );
}
