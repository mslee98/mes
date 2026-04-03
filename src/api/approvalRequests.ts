/**
 * 결재 요청(approval_requests) API.
 * 이전 approval-documents 경로 대신 사용합니다.
 */
import { createApiError } from "../lib/apiError";
import { API_BASE } from "./apiBase";
import { fetchAuthorized } from "./fetchAuthorized";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

function jsonHeaders(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(accessToken),
  };
}

export interface ApprovalRequestLine {
  id?: number;
  stepOrder?: number;
  stepNo?: number;
  status?: string;
  lineStatus?: string;
  approverUserId?: number;
  approver?: { id?: number; name?: string; employeeNo?: number };
  actedAt?: string | null;
  comment?: string | null;
}

export interface ApprovalRequestDetail {
  id: number;
  /** 예: ORDER */
  targetType?: string;
  /** 예: 발주 id */
  targetId?: number;
  title?: string | null;
  remark?: string | null;
  status?: string;
  /** 현재 몇 차 결재 대기 중인지 (완료 후 null) */
  currentStep?: number | null;
  completedAt?: string | null;
  lines?: ApprovalRequestLine[];
  requestedBy?: { id?: number; name?: string; employeeNo?: number };
  requestedById?: number;
  requestedAt?: string | null;
  submittedAt?: string | null;
}

function mapLine(raw: unknown): ApprovalRequestLine {
  const x = raw as Record<string, unknown>;
  const lineIdRaw = x.id;
  const lineId =
    typeof lineIdRaw === "number"
      ? lineIdRaw
      : lineIdRaw != null
        ? Number(lineIdRaw)
        : undefined;
  const stepOrderRaw = x.stepOrder ?? x.step_order ?? x.stepNo ?? x.step_no;
  const actedRaw = x.actedAt ?? x.acted_at;
  const commentRaw = x.comment;
  return {
    ...(lineId !== undefined && Number.isFinite(lineId) ? { id: lineId } : {}),
    stepOrder:
      typeof stepOrderRaw === "number"
        ? stepOrderRaw
        : stepOrderRaw != null
          ? Number(stepOrderRaw)
          : undefined,
    stepNo:
      typeof x.stepNo === "number"
        ? x.stepNo
        : x.stepNo != null
          ? Number(x.stepNo)
          : undefined,
    status:
      typeof x.status === "string"
        ? x.status
        : typeof x.lineStatus === "string"
          ? x.lineStatus
          : undefined,
    lineStatus: typeof x.lineStatus === "string" ? x.lineStatus : undefined,
    approverUserId:
      x.approverUserId != null
        ? Number(x.approverUserId)
        : x.approver_user_id != null
          ? Number(x.approver_user_id)
          : undefined,
    approver:
      x.approver && typeof x.approver === "object"
        ? (x.approver as ApprovalRequestLine["approver"])
        : undefined,
    actedAt:
      typeof actedRaw === "string" && actedRaw.trim()
        ? actedRaw.trim()
        : null,
    comment: typeof commentRaw === "string" ? commentRaw : null,
  };
}

export function mapApprovalRequestFromApi(raw: unknown): ApprovalRequestDetail | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === "number" ? x.id : Number(x.id);
  if (!Number.isFinite(id)) return undefined;
  const linesRaw =
    x.lines ??
    x.approvalLines ??
    x.approval_lines;
  const lines = Array.isArray(linesRaw) ? linesRaw.map(mapLine) : undefined;
  const requestedBy = x.requestedBy ?? x.requested_by;
  const targetTypeRaw = x.targetType ?? x.target_type;
  const targetIdRaw = x.targetId ?? x.target_id;
  const currentStepRaw = x.currentStep ?? x.current_step;
  const completedRaw = x.completedAt ?? x.completed_at;
  return {
    id,
    targetType:
      typeof targetTypeRaw === "string" ? targetTypeRaw : undefined,
    targetId:
      targetIdRaw != null && Number.isFinite(Number(targetIdRaw))
        ? Number(targetIdRaw)
        : undefined,
    title: x.title != null ? String(x.title) : null,
    remark: x.remark != null ? String(x.remark) : null,
    status: typeof x.status === "string" ? x.status : undefined,
    currentStep:
      currentStepRaw === null
        ? null
        : currentStepRaw != null && Number.isFinite(Number(currentStepRaw))
          ? Number(currentStepRaw)
          : undefined,
    completedAt:
      typeof completedRaw === "string" && completedRaw.trim()
        ? completedRaw.trim()
        : null,
    lines,
    requestedBy:
      requestedBy && typeof requestedBy === "object"
        ? (requestedBy as ApprovalRequestDetail["requestedBy"])
        : undefined,
    requestedById:
      x.requestedById != null
        ? Number(x.requestedById)
        : x.requested_by_id != null
          ? Number(x.requested_by_id)
          : undefined,
    requestedAt:
      typeof x.requestedAt === "string"
        ? x.requestedAt
        : typeof x.requested_at === "string"
          ? x.requested_at
          : null,
    submittedAt:
      typeof x.submittedAt === "string"
        ? x.submittedAt
        : typeof x.submitted_at === "string"
          ? x.submitted_at
          : null,
  };
}

/** GET /api/approval-requests/:id */
export async function getApprovalRequest(
  id: number,
  accessToken: string
): Promise<ApprovalRequestDetail> {
  const res = await fetchAuthorized(
    `${API_BASE}/approval-requests/${id}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "결재 요청을 불러오지 못했습니다.");
  }
  const mapped = mapApprovalRequestFromApi(await res.json());
  if (!mapped) {
    throw new Error("결재 요청 응답 형식이 올바르지 않습니다.");
  }
  return mapped;
}

export interface ApprovalDecisionPayload {
  comment?: string | null;
}

/** POST /api/approval-requests/:id/approve */
export async function approveApprovalRequest(
  id: number,
  payload: ApprovalDecisionPayload,
  accessToken: string
): Promise<void> {
  const body: Record<string, unknown> = {};
  const c = payload.comment?.trim();
  if (c) body.comment = c;
  const res = await fetchAuthorized(
    `${API_BASE}/approval-requests/${id}/approve`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(body),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "결재 승인을 처리하지 못했습니다.");
  }
}

/** POST /api/approval-requests/:id/reject */
export async function rejectApprovalRequest(
  id: number,
  payload: ApprovalDecisionPayload,
  accessToken: string
): Promise<void> {
  const body: Record<string, unknown> = {};
  const c = payload.comment?.trim();
  if (c) body.comment = c;
  const res = await fetchAuthorized(
    `${API_BASE}/approval-requests/${id}/reject`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(body),
      credentials: "include",
    },
    accessToken
  );
  if (!res.ok) {
    throw await createApiError(res, "결재 반려를 처리하지 못했습니다.");
  }
}
