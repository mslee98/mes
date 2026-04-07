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

function toStatusCode(status: string | undefined): string {
  return String(status ?? "").trim().toUpperCase();
}

function elapsedSinceLabel(dateTime: string | null | undefined): string {
  const raw = String(dateTime ?? "").trim();
  if (!raw) return "—";
  const startedAt = new Date(raw);
  if (Number.isNaN(startedAt.getTime())) return "—";
  const nowMs = Date.now();
  const diffMs = Math.max(0, nowMs - startedAt.getTime());
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / dayMs);
  if (diffDays >= 1) return `${diffDays}일 경과`;
  const diffHours = Math.floor(diffMs / hourMs);
  if (diffHours >= 1) return `${diffHours}시간 경과`;
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes >= 1) return `${diffMinutes}분 경과`;
  return "방금 전";
}

function ApproverCell({ line }: { line: ApprovalRequestLine }) {
  const name = line.approver?.name?.trim();
  if (name) return <span className="text-sm text-gray-800 dark:text-gray-100">{name}</span>;
  const uid = line.approverUserId;
  if (uid != null) return <span className="text-sm text-gray-500 dark:text-gray-400">담당자 확인 필요</span>;
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
  const pendingLine = lines.find((line) => toStatusCode(line.status ?? line.lineStatus) === "PENDING");
  const currentApproverName =
    pendingLine?.approver?.name?.trim() ||
    (pendingLine?.approverUserId != null ? "결재자 확인 필요" : "—");
  const elapsedLabel = elapsedSinceLabel(request.requestedAt ?? request.submittedAt ?? null);
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
          <strong>발주 {orderNo}</strong>에 연결된 결재 진행 현황입니다. 단계별 처리 상태와 의견을 확인할 수
          있으며, 반려된 경우 발주 내용을 수정한 뒤 다시 상신할 수 있습니다.
        </PageNotice>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
          <p className={metaDtClass}>진행 상태</p>
          <p className={metaDdClass}>{approvalRequestStatusLabel(request.status)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
          <p className={metaDtClass}>현재 단계</p>
          <p className={metaDdClass}>{approvalCurrentStepSummary(request)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
          <p className={metaDtClass}>현재 결재자</p>
          <p className={metaDdClass}>{currentApproverName}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
          <p className={metaDtClass}>상신 후 경과</p>
          <p className={metaDdClass}>{elapsedLabel}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-600 dark:bg-gray-900/55">
        <dl className={metaDlClass}>
          <div>
            <dt className={metaDtClass}>결재 대상</dt>
            <dd className={metaDdClass}>
              발주서
              {!targetOk ? (
                <span className="ml-2 text-xs text-amber-800 dark:text-amber-300/95">
                  (연결 정보 확인 필요)
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
          처리 대기: 지금 결재할 단계 · 순번 대기: 이전 단계 처리 후 진행 · 승인됨: 결재 완료 · 반려: 결재
          중단(수정 후 재상신 가능)
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
