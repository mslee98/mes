import type { ProductionPlanUnitDuplicateConflict } from "../../../api/purchaseOrder";

export type UnitFieldCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "duplicate"
  | "error";

export type UnitFieldCheckState = {
  status: UnitFieldCheckStatus;
  message?: string;
};

type FormFieldHelpTone = "default" | "error" | "success";

const SOURCE_LABEL: Record<string, string> = {
  production_plan_unit: "생산 유닛",
  product_serial: "제품 시리얼 마스터",
};

function conflictSummary(conflict: ProductionPlanUnitDuplicateConflict): string {
  const sourceKey = String(conflict.source ?? "").trim();
  const sourceLabel = (SOURCE_LABEL[sourceKey] ?? sourceKey) || "기타";
  const lot = String(conflict.unitCode ?? "").trim();
  if (lot) return `${sourceLabel} · ${lot}`;
  return sourceLabel;
}

export function duplicateCheckMessage(
  fieldLabel: string,
  conflicts: ProductionPlanUnitDuplicateConflict[]
): string {
  if (conflicts.length === 0) {
    return `${fieldLabel}은(는) 이미 사용 중입니다.`;
  }
  const summaries = conflicts.slice(0, 3).map(conflictSummary);
  const suffix =
    conflicts.length > 3 ? ` 외 ${conflicts.length - 3}건` : "";
  return `${fieldLabel} 중복: ${summaries.join(", ")}${suffix}`;
}

export function availableCheckHint(fieldLabel: string): string {
  return `${fieldLabel} 사용 가능`;
}

export function fieldCheckBlocksSave(state: UnitFieldCheckState): boolean {
  return state.status === "checking" || state.status === "duplicate";
}

export function fieldCheckToFormFieldProps(state: UnitFieldCheckState): {
  helpText?: string;
  helpTone?: FormFieldHelpTone;
  error?: boolean;
  success?: boolean;
} {
  switch (state.status) {
    case "checking":
      return { helpText: "중복 확인 중…", helpTone: "default" };
    case "available":
      return {
        success: true,
        helpTone: "success",
        helpText: state.message ?? "사용 가능합니다.",
      };
    case "duplicate":
      return {
        error: true,
        helpTone: "error",
        helpText: state.message ?? "이미 사용 중입니다.",
      };
    case "error":
      return {
        error: true,
        helpTone: "error",
        helpText: state.message ?? "입력값을 확인해 주세요.",
      };
    default:
      return {};
  }
}
