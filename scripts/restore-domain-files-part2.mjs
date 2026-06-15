import fs from "fs";
import path from "path";

const root = process.cwd();
const api = "../../../api/";
const lib = "../../../lib/";

function write(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
  console.log("wrote", rel);
}

write(
  "src/domains/production-plan/mappers/unitMappers.ts",
  `/**
 * Unit 상세 ↔ \`ProductionPlanUnit\` / \`FlatPlanUnitRow\` 변환.
 */
import type {
  ProductionPlanUnit,
  ProductionPlanUnitDetail,
  PurchaseOrderDetail,
  PurchaseOrderItem,
} from "${api}purchaseOrder";
import {
  detectorElementCodeForApi,
  lineCodeFromOrderLine,
} from "../serial/legacyProductSerialNumber";
import {
  orderLineSnapshotFromPurchaseOrderItem,
  resolvePlanUnitDetectorFields,
  type FlatPlanUnitRow,
} from "../helpers/detailHelpers";

export function productionPlanUnitFromDetail(
  detail: ProductionPlanUnitDetail
): ProductionPlanUnit {
  const unitId = String(detail.unitId ?? "").trim();
  return {
    id: unitId,
    unitCode: detail.unitCode ?? undefined,
    serialNo: detail.serialNo ?? undefined,
    detectorSerialNo: detail.detectorSerialNo ?? undefined,
    detectorId: detail.detectorId ?? null,
    detectorElementCode: detail.detectorElementCode ?? null,
    wavelengthCode: detail.wavelengthCode ?? null,
    currentProcessCode: detail.currentProcessCode ?? null,
    processStatus: detail.processStatus ?? null,
    qualityStatus: detail.qualityStatus ?? null,
    isDeliveryReady: detail.isDeliveryReady ?? false,
    isDelivered: detail.isDelivered ?? false,
    deliveryPlanId: detail.deliveryPlanId ?? null,
    deliveryPlanNo: detail.deliveryPlanNo ?? null,
    deliveredAt: detail.deliveredAt ?? null,
    productSerialAssignedAt: detail.productSerialAssignedAt ?? null,
    operatorUserId: detail.operatorUserId ?? null,
    operatorEmployeeNoSnapshot: detail.operatorEmployeeNoSnapshot ?? null,
    operatorNameSnapshot: detail.operatorNameSnapshot ?? null,
    operatorAssignedAt: detail.operatorAssignedAt ?? null,
    unitNo: detail.unitNo ?? undefined,
    lotIssuedDate: detail.lotIssuedDate ?? null,
    lotPoComposite: detail.lotPoComposite ?? null,
    lotSequenceNo: detail.lotSequenceNo ?? null,
  };
}

export function unitDisplayLot(detail: ProductionPlanUnitDetail): string {
  const sn = String(detail.serialNo ?? "").trim();
  if (sn) return sn;
  const lot = String(detail.unitCode ?? "").trim();
  if (lot) return lot;
  return String(detail.unitId ?? "").trim() || "-";
}

export function findPurchaseOrderItemForUnit(
  order: PurchaseOrderDetail,
  detail: ProductionPlanUnitDetail
): PurchaseOrderItem | undefined {
  const targetId = detail.item?.purchaseOrderItemId ?? detail.purchaseOrderItemId;
  const lines = order.orderItems ?? order.items ?? [];
  if (targetId == null) return undefined;
  return lines.find((line) => line.id === targetId);
}

export function customerCodeForUnitDetail(
  detail: ProductionPlanUnitDetail,
  purchaseOrder?: PurchaseOrderDetail | null
): string {
  return (
    String(detail.partner?.code ?? "").trim() ||
    String(purchaseOrder?.partner?.code ?? "").trim() ||
    ""
  );
}

export function flatRowFromUnitDetail(
  detail: ProductionPlanUnitDetail,
  purchaseOrderItem?: PurchaseOrderItem | null
): FlatPlanUnitRow {
  const unit = productionPlanUnitFromDetail(detail);
  const lineLabel =
    String(detail.item?.productNameSnapshot ?? "").trim() ||
    String(detail.item?.businessNameSnapshot ?? "").trim() ||
    String(purchaseOrderItem?.productNameSnapshot ?? "").trim() ||
    String(purchaseOrderItem?.businessNameSnapshot ?? "").trim() ||
    "품목";
  const orderLine = purchaseOrderItem
    ? orderLineSnapshotFromPurchaseOrderItem(purchaseOrderItem)
    : {
        productNameSnapshot: detail.item?.productNameSnapshot ?? null,
        businessNameSnapshot:
          detail.item?.businessNameSnapshot ??
          purchaseOrderItem?.businessNameSnapshot ??
          null,
        detectorElementCode: detail.detectorElementCode ?? null,
        wavelengthCode: detail.wavelengthCode ?? null,
        detectorId: detail.detectorId ?? null,
      };
  const resolved = resolvePlanUnitDetectorFields({
    unit,
    orderLine,
  });
  return {
    unit,
    purchaseOrderItemId:
      purchaseOrderItem?.id ?? detail.item?.purchaseOrderItemId ?? undefined,
    lineLabel,
    businessNameSnapshot:
      detail.item?.businessNameSnapshot ??
      purchaseOrderItem?.businessNameSnapshot ??
      null,
    orderLine,
    detectorElementCode: resolved.detectorElementCode,
    wavelengthCode: resolved.wavelengthCode,
    detectorId: resolved.detectorId,
  };
}

export function planUnitForDeliveryPayload(
  unit: ProductionPlanUnit,
  flatRow: FlatPlanUnitRow
): ProductionPlanUnit {
  const detectorElementCode =
    String(unit.detectorElementCode ?? "").trim() ||
    String(flatRow.detectorElementCode ?? "").trim();
  const wavelengthCode =
    String(unit.wavelengthCode ?? "").trim() ||
    String(flatRow.wavelengthCode ?? "").trim();
  const serialNo =
    String(unit.serialNo ?? "").trim() ||
    String(flatRow.unit.serialNo ?? "").trim();
  const detectorIdRaw = unit.detectorId ?? flatRow.detectorId;
  const detectorId =
    detectorIdRaw != null && Number.isFinite(Number(detectorIdRaw))
      ? Number(detectorIdRaw)
      : null;
  return {
    ...unit,
    serialNo: serialNo || unit.serialNo,
    detectorElementCode: detectorElementCode || unit.detectorElementCode,
    wavelengthCode: wavelengthCode || unit.wavelengthCode,
    detectorId,
  };
}
`
);

