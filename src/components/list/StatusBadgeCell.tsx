import Badge from "../ui/badge/Badge";
import { badgeColorFromKoStatusLabel } from "../../lib/ui/badgeStatusColor";

type StatusBadgeCellProps = {
  label: string;
};

/** 리스트 상태 컬럼 — 한글 라벨 기준 badge 색상 매핑 */
export function StatusBadgeCell({ label }: StatusBadgeCellProps) {
  return (
    <Badge size="sm" color={badgeColorFromKoStatusLabel(label)}>
      {label}
    </Badge>
  );
}
