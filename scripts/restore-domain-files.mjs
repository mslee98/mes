import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();

function write(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
  console.log("wrote", rel);
}

function patch(rel, pairs) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, "utf8");
  for (const [a, b] of pairs) c = c.split(a).join(b);
  fs.writeFileSync(p, c, "utf8");
}

const api = '../../../api/';
const lib = '../../../lib/';

patch("src/domains/production-plan/helpers/detailHelpers.ts", [
  ['from "../api/', `from "${api}`],
  ['from "./productionPlanProcessSequence"', 'from "./processSequence"'],
]);
patch("src/domains/production-plan/helpers/processSequence.ts", [
  ['from "../api/', `from "${api}`],
]);
patch("src/domains/production-plan/helpers/registerFromPlanUnit.ts", [
  ['from "../api/', `from "${api}`],
]);
patch("src/domains/production-plan/helpers/distributeItems.ts", [
  ['from "../api/', `from "${api}`],
]);
patch("src/domains/production-plan/helpers/aggregateRegisteredQty.ts", [
  ['from "../api/', `from "${api}`],
]);
patch("src/domains/production-plan/helpers/serialFromOrderLine.ts", [
  ['from "../api/', `from "${api}`],
  ['from "./orderLineItemRow"', `from "${lib}orderLineItemRow"`],
]);
patch("src/domains/production-plan/helpers/unitProcessRecordAttachments.ts", [
  ['from "./fileDownload"', `from "${lib}fileDownload"`],
]);
patch("src/domains/production-plan/serial/legacyProductSerialNumber.ts", [
  ['from "../api/', `from "${api}`],
  [
    'from "./productionPlanDetailHelpers"',
    'from "../helpers/detailHelpers"',
  ],
]);

const resolveBlock = `
import {
  ORDER_LINE_WAVELENGTH_CODE,
  detectorElementCodeFromBusinessName,
  detectorElementInitial,
} from "${lib}orderLineDetectorFields";
import { resolveDetectorElementCodeForSerial } from "../serial/legacyProductSerialNumber";

export type ResolvePlanUnitDetectorInput = {
  unit: ProductionPlanUnit;
  orderLine: PlanUnitOrderLineSnapshot | PurchaseOrderItem;
  rowOverrides?: Partial<
    Pick<FlatPlanUnitRow, "detectorElementCode" | "wavelengthCode" | "detectorId">
  >;
};

/** 생산·Unit 공정 — 발주와 동일 취지로 소자·파장 보정 */
export function resolvePlanUnitDetectorFields(
  input: ResolvePlanUnitDetectorInput
): {
  detectorElementCode: string;
  wavelengthCode: string;
  detectorId: number | null;
} {
  const { unit, orderLine, rowOverrides } = input;
  const ol = orderLine as PlanUnitOrderLineSnapshot;

  let detectorElementCode =
    String(unit.detectorElementCode ?? rowOverrides?.detectorElementCode ?? ol.detectorElementCode ?? "").trim();

  if (!detectorElementCode) {
    const lineCode =
      ol.businessNameSnapshot ??
      ol.businessName ??
      ol.productNameSnapshot ??
      ol.itemName ??
      "";
    detectorElementCode = resolveDetectorElementCodeForSerial(
      ol.detectorElementCode ?? unit.detectorElementCode,
      String(lineCode)
    );
  }

  if (!detectorElementCode) {
    const businessName =
      ol.businessNameSnapshot ?? ol.businessName ?? ol.productNameSnapshot ?? "";
    const token = detectorElementCodeFromBusinessName(String(businessName));
    if (token) detectorElementCode = detectorElementInitial(token);
  }

  const wavelengthCode =
    String(
      unit.wavelengthCode ??
        rowOverrides?.wavelengthCode ??
        ol.wavelengthCode ??
        ""
    ).trim() || ORDER_LINE_WAVELENGTH_CODE;

  const detectorIdRaw =
    unit.detectorId ?? rowOverrides?.detectorId ?? ol.detectorId;
  const detectorId =
    detectorIdRaw != null && Number.isFinite(Number(detectorIdRaw))
      ? Number(detectorIdRaw)
      : null;

  return { detectorElementCode, wavelengthCode, detectorId };
}

export function orderLineSnapshotFromPurchaseOrderItem(
  poi: PurchaseOrderItem
): PlanUnitOrderLineSnapshot {
  return {
    productId: poi.productId,
    itemName: poi.itemName,
    productNameSnapshot: poi.productNameSnapshot ?? null,
    businessNameSnapshot: poi.businessNameSnapshot ?? null,
    definitionNameSnapshot: poi.definitionNameSnapshot ?? null,
    versionSnapshot: poi.versionSnapshot ?? null,
    businessName: poi.businessName ?? null,
    spec: poi.spec ?? undefined,
    detectorElementCode: poi.detectorElementCode ?? null,
    wavelengthCode: poi.wavelengthCode ?? null,
    detectorId: poi.detectorId ?? null,
  };
}
`;

