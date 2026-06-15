import type { CommonCodeItem } from "../../../api/commonCode";

const LABEL_DELIVERY_WAITING = "납품 대기";
const LABEL_DELIVERY_COMPLETED = "납품 완료";

/**
 * 생산 계획 유닛 공정 코드 표시명.
 * `unitProcessStepCodes`가 있으면 `UNIT_PROCESS_STEP` API 이름을 우선하고, 없으면 로컬 폴백.
 */
const PROCESS_CODE_LABELS: Record<string, string> = {
  WAIT_DETECTOR_INCOMING: "검출기 입고 대기",
  DETECTOR_VISUAL_INSPECTION: "검출기 외관 검사",
  ELECTRONIC_INCOMING_INSPECTION: "전자부 입고 검사",
  ENGINE_ASSEMBLY: "엔진 조립",
  ENGINE_PACKAGING: "포장",
  READY_TO_DELIVER: "출고 준비 완료",
};

/** 공정 코드 → 화면용 이름 (없으면 코드 그대로) */
export function labelForProcessCode(
  code: string | null | undefined,
  unitProcessStepCodes?: CommonCodeItem[] | null
): string {
  const c = String(code ?? "").trim();
  if (!c) return "—";
  const upper = c.toUpperCase();
  if (unitProcessStepCodes && unitProcessStepCodes.length > 0) {
    const fromApi = unitProcessStepCodes.find(
      (x) => String(x.code ?? "").trim().toUpperCase() === upper
    );
    const apiName = (fromApi?.name ?? "").trim();
    if (apiName) return apiName;
  }
  const hit =
    PROCESS_CODE_LABELS[c] ??
    PROCESS_CODE_LABELS[upper] ??
    Object.entries(PROCESS_CODE_LABELS).find(
      ([k]) => k.toUpperCase() === upper
    )?.[1];
  return hit ?? c;
}

/** 공정 진행 단계 구분(배지 색상) */
export type ProcessStageKind =
  | "wait"
  | "progress"
  | "done"
  | "rework"
  | "hold"
  | "other";

export function stageKindFromProcessStatus(
  status: string | null | undefined
): ProcessStageKind {
  const s = String(status ?? "").trim().toUpperCase();
  if (!s) return "other";
  if (s === "FAILED" || s === "FAIL") return "rework";
  if (s === "PASSED" || s === "PASS") return "progress";
  if (s.includes("REWORK")) return "rework";
  if (
    s === "READY" ||
    s.includes("WAIT") ||
    s.includes("PENDING") ||
    s.includes("HOLD")
  ) {
    return s.includes("HOLD") ? "hold" : "wait";
  }
  if (
    s.includes("PROGRESS") ||
    s.includes("RUNNING") ||
    s.includes("WORK") ||
    s === "IN_PROGRESS"
  ) {
    return "progress";
  }
  if (s.includes("DONE") || s.includes("COMPLETE") || s.includes("FINISH")) {
    return "done";
  }
  return "other";
}

export type ProcessStageBadgeInput = {
  processStatus?: string | null;
  currentProcessCode?: string | null;
  isDeliveryReady?: boolean;
  isDelivered?: boolean;
};

export type ProcessStageBadgeDisplay = {
  kind: ProcessStageKind;
  label: string;
};

export function processStageBadgeFromUnit(
  unit: ProcessStageBadgeInput
): ProcessStageBadgeDisplay {
  if (unit.isDelivered === true) {
    return { kind: "done", label: LABEL_DELIVERY_COMPLETED };
  }
  if (unit.isDeliveryReady === true) {
    return { kind: "done", label: LABEL_DELIVERY_WAITING };
  }

  const status = String(unit.processStatus ?? "").trim().toUpperCase();

  if (status === "FAILED" || status === "FAIL") {
    return { kind: "rework", label: "재작업" };
  }
  if (status === "PASSED" || status === "PASS") {
    return { kind: "progress", label: "통과" };
  }
  if (!status) {
    return { kind: "other", label: "—" };
  }
  if (status.includes("REWORK")) {
    return { kind: "rework", label: "재작업" };
  }
  if (
    status === "READY" ||
    status.includes("WAIT") ||
    status.includes("PENDING")
  ) {
    return { kind: "wait", label: "대기" };
  }
  if (status.includes("HOLD")) {
    return { kind: "hold", label: "보류" };
  }
  if (
    status.includes("PROGRESS") ||
    status.includes("RUNNING") ||
    status.includes("WORK") ||
    status === "IN_PROGRESS"
  ) {
    return { kind: "progress", label: "진행" };
  }
  if (status.includes("DONE") || status.includes("COMPLETE") || status.includes("FINISH")) {
    return { kind: "done", label: "완료" };
  }

  return {
    kind: stageKindFromProcessStatus(unit.processStatus),
    label: shortLabelForProcessStatus(unit.processStatus),
  };
}

export function shortLabelForProcessStatus(
  status: string | null | undefined
): string {
  const s = String(status ?? "").trim();
  if (!s) return "—";
  const u = s.toUpperCase();
  const map: Record<string, string> = {
    READY: "대기",
    WAITING: "대기",
    PENDING: "대기",
    IN_PROGRESS: "진행 중",
    RUNNING: "진행 중",
    WORKING: "진행 중",
    HOLD: "보류",
    DONE: "완료",
    COMPLETE: "완료",
    COMPLETED: "완료",
    PASS: "통과",
    PASSED: "통과",
    FAIL: "재작업",
    FAILED: "재작업",
    REWORK: "재작업 중",
    CANCELLED: "취소",
  };
  return map[u] ?? s;
}
