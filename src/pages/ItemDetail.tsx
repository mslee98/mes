import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
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
import { getItem, type Item } from "../api/items";
import { formatCurrency } from "../lib/formatCurrency";

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

export default function ItemDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const id = Number(itemId);
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const {
    data: item,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["item", id],
    queryFn: () => getItem(id, accessToken as string, true),
    enabled: !!accessToken && !isAuthLoading && Number.isFinite(id),
  });

  if (!Number.isFinite(id)) {
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">잘못된 품목 ID입니다.</p>
        </div>
      </>
    );
  }

  if (isAuthLoading || isLoading) {
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="품목 정보를 불러오는 중..." />
        </div>
      </>
    );
  }

  if (error || !item) {
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : "품목을 불러오지 못했습니다."}
          </p>
        </div>
      </>
    );
  }

  const i = item as Item;
  const displayCategoryName = i.category?.name || i.category?.code || "-";
  const displayTypeName = i.itemType?.name || i.itemType?.code || "-";

  return (
    <>
      <PageMeta title={`품목: ${i.name}`} description="품목 상세 정보" />
      <PageBreadcrumb pageTitle="품목 상세" />

      <div className="space-y-6">
        <ComponentCard
          title="품목 정보"
          desc="품목 마스터 기본 정보 및 속성값(2단계)입니다."
        >
          <div>
            <dl className="min-w-0 flex-1">
              <DetailRow label="코드" value={<code>{i.code}</code>} />
              <DetailRow label="품목명" value={i.name} />
              <DetailRow label="분류" value={displayCategoryName} />
              <DetailRow label="유형" value={displayTypeName} />
              <DetailRow label="규격" value={i.spec || "-"} />
              <DetailRow label="단위" value={i.unit || "-"} />
              <DetailRow label="단가" value={formatCurrency(i.unitPrice, i.currencyCode ?? "KRW")} />
              <DetailRow label="제품 구분" value={i.productDiv || "-"} />
              <DetailRow
                label="상태"
                value={
                  <Badge
                    size="sm"
                    color={i.isActive === false ? "error" : "success"}
                  >
                    {i.isActive === false ? "비활성" : "활성"}
                  </Badge>
                }
              />
            </dl>
            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
              <button
                type="button"
                onClick={() => navigate(`/items/${id}/edit`)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
              >
                수정
              </button>
              <Link
                to="/items"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                취소
              </Link>
            </div>
          </div>
        </ComponentCard>

        {i.attributes && i.attributes.length > 0 && (
          <ComponentCard title="속성값" desc="품목 속성(2단계) 값입니다.">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    속성명
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    값
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {i.attributes.map((attr, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                      {attr.attributeName ?? attr.attributeCode ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {attr.value ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ComponentCard>
        )}
      </div>
    </>
  );
}
