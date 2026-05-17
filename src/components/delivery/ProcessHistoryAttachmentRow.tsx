import toast from "react-hot-toast";
import { formatDateTimeKo } from "../../lib/dateFormat";
import { downloadFileWithAuth } from "../../lib/fileDownload";
import { fileTypeIconSrc } from "../../lib/fileTypeIcon";
import type { NormalizedProcessAttachment } from "../../lib/unitProcessRecordAttachments";
import { ReactComponent as ArrowDownTrayIcon } from "../../icons/arrow-down-tray.svg?react";

export function ProcessHistoryAttachmentRow({
  attachment: a,
  accessToken,
}: {
  attachment: NormalizedProcessAttachment;
  accessToken: string | null;
}) {
  return (
    <li className="flex items-center gap-2">
      <img
        src={fileTypeIconSrc(a.label)}
        alt=""
        className="h-5 w-5 shrink-0"
        decoding="async"
      />
      <span className="min-w-0 flex-1 truncate text-theme-sm text-gray-900 dark:text-gray-100">
        {a.label}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
          {formatDateTimeKo(a.createdAt ?? "", { emptyFallback: "" })}
        </span>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          title="첨부파일 다운로드"
          aria-label="첨부파일 다운로드"
          onClick={async () => {
            if (!accessToken) {
              toast.error("로그인이 필요합니다.");
              return;
            }
            try {
              await downloadFileWithAuth({
                fileUrl: a.downloadUrl,
                fileName: a.label,
                accessToken,
              });
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "첨부파일 다운로드에 실패했습니다.";
              toast.error(message);
            }
          }}
        >
          <ArrowDownTrayIcon className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}
