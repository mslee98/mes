import ComponentCard from "../common/ComponentCard";
import LoadingLottie from "../common/LoadingLottie";
import Badge from "../ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { isForbiddenError } from "../../lib/apiError";
import { revisionStatusLabel, formatItemDetailDt } from "../../lib/itemDetailDisplay";
import type { ItemRevision } from "../../api/itemMaster";

type ItemDetailRevisionsTabProps = {
  revisions: ItemRevision[];
  revLoading: boolean;
  revError: unknown;
  revisionStatusCodes: { code: string; name?: string; isActive?: boolean }[];
  canManageItems: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (r: ItemRevision) => void;
  onOpenFiles: (r: ItemRevision) => void;
  onRequestDelete: (r: ItemRevision) => void;
};

export function ItemDetailRevisionsTab({
  revisions,
  revLoading,
  revError,
  revisionStatusCodes,
  canManageItems,
  onOpenCreate,
  onOpenEdit,
  onOpenFiles,
  onRequestDelete,
}: ItemDetailRevisionsTabProps) {
  return (
    <ComponentCard
      title="리비전 목록"
      desc="revisionCode 순으로 정렬되어 조회됩니다."
      headerEnd={
        canManageItems ? (
          <button
            type="button"
            onClick={onOpenCreate}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            리비전 등록
          </button>
        ) : null
      }
    >
      {revLoading ? (
        <LoadingLottie message="리비전을 불러오는 중..." />
      ) : revError != null ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {isForbiddenError(revError)
            ? "리비전을 조회할 권한이 없습니다."
            : revError instanceof Error
              ? revError.message
              : "목록을 불러오지 못했습니다."}
        </p>
      ) : revisions.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          등록된 리비전이 없습니다.
        </p>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-lg border border-gray-100 dark:border-white/[0.06]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
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
                  이름
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  상태
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  기본
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  도면번호
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
                  생성 / 수정
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  첨부
                </TableCell>
                {canManageItems ? (
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    관리
                  </TableCell>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {revisions.map((r) => (
                <TableRow
                  key={r.id}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                >
                  <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                    <code className="rounded bg-gray-200/80 px-1 py-0.5 text-theme-xs dark:bg-gray-700 dark:text-gray-100">
                      {r.revisionCode}
                    </code>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    {r.revisionName}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                    <span title={r.status}>
                      {revisionStatusLabel(revisionStatusCodes, r.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    {r.isDefault ? (
                      <Badge size="sm" color="success">
                        기본
                      </Badge>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {r.drawingNo?.trim() ? (
                      r.drawingNo
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span title={r.description ?? ""}>
                      {r.description?.trim() ? (
                        r.description
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                    {formatItemDetailDt(r.createdAt)}
                    <br />
                    {formatItemDetailDt(r.updatedAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-5 py-4 text-sm">
                    <button
                      type="button"
                      onClick={() => onOpenFiles(r)}
                      className="text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      파일
                    </button>
                  </TableCell>
                  {canManageItems ? (
                    <TableCell className="px-5 py-4 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => onOpenEdit(r)}
                        className="mr-2 text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDelete(r)}
                        className="text-theme-xs font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        삭제
                      </button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ComponentCard>
  );
}
