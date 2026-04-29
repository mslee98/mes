import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
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
import { useAuth } from "../hooks/useAuth";
import { useServerListPagination } from "../hooks/useServerListPagination";
import {
  getProductList,
  type GetProductListParams,
  type ProductListItemDto,
} from "../api/products";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

/** Select 첫 줄이 disabled placeholder라 실제 선택값으로 표현 */
export default function Products() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [arrayTypeFilter, setArrayTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);


  const listParams = useMemo((): GetProductListParams => {
    const p: GetProductListParams = {
      page: listPage,
      size: listPageSize,
    };
    const kw = searchKeyword.trim();
    if (kw) p.keyword = kw;
    if (productTypeFilter.trim()) p.keyword = [p.keyword, productTypeFilter].filter(Boolean).join(" ");
    if (arrayTypeFilter.trim()) p.keyword = [p.keyword, arrayTypeFilter].filter(Boolean).join(" ");
    if (statusFilter === "active") p.isActive = true;
    if (statusFilter === "inactive") p.isActive = false;
    return p;
  }, [listPage, listPageSize, searchKeyword, productTypeFilter, arrayTypeFilter, statusFilter]);

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ["productList", listParams],
    queryFn: () => getProductList(accessToken as string, listParams),
    enabled: !!accessToken && !isAuthLoading,
    placeholderData: (prev) => prev,
  });

  const serverTotal = data?.total ?? 0;
  const items: ProductListItemDto[] = data?.items ?? [];

  const listPagination = useServerListPagination({
    totalCount: serverTotal,
    listPage,
    setListPage,
    listPageSize,
    setListPageSize,
    resetPageDeps: [searchKeyword, productTypeFilter, arrayTypeFilter, statusFilter],
    emptyTotalPages: "one",
  });

  return (
    <>
      <PageMeta title="제품 목록" description="대표 제품 목록" />
      <PageBreadcrumb pageTitle="제품 목록" />
      {/* <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        SKU·단가 단위 마스터는{" "}
        <Link
          to="/items"
          className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          품목
        </Link>
        에서 관리합니다. 제품 상세에서{" "}
        <strong className="font-medium text-gray-700 dark:text-gray-200">
          제품 정의
        </strong>
        (발주 유형·버전별 기준)를 연결한 뒤 발주 화면에서 선택합니다.
      </p> */}
      <ListPageLayout
        title="제품 목록"
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <>
            <div className="w-full sm:w-48">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                제품 유형
              </p>
              <Select
                value={productTypeFilter}
                onChange={setProductTypeFilter}
                options={[{ value: "", label: "제품유형 전체" }, { value: "ENGINE", label: "ENGINE" }, { value: "CAMERA", label: "CAMERA" }]}
                placeholder="제품유형"
                size="md"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Array Type</p>
              <Select
                options={[{ value: "", label: "Array 전체" }, { value: "QVGA", label: "QVGA" }, { value: "VGA", label: "VGA" }, { value: "SXGA", label: "SXGA" }, { value: "CUSTOM", label: "CUSTOM" }]}
                value={arrayTypeFilter}
                onChange={setArrayTypeFilter}
                size="md"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                활성 여부
              </p>
              <Select
                options={STATUS_FILTER_OPTIONS}
                defaultValue={statusFilter}
                onChange={setStatusFilter}
                size="md"
              />
            </div>
          </>
        }
        toolbar={
          <ListPageToolbarRow
            search={
              <DataListSearchInput
                id="products-list-search"
                placeholder="제품 코드·제품명 키워드 (서버 검색)"
                value={searchKeyword}
                onChange={setSearchKeyword}
              />
            }
            actions={
              <>
                <DataListPrimaryActionButton onClick={() => navigate("/products/new")}>
                  제품 등록
                </DataListPrimaryActionButton>
                <div className="flex items-center gap-3">
                  <DataListSearchOptionsButton
                    open={searchOptionsOpen}
                    onToggle={() => setSearchOptionsOpen((o) => !o)}
                  />
                </div>
              </>
            }
          />
        }
        pagination={
          !isAuthLoading &&
          !isLoading &&
          !error &&
          serverTotal > 0 ? (
            <TablePagination {...listPagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading || (isLoading && !isPlaceholderData) ? (
          <ListPageLoading message="제품 목록을 불러오는 중..." />
        ) : !accessToken ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 목록을 조회할 수 있습니다.</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "제품 목록을 불러오지 못했습니다."}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">조건에 맞는 제품이 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  사업명
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  제품명
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  타입/해상도
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
              {items.map((p: ProductListItemDto) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  onClick={() => navigate(`/products/${p.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/products/${p.id}`);
                    }
                  }}
                >
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {p.businessName || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    <Link
                      to={`/products/${p.id}`}
                      className="text-brand-600 hover:underline dark:text-brand-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.productName || "-"}
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <code>
                      {(() => {
                        const productType = String(p.productType ?? "").trim() || "-";
                        const arrayType = String(p.arrayType ?? "").trim();
                        const arrayTypeDisplay =
                          arrayType === "CUSTOM"
                            ? `CUSTOM${
                                p.arrayCustomText?.trim()
                                  ? ` (${p.arrayCustomText.trim()})`
                                  : ""
                              }`
                            : arrayType || "-";
                        const resolution =
                          p.arrayWidth != null && p.arrayHeight != null
                            ? `${p.arrayWidth}x${p.arrayHeight}`
                            : "-";
                        return `${productType} / ${arrayTypeDisplay} (${resolution})`;
                      })()}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-[14rem] px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span
                      className="block truncate"
                      title={
                        p.description?.trim() ? p.description : undefined
                      }
                    >
                      {p.description?.trim() ? p.description : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <Badge
                      size="sm"
                      color={p.isActive === false ? "error" : "success"}
                    >
                      {p.isActive === false ? "비활성" : "활성"}
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