const detailPath = path.join(root, "src/domains/production-plan/helpers/detailHelpers.ts");
let detail = fs.readFileSync(detailPath, "utf8");
if (!detail.includes("resolvePlanUnitDetectorFields")) {
  detail = detail.trimEnd() + resolveBlock;
  fs.writeFileSync(detailPath, detail, "utf8");
}

write(
  "src/domains/production-plan/queries/invalidateUnitListQueries.ts",
  `import type { QueryClient } from "@tanstack/react-query";

/** 공정 PASS/FAIL 등 품목 상태 변경 후 생산·납품 품목 목록·탭 카운트 즉시 갱신 */
export async function invalidateProductionPlanUnitListQueries(
  queryClient: QueryClient
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnits"] }),
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnitTabCounts"] }),
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnit"] }),
    queryClient.invalidateQueries({ queryKey: ["productionPlanUnitProcessRecords"] }),
    queryClient.invalidateQueries({ queryKey: ["productionPlan"] }),
  ]);
}
`
);

write(
  "src/domains/production-plan/helpers/lineSelection.ts",
  `import type { PurchaseOrderItem } from "${api}purchaseOrder";
import { isYmdOnOrAfter } from "${lib}dateFormat";
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
export const MSG_PLANNED_DATE_BEFORE_ISSUE =
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
    return { ok: false, message: MSG_PLANNED_DATE_BEFORE_ISSUE };
  }
  return qtyOnly;
}
`
);

write(
  "src/domains/production-plan/serial/placeholderProductSerial.ts",
  `import type { AssignProductSerialUnitInput } from "${api}purchaseOrder";
import {
  detectorElementCodeForApi,
  lineCodeFromOrderLine,
} from "./legacyProductSerialNumber";
import type { FlatPlanUnitRow } from "../helpers/detailHelpers";
import { resolvePlanUnitDetectorFields } from "../helpers/detailHelpers";

/** 백엔드 \`OrdersService.PLACEHOLDER_PRODUCT_SERIAL_PATTERN\`과 동일 */
export const PLACEHOLDER_PRODUCT_SERIAL_PATTERN = /^unissued-\\d{4}$/i;

export function isPlaceholderProductSerialNo(
  serialNo?: string | null
): boolean {
  return PLACEHOLDER_PRODUCT_SERIAL_PATTERN.test(String(serialNo ?? "").trim());
}

export function displayProductSerialNo(serialNo?: string | null): string {
  const s = String(serialNo ?? "").trim();
  if (!s) return "미할당";
  if (isPlaceholderProductSerialNo(s)) return "제품 미확정";
  return s;
}

export function needsProductSerialAssignment(serialNo?: string | null): boolean {
  const s = String(serialNo ?? "").trim();
  return !s || isPlaceholderProductSerialNo(s);
}

export function buildPlaceholderSerialAssignUnits(
  flatRows: FlatPlanUnitRow[]
): AssignProductSerialUnitInput[] {
  return flatRows.map((row) => {
    const lot = row.unit.unitCode ?? row.unit.id;
    const { detectorElementCode, wavelengthCode, detectorId } =
      resolvePlanUnitDetectorFields({
        unit: row.unit,
        orderLine: row.orderLine,
        rowOverrides: row,
      });
    if (!detectorElementCode || !wavelengthCode) {
      throw new Error(
        \`품목 \${lot}의 검출기 소자·파장 정보가 없습니다.\`
      );
    }
    if (detectorId == null) {
      throw new Error(\`품목 \${lot}의 검출기(detectorId)가 없습니다.\`);
    }
    const serialNo = String(row.unit.serialNo ?? "").trim();
    return {
      unitId: row.unit.id,
      serialNo,
      detectorElementCode: detectorElementCodeForApi(
        detectorElementCode,
        lineCodeFromOrderLine(row.orderLine)
      ),
      wavelengthCode,
      detectorId,
    };
  });
}
`
);

