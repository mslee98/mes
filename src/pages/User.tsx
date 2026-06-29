import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  getUsers,
  userIsTeamLeaderForActiveOrgs,
  type UserItem,
} from "../api/user";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import ActiveStatusBadge from "../components/common/ActiveStatusBadge";
import Badge from "../components/ui/badge/Badge";
import Select from "../components/form/Select";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import { useAuth } from "../hooks/useAuth";
import { useClientListPagination } from "../hooks/useClientListPagination";

const SEARCH_FIELD_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "employeeNo", label: "사번" },
  { value: "name", label: "이름" },
  { value: "email", label: "이메일" },
  { value: "phoneNumber", label: "연락처" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

function getEmployeeNo(user: UserItem): string {
  return String(user.employeeNo ?? "-");
}

function getUserName(user: UserItem): string {
  return user.name ?? "-";
}

function getUserEmail(user: UserItem): string {
  return user.email ?? "-";
}

function getUserPhone(user: UserItem): string {
  return user.phoneNumber ?? "-";
}

export default function User() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });

  const filteredUsers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return users.filter((user) => {
      const employeeNo = getEmployeeNo(user);
      const name = getUserName(user);
      const email = getUserEmail(user);
      const phoneNumber = getUserPhone(user);
      const isActive = user.isActive !== false;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      if (!matchesStatus) return false;
      if (!keyword) return true;

      const targets =
        searchField === "employeeNo"
          ? [employeeNo]
          : searchField === "name"
          ? [name]
          : searchField === "email"
          ? [email]
          : searchField === "phoneNumber"
          ? [phoneNumber]
          : [employeeNo, name, email, phoneNumber];

      return targets.some((value) => value.toLowerCase().includes(keyword));
    });
  }, [users, searchField, searchKeyword, statusFilter]);

  const pagination = useClientListPagination({
    filteredCount: filteredUsers.length,
    initialPageSize: 10,
    resetPageDeps: [searchKeyword, searchField, statusFilter],
  });

  const paginatedUsers = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredUsers.slice(startIndex, startIndex + pagination.pageSize);
  }, [filteredUsers, pagination.currentPage, pagination.pageSize]);

  return (
    <>
      <PageMeta title="사용자 관리" description="사용자 관리 페이지" />
      <PageBreadcrumb pageTitle="사용자 관리" />
      <ListPageLayout
        title="사용자 관리"
        toolbar={
          <ListPageToolbarRow
            search={
              <DataListSearchInput
                id="users-list-search"
                placeholder="사번, 이름, 이메일, 연락처 검색"
                value={searchKeyword}
                onChange={setSearchKeyword}
              />
            }
            actions={
              <div className="flex items-center gap-3">
                <DataListSearchOptionsButton
                  open={searchOptionsOpen}
                  onToggle={() => setSearchOptionsOpen((prev) => !prev)}
                />
              </div>
            }
          />
        }
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                검색 대상
              </p>
              <Select
                options={SEARCH_FIELD_OPTIONS}
                defaultValue={searchField}
                onChange={setSearchField}
                size="md"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                상태
              </p>
              <Select
                options={STATUS_OPTIONS}
                defaultValue={statusFilter}
                onChange={setStatusFilter}
                size="md"
              />
            </div>
          </>
        }
        pagination={
          !isAuthLoading && !isLoading && !error && filteredUsers.length > 0 ? (
            <TablePagination {...pagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading || isLoading ? (
          <ListPageLoading message="사용자 목록을 불러오는 중..." />
        ) : !accessToken ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 사용자 목록을 조회할 수 있습니다.</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "사용자 목록을 불러오지 못했습니다."}
            </p>
          </div>
        ) : (
          <DataTable fillWidth>
            <DataTableHeader>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>사번</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>이름</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={2} compact sortable={false}>
                <DataTableHeaderLabel>이메일</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>연락처</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell
                colSpan={1}
                compact
                sortable={false}
                className="justify-center"
              >
                <DataTableHeaderLabel className="w-full text-center">
                  팀장
                </DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>상태</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell
                colSpan={1}
                compact
                sortable={false}
                className="border-r-0"
              >
                <DataTableHeaderLabel>관리</DataTableHeaderLabel>
              </DataTableHeaderCell>
            </DataTableHeader>
            <DataTableBody>
              {filteredUsers.length === 0 ? (
                <DataTableRow>
                  <DataTableCell
                    colSpan={8}
                    compact
                    className="justify-center border-r-0 py-6"
                  >
                    조건에 맞는 사용자가 없습니다.
                  </DataTableCell>
                </DataTableRow>
              ) : (
                paginatedUsers.map((user, index) => (
                  <DataTableRow key={`${user.id}-${pagination.currentPage}-${index}`}>
                    <DataTableCell colSpan={1} compact>
                      {getEmployeeNo(user)}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      {getUserName(user)}
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact className="min-w-0">
                      <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {getUserEmail(user)}
                      </p>
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      {getUserPhone(user)}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact className="justify-center">
                      {userIsTeamLeaderForActiveOrgs(user) ? (
                        <Badge size="sm" color="primary">
                          팀장
                        </Badge>
                      ) : (
                        <span className="text-theme-xs text-gray-400">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      <ActiveStatusBadge active={user.isActive} />
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact className="border-r-0">
                      <Link
                        to={`/user/${user.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-brand-300 px-3 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
                      >
                        역할 관리
                      </Link>
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        )}
      </ListPageLayout>
    </>
  );
}
