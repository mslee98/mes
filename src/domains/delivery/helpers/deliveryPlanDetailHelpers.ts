import type { CommonCodeItem } from "../../../api/commonCode";
import type {
  DeliverDeliveryPlanResponse,
  DeliverPlanSkippedUnit,
  DeliveryPlanDetailResponse,
  DeliveryPlanGroup,
  DeliveryPlanSummaryCounts,
  DeliveryPlanUnitSummary,
} from "../../../api/purchaseOrder";
import { isApiError } from "../../../lib/api/apiError";
import {
  labelForDeliverPlanSkipReason,
  MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL_SENTENCE,
} from "../../../domains/delivery/labels/statusLabels";
import {
  displayProductSerialNo,
  isPlaceholderProductSerialNo,
} from "../../../domains/production-plan/serial/placeholderProductSerial";

export type DeliveryPlanUnitFilterTab =
  | "ALL"
  | "READY"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "DELIVERED";

export type DeliveryPlanUnitCategory =
  | "ready"
  | "inProgress"
  | "blocked"
  | "delivered";

export interface FlatDeliveryPlanUnit {
  unit: DeliveryPlanUnitSummary;
  group: DeliveryPlanGroup;
  groupKey: string;
}

export interface FilteredDeliveryPlanGroup {
  group: DeliveryPlanGroup;
  units: DeliveryPlanUnitSummary[];
  groupKey: string;
}

const TERMINAL_DP_STATUSES = new Set([
  "COMPLETED",
  "COMPLETE",
  "CANCELLED",
  "CANCELED",
  "CLOSED",
]);

export const DELIVERY_PLAN_UNIT_FILTER_OPTIONS: ReadonlyArray<{
  value: DeliveryPlanUnitFilterTab;
  label: string;
}> = [
  { value: "ALL", label: "전체" },
  { value: "READY", label: "납품 대기" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "BLOCKED", label: "FAIL/재작업" },
  { value: "DELIVERED", label: "납품 완료" },
];

export const DELIVERY_PLAN_DETAIL_TABLE_GRID =
  "minmax(5rem,1.15fr) minmax(4.5rem,0.95fr) minmax(6rem,1.4fr) minmax(4.5rem,1fr) minmax(5rem,1.15fr) minmax(4rem,0.85fr) minmax(4rem,0.85fr) minmax(3.75rem,0.8fr) minmax(3.75rem,0.8fr) minmax(4.25rem,0.95fr)";

/** 납품 계획에 포함된 미납품 품목 목록 */
export function listUndeliveredDeliveryPlanUnits(
  plan: DeliveryPlanDetailResponse
): DeliveryPlanUnitSummary[] {
  return flattenDeliveryPlanUnits(plan)
    .map(({ unit }) => unit)
    .filter((unit) => unit.isDelivered !== true);
}

export function isReadyUndeliveredUnit(
  unit: Pick<DeliveryPlanUnitSummary, "isDeliveryReady" | "isDelivered">
): boolean {
  return unit.isDeliveryReady === true && unit.isDelivered !== true;
}

/** 납품 등록 실납품 대상 — 납품 대기 && 미납품 */
export function listReadyUndeliveredDeliveryPlanUnits(
  plan: DeliveryPlanDetailResponse
): DeliveryPlanUnitSummary[] {
  return listUndeliveredDeliveryPlanUnits(plan).filter(isReadyUndeliveredUnit);
}

/** 이번 deliver에서 skip 예정 — 미납품 중 납품 대기 아님 */
export function listSkippedForPlanDeliver(
  plan: DeliveryPlanDetailResponse
): DeliveryPlanUnitSummary[] {
  return listUndeliveredDeliveryPlanUnits(plan).filter(
    (unit) => !isReadyUndeliveredUnit(unit)
  );
}

/** @alias listReadyUndeliveredDeliveryPlanUnits */
export function listDeliverableDeliveryPlanUnits(
  plan: DeliveryPlanDetailResponse
): DeliveryPlanUnitSummary[] {
  return listReadyUndeliveredDeliveryPlanUnits(plan);
}

export function isUnitDeliverable(unit: DeliveryPlanUnitSummary): boolean {
  return unit.isDelivered !== true;
}

export function isDeliveryPlanEditable(status?: string | null): boolean {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return true;
  return !TERMINAL_DP_STATUSES.has(normalized);
}

export function deliveryPlanGroupKey(group: DeliveryPlanGroup): string {
  const ppId = String(group.productionPlanId ?? group.productionPlanNo ?? "").trim();
  const itemKey = String(
    group.itemId ?? group.itemName ?? group.productNameSnapshot ?? ""
  ).trim();
  return `${ppId}::${itemKey}`;
}

