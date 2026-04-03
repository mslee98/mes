import type { ApprovalRequestDetail, ApprovalRequestLine } from "../../api/approvalRequests";
import ComponentCard from "../common/ComponentCard";
import PageNotice from "../common/PageNotice";
import Badge from "../ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  approvalCurrentStepSummary,
  approvalLineStatusLabel,
  approvalRequestStatusLabel,
  formatApprovalDateTime,
  sortApprovalLines,
} from "./approvalRequestDisplayUtils";

function requestBadgeColor(
  status: string | undefined
): "success" | "error" | "warning" | "primary" {
  const c = String(status ?? "").trim().toUpperCase();
  if (c === "APPROVED") return "success";
  if (c === "REJECTED") return "error";
  if (c === "IN_PROGRESS") return "warning";
  return "primary";
}

function lineBadgeColor(
  status: string | undefined
): "success" | "error" | "warning" | "info" | "light" | "primary" {
  const c = String(status ?? "").trim().toUpperCase();
  if (c === "APPROVED") return "success";
  if (c === "REJECTED") return "error";
  if (c === "PENDING") return "warning";
  if (c === "WAITING") return "info";
  if (c === "SKIPPED") return "light";
  return "primary";
}

const metaDlClass =
  "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm";
const metaDtClass =
  "text-xs font-medium text-gray-500 dark:text-gray-400";
const metaDdClass =
  "mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100";

