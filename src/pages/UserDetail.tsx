import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import Badge from "../components/ui/badge/Badge";
import DatePicker from "../components/form/date-picker";
import Select from "../components/form/Select";
import { useAuth } from "../context/AuthContext";
import { getUsers, type UserItem } from "../api/user";
import { getRoles } from "../api/role";
import {
  assignUserRole,
  deleteUserRole,
  getUserRoles,
  updateUserRole,
  type UserRoleAssignment,
} from "../api/userRole";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  return value ?? "-";
}

const ACTIVE_OPTIONS = [
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

const EMPTY_USERS: UserItem[] = [];
const EMPTY_USER_ROLES: UserRoleAssignment[] = [];
const EMPTY_ROLES: Awaited<ReturnType<typeof getRoles>> = [];

export default function UserDetail() {
  const { userId } = useParams();
  const numericUserId = Number(userId);
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [assignForm, setAssignForm] = useState({
    roleCode: "",
    isActive: true,
    startedAt: todayString(),
    endedAt: "",
  });
  const [editState, setEditState] = useState<
    Record<number, { isActive: boolean; endedAt: string }>
  >({});

  const {
    data: usersData,
    isLoading: isUsersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });
  const users = usersData ?? EMPTY_USERS;

  const {
    data: userRolesData,
    isLoading: isRolesLoading,
    error: userRolesError,
  } = useQuery({
    queryKey: ["userRoles", numericUserId],
    queryFn: () => getUserRoles(numericUserId, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && Number.isFinite(numericUserId),
  });
  const userRoles = userRolesData ?? EMPTY_USER_ROLES;

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => getRoles(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });
  const roles = rolesData ?? EMPTY_ROLES;

  const currentUser = useMemo(
    () => users.find((user) => user.id === numericUserId),
    [numericUserId, users]
  );

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: String(role.code ?? ""),
        label: `${String(role.name ?? role.code ?? "-")} (${String(
          role.code ?? "-"
        )})`,
      })),
    [roles]
  );

  useEffect(() => {
    if (roles.length > 0 && !assignForm.roleCode) {
      const firstRoleCode = roles[0]?.code;
      if (typeof firstRoleCode === "string") {
        setAssignForm((prev) => ({ ...prev, roleCode: firstRoleCode }));
      }
    }
  }, [assignForm.roleCode, roles]);

  useEffect(() => {
    const nextState: Record<number, { isActive: boolean; endedAt: string }> = {};
    userRoles.forEach((item) => {
      nextState[item.id] = {
        isActive: item.isActive,
        endedAt: item.endedAt ?? "",
      };
    });
    setEditState(nextState);
  }, [userRoles]);

  const assignMutation = useMutation({
    mutationFn: async () =>
      assignUserRole(
        numericUserId,
        {
          roleCode: assignForm.roleCode,
          isActive: assignForm.isActive,
          startedAt: assignForm.startedAt,
          endedAt: assignForm.endedAt || null,
        },
        accessToken as string
      ),
    onSuccess: async () => {
      toast.success("역할 부여 성공");
      setAssignForm({
        roleCode: roles[0]?.code as string,
        isActive: true,
        startedAt: todayString(),
        endedAt: "",
      });
      await queryClient.invalidateQueries({
        queryKey: ["userRoles", numericUserId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "역할 부여에 실패했습니다."
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (assignment: UserRoleAssignment) =>
      updateUserRole(
        assignment.id,
        {
          isActive: editState[assignment.id]?.isActive ?? assignment.isActive,
          endedAt: editState[assignment.id]?.endedAt || null,
        },
        accessToken as string
      ),
    onSuccess: async () => {
      toast.success("역할 수정 성공");
      await queryClient.invalidateQueries({
        queryKey: ["userRoles", numericUserId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "역할 수정에 실패했습니다."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: number) =>
      deleteUserRole(assignmentId, accessToken as string),
    onSuccess: async () => {
      toast.success("역할 삭제 성공");
      await queryClient.invalidateQueries({
        queryKey: ["userRoles", numericUserId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "역할 삭제에 실패했습니다."
      );
    },
  });

  const isLoading = isAuthLoading || isUsersLoading || isRolesLoading;
  const error = usersError ?? userRolesError;

  return (
    <>
      <PageMeta title="사용자 역할 관리" description="사용자 역할 관리 페이지" />
      <PageBreadcrumb pageTitle="사용자 역할 관리" />

      <div className="mb-6">
        <Link
          to="/user"
          className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          사용자 목록으로 돌아가기
        </Link>
      </div>

      {isLoading ? (
        <ComponentCard title="사용자 역할 관리">
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">사용자 역할 정보를 불러오는 중...</p>
          </div>
        </ComponentCard>
      ) : error ? (
        <ComponentCard title="사용자 역할 관리">
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "사용자 역할 정보를 불러오지 못했습니다."}
            </p>
          </div>
        </ComponentCard>
      ) : !currentUser ? (
        <ComponentCard title="사용자 역할 관리">
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">사용자를 찾을 수 없습니다.</p>
          </div>
        </ComponentCard>
      ) : (
        <div className="space-y-6">
          <ComponentCard title="사용자 정보">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">사번</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {currentUser.employeeNo}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">이름</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {currentUser.name}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">이메일</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {currentUser.email}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">연락처</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {currentUser.phoneNumber ?? "-"}
                </p>
              </div>
            </div>
          </ComponentCard>

          <ComponentCard title="역할 부여">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">역할</p>
                <Select
                  key={`assign-role-${assignForm.roleCode}`}
                  options={roleOptions}
                  placeholder="역할 선택"
                  defaultValue={assignForm.roleCode}
                  onChange={(value) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      roleCode: value,
                    }))
                  }
                  size="md"
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">시작일</p>
                <DatePicker
                  id="assign-started-at"
                  placeholder="시작일 선택"
                  value={assignForm.startedAt}
                  onValueChange={(value) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      startedAt: value,
                    }))
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">종료일</p>
                <DatePicker
                  id="assign-ended-at"
                  placeholder="종료일 선택"
                  value={assignForm.endedAt}
                  onValueChange={(value) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      endedAt: value,
                    }))
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">상태</p>
                <Select
                  key={`assign-status-${assignForm.isActive ? "active" : "inactive"}`}
                  options={ACTIVE_OPTIONS}
                  defaultValue={assignForm.isActive ? "active" : "inactive"}
                  onChange={(value) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      isActive: value === "active",
                    }))
                  }
                  size="md"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => assignMutation.mutate()}
                disabled={
                  assignMutation.isPending ||
                  !assignForm.roleCode ||
                  !assignForm.startedAt
                }
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                역할 부여
              </button>
            </div>
          </ComponentCard>

          <ComponentCard title="사용자 역할 목록">
            {userRoles.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">부여된 역할이 없습니다.</p>
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                    <tr>
                      <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        역할명
                      </th>
                      <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        코드
                      </th>
                      <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        시작일
                      </th>
                      <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        종료일
                      </th>
                      <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        상태
                      </th>
                      <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {userRoles.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                          <div className="font-medium">{assignment.role.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {assignment.role.description ?? "-"}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <code>{assignment.role.code}</code>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(assignment.startedAt)}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <DatePicker
                            id={`assignment-ended-at-${assignment.id}`}
                            placeholder="종료일 선택"
                            value={editState[assignment.id]?.endedAt ?? ""}
                            onValueChange={(value) =>
                              setEditState((prev) => ({
                                ...prev,
                                [assignment.id]: {
                                  isActive:
                                    prev[assignment.id]?.isActive ??
                                    assignment.isActive,
                                  endedAt: value,
                                },
                              }))
                            }
                          />
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <div className="flex flex-col gap-2">
                            <Badge
                              size="sm"
                              color={
                                (editState[assignment.id]?.isActive ??
                                  assignment.isActive) === false
                                  ? "error"
                                  : "success"
                              }
                            >
                              {(editState[assignment.id]?.isActive ??
                                assignment.isActive) === false
                                ? "비활성"
                                : "활성"}
                            </Badge>
                            <Select
                              key={`edit-status-${assignment.id}-${
                                (editState[assignment.id]?.isActive ??
                                  assignment.isActive)
                                  ? "active"
                                  : "inactive"
                              }`}
                              options={ACTIVE_OPTIONS}
                              defaultValue={
                                (editState[assignment.id]?.isActive ??
                                  assignment.isActive)
                                  ? "active"
                                  : "inactive"
                              }
                              onChange={(value) =>
                                setEditState((prev) => ({
                                  ...prev,
                                  [assignment.id]: {
                                    isActive: value === "active",
                                    endedAt:
                                      prev[assignment.id]?.endedAt ??
                                      assignment.endedAt ??
                                      "",
                                  },
                                }))
                              }
                              size="sm"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => updateMutation.mutate(assignment)}
                              disabled={updateMutation.isPending}
                              className="inline-flex h-9 items-center justify-center rounded-md bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(assignment.id)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-error-300 px-3 text-xs font-medium text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>
        </div>
      )}
    </>
  );
}
