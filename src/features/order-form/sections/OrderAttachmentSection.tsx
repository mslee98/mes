import FileUploadDropzone from "../../../components/form/FileUploadDropzone";
import { TrashBinIcon } from "../../../icons";
import type { PurchaseOrderFile } from "../../../api/purchaseOrder";
import { fileTypeIconSrc } from "../../../lib/ui/fileTypeIcon";
import { formatDateTimeKo } from "../../../lib/format/dateFormat";

type Props = {
  isNew: boolean;
  isPending: boolean;
  pendingFilesForCreate: File[];
  files: PurchaseOrderFile[];
  isFileUploadPending: boolean;
  isFileDeletePending: boolean;
  uploadingExistingFileNames: string[];
  recentlyUploadedFileNames: string[];
  onError: (message: string) => void;
  onSelectCreateFiles: (files: File[]) => void;
  onRemoveCreateFile: (index: number) => void;
  onUploadExistingFiles: (files: File[]) => void;
  onDeleteExistingFile: (fileId: number) => void;
};

export default function OrderAttachmentSection({
  isNew,
  isPending,
  pendingFilesForCreate,
  files,
  isFileUploadPending,
  isFileDeletePending,
  uploadingExistingFileNames,
  recentlyUploadedFileNames,
  onError,
  onSelectCreateFiles,
  onRemoveCreateFile,
  onUploadExistingFiles,
  onDeleteExistingFile,
}: Props) {
  return (
    <div className="space-y-3">
      {isNew ? (
        <>
          <FileUploadDropzone
            onSelectFiles={onSelectCreateFiles}
            onError={onError}
            disabled={isPending}
            multiple
            buttonLabel="파일 선택"
            uploadGuideText="파일을 먼저 선택하면 등록 시 자동으로 함께 업로드됩니다."
          />
          <ul className="divide-y divide-gray-100 text-theme-sm dark:divide-white/5">
            {pendingFilesForCreate.length === 0 ? (
              <li className="py-2 text-gray-500">선택된 첨부파일이 없습니다.</li>
            ) : (
              pendingFilesForCreate.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center py-2"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <img
                      src={fileTypeIconSrc(file.name)}
                      alt=""
                      className="h-5 w-5 shrink-0"
                      decoding="async"
                    />
                    <span className="truncate text-gray-800 dark:text-gray-200">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveCreateFile(index)}
                      title="첨부파일 제거"
                      aria-label="첨부파일 제거"
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-error-600 transition-colors hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/15"
                    >
                      <TrashBinIcon className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </>
      ) : (
        <>
          <FileUploadDropzone
            onSelectFiles={onUploadExistingFiles}
            onError={onError}
            disabled={isFileUploadPending}
            multiple
            buttonLabel="파일 선택"
            uploadGuideText="아래 버튼을 눌러 파일을 업로드하세요."
          />
          {isFileUploadPending ? (
            <span className="text-theme-xs text-gray-500">업로드 중...</span>
          ) : null}
          {uploadingExistingFileNames.length > 0 ? (
            <ul className="rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-theme-xs text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
              {uploadingExistingFileNames.map((name, idx) => (
                <li key={`${name}-${idx}`} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                    업로드 중
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="divide-y divide-gray-100 text-theme-sm dark:divide-white/5">
            {files.length === 0 ? (
              <li className="py-2 text-gray-500">첨부파일이 없습니다.</li>
            ) : (
              files.map((f) => (
                <li key={f.id} className="flex items-center py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={fileTypeIconSrc(String(f.fileName ?? ""))}
                      alt=""
                      className="h-5 w-5 shrink-0"
                      decoding="async"
                    />
                    <span className="truncate text-gray-800 dark:text-gray-200">
                      {f.fileName ?? "-"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteExistingFile(f.id)}
                      disabled={isFileDeletePending}
                      title="첨부파일 삭제"
                      aria-label="첨부파일 삭제"
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-error-600 transition-colors hover:bg-error-50 disabled:pointer-events-none disabled:opacity-40 dark:text-error-400 dark:hover:bg-error-500/15"
                    >
                      <TrashBinIcon className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    {f.fileName &&
                    recentlyUploadedFileNames.includes(f.fileName) ? (
                      <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        업로드 완료
                      </span>
                    ) : null}
                    <span className="shrink-0 text-gray-500">
                      {formatDateTimeKo(f.uploadedAt ?? f.createdAt ?? "", {
                        emptyFallback: "",
                      })}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}
