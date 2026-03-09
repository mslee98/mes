import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRoles, type RoleItem } from "../api/role";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Badge from "../components/ui/badge/Badge";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import { ListPageLayout, TablePagination } from "../components/list";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../context/AuthContext";
import { usePagination } from "../hooks/usePagination";

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

  const pagination = usePagination({
    totalCount: filteredRoles.length,
    initialPageSize: 10,
  });

  const paginatedRoles = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredRoles.slice(startIndex, startIndex + pagination.pageSize);
  }, [filteredRoles, pagination.currentPage, pagination.pageSize]);

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [searchKeyword, searchField, statusFilter]);

  useEffect(() => {
    if (
      pagination.totalPages > 0 &&
      pagination.currentPage > pagination.totalPages
    ) {
      pagination.setCurrentPage(pagination.totalPages);
    }
  }, [pagination.currentPage, pagination.setCurrentPage, pagination.totalPages]);

  return (
    <>
      <PageMeta title="역할 관리" description="역할 관리 페이지" />
      <PageBreadcrumb pageTitle="역할 관리" />
      <ListPageLayout
        title="역할 관리"
        toolbar={
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-md">
              <Input
                type="text"
                placeholder="역할 이름, 코드, 설명 검색"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchOptionsOpen((prev) => !prev)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              검색 옵션
            </button>
          </div>
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
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">역할 목록을 불러오는 중...</p>
          </div>
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
        ) : filteredRoles.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">조건에 맞는 역할이 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  이름
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  코드
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  설명
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  상태
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedRoles.map((role, index) => (
                <TableRow
                  key={`${getRoleCode(role)}-${pagination.currentPage}-${index}`}
                >
                  <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                    {getRoleName(role)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <code>{getRoleCode(role)}</code>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {getRoleDescription(role)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <Badge
                      size="sm"
                      color={role.isActive === false ? "error" : "success"}
                    >
                      {role.isActive === false ? "비활성" : "활성"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPageLayout>
    </>
  );
}