write(
  "src/domains/production-plan/mappers/listMappers.ts",
  `import type {
  ProductionPlan,
  ProductionPlanUnitListItem,
} from "${api}purchaseOrder";
import type { FlatPlanUnitRow } from "../helpers/detailHelpers";

export function mapPlanDetailUnitsToListItems(
  plan: ProductionPlan,
  rows: FlatPlanUnitRow[]
): ProductionPlanUnitListItem[] {
  const purchaseOrderId = Number(
    plan.purchaseOrderId ?? plan.purchaseOrder?.id ?? ""
  );
  const orderNo = plan.purchaseOrder?.orderNo ?? null;
  const partner =
    plan.purchaseOrder?.partner ?? plan.purchaseOrder?.partnerSummary ?? null;
  const partnerName = partner?.name ?? null;
  const partnerCountryCode = partner?.countryCode ?? null;
  const dueDate =
    plan.purchaseOrder?.dueDate ??
    plan.purchaseOrder?.requestDeliveryDate ??
    null;
  const plannedDate =
    plan.plannedDeliveryDate ?? plan.plannedDate ?? plan.deliveryDate ?? null;

  return rows.map((row) => {
    const u = row.unit;
    const unitId = String(u.id ?? "").trim();
    return {
      unitId,
      unitCode: u.unitCode ?? null,
      lotPoComposite: u.lotPoComposite ?? null,
      serialNo: u.serialNo ?? null,
      operatorUserId: u.operatorUserId ?? null,
      operatorEmployeeNoSnapshot: u.operatorEmployeeNoSnapshot ?? null,
      operatorNameSnapshot: u.operatorNameSnapshot ?? null,
      operatorAssignedAt: u.operatorAssignedAt ?? null,
      detectorSerialNo: u.detectorSerialNo ?? null,
      currentProcessCode: u.currentProcessCode ?? null,
      processStatus: u.processStatus ?? null,
      qualityStatus: u.qualityStatus ?? null,
      isDeliveryReady: u.isDeliveryReady ?? false,
      isDelivered: u.isDelivered ?? false,
      deliveryPlanId: u.deliveryPlanId ?? null,
      deliveryPlanNo: u.deliveryPlanNo ?? null,
      purchaseOrderId: Number.isFinite(purchaseOrderId) ? purchaseOrderId : null,
      orderNo,
      partnerName,
      partnerCountryCode,
      dueDate,
      plan: {
        id: plan.id,
        planNo: plan.planNo ?? null,
        planSeq: plan.planSeq ?? null,
        plannedDate,
        deliveryDate: plan.deliveryDate ?? null,
        status: plan.status ?? null,
      },
      item: {
        purchaseOrderItemId: row.purchaseOrderItemId ?? null,
        productNameSnapshot: row.orderLine.productNameSnapshot ?? null,
        businessNameSnapshot:
          row.businessNameSnapshot ?? row.orderLine.businessNameSnapshot ?? null,
      },
      productionManager: plan.productionManagerName
        ? {
            name: plan.productionManagerName,
            department: plan.productionManagerDepartment ?? null,
          }
        : null,
      partner: partner
        ? {
            name: partnerName,
            countryCode: partnerCountryCode,
            code: partner?.code ?? null,
          }
        : null,
    } as ProductionPlanUnitListItem;
  });
}
`
);

