import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function write(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
  console.log("wrote", rel);
}

write(
  "src/domains/production-plan/labels/processLabels.ts",
  `import type { CommonCodeItem } from "../../../api/commonCode";

const LABEL_DELIVERY_WAITING = "납품 대기";
const LABEL_DELIVERY_COMPLETED = "납품 완료";

/**
 * 생산 계획 유닛 공정 코드 표시명.
 * \`unitProcessStepCodes\`가 있으면 \`UNIT_PROCESS_STEP\` API 이름을 우선하고, 없으면 로컬 폴백.
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
`
);

write(
  "src/domains/production-plan/labels/statusLabels.ts",
  `import { createStatusLabelFn } from "../../../lib/status/createCommonCodeLabel";

const PRODUCTION_PLAN_STATUS_FALLBACK: Record<string, string> = {
  OPEN: "진행",
  IN_PROGRESS: "진행",
  COMPLETE: "완료",
  COMPLETED: "완료",
  CLOSED: "종료",
  CANCELLED: "취소",
  CANCELED: "취소",
};

/** 생산 계획 status code → 공통코드 name (없으면 폴백·code) */
export const labelForProductionPlanStatus = createStatusLabelFn(
  PRODUCTION_PLAN_STATUS_FALLBACK
);
`
);

write(
  "src/domains/production-plan/helpers/lineSelection.ts",
  `import type { PurchaseOrderItem } from "../../../api/purchaseOrder";
import { isYmdOnOrAfter } from "../../../lib/format/dateFormat";
import type { ProductionPlanItemInput } from "./distributeItems";

export type PlanLineDraft = {
  orderItemId: number;
  selected: boolean;
  qtyInput: string;
};

export type ProductionPlanLineSelectionValidationResult =
  | { ok: true; items: ProductionPlanItemInput[] }
  | { ok: false; message: string };

export const MSG_SELECT_LINE_QTY = "선택한 품목의 생산 수량을 입력해주세요.";
export const MSG_EXCEED_UNPLANNED = "미계획 수량을 초과할 수 없습니다.";
export const MSG_PLANNED_DATE_BEFORE_DELIVERY =
  "완료예정일은 IDCCA 인수일 이후 날짜로 선택해주세요.";

export function unplannedQtyForLine(
  line: PurchaseOrderItem,
  registeredQtyByOrderItemId: Map<number, number>
): number {
  const orderQty = Math.max(0, Math.floor(Number(line.qty) || 0));
  const registered = registeredQtyByOrderItemId.get(line.id) ?? 0;
  return Math.max(0, orderQty - registered);
}

export function parsePlanLineQtyInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

export function createInitialPlanLineDrafts(
  orderLines: PurchaseOrderItem[]
): PlanLineDraft[] {
  return orderLines.map((line) => ({
    orderItemId: line.id,
    selected: false,
    qtyInput: "",
  }));
}

export function buildProductionPlanItemsFromSelection(
  drafts: PlanLineDraft[]
): ProductionPlanItemInput[] {
  const items: ProductionPlanItemInput[] = [];
  for (const draft of drafts) {
    if (!draft.selected) continue;
    const qty = parsePlanLineQtyInput(draft.qtyInput);
    if (qty == null) continue;
    items.push({ purchaseOrderItemId: draft.orderItemId, plannedQty: qty });
  }
  return items;
}

export function totalPlannedQtyFromItems(items: ProductionPlanItemInput[]): number {
  return items.reduce((sum, item) => sum + item.plannedQty, 0);
}

export function validateProductionPlanLineQtyOnly(params: {
  drafts: PlanLineDraft[];
  orderLines: PurchaseOrderItem[];
  registeredQtyByOrderItemId: Map<number, number>;
}): ProductionPlanLineSelectionValidationResult {
  const { drafts, orderLines, registeredQtyByOrderItemId } = params;
  const items = buildProductionPlanItemsFromSelection(drafts);
  if (items.length === 0) {
    return { ok: false, message: MSG_SELECT_LINE_QTY };
  }
  for (const item of items) {
    const line = orderLines.find((l) => l.id === item.purchaseOrderItemId);
    if (!line) continue;
    const unplanned = unplannedQtyForLine(line, registeredQtyByOrderItemId);
    if (item.plannedQty > unplanned) {
      return { ok: false, message: MSG_EXCEED_UNPLANNED };
    }
  }
  return { ok: true, items };
}

export function validateProductionPlanLineSelection(params: {
  drafts: PlanLineDraft[];
  orderLines: PurchaseOrderItem[];
  registeredQtyByOrderItemId: Map<number, number>;
  deliveryDate: string;
  plannedDeliveryDate: string;
}): ProductionPlanLineSelectionValidationResult {
  const qtyOnly = validateProductionPlanLineQtyOnly(params);
  if (!qtyOnly.ok) return qtyOnly;
  if (
    params.plannedDeliveryDate.trim() &&
    params.deliveryDate.trim() &&
    !isYmdOnOrAfter(params.plannedDeliveryDate.trim(), params.deliveryDate.trim())
  ) {
    return { ok: false, message: MSG_PLANNED_DATE_BEFORE_DELIVERY };
  }
  return qtyOnly;
}
`
);

// unitMappers — 손상된 사용자-facing 문자열만 패치
const unitMappersPath = path.join(root, "src/domains/production-plan/mappers/unitMappers.ts");
let unitMappers = fs.readFileSync(unitMappersPath, "utf8");
unitMappers = unitMappers
  .replace('return "???";', 'return "미등록";')
  .replace('"?? ?? ??";', '"품목 미지정";')
  .replace(
    "/** Unit ?? API ?? ? ?? ??�???? `ProductionPlanUnit` */",
    "/** Unit 상세 API 응답 → 목록용 `ProductionPlanUnit` */"
  )
  .replace(
    "/** ??? ??? ??? ?? ? Unit ??�?? ?? ? */",
    "/** 납품·Unit 고객 코드 표시용 */"
  )
  .replace(
    "/** ?? ??�???? ?? ? (?? ?? ?? `FlatPlanUnitRow`? ?? ??) */",
    "/** 발주 품목 없이도 사용 가능 (공정 진행률 `FlatPlanUnitRow` 용) */"
  )
  .replace(
    "/** ?? ?? API? Unit ? API ? ??, ??? flatRow? ?? */",
    "/** 납품 등록 API·Unit 편집 API 간, flatRow 보정 */"
  );
fs.writeFileSync(unitMappersPath, unitMappers, "utf8");
console.log("patched unitMappers.ts");

console.log("done");
