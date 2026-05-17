import { useMemo, type ReactNode } from "react";
import { Link } from "react-router";
import {
  labelForCommonCode,
  type CommonCodeItem,
} from "../../api/commonCode";
import type {
  DeliveryPlan,
  DeliveryPlanPurchaseOrderNested,
  DeliveryPlanUnit,
} from "../../api/purchaseOrder";
import type { FlatPlanUnitRow } from "../../lib/deliveryPlanDetailHelpers";
import { computeDeliveryPlanUnitStats } from "../../lib/deliveryPlanDetailHelpers";
import {
  calendarDaysFromLocalToday,
  formatDateYmd,
  formatDateYmdKoLong,
  formatDaysRelativeToTodayKo,
} from "../../lib/dateFormat";
import type { DeliveryPlanDetailTab } from "./deliveryPlanDetailTabTypes";
import {
  labelForProcessCode,
} from "../../lib/deliveryPlanProcessLabels";
import Checkbox from "../form/input/Checkbox";
import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";
import { ReactComponent as DocumentDuplicateIcon } from "../../icons/document-duplicate.svg?react";
import { DeliveryPlanProcessStageBadge } from "./DeliveryPlanProcessStageBadge";

type DeliveryPlanDetailOverviewTabProps = {
  plan: DeliveryPlan;
  orderId: string;
  orderNo: string | undefined;
  partnerLabel: ReactNode;
  flatUnits: FlatPlanUnitRow[];
  wavelengthCommonCodes: CommonCodeItem[];
  detectorElementCommonCodes: CommonCodeItem[];
  unitProcessStepCodes: CommonCodeItem[];
  /** 제품 행 체크박스 선택(상위에서 분할 등에 사용) */
  selectedUnitIds: Set<string>;
  onSelectedUnitIdsChange: (next: Set<string>) => void;
  /** null이면 「새 계획으로 분할」 활성, 문자열이면 비활성 사유(토스트·title) */
  splitDisabledReason: string | null;
  onSplitClick: () => void;
  /** 표에서는 PASS/FAIL 없이 진입만 — 모달에서 처리 */
  onProcess: (unit: DeliveryPlanUnit) => void;
  /** 출고 준비 완료 제품 — 실제 납품 등록(최소 입력 모달) */
  onDeliver: (ctx: {
    unit: DeliveryPlanUnit;
    purchaseOrderItemId?: number;
  }) => void;
  onRecords: (unitId: string) => void;
  onNavigateTab: (tab: DeliveryPlanDetailTab) => void;
};

function productSerialDisplay(unit: DeliveryPlanUnit): string {
  return (
    String(unit.serialNo ?? "").trim() ||
    String(unit.unitCode ?? "").trim() ||
    "—"
  );
}

function unitNoDisplay(unit: DeliveryPlanUnit): string {
  if (unit.unitNo != null && Number.isFinite(unit.unitNo)) {
    return String(unit.unitNo);
  }
  return String(unit.unitCode ?? unit.id);
}

/**
 * 검출기 열: 관계 `detector.detectorType`(예: 640-A) 우선, 없으면 소자코드 공통명·원문.
 * `wavelengthCode`는 WAVELENGTH 공통코드로 표시명(SWIR/MWIR/LWIR/Visible 등).
 */
function buildDetectorCellText(
  unit: DeliveryPlanUnit,
  wavelengthItems: CommonCodeItem[],
  elementItems: CommonCodeItem[]
): string {
  const chunks: string[] = [];

  const det = unit.detector;
  if (det && typeof det === "object") {
    const dt = String(
      (det as { detectorType?: string | null }).detectorType ?? ""
    ).trim();
    if (dt) chunks.push(dt);
  }

  if (chunks.length === 0) {
    const elName = labelForCommonCode(elementItems, unit.detectorElementCode);
    if (elName !== "—") chunks.push(elName);
    else {
      const elRaw = String(unit.detectorElementCode ?? "").trim();
      if (elRaw) chunks.push(elRaw);
    }
  }

  const wlRaw = String(unit.wavelengthCode ?? "").trim();
  if (wlRaw) {
    chunks.push(labelForCommonCode(wavelengthItems, wlRaw));
  }

  return chunks.length ? chunks.join(" · ") : "—";
}

