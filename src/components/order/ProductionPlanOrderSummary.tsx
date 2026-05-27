import type { ReactNode } from "react";
import Badge from "../ui/badge/Badge";
import { DetectorTypeGuidePopover } from "../common/DetectorTypeGuidePopover";
import { formatDateYmd } from "../../lib/dateFormat";

export type ProductionPlanOrderSummaryProps = {
  orderNo: string;
  partnerLabel: ReactNode;
  productName: string;
  businessName?: string | null;
  /** 다중 라인일 때 ` 외 N건` 등 */
  extraLinesSuffix?: string;
  detectorLabel: string;
  lensLabel: string;
  qtyLabel: string;
  dueDate?: string | null;
  requesterName?: string | null;
};

function SummaryCell({
  label,
  labelAddon,
  children,
  className = "",
}: {
  label: string;
  labelAddon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="flex flex-wrap items-center gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        {labelAddon}
      </dt>
      <dd className="mt-0.5 min-w-0 font-medium text-gray-900 dark:text-white">
        {children}
      </dd>
    </div>
  );
}

/** 생산 계획·실제 생산 모달 상단 — 발주 핵심 정보 스냅샷 */
export function ProductionPlanOrderSummary({
  orderNo,
  partnerLabel,
  productName,
  businessName,
  extraLinesSuffix = "",
  detectorLabel,
  lensLabel,
  qtyLabel,
  dueDate,
  requesterName,
}: ProductionPlanOrderSummaryProps) {
  const businessLine = businessName?.trim();
  const requester = requesterName?.trim();

  return (
    <div
      className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50/90 to-white px-4 py-4 dark:border-white/10 dark:from-white/[0.04] dark:to-white/[0.02] sm:px-5 sm:py-5"
      role="region"
      aria-label="발주 스냅샷"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            발주 스냅샷
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl">
            {orderNo.trim() || "—"}
            {extraLinesSuffix ? (
              <span className="ml-1 text-base font-medium text-gray-500 dark:text-gray-400">
                {extraLinesSuffix}
              </span>
            ) : null}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-theme-sm text-gray-600 dark:text-gray-300">
            <span className="inline-flex min-w-0 items-center">
              {partnerLabel}
            </span>
            {requester ? (
              <>
                <span
                  className="inline-flex items-center text-gray-300 dark:text-gray-600"
                  aria-hidden
                >
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400">담당</span>
                  <span>{requester}</span>
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge size="sm" color="primary" variant="light">
            {detectorLabel}
          </Badge>
          <Badge size="sm" color="info" variant="light">
            {qtyLabel}
          </Badge>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-theme-sm sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCell label="제품" className="sm:col-span-2 lg:col-span-2">
          <p className="truncate" title={productName}>
            {productName.trim() || "—"}
          </p>
          {businessLine ? (
            <p
              className="mt-0.5 truncate text-theme-xs font-normal text-gray-500 dark:text-gray-400"
              title={businessLine}
            >
              {businessLine}
            </p>
          ) : null}
        </SummaryCell>

        <SummaryCell
          label="검출기"
          labelAddon={<DetectorTypeGuidePopover />}
        >
          <span className="truncate" title={detectorLabel}>
            {detectorLabel}
          </span>
        </SummaryCell>

        <SummaryCell label="렌즈">
          <span className="truncate" title={lensLabel}>
            {lensLabel.trim() || "—"}
          </span>
        </SummaryCell>

        <SummaryCell label="수량">
          <span className="tabular-nums">{qtyLabel}</span>
        </SummaryCell>

        {dueDate?.trim() ? (
          <SummaryCell label="고객 요청 납기">
            {formatDateYmd(dueDate, { emptyFallback: "—" })}
          </SummaryCell>
        ) : null}
      </dl>
    </div>
  );
}
