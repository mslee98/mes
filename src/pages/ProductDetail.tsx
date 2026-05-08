import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageNotice from "../components/common/PageNotice";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import { useAuth } from "../hooks/useAuth";
import {
  getProduct,
  getProductFiles,
  type ProductFileLink,
  type RepresentativeProduct,
} from "../api/products";
import { API_BASE } from "../api/apiBase";
import { safeReturnOrderPathFromSearchParams } from "../lib/orderReturnNavigation";
import { fileTypeIconSrc } from "../lib/fileTypeIcon";
import { ReactComponent as ArrowDownTrayIcon } from "../icons/arrow-down-tray.svg?react";

function formatIsoDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ko-KR");
}

function formatAttachmentDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ko-KR");
}

function buildFileDownloadUrl(filePath: string): string {
  const raw = String(filePath ?? "").trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  const apiOrigin = new URL(API_BASE).origin;
  if (raw.startsWith("/")) return `${apiOrigin}${raw}`;
  return `${apiOrigin}/${raw}`;
}

async function forceDownloadFile(
  fileUrl: string,
  fileName: string,
  accessToken: string
) {
  const res = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("첨부파일 다운로드에 실패했습니다.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
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
  const id = String(productId ?? "").trim();
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
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });
  const { data: files = [], isLoading: isFilesLoading } = useQuery({
    queryKey: ["productFiles", id],
    queryFn: () => getProductFiles(id, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  if (!id) {
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
  const typeResolutionDisplay = (() => {
    const productType = String(p.productType ?? "").trim() || "-";
    const arrayType = String(p.arrayType ?? "").trim();
    const arrayTypeDisplay =
      arrayType === "CUSTOM"
        ? `CUSTOM${p.arrayCustomText?.trim() ? ` (${p.arrayCustomText.trim()})` : ""}`
        : arrayType || "-";
    const resolution =
      p.arrayWidth != null && p.arrayHeight != null
        ? `${p.arrayWidth}x${p.arrayHeight}`
        : "-";
    return `${productType} / ${arrayTypeDisplay} (${resolution})`;
  })();
  const pixelPitchDisplay = (() => {
    const raw = String(p.pixelPitch ?? "").trim();
    if (!raw) return "-";
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    return `${Math.trunc(n)}µm`;
  })();

  return (
    <>
      <PageMeta
        title={`제품: ${p.productName || p.businessName || String(p.id)}`}
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
                label="사업코드"
                value={<code>{String(p.businessCode ?? "").trim() || "-"}</code>}
              />
              <DetailRow
                label="사업명"
                value={<code>{p.businessName || "-"}</code>}
              />
              <DetailRow label="제품명" value={p.productName || "-"} />
              <DetailRow label="타입/해상도" value={<code>{typeResolutionDisplay}</code>} />
              <DetailRow label="Pixel Pitch" value={pixelPitchDisplay} />
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
              <DetailRow
                label="첨부파일"
                value={
                  isFilesLoading ? (
                    <span className="text-gray-500">첨부파일을 불러오는 중...</span>
                  ) : (files as ProductFileLink[]).length === 0 ? (
                    <span className="text-gray-500">첨부파일이 없습니다.</span>
                  ) : (
                    <ul className="space-y-2">
                      {(files as ProductFileLink[]).map((f) => {
                        const fileName =
                          f.file?.originalName ?? f.fileName ?? "attachment";
                        const filePath = f.file?.filePath ?? f.filePath ?? "";
                        return (
                          <li key={f.id} className="flex items-center gap-2">
                            <img
                              src={fileTypeIconSrc(fileName)}
                              alt=""
                              className="h-5 w-5 shrink-0"
                              decoding="async"
                            />
                            <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                              {fileName}
                            </span>
                            <span className="text-theme-xs text-gray-500">
                              {formatAttachmentDateTime(
                                f.createdAt ?? f.uploadedAt ?? ""
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await forceDownloadFile(
                                    buildFileDownloadUrl(filePath),
                                    fileName,
                                    accessToken as string
                                  );
                                } catch (error) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : "첨부파일 다운로드에 실패했습니다.";
                                  toast.error(message);
                                }
                              }}
                              title="첨부파일 다운로드"
                              aria-label="첨부파일 다운로드"
                              className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                            >
                              <ArrowDownTrayIcon className="size-4" aria-hidden />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )
                }
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
