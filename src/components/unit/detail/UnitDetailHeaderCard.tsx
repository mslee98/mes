import { Link } from "react-router";
import type { CommonCodeItem } from "../../../api/commonCode";
import { COMMON_CODE_GROUP_COUNTRY } from "../../../api/commonCode";
import type {
  ProductionPlanUnitDetail,
  PurchaseOrderDetail,
  Partner,
} from "../../../api/purchaseOrder";
import { useAuth } from "../../../hooks/useAuth";
import { useCommonCodesByGroup } from "../../../hooks/useCommonCodesByGroup";
import { DetailSummaryMetric } from "../../common/DetailSummaryMetric";
import { ProductionPlanProcessStageBadge } from "../../production-plan/ProductionPlanProcessStageBadge";
import Badge from "../../ui/badge/Badge";
import {
  productionPlanUnitFromDetail,
  unitDisplayLot,
  unitDisplaySerial,
} from "../../../domains/production-plan/mappers/unitMappers";
import { labelForProcessCode } from "../../../domains/production-plan/labels/processLabels";
import { formatDateYmd } from "../../../lib/format/dateFormat";
import {
  unitListDelayBadgeClassName,
  unitListDelayDays,
  unitListDelayLabel,
} from "../../../domains/production-plan/helpers/unitListDates";
import { isUnitDeliveryOrProductionFinished } from "../../../domains/production-plan/helpers/planCompletion";
import {
  dueDateDdayBadgeClassName,
  getDueDateRelative,
} from "../../../lib/format/dueDateDisplay";
import { buttonClassName } from "../../../lib/ui/buttonStyles";
import { partnerCountryFlagUrl } from "../../../domains/partner/helpers/partnerCountryOptions";
import { partnerSelectLabel } from "../../../domains/partner/display/partnerDisplay";
import {
  BoxIcon,
  CalenderIcon,
  CogIcon,
  ListIcon,
  TaskIcon,
} from "../../../icons";
import { canShowUnitDetailProcessGate } from "../../../domains/delivery/policy/unitDetailDeliveryPolicy";
import { unitDetailHeaderCardClassName } from "./unitDetailCardShell";

export type UnitDetailHeaderCardProps = {
  unit: ProductionPlanUnitDetail;
  stepCodes: CommonCodeItem[];
  purchaseOrder?: PurchaseOrderDetail | null;
  orderId: string;
  planId: string;
  unitId: string;
  canDeliver: boolean;
  showResidualUndeliveredBadge?: boolean;
  showRmaRegister: boolean;
  onOpenProcessGate: () => void;
  onOpenDeliver: () => void;
  onOpenEdit: () => void;
};

