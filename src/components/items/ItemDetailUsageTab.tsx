import ComponentCard from "../common/ComponentCard";
import LoadingLottie from "../common/LoadingLottie";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { isForbiddenError } from "../../lib/apiError";
import type { ItemUsageRow } from "../../api/itemMaster";

type ItemDetailUsageTabProps = {
  usage: ItemUsageRow[];
  usageLoading: boolean;
  usageError: unknown;
};

export function ItemDetailUsageTab({
  usage,
  usageLoading,
  usageError,
}: ItemDetailUsageTabProps) {
  return (
    <ComponentCard title="사용처" desc="제품 정의·제품에서의 사용 내역">
      {usageLoading ? (
        <LoadingLottie message="사용처를 불러오는 중..." />
      ) : usageError != null ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {isForbiddenError(usageError)
            ? "사용처를 조회할 권한이 없습니다."
            : usageError instanceof Error
              ? usageError.message
              : "조회에 실패했습니다."}
        </p>
      ) : usage.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          연결된 사용처가 없습니다.
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
                  제품정의 코드
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  제품정의명
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
                  역할
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  리비전
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
                  사용 위치
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {usage.map((u: ItemUsageRow, idx: number) => (
                <TableRow
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                >
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {u.productDefinitionCode?.trim() ? (
                      <code className="rounded bg-gray-200/80 px-1 py-0.5 text-theme-xs dark:bg-gray-700 dark:text-gray-100">
                        {u.productDefinitionCode}
                      </code>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    {u.productDefinitionName?.trim() ? (
                      u.productDefinitionName
                    ) : (
                      <span className="font-normal text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                    {u.productName?.trim() ? (
                      u.productName
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {u.itemRole?.trim() ? (
                      u.itemRole
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {u.revisionCode?.trim() ? (
                      <code className="rounded bg-gray-200/80 px-1 py-0.5 text-theme-xs dark:bg-gray-700 dark:text-gray-100">
                        {u.revisionCode}
                      </code>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {u.status?.trim() ? (
                      u.status
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span title={String(u.usageLocation ?? "")}>
                      {u.usageLocation?.trim() ? (
                        u.usageLocation
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ComponentCard>
  );
}
