import type { Dispatch, SetStateAction } from "react";
import { AngleUpIcon, AngleDownIcon, TrashBinIcon } from "../../icons";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import TextArea from "../form/input/TextArea";
import Label from "../form/Label";
import type { ApprovalLineDraftRow } from "../../lib/purchaseOrderApprovalDraft";
import { newApprovalDraftRowId } from "../../lib/purchaseOrderApprovalDraft";

export type ApproverSelectOption = { value: string; label: string };

/** 목록 검색 옵션(발주·납품 등) 필터 버튼과 비슷한 높이·밀도 */
const ACTION_BTN_CLASS =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 px-1.5 text-theme-xs font-medium " +
  "text-gray-700 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 " +
  "dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-white/10";

/**
 * 발주 결재 **상신** 직전 입력(제목·결재선·상신 메모).
 * 전자결재 모달 안에 두었고, 결재 요청(`approval-requests`) 플로우로 분리할 때 이 패널만 옮기면 됩니다.
 */
export default function PurchaseOrderApprovalSubmitPanel({
  title,
  onTitleChange,
  remark,
  onRemarkChange,
  lineRows,
  setLineRows,
  approverSelectOptions,
  isUsersLoading,
  className = "",
}: {
  title: string;
  onTitleChange: (value: string) => void;
  remark: string;
  onRemarkChange: (value: string) => void;
  lineRows: ApprovalLineDraftRow[];
  setLineRows: Dispatch<SetStateAction<ApprovalLineDraftRow[]>>;
  approverSelectOptions: ApproverSelectOption[];
  isUsersLoading: boolean;
  className?: string;
}) {
  const hasAtLeastOneApprover = lineRows.some((r) => r.approverUserId != null);

  return (
    <div className={`space-y-5 ${className}`.trim()}>
      <p className="text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
        결재자는 위에서부터 순서대로 처리합니다. 필요하면 단계를 추가·삭제·순서 변경할 수 있습니다.
      </p>

      <div>
        <Label htmlFor="approval-submit-title-panel">결재 요청 제목</Label>
        <Input
          id="approval-submit-title-panel"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="예: 발주 결재 요청"
          className="mt-1"
        />
      </div>

      <div className="space-y-3">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          결재선
        </span>
        {lineRows.map((row, index) => (
          <div
            key={row.id}
            className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/50"
          >
            <Label
              htmlFor={`approval-approver-panel-${row.id}`}
              className="mb-2 text-sm"
            >
              결재자
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <div
                className="flex h-9 w-full shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-theme-xs font-semibold tabular-nums text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:w-11"
                aria-hidden
              >
                {index + 1}차
              </div>
              <div className="min-w-0 flex-1">
                <Select
                  id={`approval-approver-panel-${row.id}`}
                  className="w-full min-w-0"
                  options={approverSelectOptions}
                  placeholder="결재자 선택"
                  value={
                    row.approverUserId != null ? String(row.approverUserId) : ""
                  }
                  onChange={(v) =>
                    setLineRows((prev) =>
                      prev.map((r) =>
                        r.id === row.id
                          ? {
                              ...r,
                              approverUserId: v === "" ? null : Number(v),
                            }
                          : r
                      )
                    )
                  }
                  disabled={isUsersLoading}
                  size="sm"
                />
              </div>
              <div
                className="flex h-9 shrink-0 flex-wrap items-center justify-end gap-0.5 sm:justify-center"
                role="group"
                aria-label={`${index + 1}차 결재선 순서 및 삭제`}
              >
                <button
                  type="button"
                  aria-label={`${index + 1}차 결재선을 위로 이동`}
                  title="위로"
                  onClick={() =>
                    setLineRows((prev) => {
                      const i = prev.findIndex((r) => r.id === row.id);
                      if (i <= 0) return prev;
                      const next = [...prev];
                      const t = next[i - 1]!;
                      next[i - 1] = next[i]!;
                      next[i] = t;
                      return next;
                    })
                  }
                  disabled={index === 0}
                  className={ACTION_BTN_CLASS}
                >
                  <AngleUpIcon className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`${index + 1}차 결재선을 아래로 이동`}
                  title="아래로"
                  onClick={() =>
                    setLineRows((prev) => {
                      const i = prev.findIndex((r) => r.id === row.id);
                      if (i < 0 || i >= prev.length - 1) return prev;
                      const next = [...prev];
                      const t = next[i + 1]!;
                      next[i + 1] = next[i]!;
                      next[i] = t;
                      return next;
                    })
                  }
                  disabled={index >= lineRows.length - 1}
                  className={ACTION_BTN_CLASS}
                >
                  <AngleDownIcon className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (lineRows.length <= 1) return;
                    setLineRows((prev) => prev.filter((r) => r.id !== row.id));
                  }}
                  disabled={lineRows.length <= 1}
                  className={`${ACTION_BTN_CLASS} text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/15`}
                >
                  <TrashBinIcon className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setLineRows((prev) => [
              ...prev,
              { id: newApprovalDraftRowId(), approverUserId: null },
            ])
          }
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          + 결재자 추가
        </button>
        {!hasAtLeastOneApprover && !isUsersLoading ? (
          <p className="text-sm text-amber-800 dark:text-amber-300/95">
            결재자를 한 명 이상 선택해야 상신할 수 있습니다.
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="approval-submit-remark-panel">상신 메모</Label>
        <div className="mt-1">
          <TextArea
            id="approval-submit-remark-panel"
            rows={3}
            value={remark}
            onChange={onRemarkChange}
            placeholder="결재자에게 전달할 메모가 있으면 입력하세요."
          />
        </div>
      </div>
    </div>
  );
}
