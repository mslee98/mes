import type { ProductionPlan } from "../../../api/purchaseOrder";
import type { FlatPlanUnitRow } from "../../../domains/production-plan/helpers/detailHelpers";
import { formatDateYmd } from "../../../lib/format/dateFormat";
import {
  LEGACY_USER_PREFIX,
  tryDecodeLegacyUser,
} from "../../../lib/legacySelectValue";

export function ymdForSplitInput(raw: unknown): string {
  const y = formatDateYmd(raw as string | null | undefined, {
    emptyFallback: "",
  });
  return y && y !== "-" ? y : "";
}

export function deliveryManagerUserIdFromSelect(
  selectValue: string
): number | null {
  const t = selectValue.trim();
  if (!t || t.startsWith(LEGACY_USER_PREFIX)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type SplitModalContext = {
  unitIds: string[];
  lineLabel: string;
};

export type SplitSelectionValidation =
  | { eligible: false; reason?: string }
  | {
      eligible: true;
      purchaseOrderItemId: number;
      rows: FlatPlanUnitRow[];
    };

export function validateSplitSelection(
  selectedUnitIds: Set<string>,
  flatUnits: FlatPlanUnitRow[]
): SplitSelectionValidation {
  if (selectedUnitIds.size === 0) {
    return { eligible: false };
  }
  const rows = flatUnits.filter((r) => selectedUnitIds.has(r.unit.id));
  if (rows.length !== selectedUnitIds.size) {
    return {
      eligible: false,
      reason: "선택한 제품을 찾을 수 없습니다.",
    };
  }
  if (rows.some((r) => r.unit.isDelivered)) {
    return {
      eligible: false,
      reason: "납품 완료된 제품은 새 계획으로 분할할 수 없습니다.",
    };
  }
  const poItemIds = new Set<number>();
  for (const r of rows) {
    const id = r.purchaseOrderItemId;
    if (id != null && Number.isFinite(Number(id)) && Number(id) > 0) {
      poItemIds.add(Number(id));
    }
  }
  if (poItemIds.size !== 1) {
    return {
      eligible: false,
      reason: "같은 발주 품목의 제품만 함께 옮길 수 있습니다.",
    };
  }
  return {
    eligible: true,
    purchaseOrderItemId: [...poItemIds][0],
    rows,
  };
}

export function buildSplitDeliveryManagerUserOptions(
  users: { id: number; name: string; employeeNo: string | number; isActive?: boolean }[],
  splitDeliveryManagerUserSelectValue: string
) {
  const opts = users
    .filter((u) => u.isActive !== false)
    .map((u) => ({
      value: String(u.id),
        label: `${u.name} (${String(u.employeeNo)})`,
    }));
  const sel = splitDeliveryManagerUserSelectValue;
  if (!sel || opts.some((o) => o.value === sel)) return opts;
  const legacyName = tryDecodeLegacyUser(sel);
  if (legacyName) {
    opts.unshift({ value: sel, label: `${legacyName} (저장된 값)` });
    return opts;
  }
  opts.unshift({ value: sel, label: `사용자 #${sel}` });
  return opts;
}

export function openSplitModalFromPlan(
  plan: ProductionPlan,
  splitValidation: {
    eligible: true;
    purchaseOrderItemId: number;
    rows: FlatPlanUnitRow[];
  },
  selectedUnitIds: Set<string>,
  handlers: {
    onSplitModalContextChange: (ctx: SplitModalContext) => void;
    onSplitDeliveryDateChange: (v: string) => void;
    onSplitPlannedDeliveryDateChange: (v: string) => void;
    onSplitDeliveryManagerUserSelectValueChange: (v: string) => void;
    onSplitTitleChange: (v: string) => void;
    onSplitRemarkChange: (v: string) => void;
    onSplitModalOpenChange: (open: boolean) => void;
  }
) {
  handlers.onSplitModalContextChange({
    unitIds: [...selectedUnitIds].filter((id) => id.trim() !== ""),
    lineLabel:
      splitValidation.rows[0]?.lineLabel ??
      `발주 품목 #${splitValidation.purchaseOrderItemId}`,
  });
  handlers.onSplitDeliveryDateChange(ymdForSplitInput(plan.deliveryDate));
  handlers.onSplitPlannedDeliveryDateChange(
    ymdForSplitInput(plan.plannedDeliveryDate ?? plan.plannedDate)
  );
  handlers.onSplitDeliveryManagerUserSelectValueChange(
    plan.productionManagerId != null &&
      Number.isFinite(Number(plan.productionManagerId))
      ? String(plan.productionManagerId)
      : ""
  );
  handlers.onSplitTitleChange(plan.title?.trim() ?? "");
  handlers.onSplitRemarkChange("");
  handlers.onSplitModalOpenChange(true);
}