function ApproverCell({ line }: { line: ApprovalRequestLine }) {
  const name = line.approver?.name?.trim();
  const uid = line.approverUserId;
  if (name) {
    return (
      <span className="text-sm text-gray-800 dark:text-gray-100">
        {name}
        {uid != null ? (
          <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
            (#{uid})
          </span>
        ) : null}
      </span>
    );
  }
  if (uid != null)
    return (
      <span className="font-mono text-sm text-gray-800 dark:text-gray-200">
        #{uid}
      </span>
    );
  return (
    <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
  );
}

/** 모달 고정 헤더 등에서 재사용 — 본문(`ApprovalRequestDetailBody`)과 동일 정보 */
export function ApprovalRequestCompactSummary({
  request,
}: {
  request: ApprovalRequestDetail;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        결재 요청
      </span>
      <Badge size="sm" color={requestBadgeColor(request.status)}>
        {approvalRequestStatusLabel(request.status)}
      </Badge>
      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
        #{request.id}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {approvalCurrentStepSummary(request)}
      </span>
    </div>
  );
}

export function ApprovalRequestDetailBody({
  request,
  orderId,
  orderNo,
  compact = false,
  omitCompactSummary = false,
}: {
  request: ApprovalRequestDetail;
  orderId: number;
  orderNo: string;
  compact?: boolean;
  /** true면 상단 요약 줄을 렌더하지 않음 — 부모(승인 모달 헤더)에서 고정 표시할 때 */
  omitCompactSummary?: boolean;
}) {
  const lines = sortApprovalLines(request.lines);
  const targetOk =
    request.targetId == null || request.targetId === orderId;

  return (
    <>
      {compact && !omitCompactSummary ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-600">
          <ApprovalRequestCompactSummary request={request} />
        </div>
      ) : null}
      {!compact ? (
        <PageNotice variant="neutral" className="mb-4 text-sm leading-relaxed">
          <strong>발주({orderNo})와 결재 요청은 별도 문서입니다.</strong> 이 카드는{" "}
          <code>approval_requests</code> 한 건과 그에 딸린 <code>approval_lines</code>를 보여 줍니다. 반려 후
          발주를 수정하고 <strong>재상신</strong>하면 새 <code>approval_requests</code> id가 생기며, 이전 요청
          이력(예: 반려)과 구분됩니다.
        </PageNotice>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-600 dark:bg-gray-900/55">
        <dl className={metaDlClass}>
          <div>
            <dt className={metaDtClass}>대상 유형 · 대상 ID</dt>
            <dd className={metaDdClass}>
              {request.targetType ?? "ORDER"}
              {" · "}
              <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                {request.targetId ?? orderId}
              </span>
              {!targetOk ? (
                <span className="ml-2 text-xs text-amber-800 dark:text-amber-300/95">
                  (발주 id {orderId}와 불일치 — 응답 확인)
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className={metaDtClass}>요청자</dt>
            <dd className={metaDdClass}>
              {request.requestedBy?.name?.trim() ||
                (request.requestedById != null
                  ? `사용자 #${request.requestedById}`
                  : "—")}
            </dd>
          </div>
          <div>
            <dt className={metaDtClass}>상신 일시</dt>
            <dd className={metaDdClass}>
              {formatApprovalDateTime(
                request.requestedAt ?? request.submittedAt ?? null
              )}
            </dd>
          </div>
          <div>
            <dt className={metaDtClass}>완료 일시</dt>
            <dd className={metaDdClass}>
              {request.completedAt
                ? formatApprovalDateTime(request.completedAt)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className={metaDtClass}>현재 단계</dt>
            <dd className={metaDdClass}>
              {request.currentStep != null
                ? `${request.currentStep}차`
                : "—"}{" "}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                ({approvalCurrentStepSummary(request)})
              </span>
            </dd>
          </div>
          {request.title?.trim() ? (
            <div className="sm:col-span-2">
              <dt className={metaDtClass}>결재 요청 제목</dt>
              <dd className={metaDdClass}>{request.title.trim()}</dd>
            </div>
          ) : null}
          {request.remark?.trim() ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className={metaDtClass}>상신 메모</dt>
              <dd className={`${metaDdClass} whitespace-pre-wrap font-normal`}>
                {request.remark.trim()}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          결재선
        </h4>
        {lines.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            결재선(approval_lines) 데이터가 없습니다.
          </p>
        ) : (
          <div className="max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/50">
            <Table className="text-sm">
              <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/90">
                <TableRow>
                  <TableCell
                    isHeader
                    className="align-middle px-3 py-3 text-start text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    단계
                  </TableCell>
                  <TableCell
                    isHeader
                    className="align-middle px-3 py-3 text-start text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    결재자
                  </TableCell>
                  <TableCell
                    isHeader
                    className="align-middle px-3 py-3 text-start text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    상태
                  </TableCell>
                  <TableCell
                    isHeader
                    className="align-middle px-3 py-3 text-start text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    처리 일시
                  </TableCell>
                  <TableCell
                    isHeader
                    className="align-middle px-3 py-3 text-start text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    의견
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {lines.map((line) => {
                  const step = line.stepOrder ?? line.stepNo ?? "—";
                  const st = line.status ?? line.lineStatus;
                  return (
                    <TableRow
                      key={line.id ?? `${step}-${line.approverUserId}`}
                      className="bg-white odd:bg-gray-50/50 dark:bg-transparent dark:odd:bg-white/[0.02]"
                    >
                      <TableCell className="align-middle px-3 py-3 text-sm tabular-nums text-gray-800 dark:text-gray-100">
                        {step}차
                      </TableCell>
                      <TableCell className="align-middle px-3 py-3">
                        <ApproverCell line={line} />
                      </TableCell>
                      <TableCell className="align-middle px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge size="sm" color={lineBadgeColor(st)}>
                            {approvalLineStatusLabel(st)}
                          </Badge>
                          {st ? (
                            <span className="font-mono text-[0.7rem] leading-none text-gray-500 dark:text-gray-400">
                              {st}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle px-3 py-3 text-xs text-gray-700 dark:text-gray-300">
                        {formatApprovalDateTime(line.actedAt)}
                      </TableCell>
                      <TableCell className="max-w-[14rem] align-middle px-3 py-3 text-xs text-gray-700 dark:text-gray-300">
                        {line.comment?.trim() ? (
                          <span className="line-clamp-3 whitespace-pre-wrap">
                            {line.comment.trim()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {!compact ? (
        <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          상태 코드 참고:{" "}
          <strong>PENDING</strong> 지금 처리 차례 · <strong>WAITING</strong> 앞 단계 후 차례 ·{" "}
          <strong>APPROVED</strong> 승인 · <strong>REJECTED</strong> 반려 ·{" "}
          <strong>SKIPPED</strong> 생략
        </p>
      ) : null}
    </>
  );
}

/**
 * 발주 상세 — `approval_requests` + `approval_lines` 전체 카드
 */
export default function CurrentApprovalRequestSection({
  request,
  orderId,
  orderNo,
}: {
  request: ApprovalRequestDetail;
  orderId: number;
  orderNo: string;
}) {
  return (
    <ComponentCard
      title="결재 요청"
      headerEnd={
        <span className="flex flex-wrap items-center justify-end gap-2">
          <Badge size="sm" color={requestBadgeColor(request.status)}>
            {approvalRequestStatusLabel(request.status)}
          </Badge>
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
            #{request.id}
          </span>
        </span>
      }
    >
      <ApprovalRequestDetailBody
        request={request}
        orderId={orderId}
        orderNo={orderNo}
        compact={false}
      />
    </ComponentCard>
  );
}
