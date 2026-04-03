import type { ApprovalRequestDetail, ApprovalRequestLine } from "../../api/approvalRequests";

/** 결재 요청(헤더) 상태 표시용 */
export function approvalRequestStatusLabel(code: string | undefined): string {
  const c = String(code ?? "").trim().toUpperCase();
  switch (c) {
    case "IN_PROGRESS":
      return "진행 중";
    case "APPROVED":
      return "승인 완료";
    case "REJECTED":
      return "반려";
    case "DRAFT":
      return "임시저장";
    default:
      return code?.trim() || "—";
  }
}

/** 결재선(approval_lines) 한 줄 상태 */
export function approvalLineStatusLabel(code: string | undefined): string {
  const c = String(code ?? "").trim().toUpperCase();
  switch (c) {
    case "PENDING":
      return "처리 대기";
    case "WAITING":
      return "순번 대기";
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "반려";
    case "SKIPPED":
      return "생략";
    default:
      return code?.trim() || "—";
  }
}

export function lineStepOrder(line: ApprovalRequestLine): number {
  const n = Number(line.stepOrder ?? line.stepNo ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function sortApprovalLines(
  lines: ApprovalRequestLine[] | undefined
): ApprovalRequestLine[] {
  if (!lines?.length) return [];
  return [...lines].sort((a, b) => lineStepOrder(a) - lineStepOrder(b));
}

export function formatApprovalDateTime(s: string | null | undefined): string {
  const raw = String(s ?? "").trim();
  if (!raw) return "—";
  const head = raw.match(
    /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/
  );
  if (head) return `${head[1]} ${head[2]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }
  return raw;
}

/** 현재 몇 차인지 요약 문구 */
export function approvalCurrentStepSummary(req: ApprovalRequestDetail): string {
  const st = String(req.status ?? "").trim().toUpperCase();
  if (st === "APPROVED") return "모든 단계 승인 완료";
  if (st === "REJECTED") return "결재 요청이 반려되었습니다";
  const step = req.currentStep;
  if (step != null && Number.isFinite(step) && step > 0) {
    return `${step}차 결재 대기 중`;
  }
  if (st === "IN_PROGRESS") return "결재 진행 중";
  return "—";
}
