import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPermissions, type PermissionItem } from "../api/permission";
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

function getPermissionName(permission: PermissionItem): string {
  return (
    (permission.name as string | undefined) ??
    (permission.permissionName as string | undefined) ??
    "-"
  );
}

function getPermissionCode(permission: PermissionItem): string {
  return (
    (permission.code as string | undefined) ??
    (permission.permissionCode as string | undefined) ??
    "-"
  );
}

function getPermissionDescription(permission: PermissionItem): string {
  return (
    (permission.description as string | undefined) ??
    (permission.desc as string | undefined) ??
    "-"
  );
}

export default function Permission() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const {
    data: permissions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => getPermissions(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });

  const filteredPermissions = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return permissions.filter((permission) => {
      const name = getPermissionName(permission);
      const code = getPermissionCode(permission);
      const description = getPermissionDescription(permission);
      const isActive = permission.isActive !== false;

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
  }, [permissions, searchField, searchKeyword, statusFilter]);

  const pagination = useClientListPagination({
    filteredCount: filteredPermissions.length,
    initialPageSize: 10,
    resetPageDeps: [searchKeyword, searchField, statusFilter],
  });

  const paginatedPermissions = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredPermissions.slice(
      startIndex,
      startIndex + pagination.pageSize
    );
  }, [filteredPermissions, pagination.currentPage, pagination.pageSize]);

  return (
    <>
      <PageMeta title="권한 관리" description="권한 관리 페이지" />
      <PageBreadcrumb pageTitle="권한 관리" />
      <ListPageLayout
        title="권한 관리"
        toolbar={
          <ListPageToolbarRow
            search={
              <DataListSearchInput
                id="permissions-list-search"
                placeholder="권한 이름, 코드, 설명 검색"
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
          !isAuthLoading && !isLoading && !error && filteredPermissions.length > 0 ? (
            <TablePagination {...pagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading || isLoading ? (
          <ListPageLoading message="권한 목록을 불러오는 중..." />
        ) : !accessToken ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 권한 목록을 조회할 수 있습니다.</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "권한 목록을 불러오지 못했습니다."}
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
              {filteredPermissions.length === 0 ? (
                <DataTableRow>
                  <DataTableCell
                    colSpan={4}
                    compact
                    className="justify-center border-r-0 py-6"
                  >
                    조건에 맞는 권한이 없습니다.
                  </DataTableCell>
                </DataTableRow>
              ) : (
                paginatedPermissions.map((permission, index) => (
                  <DataTableRow
                    key={`${getPermissionCode(permission)}-${pagination.currentPage}-${index}`}
                  >
                    <DataTableCell colSpan={1} compact>
                      {getPermissionName(permission)}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      <code>{getPermissionCode(permission)}</code>
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      {getPermissionDescription(permission)}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact className="border-r-0">
                      <ActiveStatusBadge active={permission.isActive} />
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