/** 검출기 S/N — 명시 필드 또는 `detector` 관계 객체에서 추출 */
function detectorSerialDisplay(unit: DeliveryPlanUnit): string {
  const direct = String(unit.detectorSerialNo ?? "").trim();
  if (direct) return direct;
  const d = unit.detector;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    for (const key of [
      "serialNo",
      "serialNumber",
      "sn",
      "detectorSerialNo",
      "detectorSerial",
    ]) {
      const v = o[key];
      if (v != null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
  }
  return "";
}

export function DeliveryPlanDetailOverviewTab({
  plan,
  orderId,
  orderNo,
  partnerLabel,
  flatUnits,
  wavelengthCommonCodes,
  detectorElementCommonCodes,
  unitProcessStepCodes,
  selectedUnitIds,
  onSelectedUnitIdsChange,
  splitDisabledReason,
  onSplitClick,
  onProcess,
  onDeliver,
  onRecords,
  onNavigateTab,
}: DeliveryPlanDetailOverviewTabProps) {
  /* 검색 UI·필터 일시 비활성화
  const [search, setSearch] = useState("");
  */

  const stats = useMemo(
    () => computeDeliveryPlanUnitStats(flatUnits),
    [flatUnits]
  );

  /* 검색 필터 일시 비활성화
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flatUnits;
    return flatUnits.filter(({ unit, lineLabel }) => {
      const hay = [
        lineLabel,
        unit.unitCode,
        unit.serialNo,
        detectorSerialDisplay(unit),
        buildDetectorCellText(
          unit,
          wavelengthCommonCodes,
          detectorElementCommonCodes
        ),
        unit.currentProcessCode,
        labelForProcessCode(unit.currentProcessCode, unitProcessStepCodes),
        unit.processStatus,
        shortLabelForProcessStatus(unit.processStatus),
        String(unit.unitNo ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    flatUnits,
    search,
    wavelengthCommonCodes,
    detectorElementCommonCodes,
    unitProcessStepCodes,
  ]);
  */
  const filteredRows = flatUnits;

  const filteredIds = useMemo(
    () => filteredRows.map((r) => r.unit.id),
    [filteredRows]
  );

  const allFilteredSelected =
    filteredIds.length > 0 &&
    filteredIds.every((id) => selectedUnitIds.has(id));
  const someFilteredSelected = filteredIds.some((id) =>
    selectedUnitIds.has(id)
  );

  const progressPercent =
    stats.total > 0
      ? Math.round((stats.deliveredOrReadyCount / stats.total) * 100)
      : 0;

  const planCode = plan.planNo?.trim() || plan.id;

  const purchaseOrder = plan.purchaseOrder;
  const plannedYmd = useMemo(() => {
    const raw =
      String(plan.plannedDeliveryDate ?? "").trim() ||
      String(plan.plannedDate ?? "").trim() ||
      "";
    const y = formatDateYmd(raw, { emptyFallback: "" });
    return y && y !== "-" ? y : "";
  }, [plan.plannedDeliveryDate, plan.plannedDate]);

  const finalYmd = useMemo(() => {
    if (!purchaseOrder || typeof purchaseOrder !== "object") return "";
    const po = purchaseOrder as DeliveryPlanPurchaseOrderNested;
    const raw =
      String(po.dueDate ?? "").trim() ||
      String(po.requestDeliveryDate ?? "").trim() ||
      "";
    const y = formatDateYmd(raw, { emptyFallback: "" });
    return y && y !== "-" ? y : "";
  }, [purchaseOrder]);

  const finalDiff = finalYmd ? calendarDaysFromLocalToday(finalYmd) : null;
  const finalRelLabel = finalYmd ? formatDaysRelativeToTodayKo(finalYmd) : "";
  const finalRelToneClass =
    finalDiff == null
      ? ""
      : finalDiff < 0
        ? "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300"
        : finalDiff === 0
          ? "text-amber-900 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-200"
          : finalDiff <= 14
            ? "text-amber-900 bg-amber-50 dark:bg-amber-950/35 dark:text-amber-200"
            : "text-brand-800 bg-brand-50 dark:bg-brand-950/35 dark:text-brand-200";

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50/90 to-white px-4 py-4 dark:border-white/10 dark:from-white/[0.04] dark:to-white/[0.02] sm:px-5 sm:py-5"
        role="region"
        aria-label="납품 계획 요약"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              납품 계획
            </p>
            <p className="mt-1 break-words text-xl font-semibold text-gray-900 dark:text-white">
              {planCode}
            </p>
            {plan.title?.trim() && plan.title.trim() !== planCode ? (
              <p className="mt-0.5 text-theme-sm text-gray-600 dark:text-gray-300">
                {plan.title.trim()}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-theme-sm text-gray-600 dark:text-gray-400">
              <span>
                발주:{" "}
                <Link
                  to={`/order/${orderId}`}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {orderNo?.trim() || orderId}
                </Link>
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                고객: {partnerLabel}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-theme-sm sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100/90 bg-white/50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  계획 납품일
                </dt>
                <dd className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {plannedYmd ? formatDateYmdKoLong(plannedYmd) : "—"}
                </dd>
              </div>
              <div className="rounded-lg border border-gray-100/90 bg-white/50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  최종 납품일
                </dt>
                <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {finalYmd ? formatDateYmdKoLong(finalYmd) : "—"}
                  </span>
                  {finalRelLabel ? (
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-theme-xs font-medium ${finalRelToneClass}`}
                    >
                      {finalRelLabel}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </div>
          <div className="shrink-0 text-right">
            {plan.status ? (
              <Badge size="sm" color="primary">
                {plan.status}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-white/10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                진행률 (출고 준비 이상)
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {stats.deliveredOrReadyCount} / {stats.total}
              </p>
              <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                납품 완료 {stats.deliveredCount}대 · 출고 준비 가능{" "}
                {stats.deliveryReadyCount}대
              </p>
            </div>
            <button
              type="button"
              className="text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              onClick={() => onNavigateTab("lines")}
            >
              품목별 수량 보기 →
            </button>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-300 dark:bg-brand-400"
              style={{
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            제품 진행 현황
          </h3>
          {/* 검색 일시 비활성화
          <label className="block min-w-[12rem] flex-1 sm:max-w-xs">
            <span className="sr-only">검색</span>
            <input
              type="search"
              placeholder="관리 코드 · 품목 · 상태 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-theme-sm text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500"
            />
          </label>
          */}
        </div>

        <div className="mb-3 h-12 shrink-0">
          <div
            className={`flex h-full w-full items-center gap-3 rounded-lg border border-gray-200 px-3 dark:border-white/10 ${
              selectedUnitIds.size > 0
                ? "bg-gray-50/90 dark:bg-white/[0.04]"
                : "bg-transparent"
            }`}
          >
            {selectedUnitIds.size > 0 ? (
              <>
                <span className="min-w-0 shrink truncate text-theme-sm text-gray-700 dark:text-gray-300">
                  {selectedUnitIds.size}건 선택
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outlineBrand"
                  disabled={splitDisabledReason != null}
                  title={splitDisabledReason ?? undefined}
                  className="shrink-0"
                  onClick={() => {
                    if (splitDisabledReason != null) {
                      return;
                    }
                    onSplitClick();
                  }}
                >
                  새 계획으로 분할
                </Button>
                <button
                  type="button"
                  disabled
                  title="같은 공정·동일 상태만 허용할 예정입니다."
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-theme-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-500"
                >
                  일괄 공정 처리
                </button>
              </>
            ) : (
              <p className="line-clamp-1 min-w-0 flex-1 text-theme-xs leading-tight text-gray-400 dark:text-gray-500">
                제품을 선택하면 일괄 공정 처리를 사용할 수 있습니다. (같은 공정·동일
                상태만 허용 예정)
              </p>
            )}
          </div>
        </div>

        {flatUnits.length === 0 ? (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            등록된 제품이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/10">
            <table className="min-w-full divide-y divide-gray-200 text-theme-sm dark:divide-white/10">
              <thead className="bg-gray-50/80 dark:bg-white/[0.03]">
                <tr className="text-left text-theme-xs text-gray-500 dark:text-gray-400">
                  <th className="w-10 px-2 py-2 font-medium">
                    <span className="sr-only">행 선택</span>
                    <Checkbox
                      checked={allFilteredSelected}
                      indeterminate={
                        someFilteredSelected && !allFilteredSelected
                      }
                      disabled={flatUnits.length === 0}
                      onChange={(checked) => {
                        const prev = selectedUnitIds;
                        const next = new Set(prev);
                        if (checked) {
                          filteredIds.forEach((id) => next.add(id));
                        } else {
                          filteredIds.forEach((id) => next.delete(id));
                        }
                        onSelectedUnitIdsChange(next);
                      }}
                      label=""
                    />
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">
                    관리 코드
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">
                    품목
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">
                    제품 S/N
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">
                    검출기
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">
                    검출기 S/N
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-center font-medium">
                    현재 공정
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-center font-medium">
                    공정 상태
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-center font-medium">
                    출고·납품
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredRows.map(({ unit, lineLabel, purchaseOrderItemId }) => {
                  const detectorSn = detectorSerialDisplay(unit);
                  const detectorCell = buildDetectorCellText(
                    unit,
                    wavelengthCommonCodes,
                    detectorElementCommonCodes
                  );
                  const isRework = String(
                    unit.processStatus ?? ""
                  )
                    .toUpperCase()
                    .includes("REWORK");
                  return (
                  <tr
                    key={unit.id}
                    className={`hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                      isRework
                        ? "bg-amber-50/90 dark:bg-amber-950/25"
                        : ""
                    }`}
                  >
                    <td className="px-2 py-2 align-middle">
                      <Checkbox
                        checked={selectedUnitIds.has(unit.id)}
                        onChange={(checked) => {
                          const next = new Set(selectedUnitIds);
                          if (checked) next.add(unit.id);
                          else next.delete(unit.id);
                          onSelectedUnitIdsChange(next);
                        }}
                        label=""
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-theme-xs text-gray-800 dark:text-white/90">
                      {unitNoDisplay(unit)}
                    </td>
                    <td
                      className="max-w-[10rem] truncate px-3 py-2 text-gray-800 dark:text-white/90"
                      title={lineLabel}
                    >
                      {lineLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-theme-xs text-gray-800 dark:text-white/90">
                      {productSerialDisplay(unit)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-theme-xs text-gray-700 dark:text-gray-300">
                      {detectorCell}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-theme-xs text-gray-800 dark:text-white/90">
                      {detectorSn ? (
                        detectorSn
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="max-w-[14rem] px-3 py-2 align-middle text-center">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {labelForProcessCode(
                          unit.currentProcessCode,
                          unitProcessStepCodes
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-middle">
                      <div className="flex justify-center">
                        <DeliveryPlanProcessStageBadge unit={unit} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-middle text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {unit.isDelivered ? (
                          <Badge size="sm" color="info">
                            납품완료
                          </Badge>
                        ) : unit.isDeliveryReady ? (
                          <Badge size="sm" color="success">
                            출고준비
                          </Badge>
                        ) : (
                          <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                            -
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                        <Button
                          type="button"
                          size="xs"
                          variant={
                            unit.isDeliveryReady && !unit.isDelivered
                              ? "outlineBrand"
                              : "primary"
                          }
                          disabled={unit.isDelivered === true}
                          title={
                            unit.isDelivered
                              ? "납품 완료된 제품은 공정 처리할 수 없습니다."
                              : unit.isDeliveryReady && !unit.isDelivered
                                ? "출고 준비가 완료되었습니다. 납품 등록을 진행합니다."
                                : "PASS·FAIL은 다음 단계 모달에서 선택합니다."
                          }
                          onClick={() => {
                            if (unit.isDeliveryReady && !unit.isDelivered) {
                              onDeliver({ unit, purchaseOrderItemId });
                            } else {
                              onProcess(unit);
                            }
                          }}
                        >
                          {unit.isDeliveryReady && !unit.isDelivered
                            ? "납품 등록"
                            : "공정 처리"}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          title="공정 이력"
                          startIcon={
                            <DocumentDuplicateIcon
                              className="size-4 shrink-0 text-current"
                              aria-hidden
                            />
                          }
                          onClick={() => onRecords(unit.id)}
                        >
                          이력
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
