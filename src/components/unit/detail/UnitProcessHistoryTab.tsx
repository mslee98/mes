import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CommonCodeItem } from "../../../api/commonCode";
import type { ProductionPlanUnitDetail } from "../../../api/purchaseOrder";
import { getProductionPlanUnitProcessRecords } from "../../../api/purchaseOrder";
import { useAuth } from "../../../hooks/useAuth";
import ComponentCard from "../../common/ComponentCard";
import { UnitProcessRecordsTimeline } from "../../production-plan/UnitProcessRecordsTimeline";
import { ProcessPipelineStepper } from "../../production-plan/ProcessPipelineStepper";
import { buttonClassName } from "../../../lib/ui/buttonStyles";
import { productionPlanUnitFromDetail } from "../../../domains/production-plan/mappers/unitMappers";
import { labelForProcessCode } from "../../../domains/production-plan/labels/processLabels";
import { normalizeUnitProcessRecordAttachments } from "../../../domains/production-plan/helpers/unitProcessRecordAttachments";

export interface UnitProcessHistoryTabProps {
  unit: ProductionPlanUnitDetail;
  stepCodes: CommonCodeItem[];
  showProcessActions?: boolean;
  onOpenProcessGate?: () => void;
  onUploadAttachments?: (recordId: string, files: File[]) => Promise<void>;
  uploadingRecordKey?: string | null;
}

export function UnitProcessHistoryTab({
  unit,
  stepCodes,
  showProcessActions = false,
  onOpenProcessGate,
  onUploadAttachments,
  uploadingRecordKey = null,
}: UnitProcessHistoryTabProps) {
  const processUnit = productionPlanUnitFromDetail(unit);
  const unitId = String(unit.unitId ?? "").trim();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", unitId],
    queryFn: () => getProductionPlanUnitProcessRecords(unitId, accessToken!),
    enabled: !!accessToken && !isAuthLoading && !!unitId,
  });

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => (a.processSeq ?? 0) - (b.processSeq ?? 0));
  }, [records]);

  const summary = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let attachmentCount = 0;
    for (const r of sorted) {
      const res = String(r.result ?? "").trim().toUpperCase();
      if (res === "PASS") pass += 1;
      else if (res === "FAIL") fail += 1;
      attachmentCount += normalizeUnitProcessRecordAttachments(
        r as unknown as Record<string, unknown>
      ).length;
    }
    return { total: sorted.length, pass, fail, attachmentCount };
  }, [sorted]);

  const currentLabel =
    String(unit.currentProcessName ?? "").trim() ||
    labelForProcessCode(unit.currentProcessCode, stepCodes);

  const pipelineStepCount = stepCodes.length;

  return (
    <div className="space-y-6">
      <ComponentCard
        title="공정 파이프라인"
        desc={`제품군별 ${pipelineStepCount}단계 · 표시·현재 공정 주석 표시`}
        collapsible
        defaultCollapsed
        headerEnd={
          showProcessActions && onOpenProcessGate ? (
            <button
              type="button"
              onClick={onOpenProcessGate}
              className={buttonClassName({ actionRole: "primary", size: "compact" })}
            >
              공정 처리
            </button>
          ) : undefined
        }
      >
        <ProcessPipelineStepper
          unit={processUnit}
          stepCodes={stepCodes}
          interactive={false}
        />
      </ComponentCard>

      <ComponentCard
        title="공정 이력"
        desc="PASS/FAIL 이력과 공정 첨부 파일을 함께 확인합니다."
      >
        <p className="mb-4 text-theme-sm text-gray-700 dark:text-gray-300">
          전체 {summary.total}건 · PASS {summary.pass}건 · FAIL {summary.fail}건
          {summary.attachmentCount > 0
            ? ` · 첨부 ${summary.attachmentCount}건`
            : ""}{" "}
          · 현재 공정: {currentLabel || "—"}
        </p>

        <UnitProcessRecordsTimeline
          records={sorted}
          isLoading={isLoading}
          unit={processUnit}
          accessToken={accessToken}
          viewportClassName="max-h-[min(28rem,55vh)] sm:max-h-[min(32rem,50vh)]"
          onUploadAttachments={onUploadAttachments}
          uploadingRecordKey={uploadingRecordKey}
        />
      </ComponentCard>
    </div>
  );
}
