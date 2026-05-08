import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import { useAuth } from "../hooks/useAuth";
import { getLens, getLensFiles, type LensItem, type FileLink } from "../api/lenses";
import { API_BASE } from "../api/apiBase";
import { fileTypeIconSrc } from "../lib/fileTypeIcon";
import { formatDateTimeKo } from "../lib/dateFormat";
import { buildApiFileUrl, downloadFileWithAuth } from "../lib/fileDownload";
import { ReactComponent as ArrowDownTrayIcon } from "../icons/arrow-down-tray.svg?react";

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

export default function LensDetail() {
  const { lensId } = useParams();
  const id = String(lensId ?? "").trim();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const {
    data: lens,
    isLoading: isLensLoading,
    error: lensError,
  } = useQuery({
    queryKey: ["lens", id],
    queryFn: () => getLens(id, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });
  const { data: files = [], isLoading: isFilesLoading } = useQuery({
    queryKey: ["lensFiles", id],
    queryFn: () => getLensFiles(id, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });

  if (!id) {
    return (
      <>
        <PageMeta title="렌즈 상세" description="렌즈 정보" />
        <PageBreadcrumb pageTitle="렌즈 상세" />
        <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">잘못된 렌즈 ID입니다.</p>
        </div>
      </>
    );
  }

  if (isAuthLoading || isLensLoading) {
    return (
      <>
        <PageMeta title="렌즈 상세" description="렌즈 정보" />
        <PageBreadcrumb pageTitle="렌즈 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="렌즈 정보를 불러오는 중..." />
        </div>
      </>
    );
  }

  if (lensError || !lens) {
    return (
      <>
        <PageMeta title="렌즈 상세" description="렌즈 정보" />
        <PageBreadcrumb pageTitle="렌즈 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {lensError instanceof Error
              ? lensError.message
              : "렌즈를 불러오지 못했습니다."}
          </p>
        </div>
      </>
    );
  }

  const l = lens as LensItem;

  return (
    <>
      <PageMeta
        title={`렌즈: ${l.lensName?.trim() || l.fNumber || l.id}`}
        description="렌즈 정보"
      />
      <PageBreadcrumb pageTitle="렌즈 상세" />
      <ComponentCard title="렌즈 기본 정보" desc="렌즈 상세 정보입니다.">
        <dl className="min-w-0 flex-1">
          <DetailRow
            label="제조사"
            value={l.manufacturerName || `업체 #${l.manufacturerId}`}
          />
          <DetailRow label="렌즈명" value={l.lensName?.trim() || "-"} />
          <DetailRow label="F Number" value={`F/${l.fNumber || "-"}`} />
          <DetailRow label="초점 거리" value={`${l.focalLength || "-" }mm`} />
          <DetailRow
            label="상태"
            value={
              <Badge size="sm" color={l.isActive === false ? "error" : "success"}>
                {l.isActive === false ? "비활성" : "활성"}
              </Badge>
            }
          />
          <DetailRow
            label="등록일시"
            value={formatDateTimeKo(l.createdAt, { emptyFallback: "-" })}
          />
          <DetailRow
            label="수정일시"
            value={formatDateTimeKo(l.updatedAt, { emptyFallback: "-" })}
          />
          <DetailRow
            label="첨부파일"
            value={
              isFilesLoading ? (
                <span className="text-gray-500">첨부파일을 불러오는 중...</span>
              ) : (files as FileLink[]).length === 0 ? (
                <span className="text-gray-500">첨부파일이 없습니다.</span>
              ) : (
                <ul className="space-y-2">
                  {(files as FileLink[]).map((f) => {
                    const fileName = f.file?.originalName ?? f.fileName ?? "attachment";
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
                          {formatDateTimeKo(f.createdAt ?? f.uploadedAt, {
                            emptyFallback: "-",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await downloadFileWithAuth({
                                fileUrl: buildApiFileUrl(filePath, API_BASE),
                                fileName,
                                accessToken: accessToken as string,
                              });
                            } catch (error) {
                              const message =
                                error instanceof Error
                                  ? error.message
                                  : "첨부파일 다운로드에 실패했습니다.";
                              notify.error(message);
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
            to={`/lenses/${id}/edit`}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            렌즈 수정
          </Link>
          <Link
            to="/lenses"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            목록으로
          </Link>
        </div>
      </ComponentCard>
    </>
  );
}
