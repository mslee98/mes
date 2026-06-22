import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { CommonCodeItem } from "../../../api/commonCode";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_DETECTOR_ELEMENT,
  COMMON_CODE_GROUP_DETECTOR_TYPE,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  COMMON_CODE_GROUP_WAVELENGTH,
  labelForCommonCode,
} from "../../../api/commonCode";
import type {
  ProductionPlanUnitDetail,
  PurchaseOrderDetail,
  PurchaseOrderItem,
  PartnerSummary,
} from "../../../api/purchaseOrder";
import { getProductionPlanUnitProcessRecords } from "../../../api/purchaseOrder";
import { useAuth } from "../../../hooks/useAuth";
import { useCommonCodesByGroup } from "../../../hooks/useCommonCodesByGroup";
import Button from "../../ui/button/Button";
import Badge from "../../ui/badge/Badge";
import { PartnerCountryCell } from "../../partner/PartnerCountryCell";
import { labelForProcessCode } from "../../../domains/production-plan/labels/processLabels";
import { formatDateYmd, formatDateTimeKo } from "../../../lib/format/dateFormat";
import {
  dueDateDdayBadgeClassName,
  getDueDateRelative,
} from "../../../lib/format/dueDateDisplay";
import {
  unitListDelayBadgeClassName,
  unitListDelayDays,
  unitListDelayLabel,
} from "../../../domains/production-plan/helpers/unitListDates";
import { isUnitDeliveryOrProductionFinished } from "../../../domains/production-plan/helpers/planCompletion";
import { resolvePlanUnitDetectorFields, type FlatPlanUnitRow } from "../../../domains/production-plan/helpers/detailHelpers";
import { productionPlanUnitFromDetail } from "../../../domains/production-plan/mappers/unitMappers";
import { normalizeUnitProcessRecordAttachments } from "../../../domains/production-plan/helpers/unitProcessRecordAttachments";
import type { UnitDetailTab } from "../unitDetailTabTypes";
import { BentoTile, InfoCell, SummaryRow } from "./unitDetailBento";

export interface UnitOverviewTabProps {
  unit: ProductionPlanUnitDetail;
  stepCodes: CommonCodeItem[];
  purchaseOrder?: PurchaseOrderDetail | null;
  purchaseOrderItem?: PurchaseOrderItem | null;
  flatRow?: FlatPlanUnitRow | null;
  orderId: string;
  planId: string;
  onNavigateTab: (tab: UnitDetailTab) => void;
  deliveryHint?: string | null;
  showResidualUndeliveredBadge?: boolean;
}

