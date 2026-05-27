import type { CommonCodeItem } from "../../api/commonCode";
import type { ProductionPlanUnit } from "../../api/purchaseOrder";
import type { FlatPlanUnitRow } from "../../lib/productionPlanDetailHelpers";
import { labelForProcessCode } from "../../lib/productionPlanProcessLabels";

export interface ProcessModalProductSummaryProps {
  /** 평탄화 행이 있으면 품목 라벨·제품 정보를 우선 사용 */
  flatRow: FlatPlanUnitRow | null;
  /** `flatRow`가 없을 때 최소 표시용 */
  unit: ProductionPlanUnit | null;
  stepCodes: CommonCodeItem[];
  /** `false`면 「진행 중인 공정」 카드 숨김 — 현황 전용(타임라인) 모달에서 중복 방지 */
  showCurrentProcessBlock?: boolean;
  /** `minimal`: 제품 S/N + 품목만 (공정 현황 모달 상단 등) */
  variant?: "default" | "minimal";
}

/**
 * 생산 계획 공정 처리 모달용 — `default`는 품목·S/N·관리 코드·진행 공정, `minimal`은 S/N·품목만.
 */
export function ProcessModalProductSummary({
  flatRow,
  unit,
  stepCodes,
  showCurrentProcessBlock = true,
  variant = "default",
}: ProcessModalProductSummaryProps) {
  const u = flatRow?.unit ?? unit;
  if (!u) return null;

  const lineLabel = flatRow?.lineLabel?.trim() || "품목 정보 없음";
  const serial = u.serialNo?.trim() || null;

  if (variant === "minimal") {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-3 dark:border-white/10 dark:bg-gray-800/50 sm:px-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">제품 S/N</dt>
            <dd className="mt-0.5 break-all font-mono text-theme-sm font-medium text-gray-900 dark:text-white/90">
              {serial ?? "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">품목</dt>
            <dd className="mt-0.5 break-words text-theme-sm font-semibold text-gray-900 dark:text-white">
              {lineLabel}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  const management = (u.unitCode ?? u.id)?.trim() || "—";
  const code = u.currentProcessCode?.trim();
  const processTitle = code
    ? labelForProcessCode(code, stepCodes)
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 dark:border-white/10 dark:bg-gray-800/50">
      <div className="min-w-0">
        <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          품목
        </p>
        <p className="mt-0.5 break-words text-theme-sm font-semibold text-gray-900 dark:text-white">
          {lineLabel}
        </p>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-theme-xs text-gray-500 dark:text-gray-400">제품 S/N</dt>
          <dd className="mt-0.5 break-all font-mono text-theme-sm text-gray-900 dark:text-white/90">
            {serial ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-theme-xs text-gray-500 dark:text-gray-400">관리 코드</dt>
          <dd className="mt-0.5 break-all font-mono text-theme-sm text-gray-900 dark:text-white/90">
            {management}
          </dd>
        </div>
      </dl>
      {showCurrentProcessBlock && processTitle ? (
        <div className="mt-3 rounded-lg border border-brand-100 bg-brand-25/90 px-3 py-2.5 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="text-theme-xs font-medium text-brand-700 dark:text-brand-300">
            진행 중인 공정
          </p>
          <p className="mt-0.5 break-words text-theme-sm font-semibold text-gray-900 dark:text-white">
            {processTitle}
          </p>
        </div>
      ) : null}
    </div>
  );
}