write(
  "src/domains/production-plan/helpers/unitListDates.ts",
  `import type {
  ProductionPlanUnitListItem,
  ProductionPlanUnitPerspective,
} from "${api}purchaseOrder";
import { formatDateYmd } from "${lib}dateFormat";

const DELAY_BADGE_BASE =
  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium";

export function unitListScheduleDateYmd(
  perspective: ProductionPlanUnitPerspective,
  row: ProductionPlanUnitListItem
): string | null {
  if (perspective === "production") {
    const planned = String(row.plan?.plannedDate ?? "").trim();
    return planned || null;
  }
  const fromPlan = String(row.deliveryPlanPlannedDeliveryDate ?? "").trim();
  if (fromPlan) return fromPlan;
  const due = String(row.dueDate ?? "").trim();
  return due || null;
}

export function unitListCompletedDateYmd(
  perspective: ProductionPlanUnitPerspective,
  row: ProductionPlanUnitListItem
): string | null {
  if (perspective === "production") {
    const at = String(row.productionCompletedAt ?? "").trim();
    return at || null;
  }
  const at = String(row.deliveredAt ?? "").trim();
  return at || null;
}

export function formatUnitListScheduleDate(
  perspective: ProductionPlanUnitPerspective,
  row: ProductionPlanUnitListItem
): string {
  return formatDateYmd(unitListScheduleDateYmd(perspective, row));
}

export function formatUnitListCompletedDate(
  perspective: ProductionPlanUnitPerspective,
  row: ProductionPlanUnitListItem
): string {
  return formatDateYmd(unitListCompletedDateYmd(perspective, row));
}

export function unitListDelayDays(row: ProductionPlanUnitListItem): number {
  return Math.max(0, Number(row.delayDays ?? 0));
}

export function unitListDelayLabel(row: ProductionPlanUnitListItem): string {
  const delayDays = unitListDelayDays(row);
  if (delayDays <= 0) return "";
  return \`\${delayDays}일\`;
}

export function unitListDelayBadgeClassName(
  row: ProductionPlanUnitListItem
): string {
  if (unitListDelayDays(row) <= 0) return "";
  return \`\${DELAY_BADGE_BASE} bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300\`;
}

export function unitListDatesColumnTitle(
  perspective: ProductionPlanUnitPerspective,
  kind: "schedule" | "completed"
): string {
  if (kind === "schedule") {
    return perspective === "production" ? "생산 예정일" : "납품 예정일";
  }
  return perspective === "production" ? "생산 완료일" : "납품 완료일";
}
`
);

write(
  "src/domains/production-plan/helpers/unitListPerspective.ts",
  `import type {
  ProductionPlanUnitPerspective,
  ProductionPlanUnitTab,
} from "${api}purchaseOrder";

export const PRODUCTION_PLAN_UNIT_TABS: ProductionPlanUnitTab[] = [
  "WAITING",
  "IN_PROGRESS",
  "COMPLETED",
  "DELAYED",
];

const TAB_LABELS: Record<
  ProductionPlanUnitPerspective,
  Record<ProductionPlanUnitTab, string>
> = {
  production: {
    WAITING: "생산 대기",
    IN_PROGRESS: "생산 진행",
    COMPLETED: "생산 완료",
    DELAYED: "생산 지연",
  },
  delivery: {
    WAITING: "납품 대기",
    IN_PROGRESS: "계획·공정중",
    COMPLETED: "납품 완료",
    DELAYED: "지연",
  },
};

export function tabLabel(
  perspective: ProductionPlanUnitPerspective,
  tab: ProductionPlanUnitTab
): string {
  return TAB_LABELS[perspective][tab];
}

export function completedTabLabel(
  perspective: ProductionPlanUnitPerspective
): string {
  return tabLabel(perspective, "COMPLETED");
}

export function unitListPageTitle(
  perspective: ProductionPlanUnitPerspective
): string {
  return perspective === "delivery"
    ? "납품 품목 목록"
    : "생산 품목 목록";
}

export function unitListBreadcrumbTitle(
  perspective: ProductionPlanUnitPerspective
): string {
  return unitListPageTitle(perspective);
}

export function unitListMetaDescription(
  perspective: ProductionPlanUnitPerspective
): string {
  return perspective === "delivery"
    ? "납품 관점 품목 목록"
    : "생산 관점 품목 목록";
}
`
);

console.log("restore-domain-files done");
