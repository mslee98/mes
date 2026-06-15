import type { RmaDetail } from "../../../api/rma";
import type { CommonCodeItem } from "../../../api/commonCode";
import { labelForCommonCode } from "../../../api/commonCode";
import Badge from "../../ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { badgeColorByDomain } from "../../../lib/ui/badgeStatusColor";
import { formatDateTimeKo } from "../../../lib/format/dateFormat";

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function statusLabel(
  code: string | null | undefined,
  statusCodes: CommonCodeItem[]
) {
  const statusCode = toText(code);
  if (!statusCode) return "미지정";
  const matched = statusCodes.find((item) => toText(item.code) === statusCode);
  return matched?.name || statusCode;
}

export interface RmaDetailPanelProps {
  rma: RmaDetail;
  rmaStatusCodes: CommonCodeItem[];
  rmaSymptomCodes: CommonCodeItem[];
  rmaReturnStatusCodes: CommonCodeItem[];
  readOnlyHint?: boolean;
}

export function RmaDetailPanel({
  rma,
  rmaStatusCodes,
  rmaSymptomCodes,
  rmaReturnStatusCodes,
  readOnlyHint,
}: RmaDetailPanelProps) {
  const rmaNo = toText(rma.rmaNo) || `#${rma.id}`;
  const statusName = statusLabel(rma.status, rmaStatusCodes);
  const symptomName = labelForCommonCode(rmaSymptomCodes, rma.symptomCode);
  const returnStatus =
    labelForCommonCode(rmaReturnStatusCodes, rma.returnStatus) ||
    (rma.returnRequiredYn ? "반송 필요" : "-");

  const actionRecords = Array.isArray(rma.actionRecords) ? rma.actionRecords : [];
  const componentChanges = Array.isArray(rma.componentChanges)
    ? rma.componentChanges
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge size="sm" color={badgeColorByDomain("delivery", statusName)}>
          {statusName}
        </Badge>
        {readOnlyHint ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">읽기 전용</span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">RMA 번호</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{rmaNo}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">증상</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">{symptomName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">접수일</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">
            {formatDateTimeKo(rma.receivedAt, { emptyFallback: "-" })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">반송 상태</p>
          <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">{returnStatus}</p>
        </div>
      </div>

      {toText(rma.requestContent) ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">요청 내용</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
            {toText(rma.requestContent)}
          </p>
        </div>
      ) : null}

      {actionRecords.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">조치 이력</p>
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  조치일시
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  조치 내용
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  결과
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {actionRecords.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
                    {formatDateTimeKo(row.actionAt, { emptyFallback: "-" })}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
                    {toText(row.actionContent) || "-"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
                    {toText(row.resultStatus) || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {componentChanges.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
            구성품 변경 이력
          </p>
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  구성품
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  기존 S/N
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  변경 S/N
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  변경일
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {componentChanges.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
                    {toText(row.componentName) || toText(row.componentTypeCode) || "-"}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono text-theme-sm text-gray-700 dark:text-gray-300">
                    {toText(row.oldSerialNo) || "-"}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono text-theme-sm text-gray-700 dark:text-gray-300">
                    {toText(row.newSerialNo) || "-"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
                    {formatDateTimeKo(row.changedAt, { emptyFallback: "-" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
