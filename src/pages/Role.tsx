import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRoles, type RoleItem } from "../api/role";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import ActiveStatusBadge from "../components/common/ActiveStatusBadge";
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
  { value: "name", label: "이름" },
  { value: "code", label: "코드" },
  { value: "description", label: "설명" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

function getRoleName(role: RoleItem): string {
  return (
    (role.name as string | undefined) ??
    (role.roleName as string | undefined) ??
    "-"
  );
}

function getRoleCode(role: RoleItem): string {
  return (
    (role.code as string | undefined) ??
    (role.roleCode as string | undefined) ??
    "-"
  );
}

function getRoleDescription(role: RoleItem): string {
  return (
    (role.description as string | undefined) ??
    (role.desc as string | undefined) ??
    "-"
  );
}

export default function Role() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const {
    data: roles = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: () => getRoles(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });

  const filteredRoles = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return roles.filter((role) => {
      const name = getRoleName(role);
      const code = getRoleCode(role);
      const description = getRoleDescription(role);
      const isActive = role.isActive !== false;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      if (!matchesStatus) return false;
      if (!keyword) return true;

      const targets =
        searchField === "name"
          ? [name]
          : searchField === "code"
          ? [code]
          : searchField === "description"
          ? [description]
          : [name, code, description];

      return targets.some((value) => value.toLowerCase().includes(keyword));
    });
  }, [roles, searchField, searchKeyword, statusFilter]);

  const pagination = useClientListPagination({
    filteredCount: filteredRoles.length,
    initialPageSize: 10,
    resetPageDeps: [searchKeyword, searchField, statusFilter],
  });

  const paginatedRoles = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredRoles.slice(startIndex, startIndex + pagination.pageSize);
  }, [filteredRoles, pagination.currentPage, pagination.pageSize]);

  return (
    <>
      <PageMeta title="역할 관리" description="역할 관리 페이지" />
      <PageBreadcrumb pageTitle="역할 관리" />
      <ListPageLayout
        title="역할 관리"
        toolbar={
          <ListPageToolbarRow
            search={
              <DataListSearchInput
                id="roles-list-search"
                placeholder="역할 이름, 코드, 설명 검색"
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
          !isAuthLoading && !isLoading && !error && filteredRoles.length > 0 ? (
            <TablePagination {...pagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading || isLoading ? (
          <ListPageLoading message="역할 목록을 불러오는 중..." />
        ) : !accessToken ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 역할 목록을 조회할 수 있습니다.</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "역할 목록을 불러오지 못했습니다."}
            </p>
          </div>
        ) : (
          <DataTable fillWidth>
            <DataTableHeader>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>이름</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>코드</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>설명</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell
                colSpan={1}
                compact
                sortable={false}
                className="border-r-0"
              >
                <DataTableHeaderLabel>상태</DataTableHeaderLabel>
              </DataTableHeaderCell>
            </DataTableHeader>
            <DataTableBody>
              {filteredRoles.length === 0 ? (
                <DataTableRow>
                  <DataTableCell
                    colSpan={4}
                    compact
                    className="justify-center border-r-0 py-6"
                  >
                    조건에 맞는 역할이 없습니다.
                  </DataTableCell>
                </DataTableRow>
              ) : (
                paginatedRoles.map((role, index) => (
                  <DataTableRow
                    key={`${getRoleCode(role)}-${pagination.currentPage}-${index}`}
                  >
                    <DataTableCell colSpan={1} compact>
                      {getRoleName(role)}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      <code>{getRoleCode(role)}</code>
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      {getRoleDescription(role)}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact className="border-r-0">
                      <ActiveStatusBadge active={role.isActive} />
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
