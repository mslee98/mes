import type { CommonCodeItem } from "../../../api/commonCode";
import { labelForCommonCode } from "../../../api/commonCode";
import type { ProductionPlanUnitListItem } from "../../../api/purchaseOrder";
import { labelForProcessCode } from "../../../domains/production-plan/labels/processLabels";
import { partnerCountryFlagUrl } from "../../partner/helpers/partnerCountryOptions";
import { displayProductSerialNo } from "../../../domains/production-plan/serial/placeholderProductSerial";

export type DeliveryUnitListRow = ProductionPlanUnitListItem;

export const unitDetailLinkClassName =
  "text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400";

/** 유닛 상세 경로 — LOT 유무와 무관하게 `unitId`만 사용 */
export function unitDetailPath(
  unitId: string | null | undefined
): string | null {
  const id = String(unitId ?? "").trim();
  return id ? `/delivery/units/${encodeURIComponent(id)}` : null;
}

export function deliveryUnitRowClassName(index: number): string {
  return index % 2 === 0
    ? "bg-white transition-colors hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/[0.03]"
    : "bg-gray-50/70 transition-colors hover:bg-gray-100/70 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]";
}

export function isUnitAssignedToDeliveryPlan(
  row: Pick<
    DeliveryUnitListRow,
    "isInDeliveryPlan" | "deliveryPlanId"
  >
): boolean {
  if (row.isInDeliveryPlan === true) return true;
  return String(row.deliveryPlanId ?? "").trim() !== "";
}

/** 생산 품목 — 납품 계획 배정 완료 행 (선택 불가·시각적 구분) */
export function deliveryUnitAssignedRowClassName(): string {
  return "bg-gray-100/90 dark:bg-white/[0.04] [&_.font-semibold]:text-gray-600 dark:[&_.font-semibold]:text-gray-400 [&_.text-gray-900]:text-gray-600 dark:[&_.text-gray-900]:text-gray-400 [&_.text-gray-800]:text-gray-500 dark:[&_.text-gray-800]:text-gray-500 [&_.text-brand-600]:text-brand-500/80 dark:[&_.text-brand-600]:text-brand-400/70";
}

export function listUnitLotCode(row: DeliveryUnitListRow): string {
  const lot = String(row.unitCode ?? "").trim();
  return lot || "—";
}

/** LOT 미부여 시 유닛 ID 표시 — 목록·콜랩스에서 상세 이동 라벨용 */
export function listUnitLotOrDetailLabel(row: DeliveryUnitListRow): string {
  const lot = String(row.unitCode ?? "").trim();
  if (lot) return lot;
  const unitId = String(row.unitId ?? "").trim();
  return unitId || "—";
}

/** 콜랩스 PP 컬럼 — `lotPoComposite` 또는 차수(전체 planNo 미표시) */
export function listUnitPpLabel(
  row: DeliveryUnitListRow & { lotPoComposite?: string | null }
): string {
  const composite = String(row.lotPoComposite ?? "").trim();
  if (composite) return composite;
  const seq = row.plan?.planSeq;
  if (seq != null && Number.isFinite(Number(seq))) {
    return `${Math.trunc(Number(seq))}차`;
  }
  return "계획";
}

export function listUnitIndexLabel(
  indexOnPage: number,
  page: number,
  pageSize: number
): string {
  return String((page - 1) * pageSize + indexOnPage + 1);
}

export function listProductSerialDisplay(row: DeliveryUnitListRow): string {
  return displayProductSerialNo(row.serialNo);
}

export function listDetectorSerialDisplay(row: DeliveryUnitListRow): string {
  const sn = String(row.detectorSerialNo ?? "").trim();
  return sn || "미할당";
}

export function listOperatorDisplay(row: DeliveryUnitListRow): string {
  const name = String(row.operatorNameSnapshot ?? "").trim();
  if (name) return name;
  const employeeNo = String(row.operatorEmployeeNoSnapshot ?? "").trim();
  if (employeeNo) return `사번 ${employeeNo}`;
  return "미지정";
}

export function currentProcessDisplay(
  row: {
    currentProcessName?: string | null;
    currentProcessCode?: string | null;
  },
  stepCodes: CommonCodeItem[]
): string {
  const name = String(row.currentProcessName ?? "").trim();
  if (name) return name;
  const code = String(row.currentProcessCode ?? "").trim();
  if (!code) return "-";
  return labelForProcessCode(code, stepCodes);
}

/** 거래처 아래 국가 서브줄 — 국기(SVG URL) + COUNTRY 공통코드 표시명 */
export function partnerCountrySubline(
  countryCode: string | null | undefined,
  countryCodes: CommonCodeItem[]
): { label: string; flagUrl?: string } | null {
  const raw = String(countryCode ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const fromApi = labelForCommonCode(countryCodes, upper);
  const label = fromApi !== "—" ? fromApi : upper;
  return { label, flagUrl: partnerCountryFlagUrl(upper) };
}
