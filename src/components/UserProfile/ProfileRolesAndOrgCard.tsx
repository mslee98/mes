import type { UserRoleAssignment } from "../../api/userRole";
import ComponentCard from "../common/ComponentCard";
import Badge from "../ui/badge/Badge";

interface ProfileRolesCardProps {
  roles: UserRoleAssignment[];
  isLoading?: boolean;
}

export default function ProfileRolesCard({
  roles,
  isLoading,
}: ProfileRolesCardProps) {
  const activeRoles = roles.filter((r) => r.isActive);

  return (
    <ComponentCard
      title="역할"
      desc="부여된 역할 목록입니다. (활성만 표시)"
    >
      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          역할 정보를 불러오는 중...
        </p>
      ) : activeRoles.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          부여된 역할이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {activeRoles.map((assignment) => (
            <li
              key={assignment.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-white/[0.05]"
            >
              <Badge size="sm" color="primary">
                {assignment.role.name}
              </Badge>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {assignment.role.code}
              </span>
              {assignment.role.description && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {assignment.role.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </ComponentCard>
  );
}
