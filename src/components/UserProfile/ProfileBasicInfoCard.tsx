import type { UserItem } from "../../api/user";
import { getOrganizationPath } from "../../api/user";
import { UserSolidIcon } from "../../icons";
import ComponentCard from "../common/ComponentCard";

interface ProfileBasicInfoCardProps {
  user: UserItem | null;
  /** API에서 사용자 조회 실패 시 auth만 있을 때 (사번, 이름만) */
  fallback?: { employeeNo: number; name?: string };
}

export default function ProfileBasicInfoCard({
  user,
  fallback,
}: ProfileBasicInfoCardProps) {
  const displayName = user?.name ?? fallback?.name ?? "-";
  const displayEmployeeNo = user?.employeeNo ?? fallback?.employeeNo ?? "-";

  const activeOrgs = (user?.userOrganizations ?? []).filter(
    (uo) => uo.isActive !== false
  );
  const primaryFirst = [...activeOrgs].sort((a, b) =>
    (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)
  );

  return (
    <ComponentCard title="기본 정보" desc="로그인한 사용자의 기본 정보입니다.">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <UserSolidIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
        </span>
        <div className="min-w-0 flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">사번</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {String(displayEmployeeNo)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">이름</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {displayName}
            </p>
          </div>
          {user?.email != null && (
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">이메일</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {user.email || "-"}
              </p>
            </div>
          )}
          {user?.phoneNumber != null && (
            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">연락처</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {user.phoneNumber || "-"}
              </p>
            </div>
          )}
          {primaryFirst.length > 0 && (
            <div className="sm:col-span-2 space-y-2">
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">소속 조직</p>
              {primaryFirst.map((uo) => (
                <div
                  key={uo.id}
                  className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 dark:border-white/[0.05] dark:bg-white/[0.02]"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {getOrganizationPath(uo.organizationUnit)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {uo.position?.name && (
                      <span>직위: {uo.position.name}</span>
                    )}
                    {uo.jobTitle?.name && (
                      <span>직급: {uo.jobTitle.name}</span>
                    )}
                    {uo.isPrimary && (
                      <span className="text-brand-600 dark:text-brand-400">주 소속</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ComponentCard>
  );
}