export function flattenDeliveryPlanUnits(
  plan: DeliveryPlanDetailResponse
): FlatDeliveryPlanUnit[] {
  const result: FlatDeliveryPlanUnit[] = [];
  for (const group of plan.groups ?? []) {
    const groupKey = deliveryPlanGroupKey(group);
    for (const unit of group.units ?? []) {
      const unitId = String(unit?.id ?? "").trim();
      if (!unitId) continue;
      result.push({ unit, group, groupKey });
    }
  }
  return result;
}

export function classifyDeliveryPlanUnit(
  unit: DeliveryPlanUnitSummary
): DeliveryPlanUnitCategory {
  if (unit.isDelivered === true) return "delivered";
  if (unit.isDeliveryReady === true) return "ready";

  const status = String(unit.processStatus ?? "").trim().toUpperCase();
  if (
    status === "FAILED" ||
    status === "FAIL" ||
    status.includes("REWORK") ||
    status === "BLOCKED" ||
    status.includes("BLOCK")
  ) {
    return "blocked";
  }
  return "inProgress";
}

export function deriveDeliveryPlanSummary(
  plan: DeliveryPlanDetailResponse
): Required<DeliveryPlanSummaryCounts> {
  const apiSummary = plan.summary;
  if (apiSummary) {
    const totalUnitCount = Number(apiSummary.totalUnitCount) || 0;
    const deliveredUnitCount = Number(apiSummary.deliveredUnitCount) || 0;
    const undeliveredFromApi = apiSummary.undeliveredUnitCount;
    const undeliveredUnitCount =
      undeliveredFromApi != null
        ? Number(undeliveredFromApi) || 0
        : Math.max(0, totalUnitCount - deliveredUnitCount);

    return {
      totalUnitCount,
      readyUnitCount: Number(apiSummary.readyUnitCount) || 0,
      inProgressUnitCount: Number(apiSummary.inProgressUnitCount) || 0,
      blockedUnitCount: Number(apiSummary.blockedUnitCount) || 0,
      deliveredUnitCount,
      undeliveredUnitCount,
    };
  }

  const flat = flattenDeliveryPlanUnits(plan);
  let readyUnitCount = 0;
  let inProgressUnitCount = 0;
  let blockedUnitCount = 0;
  let deliveredUnitCount = 0;

  for (const { unit } of flat) {
    const category = classifyDeliveryPlanUnit(unit);
    if (category === "ready") readyUnitCount += 1;
    else if (category === "delivered") deliveredUnitCount += 1;
    else if (category === "blocked") blockedUnitCount += 1;
    else inProgressUnitCount += 1;
  }

  const totalUnitCount = flat.length;
  return {
    totalUnitCount,
    readyUnitCount,
    inProgressUnitCount,
    blockedUnitCount,
    deliveredUnitCount,
    undeliveredUnitCount: Math.max(0, totalUnitCount - deliveredUnitCount),
  };
}

export function resolveUndeliveredUnitCount(
  plan: DeliveryPlanDetailResponse
): number {
  const fromSummary = plan.summary?.undeliveredUnitCount;
  if (fromSummary != null) return Number(fromSummary) || 0;
  return deriveDeliveryPlanSummary(plan).undeliveredUnitCount;
}

export function resolveReadyUndeliveredUnitCount(
  plan: DeliveryPlanDetailResponse
): number {
  const fromSummary = plan.summary?.readyUnitCount;
  if (fromSummary != null) return Number(fromSummary) || 0;
  return listReadyUndeliveredDeliveryPlanUnits(plan).length;
}

export function resolveDeliverableUnitCount(
  plan: DeliveryPlanDetailResponse
): number {
  return resolveReadyUndeliveredUnitCount(plan);
}

export function listDeliveryPlanUnitsWithUnconfirmedSerial(
  units: DeliveryPlanUnitSummary[]
): DeliveryPlanUnitSummary[] {
  return units.filter(
    (unit) =>
      unit.isDelivered !== true &&
      needsDeliveryPlanUnitSerialConfirmation(unit)
  );
}

export function needsDeliveryPlanUnitSerialConfirmation(
  unit: Pick<DeliveryPlanUnitSummary, "serialNo">
): boolean {
  const sn = String(unit.serialNo ?? "").trim();
  return !sn || isPlaceholderProductSerialNo(sn);
}

export function canRegisterBulkDelivery(
  plan: DeliveryPlanDetailResponse
): boolean {
  return (
    resolveUndeliveredUnitCount(plan) > 0 &&
    isDeliveryPlanEditable(plan.status)
  );
}

export function isUnitSelectableForDelivery(
  unit: DeliveryPlanUnitSummary
): boolean {
  return unit.isDelivered !== true;
}