write(
  "src/domains/production-plan/helpers/unitDuplicateCheck.ts",
  `import type { ProductionPlanUnitDuplicateConflict } from "${api}purchaseOrder";

export type UnitFieldCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; message?: string }
  | { status: "duplicate"; message?: string }
  | { status: "error"; message?: string };

const SOURCE_LABEL: Record<string, string> = {
  lot: "LOT",
  detector_serial: "검출기 S/N",
  product_serial: "제품 시리얼 마스터",
};

export function duplicateCheckMessage(
  conflicts: ProductionPlanUnitDuplicateConflict[],
  fieldLabel: string
): string {
  if (conflicts.length === 0) return \`\${fieldLabel} 사용 가능\`;
  if (conflicts.length === 1) {
    const c = conflicts[0];
    const sourceKey = String(c.source ?? "").trim();
    const sourceLabel = (SOURCE_LABEL[sourceKey] ?? sourceKey) || "기타";
    const lot = String(c.unitCode ?? "").trim();
    return lot
      ? \`\${fieldLabel} 중복 (\${sourceLabel} · \${lot})\`
      : \`\${fieldLabel}은(는) 이미 사용 중입니다.\`;
  }
  const suffix =
    conflicts.length > 3 ? \` 외 \${conflicts.length - 3}건\` : "";
  return \`\${fieldLabel} 중복 \${conflicts.length}건\${suffix}\`;
}

export function fieldCheckBlocksSave(state: UnitFieldCheckState): boolean {
  return state.status === "duplicate" || state.status === "error";
}

export function availableCheckHint(state: UnitFieldCheckState): string | undefined {
  if (state.status === "available") return state.message ?? "사용 가능합니다.";
  return undefined;
}

export function fieldCheckToFormFieldProps(state: UnitFieldCheckState): {
  error?: boolean;
  hint?: string;
  success?: boolean;
} {
  switch (state.status) {
    case "checking":
      return { hint: "확인 중…" };
    case "available":
      return {
        success: true,
        hint: state.message ?? "사용 가능합니다.",
      };
    case "duplicate":
      return {
        error: true,
        hint: state.message ?? "이미 사용 중입니다.",
      };
    case "error":
      return {
        error: true,
        hint: state.message ?? "입력값을 확인해 주세요.",
      };
    default:
      return {};
  }
}
`
);

