import type { PurchaseOrderApprovalLineInput } from "../api/purchaseOrder";

/** 모달·상신 폼에서만 쓰는 로컬 행 id + 결재자. 저장 API에는 `lines`로만 나감 */
export type ApprovalLineDraftRow = {
  id: string;
  approverUserId: number | null;
};

export function newApprovalDraftRowId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `apr-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

/** 미선택 행은 제외하고 stepOrder를 1부터 재부여 */
export function buildApprovalLinesFromDraft(
  rows: { approverUserId: number | null }[]
): PurchaseOrderApprovalLineInput[] {
  return rows
    .filter((r) => r.approverUserId != null)
    .map((r, idx) => ({
      stepOrder: idx + 1,
      approverUserId: r.approverUserId as number,
    }));
}
