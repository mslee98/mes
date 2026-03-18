import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import Badge from "../components/ui/badge/Badge";
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
import {
  getItems,
  getItemCategories,
  getItemTypes,
  type Item,
  type ItemCategory,
} from "../api/items";
import { formatCurrency } from "../lib/formatCurrency";

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

function flattenCategories(
  nodes: ItemCategory[],
  level = 0
): { category: ItemCategory; level: number }[] {
  const result: { category: ItemCategory; level: number }[] = [];
  for (const c of nodes) {
    result.push({ category: c, level });
    if (c.children?.length) {
      result.push(...flattenCategories(c.children, level + 1));
    }
  }
  return result;
}

export default function Items() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [itemTypeId, setItemTypeId] = useState<string>("");
  const [productDiv, setProductDiv] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("all");

  const listParams = useMemo(() => {
    const params: {
      categoryId?: number;
      itemTypeId?: number;
      productDiv?: string;
      isActive?: boolean;
    } = {};
    if (categoryId) params.categoryId = Number(categoryId);
    if (itemTypeId) params.itemTypeId = Number(itemTypeId);
    if (productDiv.trim()) params.productDiv = productDiv.trim();
    if (isActiveFilter === "active") params.isActive = true;
    if (isActiveFilter === "inactive") params.isActive = false;
    return params;
  }, [categoryId, itemTypeId, productDiv, isActiveFilter]);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["items", listParams],
    queryFn: () => getItems(accessToken as string, listParams),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: categoryTree = [] } = useQuery({
    queryKey: ["itemCategories", "tree"],
    queryFn: () => getItemCategories(accessToken as string, { tree: true }),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: itemTypes = [] } = useQuery({
    queryKey: ["itemTypes"],
    queryFn: () => getItemTypes(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });

  const categoryOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "", label: "전체" }];
    flattenCategories(categoryTree).forEach(({ category: c, level }) => {
      options.push({
        value: String(c.id),
        label: "　".repeat(level) + (c.name || c.code),
      });
    });
    return options;
  }, [categoryTree]);

  const itemTypeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "", label: "전체" }];
    itemTypes.forEach((t) => {
      options.push({ value: String(t.id), label: t.name || t.code || "-" });
    });
    return options;
  }, [itemTypes]);

  const filteredItems = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((i: Item) => {
      const code = (i.code ?? "").toLowerCase();
      const name = (i.name ?? "").toLowerCase();
      return code.includes(kw) || name.includes(kw);
    });
  }, [items, searchKeyword]);

  const pagination = usePagination({
    totalCount: filteredItems.length,
    initialPageSize: 10,
  });

  const paginatedItems = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredItems.slice(start, start + pagination.pageSize);
  }, [filteredItems, pagination.currentPage, pagination.pageSize]);

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [searchKeyword, categoryId, itemTypeId, productDiv, isActiveFilter]);

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
      <PageMeta title="품목 목록" description="품목 마스터 목록" />
      <PageBreadcrumb pageTitle="품목 목록" />
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        2단계: 품목 분류 · 유형을 먼저 정의하려면{" "}
        <Link to="/item-categories" className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          품목 분류
        </Link>
        ,{" "}
        <Link to="/item-types" className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          품목 유형
        </Link>
        을 이용하세요.
      </p>
      <ListPageLayout
        title="품목 목록"
        toolbar={
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-md">
              <Input
                type="text"
                placeholder="품목 코드, 품목명 검색"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/items/new")}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
              >
                품목 추가
              </button>
              <button
                type="button"
                onClick={() => setSearchOptionsOpen((prev) => !prev)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                검색 옵션
              </button>
            </div>
          </div>
        }
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                품목 분류
              </p>
              <Select
                options={categoryOptions}
                defaultValue={categoryId}
                onChange={setCategoryId}
                size="md"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                품목 유형
              </p>
              <Select
                options={itemTypeOptions}
                defaultValue={itemTypeId}
                onChange={setItemTypeId}
                size="md"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                제품 구분
              </p>
              <Input
                type="text"
                value={productDiv}
                onChange={(e) => setProductDiv(e.target.value)}
                placeholder="productDiv"
                className="mt-0"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                활성 여부
              </p>
              <Select
                options={STATUS_OPTIONS}
                defaultValue={isActiveFilter}
                onChange={setIsActiveFilter}
                size="md"
              />
            </div>
          </>
        }
        pagination={
          !isAuthLoading && !isLoading && !error && filteredItems.length > 0 ? (
            <TablePagination {...pagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading || isLoading ? (
          <ListPageLoading message="품목 목록을 불러오는 중..." />
        ) : !accessToken ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 목록을 조회할 수 있습니다.</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "품목 목록을 불러오지 못했습니다."}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">조건에 맞는 품목이 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
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
                  품목명
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  분류
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  유형
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  규격
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  단위
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  단가
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
              {paginatedItems.map((item: Item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  onClick={() => navigate(`/items/${item.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/items/${item.id}`);
                    }
                  }}
                >
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <code>{item.code}</code>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    <Link
                      to={`/items/${item.id}`}
                      className="text-brand-600 hover:underline dark:text-brand-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {item.category?.name ?? "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {item.itemType?.name ?? "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {item.spec || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {item.unit || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-right text-gray-800 dark:text-white/90">
                    {formatCurrency(item.unitPrice, item.currencyCode ?? "KRW")}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <Badge
                      size="sm"
                      color={item.isActive === false ? "error" : "success"}
                    >
                      {item.isActive === false ? "비활성" : "활성"}
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
