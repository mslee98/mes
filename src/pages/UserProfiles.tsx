import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { getUsers, type UserItem } from "../api/user";
import { getUserRoles } from "../api/userRole";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import LoadingLottie from "../components/common/LoadingLottie";
import ProfileBasicInfoCard from "../components/UserProfile/ProfileBasicInfoCard";
import ProfilePasswordCard from "../components/UserProfile/ProfilePasswordCard";
import ProfileRolesCard from "../components/UserProfile/ProfileRolesAndOrgCard";

export default function UserProfiles() {
  const { user: authUser, accessToken, isLoading: isAuthLoading } = useAuth();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });

  const currentUser = useMemo((): UserItem | null => {
    if (!authUser?.employeeNo) return null;
    const found = users.find(
      (u) => Number(u.employeeNo) === Number(authUser.employeeNo)
    );
    return found ?? null;
  }, [authUser?.employeeNo, users]);

  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ["userRoles", "me", currentUser?.id],
    queryFn: () => getUserRoles(currentUser!.id, accessToken as string),
    enabled: !!accessToken && !!currentUser?.id && !isAuthLoading,
  });

  if (isAuthLoading) {
    return (
      <>
        <PageMeta title="내 프로필" description="내 프로필 및 비밀번호 변경" />
        <PageBreadcrumb pageTitle="내 프로필" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="프로필을 불러오는 중..." />
        </div>
      </>
    );
  }

  if (!accessToken || !authUser) {
    return (
      <>
        <PageMeta title="내 프로필" description="내 프로필" />
        <PageBreadcrumb pageTitle="내 프로필" />
        <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">로그인 후 프로필을 조회할 수 있습니다.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="내 프로필"
        description="기본 정보, 비밀번호 변경, 역할 및 조직 정보"
      />
      <PageBreadcrumb pageTitle="내 프로필" />
      <div className="space-y-6">
        <ProfileBasicInfoCard
          user={currentUser}
          fallback={{
            employeeNo: authUser.employeeNo as number,
            name: authUser.name as string | undefined,
          }}
        />
        <ProfilePasswordCard
          userId={currentUser?.id ?? null}
          accessToken={accessToken}
        />
        <ProfileRolesCard
          roles={roles}
          isLoading={!!currentUser?.id && isRolesLoading}
        />
      </div>
    </>
  );
}
