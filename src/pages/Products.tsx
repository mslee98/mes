import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import Select from "../components/form/Select";
import ActiveStatusBadge from "../components/common/ActiveStatusBadge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DATA_TABLE_COMPACT_LINK_CLASS,
  DataListPrimaryActionButton,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
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
        ) : (
          <DataTable fillWidth>
            <DataTableHeader>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>사업코드</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>사업명</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>제품명</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={1} compact sortable={false}>
                <DataTableHeaderLabel>타입/해상도</DataTableHeaderLabel>
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
              {items.length === 0 ? (
                <DataTableRow>
                  <DataTableCell
                    colSpan={6}
                    compact
                    className="justify-center border-r-0 py-6"
                  >
                    조건에 맞는 제품이 없습니다.
                  </DataTableCell>
                </DataTableRow>
              ) : (
                items.map((p: ProductListItemDto) => (
                  <DataTableRow key={p.id}>
                    <DataTableCell colSpan={1} compact>
                      <code>{String(p.businessCode ?? "").trim() || "-"}</code>
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      {p.businessName || "-"}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      <Link
                        to={`/products/${p.id}`}
                        className={DATA_TABLE_COMPACT_LINK_CLASS}
                      >
                        {p.productName || "-"}
                      </Link>
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact>
                      <code>
                        {(() => {
                          const productType =
                            String(p.productType ?? "").trim() || "-";
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
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact className="min-w-0">
                      <span
                        className="block truncate"
                        title={
                          p.description?.trim() ? p.description : undefined
                        }
                      >
                        {p.description?.trim() ? p.description : "-"}
                      </span>
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact className="border-r-0">
                      <ActiveStatusBadge active={p.isActive} />
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
