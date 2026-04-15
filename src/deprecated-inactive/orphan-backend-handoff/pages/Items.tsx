import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
// import PageNotice from "../components/common/PageNotice";
import ListPageLoading from "../components/common/ListPageLoading";
import Select from "../components/form/Select";
import Badge from "../components/ui/badge/Badge";
import {
  DataListPrimaryActionButton,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../../../hooks/useAuth";
import { useItemPermissions } from "../hooks/useItemPermissions";
import { useServerListPagination } from "../hooks/useServerListPagination";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  getItemMasterList,
  ITEM_TYPE_FILTER_ALL,
  ITEM_TYPE_OPTIONS_FALLBACK,
} from "../api/itemMaster";
import {
  COMMON_CODE_GROUP_ITEM_TYPE,
  commonCodesToSelectOptions,
  labelForCommonCode,
} from "../api/commonCode";
import { isForbiddenError } from "../lib/apiError";

const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "사용" },
  { value: "inactive", label: "미사용" },
];

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ko-KR");
}

export default function Items() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadItems, canManageItems } = useItemPermissions();

  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [itemTypeFilter, setItemTypeFilter] = useState(ITEM_TYPE_FILTER_ALL);
  const [isActiveFilter, setIsActiveFilter] = useState("all");

  const { data: itemTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_ITEM_TYPE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadItems }
  );

  const itemTypeSelectOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [
      { value: ITEM_TYPE_FILTER_ALL, label: "전체 유형" },
    ];
    const fromApi = commonCodesToSelectOptions(itemTypeCodes);
    if (fromApi.length) {
      fromApi.forEach((o) => list.push(o));
    } else {
      ITEM_TYPE_OPTIONS_FALLBACK.forEach((o) => list.push(o));
    }
    return list;
  }, [itemTypeCodes]);

  const listParams = useMemo(() => {
    const isActive =
      isActiveFilter === "active"
        ? true
        : isActiveFilter === "inactive"
          ? false
          : undefined;
    return {
      keyword: submittedKeyword.trim() || undefined,
      itemType:
        itemTypeFilter === ITEM_TYPE_FILTER_ALL ? undefined : itemTypeFilter,
      isActive,
    };
  }, [submittedKeyword, itemTypeFilter, isActiveFilter]);

  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: [
      "itemMasterList",
      listParams.keyword,
      listParams.itemType,
      listParams.isActive,
      listPage,
      listPageSize,
    ],
    queryFn: () =>
      getItemMasterList(accessToken as string, {
        ...listParams,
        page: listPage,
        size: Math.min(listPageSize, 100),
      }),
    enabled:
      !!accessToken && !isAuthLoading && canReadItems,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const listPagination = useServerListPagination({
    totalCount: total,
    listPage,
    setListPage,
    listPageSize,
    setListPageSize,
    resetPageDeps: [submittedKeyword, itemTypeFilter, isActiveFilter],
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedKeyword(keyword);
  };

  const forbidden = error && isForbiddenError(error);

  return (
    <>
      <PageMeta
        title="품목 마스터"
        description="보드·하우징·파트 등 구성 요소(품목) 마스터"
      />
      <PageBreadcrumb pageTitle="품목 마스터" />

      {/* <PageNotice className="mb-4" variant="neutral">
        품목은 <strong>설계·구성 요소</strong> 마스터입니다. 발주 기준은{" "}
        <Link
          to="/products"
          className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
        >
          제품 정의
        </Link>
        에서 다룹니다. 분류·유형(레거시 2단계)은{" "}
        <Link
          to="/item-categories"
          className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
        >
          품목 분류
        </Link>
        ,{" "}
        <Link
          to="/item-types"
          className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
        >
          품목 유형
        </Link>
        메뉴를 이용하세요.
      </PageNotice> */}

      <ListPageLayout
        title="품목 목록"
        toolbar={
          <form className="w-full min-w-0" onSubmit={handleSearchSubmit}>
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="items-list-search"
                  placeholder="품목코드·품목명 (Enter로 검색)"
                  value={keyword}
                  onChange={setKeyword}
                />
              }
              actions={
                <>
                  {canManageItems ? (
                    <DataListPrimaryActionButton onClick={() => navigate("/items/new")}>
                      품목 등록
                    </DataListPrimaryActionButton>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <DataListSearchOptionsButton
                      open={searchOptionsOpen}
                      onToggle={() => setSearchOptionsOpen((prev) => !prev)}
                    />
                  </div>
                </>
              }
            />
          </form>
        }
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <>
            <div className="w-full sm:w-[220px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                품목 유형
              </p>
              <Select
                options={itemTypeSelectOptions}
                defaultValue={itemTypeFilter}
                onChange={setItemTypeFilter}
                size="md"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                사용 여부
              </p>
              <Select
                options={ACTIVE_FILTER_OPTIONS}
                defaultValue={isActiveFilter}
                onChange={setIsActiveFilter}
                size="md"
              />
            </div>
          </>
        }
        pagination={
          !isAuthLoading &&
          canReadItems &&
          !isLoading &&
          !error &&
          total > 0 ? (
            <TablePagination {...listPagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading ? (
          <ListPageLoading message="인증 확인 중..." />
        ) : !accessToken ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 목록을 조회할 수 있습니다.</p>
          </div>
        ) : !canReadItems ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">품목 조회 권한(item.read)이 없습니다.</p>
          </div>
        ) : isLoading ? (
          <ListPageLoading message="품목 목록을 불러오는 중..." />
        ) : forbidden ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              이 목록을 볼 권한이 없습니다. 관리자에게 문의하세요.
            </p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "목록을 불러오지 못했습니다."}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">
              {isFetching ? "불러오는 중…" : "조건에 맞는 품목이 없습니다."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  품목코드
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  품목명
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  유형
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  리비전
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  기본 리비전
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  설명
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  상태
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  수정일
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {items.map((row) => {
                const defaultRev =
                  row.defaultRevisionCode ??
                  (row.defaultRevisionId != null
                    ? `#${row.defaultRevisionId}`
                    : "-");
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    onClick={() => navigate(`/items/${row.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/items/${row.id}`);
                      }
                    }}
                  >
                    <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                      <code>{row.itemCode}</code>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      <Link
                        to={`/items/${row.id}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.itemName}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <span title={row.itemType || undefined}>
                        {itemTypeCodes.length
                          ? labelForCommonCode(itemTypeCodes, row.itemType)
                          : (ITEM_TYPE_OPTIONS_FALLBACK.find(
                              (o) => o.value === row.itemType
                            )?.label ??
                            (row.itemType || "-"))}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                      {row.revisionCount}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {defaultRev}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      <span title={row.description ?? ""}>
                        {row.description?.trim() ? row.description : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <Badge
                        size="sm"
                        color={row.isActive === false ? "error" : "success"}
                      >
                        {row.isActive === false ? "미사용" : "사용"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(row.updatedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ListPageLayout>
    </>
  );
}
