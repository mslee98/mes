import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageNotice from "../components/common/PageNotice";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../context/AuthContext";
import { useProductPermissions } from "../hooks/useProductPermissions";
import {
  getProduct,
  productDefinitionSelectLabel,
  setProductDefaultDefinition,
  type ProductDefinition,
  type RepresentativeProduct,
} from "../api/products";
import ProductDefinitionCreateModal from "../components/products/ProductDefinitionCreateModal";
import { safeReturnOrderPathFromSearchParams } from "../lib/orderReturnNavigation";

function formatIsoDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ko-KR");
}

function definitionLifecycleBadge(d: ProductDefinition) {
  const s = (d.definitionStatus ?? "").toUpperCase();
  if (s === "ACTIVE")
    return (
      <Badge size="sm" color="success">
        ACTIVE
      </Badge>
    );
  if (s === "DRAFT")
    return (
      <Badge size="sm" color="warning">
        DRAFT
      </Badge>
    );
  if (s === "OBSOLETE")
    return (
      <Badge size="sm" color="error">
        OBSOLETE
      </Badge>
    );
  if (d.isActive === false)
    return (
      <Badge size="sm" color="error">
        비활성
      </Badge>
    );
  return (
    <Badge size="sm" color="success">
      활성
    </Badge>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex border-b border-gray-100 py-3 dark:border-white/[0.05]">
      <dt className="w-32 shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-gray-800 dark:text-white/90">
        {value}
      </dd>
    </div>
  );
}