export function getUnitSelectionDisabledReason(
  unit: DeliveryPlanUnitSummary
): string | null {
  if (unit.isDelivered === true) return "이미 납품 완료된 품목입니다.";
  return null;
}

export function matchesDeliveryPlanUnitFilter(
  unit: DeliveryPlanUnitSummary,
  tab: DeliveryPlanUnitFilterTab
): boolean {
  if (tab === "ALL") return true;
  const category = classifyDeliveryPlanUnit(unit);
  if (tab === "READY") return category === "ready";
  if (tab === "IN_PROGRESS") return category === "inProgress";
  if (tab === "BLOCKED") return category === "blocked";
  if (tab === "DELIVERED") return category === "delivered";
  return true;
}

export function matchesDeliveryPlanUnitSearch(
  entry: FlatDeliveryPlanUnit,
  keyword: string
): boolean {
  const query = keyword.trim().toLowerCase();
  if (!query) return true;

  const { unit, group } = entry;
  const haystack = [
    unit.unitCode,
    unit.serialNo,
    unit.itemName,
    unit.productionPlanNo,
    group.productionPlanNo,
    group.itemName,
    group.productNameSnapshot,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean);

  return haystack.some((value) => value.includes(query));
}

export function filterDeliveryPlanGroups(
  plan: DeliveryPlanDetailResponse,
  tab: DeliveryPlanUnitFilterTab,
  keyword: string
): FilteredDeliveryPlanGroup[] {
  const result: FilteredDeliveryPlanGroup[] = [];

  for (const group of plan.groups ?? []) {
    const groupKey = deliveryPlanGroupKey(group);
    const units = (group.units ?? []).filter((unit) => {
      const entry: FlatDeliveryPlanUnit = { unit, group, groupKey };
      return (
        matchesDeliveryPlanUnitFilter(unit, tab) &&
        matchesDeliveryPlanUnitSearch(entry, keyword)
      );
    });

    if (units.length > 0) {
      result.push({ group, units, groupKey });
    }
  }

  return result;
}

export function labelForUnitProcessStatus(
  code: string | null | undefined,
  processStatusCodes: CommonCodeItem[]
): string {
  const normalized = String(code ?? "").trim();
  if (!normalized) return "—";
  const upper = normalized.toUpperCase();
  const hit = processStatusCodes.find(
    (item) => String(item.code ?? "").trim().toUpperCase() === upper
  );
  const name = hit?.name?.trim();
  return name || normalized;
}

export function deliveryReadyLabel(unit: DeliveryPlanUnitSummary): string {
  if (unit.isDelivered === true) return "납품 완료";
  if (unit.isDeliveryReady === true) return "대기";
  return "미대기";
}

export function deliveryStatusLabel(unit: DeliveryPlanUnitSummary): string {
  return unit.isDelivered === true ? "납품 완료" : "미납품";
}

export function resolveDeliveryPlanOrderId(
  plan: DeliveryPlanDetailResponse
): string {
  return String(
    plan.purchaseOrderId ??
      plan.purchaseOrder?.id ??
      plan.order?.orderId ??
      ""
  ).trim();
}

export function resolveDeliveryPlanOrderNo(
  plan: DeliveryPlanDetailResponse
): string {
  return (
    plan.purchaseOrder?.orderNo?.trim() ||
    plan.order?.orderNo?.trim() ||
    resolveDeliveryPlanOrderId(plan) ||
    "-"
  );
}

export function resolveDeliveryPlanPartnerName(
  plan: DeliveryPlanDetailResponse
): string {
  return (
    plan.partner?.name?.trim() ||
    plan.purchaseOrder?.partnerName?.trim() ||
    plan.order?.partnerName?.trim() ||
    "-"
  );
}

export function resolveDeliveryPlanManagerName(
  plan: DeliveryPlanDetailResponse,
  usersById?: Map<number, string>
): string {
  const nested = plan.deliveryManager?.name?.trim();
  if (nested) return nested;
  const managerId = plan.deliveryManagerId;
  if (managerId != null && usersById?.has(managerId)) {
    return usersById.get(managerId) ?? "-";
  }
  return "-";
}

export function resolveGroupItemLabel(group: DeliveryPlanGroup): string {
  return (
    group.itemName?.trim() ||
    group.productNameSnapshot?.trim() ||
    "-"
  );
}

export function resolveUnitItemLabel(
  unit: DeliveryPlanUnitSummary,
  group: DeliveryPlanGroup
): string {
  return unit.itemName?.trim() || resolveGroupItemLabel(group);
}