/** Unit 상세 고정 헤더 — 발주 상세 헤더와 동일 2행 구조(액션 / 요약 지표) */
export function UnitDetailHeaderCard({
  unit,
  stepCodes,
  purchaseOrder,
  orderId,
  planId,
  unitId,
  canDeliver,
  showResidualUndeliveredBadge = false,
  showRmaRegister,
  onOpenProcessGate,
  onOpenDeliver,
  onOpenEdit,
}: UnitDetailHeaderCardProps) {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const processUnit = productionPlanUnitFromDetail(unit);
  const showProcessGateButton = canShowUnitDetailProcessGate({
    isDelivered: unit.isDelivered === true,
    isDeliveryReady: unit.isDeliveryReady === true,
  });
  const lotLabel = unitDisplayLot(unit);
  const serialLabel = unitDisplaySerial(unit);
  const productName =
    String(unit.item?.productNameSnapshot ?? "").trim() ||
    String(unit.item?.businessNameSnapshot ?? "").trim() ||
    "—";

  const partner: Partner | undefined =
    purchaseOrder?.partner ??
    (unit.partner?.name || unit.partner?.countryCode
      ? {
          id: String(unit.partner?.id ?? unit.order?.partnerId ?? ""),
          code: String(unit.partner?.code ?? ""),
          name: String(unit.partner?.name ?? unit.order?.partnerName ?? ""),
          countryCode:
            unit.partner?.countryCode ?? unit.order?.partnerCountryCode ?? undefined,
        }
      : undefined);

  const partnerName = partnerSelectLabel(partner, countryCodes);
  const partnerFlagUrl = partnerCountryFlagUrl(String(partner?.countryCode ?? ""));

  const currentLabel =
    String(unit.currentProcessName ?? "").trim() ||
    labelForProcessCode(unit.currentProcessCode, stepCodes) ||
    "—";

  const dueYmd = formatDateYmd(unit.plan?.plannedDate ?? unit.dueDate, {
    emptyFallback: "—",
  });
  const showScheduleTracking = !isUnitDeliveryOrProductionFinished(unit);
  const dueRel = showScheduleTracking
    ? getDueDateRelative(unit.plan?.plannedDate ?? unit.dueDate)
    : null;
  const productionDelayDays = unitListDelayDays(unit);

  const partnerNameWithFlag = (
    <span className="inline-flex items-center gap-2">
      {partnerFlagUrl ? (
        <img
          src={partnerFlagUrl}
          alt=""
          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
          decoding="async"
        />
      ) : null}
      <span className="min-w-0">{partnerName}</span>
    </span>
  );

  return (
    <section className={unitDetailHeaderCardClassName} aria-label="품목 요약">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            {lotLabel}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{productName}</p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{partnerNameWithFlag}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Link
            to="/production/units"
            className={buttonClassName({ actionRole: "navigate", size: "compact" })}
          >
            <ListIcon className="size-4 shrink-0" aria-hidden />
            품목 목록
          </Link>
          {orderId && planId ? (
            <Link
              to={`/order/${orderId}/plan/${planId}`}
              className={buttonClassName({ actionRole: "navigate", size: "compact" })}
            >
              생산 계획
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onOpenEdit}
            className={buttonClassName({ actionRole: "edit", size: "compact" })}
            title="LOT·담당·시리얼 수정"
          >
            수정
          </button>
          {showProcessGateButton ? (
            <button
              type="button"
              onClick={onOpenProcessGate}
              className={buttonClassName({ actionRole: "primary", size: "compact" })}
            >
              공정 처리
            </button>
          ) : null}
          {canDeliver ? (
            <button
              type="button"
              onClick={onOpenDeliver}
              className={buttonClassName({ actionRole: "positive", size: "compact" })}
            >
              납품 등록
            </button>
          ) : null}
          {showRmaRegister ? (
            <Link
              to={`/rma/new?unitId=${encodeURIComponent(unitId)}`}
              className={buttonClassName({ actionRole: "positive", size: "compact" })}
            >
              RMA 접수
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-gray-100 dark:xl:divide-white/[0.06]">
        <DetailSummaryMetric icon={<BoxIcon className="size-6" aria-hidden />} label="제품 S/N">
          <span className="font-mono font-normal">{serialLabel}</span>
        </DetailSummaryMetric>
        <DetailSummaryMetric icon={<CogIcon className="size-6" aria-hidden />} label="현재 공정">
          <span className="inline-flex flex-wrap items-center gap-2">
            <ProductionPlanProcessStageBadge unit={processUnit} />
            <span className="font-normal text-gray-700 dark:text-gray-300">{currentLabel}</span>
          </span>
        </DetailSummaryMetric>
        <DetailSummaryMetric icon={<TaskIcon className="size-6" aria-hidden />} label="납품">
          <span className="inline-flex flex-wrap items-center gap-2">
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
            {(unit.rmaCount ?? 0) > 0 ? (
              <Badge size="sm" color="warning">
                RMA {Number(unit.rmaCount)}
              </Badge>
            ) : null}
          </span>
        </DetailSummaryMetric>
        <DetailSummaryMetric
          icon={<CalenderIcon className="size-6" aria-hidden />}
          label="생산 예정일"
          badge={
            productionDelayDays > 0 ? (
              <span
                className={unitListDelayBadgeClassName(productionDelayDays)}
                title={`${productionDelayDays}일 지연`}
              >
                {unitListDelayLabel(productionDelayDays)}
              </span>
            ) : dueRel ? (
              <span
                className={dueDateDdayBadgeClassName(dueRel.diff)}
                title={dueRel.koLabel}
              >
                {dueRel.ddayLabel}
              </span>
            ) : null
          }
        >
          {dueYmd}
        </DetailSummaryMetric>
      </div>
    </section>
  );
}