write(
  "src/domains/production-plan/policy/unitEditPolicy.ts",
  `import type { ProductionPlanUnit } from "${api}purchaseOrder";
import { LOT_UNIT_CODE_PATTERN_DESCRIPTION } from "${lib}lotUnitCodeFormat";

export function canEditUnitFieldsBeforeShipment(_unit: ProductionPlanUnit): boolean {
  return true;
}

export function canEditUnitProductSerial(unit: ProductionPlanUnit): boolean {
  return String(unit.serialNo ?? "").trim().length > 0;
}

export function canEditUnitDetectorSerial(unit: ProductionPlanUnit): boolean {
  return String(unit.detectorSerialNo ?? "").trim().length > 0;
}

export function validateLotUnitCodeInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "LOT 번호를 입력하세요.";
  if (!/^LT-\\d{8}-\\d{3}$/.test(trimmed)) {
    return \`LOT 형식이 올바르지 않습니다. (\${LOT_UNIT_CODE_PATTERN_DESCRIPTION})\`;
  }
  return null;
}

export function validateDetectorSerialInput(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length > 100) {
    return "검출기 S/N은 100자 이하로 입력하세요.";
  }
  return null;
}
`
);

write(
  "src/domains/production-plan/helpers/unitLookupEligibility.ts",
  `import type { SearchRmaTargetUnitItem } from "${api}rma";

export type UnitLookupContext = {
  selectedUnitIds?: Set<string>;
};

function trim(value: unknown): string {
  return String(value ?? "").trim();
}

export function unitLookupEligibility(
  unit: SearchRmaTargetUnitItem,
  context: UnitLookupContext = {}
): { selectable: boolean; message?: string } {
  const unitId = trim(unit.unitId);
  if (context.selectedUnitIds?.has(unitId)) {
    return {
      selectable: false,
      message: "이미 현재 등록 목록에 추가된 품목입니다.",
    };
  }
  if (unit.isDelivered !== true && unit.isProductionCompleted !== true) {
    return {
      selectable: false,
      message: "아직 생산 완료되지 않은 품목입니다. RMA 접수할 수 없습니다.",
    };
  }
  if (String(unit.qualityStatus ?? "").trim().toUpperCase() === "FAIL") {
    return {
      selectable: false,
      message: "선택할 수 없습니다. 사유: 품질 상태가 FAIL입니다.",
    };
  }
  if (unit.isOnHold === true) {
    return {
      selectable: false,
      message: "선택할 수 없습니다. 사유: 보류 처리된 Unit입니다.",
    };
  }
  if (unit.hasActiveRma === true) {
    return {
      selectable: false,
      message: "선택할 수 없습니다. 사유: 현재 RMA 진행 중인 Unit입니다.",
    };
  }
  return { selectable: true };
}

export function unitDisplaySerial(unit: SearchRmaTargetUnitItem): string {
  return trim(unit.productSerialNo) || trim(unit.unitCode) || trim(unit.unitId);
}

export function unitLotLabel(unit: SearchRmaTargetUnitItem): string {
  return trim(unit.unitCode) || trim(unit.unitId);
}

export function unitProductLabel(unit: SearchRmaTargetUnitItem): string {
  return (
    trim(unit.productNameSnapshot) ||
    trim(unit.businessNameSnapshot) ||
    unitLotLabel(unit)
  );
}

export function lotGroupKey(unitCode: string): string {
  const code = trim(unitCode);
  const match = code.match(/^(LT-\\d{8})/i);
  return match ? match[1].toUpperCase() : code;
}

export function groupUnitsByLot(
  units: SearchRmaTargetUnitItem[]
): Map<string, SearchRmaTargetUnitItem[]> {
  const map = new Map<string, SearchRmaTargetUnitItem[]>();
  for (const unit of units) {
    const key = lotGroupKey(trim(unit.unitCode));
    const list = map.get(key) ?? [];
    list.push(unit);
    map.set(key, list);
  }
  return map;
}
`
);

// Fix lib imports still pointing at old placeholder path
for (const rel of [
  "src/lib/deliveryPlanDetailHelpers.ts",
  "src/lib/deliveryUnitListDisplay.ts",
  "src/lib/unitDetailDeliveryPolicy.ts",
]) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  let c = fs.readFileSync(p, "utf8");
  c = c
    .split('"./placeholderProductSerial"')
    .join('"../domains/production-plan/serial/placeholderProductSerial"');
  fs.writeFileSync(p, c, "utf8");
  console.log("patched", rel);
}

console.log("restore-domain-files-part2 done");