export function resolveUnitProductionPlanNo(
  unit: DeliveryPlanUnitSummary,
  group: DeliveryPlanGroup
): string {
  return (
    unit.productionPlanNo?.trim() ||
    group.productionPlanNo?.trim() ||
    "-"
  );
}

export function deliveryPlanUnitLotDisplay(unit: DeliveryPlanUnitSummary): string {
  const lot = String(unit.unitCode ?? "").trim();
  return lot || String(unit.id).trim() || "—";
}

export function deliveryPlanUnitProductSerialDisplay(
  unit: Pick<DeliveryPlanUnitSummary, "serialNo">
): string {
  return displayProductSerialNo(unit.serialNo);
}

export function deliveryPlanUnitDetectorSerialDisplay(
  unit: Pick<DeliveryPlanUnitSummary, "detectorSerialNo">
): string {
  const sn = String(unit.detectorSerialNo ?? "").trim();
  return sn || "미할당";
}

/** 납품 deliver API 사전 검증 — 소자·파장·검출기 ID (placeholder S/N은 허용) */
export function deliveryPlanUnitMissingDeliverFields(
  unit: Pick<
    DeliveryPlanUnitSummary,
    "detectorElementCode" | "wavelengthCode" | "detectorId"
  >
): string[] {
  const missing: string[] = [];
  if (!String(unit.detectorElementCode ?? "").trim()) missing.push("검출기 소자");
  if (!String(unit.wavelengthCode ?? "").trim()) missing.push("파장");
  const detectorId = unit.detectorId;
  if (
    detectorId == null ||
    !Number.isFinite(Number(detectorId)) ||
    Number(detectorId) <= 0
  ) {
    missing.push("검출기 ID");
  }
  return missing;
}

/** @deprecated deliveryPlanUnitMissingDeliverFields 사용 */
export function deliveryPlanUnitMissingSerialFields(
  unit: Pick<
    DeliveryPlanUnitSummary,
    "detectorElementCode" | "wavelengthCode" | "detectorId"
  >
): string[] {
  return deliveryPlanUnitMissingDeliverFields(unit);
}

export function listDeliveryPlanUnitsWithIncompleteDeliverFields(
  units: DeliveryPlanUnitSummary[]
): Array<{ unit: DeliveryPlanUnitSummary; missing: string[] }> {
  return units
    .map((unit) => ({
      unit,
      missing: deliveryPlanUnitMissingDeliverFields(unit),
    }))
    .filter((row) => row.missing.length > 0);
}

/** @deprecated listDeliveryPlanUnitsWithIncompleteDeliverFields 사용 */
export function listDeliveryPlanUnitsWithIncompleteSerial(
  units: DeliveryPlanUnitSummary[]
): Array<{ unit: DeliveryPlanUnitSummary; missing: string[] }> {
  return listDeliveryPlanUnitsWithIncompleteDeliverFields(units);
}

export function formatDeliveryPlanUnitErrorDetail(detail: {
  unitId?: string;
  unitCode?: string;
  reason?: string;
  message?: string;
}): string {
  const lot =
    String(detail.unitCode ?? "").trim() ||
    String(detail.unitId ?? "").trim() ||
    "품목";
  const reason =
    String(detail.message ?? "").trim() ||
    labelForDeliverPlanSkipReason(detail.reason) ||
    "검증 실패";
  return `${lot}: ${reason}`;
}

export function formatDeliverPlanSuccessMessage(
  result: DeliverDeliveryPlanResponse
): string {
  const deliveredCount = result.deliveredUnitIds?.length ?? 0;
  const skippedCount = result.skippedUnits?.length ?? 0;
  const remainingUndelivered =
    result.summary?.undeliveredUnitCount != null
      ? Number(result.summary.undeliveredUnitCount) || 0
      : skippedCount;

  if (deliveredCount > 0) {
    if (remainingUndelivered > 0) {
      return `납품 ${deliveredCount}대 등록 · 납품 계획 완료 · 미출고 ${remainingUndelivered}대`;
    }
    return `납품 ${deliveredCount}대 등록 · 납품 계획 완료`;
  }

  if (skippedCount > 0) {
    return `납품 0대 · 납품 계획 완료 · 진행 중 ${skippedCount}대는 ${MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL_SENTENCE}`;
  }

  return "납품 계획이 완료 처리되었습니다.";
}

export function deliverPlanErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "DELIVERY_PLAN_ALREADY_COMPLETED") {
      return "이미 완료된 납품 계획입니다.";
    }
    if (error.code === "DELIVERY_PLAN_NO_UNITS") {
      return "납품 계획에 미납품 품목이 없습니다.";
    }
    if (error.message.trim()) return error.message.trim();
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "납품 등록에 실패했습니다.";
}

export type { DeliverPlanSkippedUnit };
