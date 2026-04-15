import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageNotice from "../components/common/PageNotice";
import Select from "../components/form/Select";
import Badge from "../components/ui/badge/Badge";
import { Dropdown } from "../components/ui/dropdown/Dropdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DataListSearchInput,
  DataListSearchOptionsButton,
  DataListPrimaryActionButton,
  ListPageLayout,
  ListPageToolbarRow,
  dataListOutlineButtonClassName,
  TablePagination,
} from "../components/list";
import ListPageLoading from "../components/common/ListPageLoading";
import HousingTemplateCreateModal from "../components/form/HousingTemplateCreateModal";
import { useAuth } from "../../../hooks/useAuth";
import { useProductPermissions } from "../hooks/useProductPermissions";
import { usePagination } from "../hooks/usePagination";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  getHousingTemplates,
  type HousingTemplate,
} from "../api/housingTemplates";
import {
  COMMON_CODE_GROUP_USE_STATUS,
  labelForCommonCode,
  buildUseStatusSelectOptions,
} from "../api/commonCode";
import { badgeColorFromUseStatusCode } from "../lib/badgeStatusColor";

const PAGE_SIZE = 10;

export default function HousingTemplates() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadProducts, canManageProducts } = useProductPermissions();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["housingTemplates"],
    queryFn: () => getHousingTemplates(accessToken as string),
    enabled: !!accessToken && !isAuthLoading && canReadProducts,
  });

  const { data: useStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_USE_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadProducts }
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "", label: "전체" },
      ...buildUseStatusSelectOptions(useStatusCodes),
    ],
    [useStatusCodes]
  );

  const filteredList = useMemo(() => {
    let list = data as HousingTemplate[];
    const kw = searchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter((t) => {
        const code = (t.templateCode ?? "").toLowerCase();
        const name = (t.templateName ?? "").toLowerCase();
        return code.includes(kw) || name.includes(kw);
      });
    }
    if (statusFilter.trim()) {
      const sf = statusFilter.trim().toUpperCase();
      list = list.filter(
        (t) => String(t.status ?? "").trim().toUpperCase() === sf
      );
    }
    return list;
  }, [data, searchKeyword, statusFilter]);

  const totalCount = filteredList.length;
  const pagination = usePagination({ totalCount, initialPageSize: PAGE_SIZE });
  const { startItem, endItem, setCurrentPage } = pagination;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, statusFilter, setCurrentPage]);

  const pageList = useMemo(
    () => filteredList.slice(startItem - 1, endItem),
    [filteredList, startItem, endItem]
  );

  const handleSearchReset = () => {
    setSearchKeyword("");
    setStatusFilter("");
    setSearchKey((k) => k + 1);
  };

  if (!canReadProducts) {
    return (
      <>
        <PageMeta title="하우징 템플릿" description="하우징 템플릿 목록" />
        <PageBreadcrumb pageTitle="하우징 템플릿" />
        <PageNotice variant="neutral">
          제품 조회 권한(<code>product.read</code>)이 없습니다.
        </PageNotice>
      </>
    );
  }

  return (
    <>
      <PageMeta title="하우징 템플릿" description="하우징 템플릿 목록" />
      <PageBreadcrumb pageTitle="하우징 템플릿" />

      <div className="space-y-6">
        <ListPageLayout
          title="하우징 템플릿 목록"
          desc="하우징 구성 템플릿입니다."
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="housing-template-search"
                  placeholder="템플릿 코드, 이름 검색"
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                />
              }
              actions={
                <>
                  {canManageProducts && accessToken ? (
                    <DataListPrimaryActionButton
                      onClick={() => setCreateModalOpen(true)}
                    >
                      템플릿 등록
                    </DataListPrimaryActionButton>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <DataListSearchOptionsButton
                      open={searchOptionsOpen}
                      onToggle={() =>
                        setSearchOptionsOpen((open) => !open)
                      }
                    />
                    <div className="relative dropdown-toggle">
                      <button
                        type="button"
                        onClick={() => setFilterOpen(!filterOpen)}
                        className={dataListOutlineButtonClassName}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                          className="mr-2 h-4 w-4 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        필터
                        <svg
                          className="-mr-1 ml-1.5 h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path
                            clipRule="evenodd"
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          />
                        </svg>
                      </button>
                      <Dropdown
                        isOpen={filterOpen}
                        onClose={() => setFilterOpen(false)}
                        className="right-0 w-56 p-3"
                      >
                        <h6 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                          템플릿 상태
                        </h6>
                        <ul
                          className="space-y-2 text-sm"
                          aria-labelledby="housing-template-filter-hint"
                        >
                          <li>
                            <span
                              id="housing-template-filter-hint"
                              className="text-gray-700 dark:text-gray-300"
                            >
                              아래「검색 옵션」에서 상태를 선택해 목록을
                              좁힐 수 있습니다.
                            </span>
                          </li>
                        </ul>
                      </Dropdown>
                    </div>
                  </div>
                </>
              }
            />
          }
          searchOptionsOpen={searchOptionsOpen}
          searchOptions={
            <>
              <div
                key={`ht-status-${searchKey}`}
                className="min-w-0 flex-1 sm:max-w-[12rem]"
              >
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  상태
                </label>
                <Select
                  id={`housing-template-status-${searchKey}`}
                  size="sm"
                  options={statusFilterOptions}
                  placeholder="전체"
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleSearchReset}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                >
                  초기화
                </button>
              </div>
            </>
          }
          pagination={
            !isAuthLoading && !isLoading && !error ? (
              <TablePagination {...pagination} />
            ) : null
          }
        >
          {isAuthLoading || isLoading ? (
            <ListPageLoading
              message="하우징 템플릿 목록을 불러오는 중입니다."
              skeletonRows={8}
              minHeight={320}
            />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "목록을 불러오는 중 오류가 발생했습니다."}
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    코드
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    이름
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    상태
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    라인 수
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="px-5 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                    >
                      등록된 하우징 템플릿이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : pageList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="px-5 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                    >
                      검색 조건에 맞는 템플릿이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageList.map((row) => {
                    const detailPath = `/housing-templates/${row.id}`;
                    const goToDetail = () => {
                      navigate(detailPath);
                    };
                    const statusCode = String(row.status ?? "")
                      .trim()
                      .toUpperCase();
                    return (
                      <TableRow
                        key={row.id}
                        tabIndex={0}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                        aria-label={`${row.templateName} 상세`}
                        onClick={goToDetail}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            goToDetail();
                          }
                        }}
                      >
                        <TableCell className="px-5 py-4 text-start text-theme-sm sm:px-6">
                          <Link
                            to={detailPath}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                          >
                            <code className="text-inherit">
                              {row.templateCode}
                            </code>
                          </Link>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-700 dark:text-gray-300 max-w-[15rem] truncate">
                          {row.templateName}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge
                            size="sm"
                            color={badgeColorFromUseStatusCode(statusCode)}
                          >
                            {labelForCommonCode(
                              useStatusCodes,
                              statusCode
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-end text-theme-sm tabular-nums text-gray-500 dark:text-gray-400">
                          {row.lines.length}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </ListPageLayout>
      </div>

      {canManageProducts && accessToken ? (
        <HousingTemplateCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreated={(templateId) => {
            navigate(`/housing-templates/${templateId}`);
          }}
        />
      ) : null}
    </>
  );
}
