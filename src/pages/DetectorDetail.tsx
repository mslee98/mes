import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import DetailPageState from "../components/common/DetailPageState";
import Badge from "../components/ui/badge/Badge";
import { useAuth } from "../hooks/useAuth";
import { useProductPermissions } from "../hooks/useProductPermissions";
import { getDetector, type DetectorDetail } from "../api/detectors";
import {
  COMMON_CODE_GROUP_COUNTRY,
  labelForCommonCode,
} from "../api/commonCode";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";

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

function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR");
}

function textOrDash(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  return text || "-";
}

function textListOrDash(value: string[] | null | undefined): string {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ") || "-";
}

export default function DetectorDetailPage() {
  const { detectorId } = useParams();
  const id = Number(String(detectorId ?? "").trim());
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadProducts, canManageProducts } = useProductPermissions();

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadProducts }
  );

  const {
    data: detector,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["detector", id],
    queryFn: () => getDetector(accessToken as string, id),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      canReadProducts &&
      Number.isFinite(id) &&
      id > 0,
  });

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <DetailPageState
        title="검출기 상세"
        description="검출기 마스터"
        pageTitle="검출기 상세"
        invalidMessage="잘못된 검출기 ID입니다."
      />
    );
  }

  if (!canReadProducts) {
    return (
      <DetailPageState
        title="검출기 상세"
        description="검출기 마스터"
        pageTitle="검출기 상세"
        invalidMessage="제품 조회 권한(product.read)이 필요합니다."
      />
    );
  }

  if (isAuthLoading || isLoading) {
    return (
      <DetailPageState
        title="검출기 상세"
        description="검출기 마스터"
        pageTitle="검출기 상세"
        loadingMessage="검출기 정보를 불러오는 중..."
      />
    );
  }

  if (error || !detector) {
    return (
      <DetailPageState
        title="검출기 상세"
        description="검출기 마스터"
        pageTitle="검출기 상세"
        errorMessage={
          error instanceof Error
            ? error.message
            : "검출기 정보를 불러오지 못했습니다."
        }
      />
    );
  }

  const item = detector as DetectorDetail;
  const seriesLabel = item.detectorSeries
    ? `${item.detectorSeries.name} (${item.detectorSeries.code})`
    : textOrDash(item.seriesCode);
  const countryLabel = (() => {
    const code = String(item.countryCode ?? "").trim();
    if (!code) return "-";
    return labelForCommonCode(countryCodes, code);
  })();
  const arrayResolution = (() => {
    const type = String(item.arrayType ?? "").trim();
    const width = item.arrayWidth;
    const height = item.arrayHeight;
    if (!type) return "-";
    if (width != null && height != null) return `${type} (${width}x${height})`;
    return type;
  })();

  return (
    <>
      <PageMeta title={`검출기: ${item.detectorType || id}`} description="검출기 마스터" />
      <PageBreadcrumb pageTitle="검출기 상세" />
      <ComponentCard
        title="검출기 상세"
        headerEnd={
          <div className="flex items-center gap-2">
            {canManageProducts ? (
              <Link
                to={`/detectors/${item.id}/edit`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                수정
              </Link>
            ) : null}
            <Link
              to="/detectors"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              목록
            </Link>
          </div>
        }
      >
        <dl>
          <DetailRow label="시리즈" value={seriesLabel} />
          <DetailRow label="검출기 타입" value={textOrDash(item.detectorType)} />
          <DetailRow label="고객명" value={textOrDash(item.customerName)} />
          <DetailRow label="국가" value={countryLabel} />
          <DetailRow label="프로젝트명" value={textOrDash(item.projectName)} />
          <DetailRow label="프로젝트 코드" value={textOrDash(item.projectCode)} />
          <DetailRow label="배열 해상도" value={arrayResolution} />
          <DetailRow label="피치" value={textOrDash(item.pitch)} />
          <DetailRow label="쿨러" value={textOrDash(item.cooler)} />
          <DetailRow label="F-number" value={textOrDash(item.fNumber)} />
          <DetailRow label="CSH" value={textOrDash(item.csh)} />
          <DetailRow label="Feedthru 타입" value={textOrDash(item.feedthruType)} />
          <DetailRow label="ROIC 타입" value={textOrDash(item.roicType)} />
          <DetailRow label="필터 컷" value={textOrDash(item.filterCut)} />
          <DetailRow label="납품 유형" value={textListOrDash(item.deliveryType)} />
          <DetailRow
            label="양산 여부"
            value={item.isMassProduction ? "양산" : "비양산"}
          />
          <DetailRow
            label="상태"
            value={
              <Badge size="sm" color={item.isActive === false ? "error" : "success"}>
                {item.isActive === false ? "비활성" : "활성"}
              </Badge>
            }
          />
          <DetailRow label="특이 사항" value={textOrDash(item.specialNote)} />
          <DetailRow label="비고" value={textOrDash(item.remark)} />
          <DetailRow label="생성일" value={formatDateTime(item.createdAt)} />
          <DetailRow label="수정일" value={formatDateTime(item.updatedAt)} />
        </dl>
      </ComponentCard>
    </>
  );
}
