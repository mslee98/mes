import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageNotice from "../components/common/PageNotice";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import { useAuth } from "../hooks/useAuth";
import { getProduct, type RepresentativeProduct } from "../api/products";
import { safeReturnOrderPathFromSearchParams } from "../lib/orderReturnNavigation";

function formatIsoDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ko-KR");
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
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const {
    data: product,
    isLoading: isProductLoading,
    error: productError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && Number.isFinite(id),
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
        description="대표 제품 정보"
      />
      <PageBreadcrumb pageTitle="제품 상세" />

      {returnToOrderPath ? (
        <PageNotice variant="brand" className="mb-6">
          <p className="text-theme-sm text-gray-800 dark:text-gray-200">
            발주 납품 화면에서 돌아오셨나요?{" "}
            <Link
              to={returnToOrderPath}
              className="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              발주 상세로 돌아가 납품을 이어서 등록
            </Link>
            할 수 있습니다.
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
      </div>
    </>
  );
}
