import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
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
import { useAuth } from "../context/AuthContext";
import { useProductPermissions } from "../hooks/useProductPermissions";
import { useServerListPagination } from "../hooks/useServerListPagination";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import ConfirmModal from "../components/common/ConfirmModal";
import ProductDefinitionCreateModal from "../components/products/ProductDefinitionCreateModal";
import {
  COMMON_CODE_GROUP_PRODUCT_CATEGORY,
  commonCodesToSelectOptions,
} from "../api/commonCode";
import {
  createProduct,
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
const FILTER_CATEGORY_ALL = "__all__";
const CREATE_CATEGORY_NONE = "__none__";

export default function Products() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canManageProducts } = useProductPermissions();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [categoryCode, setCategoryCode] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);

  const [createOpen, setCreateOpen] = useState(false);
  const [definePromptOpen, setDefinePromptOpen] = useState(false);
  const [definitionModalOpen, setDefinitionModalOpen] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<number | null>(
    null
  );
  const [npCode, setNpCode] = useState("");
  const [npName, setNpName] = useState("");
  const [npCategory, setNpCategory] = useState(CREATE_CATEGORY_NONE);
  const [npDesc, setNpDesc] = useState("");
  const [npActive, setNpActive] = useState(true);

  const { data: productCategoryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PRODUCT_CATEGORY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const filterCategoryOptions = useMemo(
    () => [
      { value: FILTER_CATEGORY_ALL, label: "분류 전체" },
      ...commonCodesToSelectOptions(productCategoryCodes),
    ],
    [productCategoryCodes]
  );

  const createCategoryOptions = useMemo(
    () => [
      { value: CREATE_CATEGORY_NONE, label: "선택 안 함" },
      ...commonCodesToSelectOptions(productCategoryCodes),
    ],
    [productCategoryCodes]
  );

  const resetCreateForm = () => {
    setNpCode("");
    setNpName("");
    setNpCategory(CREATE_CATEGORY_NONE);
    setNpDesc("");
    setNpActive(true);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createProduct(accessToken as string, {
        productCode: npCode.trim(),
        productName: npName.trim(),
        categoryCode:
          !npCategory || npCategory === CREATE_CATEGORY_NONE
            ? null
            : npCategory.trim() || null,
        description: npDesc.trim() || null,
        isActive: npActive,
      }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["productList"] });
      toast.success("제품을 등록했습니다.");
      resetCreateForm();
      setCreateOpen(false);
      if (canManageProducts && accessToken) {
        setPendingProductId(p.id);
        setDefinePromptOpen(true);
      } else {
        navigate(`/products/${p.id}`);
      }
    },
    onError: (e: Error) =>
      toast.error(e.message || "등록에 실패했습니다."),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!npCode.trim()) {
      toast.error("제품 코드를 입력하세요.");
      return;
    }
    if (!npName.trim()) {
      toast.error("제품명을 입력하세요.");
      return;
    }
    createMutation.mutate();
  };

  const listParams = useMemo((): GetProductListParams => {
    const p: GetProductListParams = {
      page: listPage,
      size: listPageSize,
    };
    const kw = searchKeyword.trim();
    if (kw) p.keyword = kw;
    const cat = categoryCode.trim();
    if (cat && cat !== FILTER_CATEGORY_ALL) p.categoryCode = cat;
    if (statusFilter === "active") p.isActive = true;
    if (statusFilter === "inactive") p.isActive = false;
    return p;
  }, [listPage, listPageSize, searchKeyword, categoryCode, statusFilter]);

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
    resetPageDeps: [searchKeyword, categoryCode, statusFilter],
    emptyTotalPages: "one",
  });

  return (
    <>
      <Modal
        isOpen={createOpen}
        onClose={() => {
          if (!createMutation.isPending) setCreateOpen(false);
        }}
        className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8"
      >
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
          제품 등록
        </h2>
        <p className="mb-5 text-theme-sm text-gray-500 dark:text-gray-400">
          제품 코드는 등록 후 변경할 수 없습니다. 분류는 공통코드{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
            PRODUCT_CATEGORY
          </code>
          에서 선택합니다.
        </p>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <Label htmlFor="np-code">제품 코드 *</Label>
            <Input
              id="np-code"
              value={npCode}
              onChange={(e) => setNpCode(e.target.value)}
              placeholder="예: MARKOS-ENG"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="np-name">제품명 *</Label>
            <Input
              id="np-name"
              value={npName}
              onChange={(e) => setNpName(e.target.value)}
              placeholder="표시 이름"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="np-category">분류</Label>
            <Select
              id="np-category"
              className="mt-1.5"
              placeholder="분류"
              value={npCategory}
              onChange={setNpCategory}
              options={createCategoryOptions}
              size="md"
            />
          </div>
          <div>
            <Label htmlFor="np-desc">설명</Label>
            <TextArea
              id="np-desc"
              value={npDesc}
              onChange={(v) => setNpDesc(v)}
              rows={3}
              className="mt-1.5"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={npActive}
              onChange={(e) => setNpActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            활성
          </label>
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-white/10">
            <button
              type="submit"
              disabled={createMutation.isPending || !accessToken}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600"
            >
              등록
            </button>
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              취소
            </button>
          </div>
        </form>
      </Modal>

      <PageMeta
        title="제품 목록"
        description="대표 제품(발주·정의 연동 기준) 목록"
      />
      <PageBreadcrumb pageTitle="제품 목록" />
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
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
      </p>
      <ListPageLayout
        title="제품 목록"
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <>
            <div className="w-full sm:w-48">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                분류
              </p>
              <Select
                options={filterCategoryOptions}
                value={
                  categoryCode === "" ? FILTER_CATEGORY_ALL : categoryCode
                }
                onChange={(v) =>
                  setCategoryCode(v === FILTER_CATEGORY_ALL ? "" : v)
                }
                placeholder="분류 필터"
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
                <DataListPrimaryActionButton onClick={openCreateModal}>
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
                  제품 코드
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
                  분류
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  정의 수
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  기본 정의
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
                    <code>{p.productCode || "-"}</code>
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
                    {p.categoryCode ? (
                      <code>{p.categoryCode}</code>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {p.definitionCount ?? 0}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {p.defaultDefinitionId != null ? (
                      <code>{p.defaultDefinitionId}</code>
                    ) : (
                      "—"
                    )}
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

      {canManageProducts && accessToken ? (
        <>
          <ConfirmModal
            isOpen={definePromptOpen}
            illustration="check-circle"
            title="제품 정의를 등록할까요?"
            message="제품 등록이 완료되었습니다. 제품 정의를 추가하면 발주 유형·하우징 템플릿 등을 연결할 수 있습니다. 지금 등록 화면을 열까요?"
            confirmText="정의 등록하기"
            cancelText="나중에"
            confirmVariant="primary"
            onClose={() => {
              setDefinePromptOpen(false);
              setPendingProductId(null);
            }}
            onCancel={() => {
              const pid = pendingProductId;
              setDefinePromptOpen(false);
              setPendingProductId(null);
              if (pid != null) navigate(`/products/${pid}`);
            }}
            onConfirm={() => {
              setDefinePromptOpen(false);
              setDefinitionModalOpen(true);
            }}
          />
          {pendingProductId != null ? (
            <ProductDefinitionCreateModal
              isOpen={definitionModalOpen}
              onClose={() => {
                setDefinitionModalOpen(false);
                setPendingProductId(null);
              }}
              productId={pendingProductId}
              accessToken={accessToken}
              onCreated={(definitionId) => {
                navigate(
                  `/products/${pendingProductId}/definitions/${definitionId}`
                );
                setDefinitionModalOpen(false);
                setPendingProductId(null);
              }}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