/** 개요 탭 — 발주·계획·납품 연결, 제품·검출기 스펙, 최근 공정 */
export function UnitOverviewTab({
  unit,
  stepCodes,
  purchaseOrder,
  purchaseOrderItem,
  flatRow,
  orderId,
  planId,
  onNavigateTab,
  deliveryHint = null,
  showResidualUndeliveredBadge = false,
}: UnitOverviewTabProps) {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const unitId = String(unit.unitId ?? "").trim();

  const { data: orderStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );
  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );
  const { data: detectorElementCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DETECTOR_ELEMENT,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );
  const { data: wavelengthCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_WAVELENGTH,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );
  const { data: detectorTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DETECTOR_TYPE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", unitId],
    queryFn: () => getProductionPlanUnitProcessRecords(unitId, accessToken!),
    enabled: !!accessToken && !isAuthLoading && !!unitId,
  });

  const recentRows = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        const tb = Date.parse(String(b.endedAt ?? b.createdAt ?? ""));
        const ta = Date.parse(String(a.endedAt ?? a.createdAt ?? ""));
        if (!Number.isNaN(tb) && !Number.isNaN(ta) && tb !== ta) return tb - ta;
        return (b.processSeq ?? 0) - (a.processSeq ?? 0);
      })
      .slice(0, 4);
  }, [records]);

  const partnerForDisplay: PartnerSummary | null =
    purchaseOrder?.partner ??
    (unit.partner?.name || unit.partner?.countryCode
      ? {
          id: String(unit.partner?.id ?? unit.order?.partnerId ?? ""),
          code: unit.partner?.code ?? undefined,
          name: unit.partner?.name ?? unit.order?.partnerName ?? undefined,
          countryCode:
            unit.partner?.countryCode ?? unit.order?.partnerCountryCode ?? undefined,
        }
      : null);

  const partnerName =
    String(unit.partner?.name ?? "").trim() ||
    String(unit.order?.partnerName ?? "").trim() ||
    String(purchaseOrder?.partner?.name ?? "").trim() ||
    "—";

  const orderNo =
    unit.order?.orderNo?.trim() ||
    purchaseOrder?.orderNo?.trim() ||
    (orderId || "—");
  const orderTitle = purchaseOrder?.title?.trim() || "—";
  const orderDate = formatDateYmd(purchaseOrder?.orderDate, { emptyFallback: "—" });
  const orderStatusCode = String(
    purchaseOrder?.status ?? purchaseOrder?.orderStatus ?? ""
  ).trim();
  const orderStatusLabel = orderStatusCode
    ? labelForCommonCode(orderStatusCodes, orderStatusCode) || orderStatusCode
    : "—";

  const dueYmd =
    formatDateYmd(unit.dueDate, { emptyFallback: "" }) ||
    formatDateYmd(purchaseOrder?.dueDate ?? purchaseOrder?.requestDeliveryDate, {
      emptyFallback: "",
    });
  const dueRel = isUnitDeliveryOrProductionFinished(unit)
    ? null
    : getDueDateRelative(unit.dueDate ?? purchaseOrder?.dueDate);

  const planNo = unit.plan?.planNo?.trim() || planId || "—";
  const planStatus = String(unit.plan?.status ?? "").trim() || "—";
  const productionScheduleYmd = formatDateYmd(unit.plan?.plannedDate, {
    emptyFallback: "—",
  });
  const productionCompletedLabel = formatDateTimeKo(unit.productionCompletedAt, {
    emptyFallback: "—",
  });
  const productionDelayDays = unitListDelayDays(unit);
  const deliveryScheduleYmd = formatDateYmd(
    unit.deliveryPlanPlannedDeliveryDate ?? unit.dueDate,
    { emptyFallback: "—" }
  );
  const planDeliveryYmd = formatDateYmd(
    unit.plan?.plannedDate ?? unit.plan?.deliveryDate,
    { emptyFallback: "—" }
  );
  const planSeq =
    unit.plan?.planSeq != null && Number.isFinite(Number(unit.plan.planSeq))
      ? String(unit.plan.planSeq)
      : null;

  const deliveryId = unit.delivery?.deliveryId;
  const deliveryNo = String(unit.delivery?.deliveryNo ?? "").trim();
  const hasDelivery = deliveryId != null && String(deliveryId).trim() !== "";
  const deliveryDateYmd = formatDateYmd(unit.delivery?.deliveryDate, {
    emptyFallback: "—",
  });

  const businessName =
    String(unit.item?.businessNameSnapshot ?? "").trim() ||
    String(purchaseOrderItem?.businessNameSnapshot ?? "").trim() ||
    "—";
  const productName =
    String(unit.item?.productNameSnapshot ?? "").trim() ||
    String(purchaseOrderItem?.productNameSnapshot ?? "").trim() ||
    "—";

  const resolvedDetector = resolvePlanUnitDetectorFields({
    unit: productionPlanUnitFromDetail(unit),
    orderLine: purchaseOrderItem ?? {},
    rowOverrides: flatRow ?? undefined,
  });

  const detectorTypeRaw =
    String(unit.detectorType ?? "").trim() ||
    String(purchaseOrderItem?.detectorTypeSnapshot ?? "").trim() ||
    String(purchaseOrderItem?.detector?.detectorType ?? "").trim();
  const detectorTypeLabel = detectorTypeRaw
    ? labelForCommonCode(detectorTypeCodes, detectorTypeRaw) || detectorTypeRaw
    : "—";

  const elementLabel =
    labelForCommonCode(detectorElementCodes, resolvedDetector.detectorElementCode) ||
    resolvedDetector.detectorElementCode ||
    "—";
  const wavelengthLabel =
    labelForCommonCode(wavelengthCodes, resolvedDetector.wavelengthCode) ||
    resolvedDetector.wavelengthCode ||
    "—";

  const lensLabel =
    String(purchaseOrderItem?.lens?.lensName ?? "").trim() ||
    String(purchaseOrderItem?.lensNameSnapshot ?? "").trim() ||
    "—";

  const readyDateYmd = formatDateYmd(unit.productSerialAssignedAt, {
    emptyFallback: "—",
  });

  const actualDeliveryYmd =
    formatDateYmd(unit.delivery?.deliveryDate, { emptyFallback: "" }) ||
    formatDateYmd(unit.deliveredAt, { emptyFallback: "—" });

  return (
    <div className="space-y-4">
      {deliveryHint?.trim() && !unit.isDelivered ? (
        <div
          className={
            unit.isDeliveryReady
              ? "rounded-lg border border-success-200 bg-success-50/60 px-3 py-2.5 text-theme-sm text-success-800 dark:border-success-900/40 dark:bg-success-950/20 dark:text-success-200"
              : "rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-theme-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100"
          }
        >
          {deliveryHint.trim()}
        </div>
      ) : null}
      <div className="grid grid-cols-12 gap-3">
        <BentoTile title="발주 정보" className="col-span-12 md:col-span-4">
          <dl className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            <SummaryRow label="발주번호">
              {orderId ? (
                <Link
                  to={`/order/${orderId}`}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {orderNo}
                </Link>
              ) : (
                orderNo
              )}
            </SummaryRow>
            <SummaryRow label="건명">{orderTitle}</SummaryRow>
            <SummaryRow label="거래처">{partnerName}</SummaryRow>
            <SummaryRow label="발주일">{orderDate}</SummaryRow>
            <SummaryRow label="발주 상태">{orderStatusLabel}</SummaryRow>
            <SummaryRow label="최종 납기">
              {dueYmd && dueYmd !== "-" ? (
                <span className="inline-flex flex-wrap items-center justify-end gap-1">
                  <span>{dueYmd}</span>
                  {dueRel ? (
                    <span
                      className={dueDateDdayBadgeClassName(dueRel.diff)}
                      title={dueRel.koLabel}
                    >
                      {dueRel.ddayLabel}
                    </span>
                  ) : null}
                </span>
              ) : (
                "—"
              )}
            </SummaryRow>
          </dl>
        </BentoTile>

        <BentoTile title="계획 정보" className="col-span-12 md:col-span-4">
          <dl className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            <SummaryRow label="계획번호">
              {orderId && planId ? (
                <Link
                  to={`/order/${orderId}/plan/${planId}`}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {planNo}
                </Link>
              ) : (
                planNo
              )}
            </SummaryRow>
            {planSeq ? <SummaryRow label="계획 차번">{planSeq}</SummaryRow> : null}
            <SummaryRow label="계획 상태">{planStatus}</SummaryRow>
            <SummaryRow label="생산 예정일">{productionScheduleYmd}</SummaryRow>
            <SummaryRow label="생산 완료일">{productionCompletedLabel}</SummaryRow>
            <SummaryRow label="생산 지연">
              {productionDelayDays > 0 ? (
                <span
                  className={unitListDelayBadgeClassName(productionDelayDays)}
                  title={`${productionDelayDays}일 지연`}
                >
                  {unitListDelayLabel(productionDelayDays)}
                </span>
              ) : (
                "—"
              )}
            </SummaryRow>
          </dl>
        </BentoTile>

        <BentoTile title="납품 정보" className="col-span-12 md:col-span-4">
          <dl className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            <SummaryRow label="납품 계획">
              {unit.isInDeliveryPlan && unit.deliveryPlanId ? (
                <Link
                  to={`/delivery/plans/${encodeURIComponent(unit.deliveryPlanId)}`}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {unit.deliveryPlanNo?.trim() || unit.deliveryPlanId}
                </Link>
              ) : (
                "없음"
              )}
            </SummaryRow>
            <SummaryRow label="납품번호">
              {hasDelivery ? (
                <Link
                  to={`/delivery/${deliveryId}`}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {deliveryNo || String(deliveryId)}
                </Link>
              ) : (
                "미등록"
              )}
            </SummaryRow>
            <SummaryRow label="납품 예정일">{deliveryScheduleYmd}</SummaryRow>
            <SummaryRow label="납품일">{hasDelivery ? deliveryDateYmd : "—"}</SummaryRow>
            <SummaryRow label="납품 완료">
              {formatDateTimeKo(unit.deliveredAt, { emptyFallback: "—" })}
            </SummaryRow>
            <SummaryRow label="납품">
              <span className="inline-flex flex-wrap items-center justify-end gap-1">
                {unit.isDelivered ? (
                  <Badge size="sm" color="info">
                    납품 완료
                  </Badge>
                ) : unit.isDeliveryReady ? (
                  <Badge size="sm" color="success">
                    납품 대기
                  </Badge>
                ) : (
                  <Badge size="sm" color="light">
                    진행 중
                  </Badge>
                )}
                {showResidualUndeliveredBadge ? (
                  <Badge size="sm" color="warning">
                    미출고 잔여
                  </Badge>
                ) : null}
              </span>
            </SummaryRow>
          </dl>
        </BentoTile>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <BentoTile title="제품 · 거래 · 일정" className="col-span-12 lg:col-span-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <InfoCell label="사업명">{businessName}</InfoCell>
            <InfoCell label="대표 제품">{productName}</InfoCell>
            <InfoCell label="거래처">
              {partnerForDisplay ? (
                <PartnerCountryCell
                  partner={partnerForDisplay}
                  countryCodes={countryCodes}
                  variant="orderList"
                />
              ) : (
                partnerName
              )}
            </InfoCell>
            <InfoCell label="제품 확정일">{readyDateYmd}</InfoCell>
            <InfoCell label="계획 납품일">{planDeliveryYmd}</InfoCell>
            <InfoCell label="실제 납품일">{actualDeliveryYmd}</InfoCell>
          </dl>
        </BentoTile>

        <BentoTile title="검출기 · 스펙" className="col-span-12 lg:col-span-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <InfoCell label="검출기 S/N">
              <span className="font-mono font-normal">
                {String(unit.detectorSerialNo ?? "").trim() || "미할당"}
              </span>
            </InfoCell>
            <InfoCell label="검출기 타입">{detectorTypeLabel}</InfoCell>
            <InfoCell label="소자">{elementLabel}</InfoCell>
            <InfoCell label="파장">{wavelengthLabel}</InfoCell>
            <InfoCell label="렌즈">{lensLabel}</InfoCell>
          </dl>
        </BentoTile>
      </div>

      <BentoTile
        title="최근 공정 이력"
        headerEnd={
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onNavigateTab("process")}
          >
            전체 보기
          </Button>
        }
      >
        {recordsLoading ? (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">불러오는 중…</p>
        ) : recentRows.length === 0 ? (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            공정 이력이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {recentRows.map((record, index) => {
              const processName =
                String(record.processName ?? "").trim() ||
                labelForProcessCode(record.processCode, stepCodes);
              const result = String(record.result ?? "").trim() || "-";
              const attachments = normalizeUnitProcessRecordAttachments(
                record as unknown as Record<string, unknown>
              );
              const performer =
                record.performedBy?.name?.trim() ||
                record.performedBy?.employeeNo?.toString() ||
                "";

              return (
                <li
                  key={String(record.id ?? index)}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-gray-100">
                      {processName}
                      <span
                        className={`ms-2 font-normal ${
                          result === "PASS"
                            ? "text-success-600 dark:text-success-400"
                            : result === "FAIL"
                              ? "text-error-600 dark:text-error-400"
                              : "text-gray-500"
                        }`}
                      >
                        {result}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatDateTimeKo(record.endedAt ?? record.createdAt, {
                        emptyFallback: "-",
                      })}
                      {performer ? ` · ${performer}` : ""}
                      {attachments.length > 0 ? ` · 첨부 ${attachments.length}건` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {(unit.rmaCount ?? 0) > 0 ? (
          <button
            type="button"
            className="mt-2 text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            onClick={() => onNavigateTab("rma")}
          >
            RMA 이력 {Number(unit.rmaCount)}건 보기
          </button>
        ) : null}
      </BentoTile>
    </div>
  );
}