export default function ProductDetail() {
  const { productId } = useParams();
  const id = Number(productId);
  const [searchParams] = useSearchParams();
  const returnToOrderPath = useMemo(
    () => safeReturnOrderPathFromSearchParams(searchParams),
    [searchParams]
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canManageProducts } = useProductPermissions();
  const [createDefinitionOpen, setCreateDefinitionOpen] = useState(false);

  const {
    data: product,
    isLoading: isProductLoading,
    error: productError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && Number.isFinite(id),
  });

  const definitions: ProductDefinition[] = product?.definitions ?? [];

  const defaultDefMutation = useMutation({
    mutationFn: (definitionId: number) =>
      setProductDefaultDefinition(id, accessToken as string, definitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["productList"] });
      toast.success("기본 제품 정의로 설정했습니다.");
    },
    onError: (e: Error) =>
      toast.error(e.message || "기본 정의 설정에 실패했습니다."),
  });

  if (!Number.isFinite(id)) {
    return (
      <>
        <PageMeta title="제품 상세" description="대표 제품 정보" />
        <PageBreadcrumb pageTitle="제품 상세" />
        <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">잘못된 제품 ID입니다.</p>
        </div>
      </>
    );
  }

  if (isAuthLoading || isProductLoading) {
    return (
      <>
        <PageMeta title="제품 상세" description="대표 제품 정보" />
        <PageBreadcrumb pageTitle="제품 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="제품 정보를 불러오는 중..." />
        </div>
      </>
    );
  }

  if (productError || !product) {
    return (
      <>
        <PageMeta title="제품 상세" description="대표 제품 정보" />
        <PageBreadcrumb pageTitle="제품 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {productError instanceof Error
              ? productError.message
              : "제품을 불러오지 못했습니다."}
          </p>
        </div>
      </>
    );
  }

  const p = product as RepresentativeProduct;

  return (
    <>
      <PageMeta
        title={`제품: ${p.productName || p.productCode || String(p.id)}`}
        description="대표 제품 및 제품 정의"
      />
      <PageBreadcrumb pageTitle="제품 상세" />

      {returnToOrderPath ? (
        <PageNotice variant="brand" className="mb-6">
          <p className="text-theme-sm text-gray-800 dark:text-gray-200">
            발주 납품 화면에서 이 제품의 정의를 채우러 오셨나요? 정의를 저장한 뒤{" "}
            <Link
              to={returnToOrderPath}
              className="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              발주 상세로 돌아가 납품을 이어서 등록
            </Link>
            하면 됩니다.
          </p>
        </PageNotice>
      ) : null}

      <div className="space-y-6">
        <ComponentCard
          title="제품 기본 정보"
          desc="발주 등록 시 선택하는 대표 제품입니다."
        >
          <div>
            <dl className="min-w-0 flex-1">
              <DetailRow
                label="제품 코드"
                value={<code>{p.productCode || "-"}</code>}
              />
              <DetailRow label="제품명" value={p.productName || "-"} />
              <DetailRow
                label="분류 코드"
                value={
                  p.categoryCode ? (
                    <code>{p.categoryCode}</code>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailRow
                label="설명"
                value={
                  p.description?.trim() ? (
                    <span className="whitespace-pre-wrap">{p.description}</span>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailRow
                label="상태"
                value={
                  <Badge
                    size="sm"
                    color={p.isActive === false ? "error" : "success"}
                  >
                    {p.isActive === false ? "비활성" : "활성"}
                  </Badge>
                }
              />
              <DetailRow
                label="등록일시"
                value={formatIsoDate(p.createdAt)}
              />
              <DetailRow
                label="수정일시"
                value={formatIsoDate(p.updatedAt)}
              />
            </dl>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
              <Link
                to={`/products/${id}/edit`}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
              >
                제품 수정
              </Link>
              <Link
                to="/products"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                목록으로
              </Link>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="제품 정의 목록"
          desc="발주·구성의 기준 단위입니다. 기본 정의는 행의 「기본으로」로 지정합니다."
          headerEnd={
            canManageProducts ? (
              <button
                type="button"
                onClick={() => setCreateDefinitionOpen(true)}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
              >
                제품 정의 등록
              </button>
            ) : null
          }
        >
          {definitions.length === 0 ? (
            <div className="space-y-4">
              <PageNotice variant="neutral">
                <p className="mb-2 text-theme-sm">
                  아직 정의가 없습니다.{" "}
                  {canManageProducts ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCreateDefinitionOpen(true)}
                        className="font-medium text-brand-600 underline dark:text-brand-400"
                      >
                        제품 정의 등록
                      </button>
                      으로 헤더를 만든 뒤, 상세에서 품목·리비전 구성을 추가하세요.
                    </>
                  ) : (
                    "관리 권한이 있으면 등록할 수 있습니다."
                  )}
                </p>
                <p className="text-theme-sm text-gray-600 dark:text-gray-300">
                  발주 등록 시{" "}
                  <Link
                    to="/order/new"
                    className="text-brand-600 underline dark:text-brand-400"
                  >
                    이 제품
                  </Link>
                  을 고르면 정의를 고르거나 자동 매칭합니다.
                </p>
              </PageNotice>
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
                    버전
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    발주 유형
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    프로젝트
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    구분
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    상태
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    작업
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {definitions.map((d: ProductDefinition) => (
                  <TableRow key={d.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      <Link
                        to={`/products/${id}/definitions/${d.id}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {d.name?.trim()
                          ? d.name
                          : productDefinitionSelectLabel(d)}
                      </Link>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <code>{d.code ?? "-"}</code>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {d.version ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {d.purchaseOrderTypeCode ? (
                        <code>{d.purchaseOrderTypeCode}</code>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {d.projectCode ? (
                        <code>{d.projectCode}</code>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      {d.isDefault === true ? (
                        <Badge size="sm" color="success">
                          기본
                        </Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      {definitionLifecycleBadge(d)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right text-sm">
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-2">
                        {d.isDefault !== true ? (
                          <button
                            type="button"
                            disabled={defaultDefMutation.isPending}
                            onClick={() => defaultDefMutation.mutate(d.id)}
                            className="text-theme-xs font-medium text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                          >
                            기본으로
                          </button>
                        ) : null}
                        <Link
                          to={`/products/${id}/definitions/${d.id}`}
                          className="text-brand-600 hover:underline dark:text-brand-400"
                        >
                          상세
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ComponentCard>
      </div>

      {canManageProducts && accessToken ? (
        <ProductDefinitionCreateModal
          isOpen={createDefinitionOpen}
          onClose={() => setCreateDefinitionOpen(false)}
          productId={id}
          accessToken={accessToken}
          onCreated={(definitionId) =>
            navigate(`/products/${id}/definitions/${definitionId}`)
          }
        />
      ) : null}
    </>
  );
}
